import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

export interface OutboundCallJobData {
  campaignId: string;
  campaignLeadId: string;
  leadId: string;
  agentId: string;
  tenantId: string;
  attemptNumber: number;
  phoneNumber: string;
  enqueuedAt: string;
}

export interface EnqueueOptions {
  delayMs?: number;
  priority?: number;
}

@Injectable()
export class CampaignQueueService implements OnModuleInit {
  private readonly logger = new Logger(CampaignQueueService.name);
  public isRedisAvailable = false;
  private readonly inMemoryQueue: Array<{ id: string; data: OutboundCallJobData; availableAt: number }> = [];
  private inMemoryProcessor?: (data: OutboundCallJobData) => Promise<void>;
  private isProcessingInMemory = false;

  constructor(
    @InjectQueue('outbound-calls') private readonly outboundQueue: Queue<OutboundCallJobData>,
  ) {}

  async onModuleInit() {
    try {
      // Check Redis client connection status
      const client = (this.outboundQueue as any).client;
      if (client && client.status === 'ready') {
        this.isRedisAvailable = true;
        this.logger.log('Bull queue [outbound-calls] connected to Redis');
      } else {
        this.isRedisAvailable = false;
        this.logger.warn('Redis is offline on localhost:6379. CampaignQueueService activated in-memory offline fallback mode.');
      }
    } catch {
      this.isRedisAvailable = false;
      this.logger.warn('Redis queue check deferred; operating in safe offline dev mode.');
    }
  }

  /**
   * Sets the worker processor callback for the in-memory fallback runner.
   */
  setInMemoryProcessor(fn: (data: OutboundCallJobData) => Promise<void>) {
    this.inMemoryProcessor = fn;
    this.triggerInMemoryProcessing();
  }

  /**
   * Enqueues an outbound call job with deterministic compound idempotency key.
   */
  async enqueueCallJob(
    data: OutboundCallJobData,
    options: EnqueueOptions = {},
  ): Promise<{ jobId: string; queued: boolean; mode: 'bull' | 'in_memory' }> {
    const jobId = `campaign:${data.campaignId}:lead:${data.leadId}:attempt:${data.attemptNumber}`;

    if (this.isRedisAvailable) {
      try {
        await this.outboundQueue.add(data, {
          jobId,
          delay: options.delayMs || 0,
          priority: options.priority || 1,
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 1, // Application-level retry policy controls attempts via CampaignLead
        });
        this.logger.log(`[CALL_JOB_QUEUED] jobId=${jobId} campaignId=${data.campaignId} leadId=${data.leadId} phone=${data.phoneNumber}`);
        return { jobId, queued: true, mode: 'bull' };
      } catch (err: any) {
        this.logger.warn(`Failed to enqueue job to Bull queue (${err.message}). Falling back to in-memory queue.`);
      }
    }

    // In-memory fallback for local development / testing when Redis is offline
    const exists = this.inMemoryQueue.some(j => j.id === jobId);
    if (exists) {
      this.logger.log(`Skipping duplicate in-memory job [${jobId}]`);
      return { jobId, queued: false, mode: 'in_memory' };
    }

    const availableAt = Date.now() + (options.delayMs || 0);
    this.inMemoryQueue.push({ id: jobId, data, availableAt });
    this.logger.log(`[CALL_JOB_QUEUED_DEV] jobId=${jobId} availableAt=${new Date(availableAt).toISOString()}`);

    // Trigger processing
    this.triggerInMemoryProcessing();

    return { jobId, queued: true, mode: 'in_memory' };
  }

  /**
   * Processes available in-memory jobs sequentially with delay handling.
   */
  private async triggerInMemoryProcessing() {
    if (this.isProcessingInMemory || !this.inMemoryProcessor) return;
    this.isProcessingInMemory = true;

    try {
      while (this.inMemoryQueue.length > 0) {
        const now = Date.now();
        const nextIdx = this.inMemoryQueue.findIndex(j => j.availableAt <= now);
        if (nextIdx === -1) {
          // All remaining jobs are delayed; break loop
          break;
        }

        const [job] = this.inMemoryQueue.splice(nextIdx, 1);
        try {
          await this.inMemoryProcessor(job.data);
        } catch (procErr: any) {
          this.logger.error(`Error processing in-memory job ${job.id}: ${procErr.message}`);
        }
      }
    } finally {
      this.isProcessingInMemory = false;
    }
  }

  /**
   * Returns current queue backlog count.
   */
  async getQueueStats(): Promise<{ waiting: number; active: number; inMemory: number }> {
    if (this.isRedisAvailable) {
      try {
        const [waiting, active] = await Promise.all([
          this.outboundQueue.getWaitingCount(),
          this.outboundQueue.getActiveCount(),
        ]);
        return { waiting, active, inMemory: this.inMemoryQueue.length };
      } catch {
        // Redis read error
      }
    }
    return { waiting: 0, active: 0, inMemory: this.inMemoryQueue.length };
  }

  /**
   * Clears pending in-memory jobs for a cancelled campaign.
   */
  clearCampaignInMemoryJobs(campaignId: string): number {
    const before = this.inMemoryQueue.length;
    for (let i = this.inMemoryQueue.length - 1; i >= 0; i--) {
      if (this.inMemoryQueue[i].data.campaignId === campaignId) {
        this.inMemoryQueue.splice(i, 1);
      }
    }
    return before - this.inMemoryQueue.length;
  }
}
