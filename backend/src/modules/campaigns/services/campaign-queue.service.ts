import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { MetricsService } from '../../../common/services/metrics.service';

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
  static failedJobCount = 0;
  private readonly logger = new Logger(CampaignQueueService.name);
  public isRedisAvailable = false;
  private readonly inMemoryQueue: Array<{ id: string; data: OutboundCallJobData; availableAt: number }> = [];
  private inMemoryProcessor?: (data: OutboundCallJobData) => Promise<void>;
  private isProcessingInMemory = false;
  private failedJobs: Array<{ jobId: string; data: OutboundCallJobData; error: string; timestamp: number }> = [];
  private readonly MAX_FAILED_JOBS = 100;

  constructor(
    @InjectQueue('outbound-calls') private readonly outboundQueue: Queue<OutboundCallJobData>,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    try {
      const client = (this.outboundQueue as any).client;
      if (client && client.status === 'ready') {
        this.isRedisAvailable = true;
        this.logger.log('Bull queue [outbound-calls] connected to Redis');
        this.registerQueueEventListeners();
      } else {
        this.isRedisAvailable = false;
        this.logger.warn('Redis is offline on localhost:6379. CampaignQueueService activated in-memory offline fallback mode.');
      }
    } catch {
      this.isRedisAvailable = false;
      this.logger.warn('Redis queue check deferred; operating in safe offline dev mode.');
    }
  }

  private registerQueueEventListeners() {
    this.outboundQueue.on('completed', (job) => {
      this.metrics.increment('queue.outbound-calls.completed');
      this.logger.log(
        JSON.stringify({ event: 'queue.job.completed', queue: 'outbound-calls', jobId: job.id }),
      );
    });

    this.outboundQueue.on('failed', (job, err) => {
      this.metrics.increment('queue.outbound-calls.failed');
      this.addFailedJob(String(job.id), job.data, err.message);
      this.logger.error(
        JSON.stringify({
          event: 'queue.job.failed',
          queue: 'outbound-calls',
          jobId: job.id,
          attempt: job.attemptsMade,
          error: err.message,
        }),
      );
    });

    this.outboundQueue.on('stalled', (jobId) => {
      this.metrics.increment('queue.outbound-calls.stalled');
      this.logger.warn(
        JSON.stringify({ event: 'queue.job.stalled', queue: 'outbound-calls', jobId }),
      );
    });
  }

  private addFailedJob(jobId: string, data: OutboundCallJobData, error: string) {
    this.failedJobs.push({ jobId, data, error, timestamp: Date.now() });
    CampaignQueueService.failedJobCount += 1;
    if (this.failedJobs.length > this.MAX_FAILED_JOBS) {
      this.failedJobs = this.failedJobs.slice(-this.MAX_FAILED_JOBS);
    }
  }

  getFailedJobs() {
    return [...this.failedJobs];
  }

  setInMemoryProcessor(fn: (data: OutboundCallJobData) => Promise<void>) {
    this.inMemoryProcessor = fn;
    this.triggerInMemoryProcessing();
  }

  async enqueueCallJob(
    data: OutboundCallJobData,
    options: EnqueueOptions = {},
  ): Promise<{ jobId: string; queued: boolean; mode: 'bull' | 'in_memory' }> {
    const jobId = `campaign:${data.campaignId}:lead:${data.leadId}:attempt:${data.attemptNumber}`;
    this.metrics.increment('queue.outbound-calls.enqueued');

    if (this.isRedisAvailable) {
      try {
        await this.outboundQueue.add(data, {
          jobId,
          delay: options.delayMs || 0,
          priority: options.priority || 1,
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 1,
        });
        this.logger.log(`[CALL_JOB_QUEUED] jobId=${jobId} campaignId=${data.campaignId} leadId=${data.leadId} phone=${data.phoneNumber}`);
        return { jobId, queued: true, mode: 'bull' };
      } catch (err: any) {
        this.logger.warn(`Failed to enqueue job to Bull queue (${err.message}). Falling back to in-memory queue.`);
      }
    }

    const exists = this.inMemoryQueue.some(j => j.id === jobId);
    if (exists) {
      this.logger.log(`Skipping duplicate in-memory job [${jobId}]`);
      return { jobId, queued: false, mode: 'in_memory' };
    }

    const availableAt = Date.now() + (options.delayMs || 0);
    this.inMemoryQueue.push({ id: jobId, data, availableAt });
    this.logger.log(`[CALL_JOB_QUEUED_DEV] jobId=${jobId} availableAt=${new Date(availableAt).toISOString()}`);

    this.triggerInMemoryProcessing();

    return { jobId, queued: true, mode: 'in_memory' };
  }

  private async triggerInMemoryProcessing() {
    if (this.isProcessingInMemory || !this.inMemoryProcessor) return;
    this.isProcessingInMemory = true;

    try {
      while (this.inMemoryQueue.length > 0) {
        const now = Date.now();
        const nextIdx = this.inMemoryQueue.findIndex(j => j.availableAt <= now);
        if (nextIdx === -1) {
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

  async getQueueStats(): Promise<{ waiting: number; active: number; failed: number; inMemory: number }> {
    if (this.isRedisAvailable) {
      try {
        const [waiting, active, failed] = await Promise.all([
          this.outboundQueue.getWaitingCount(),
          this.outboundQueue.getActiveCount(),
          this.outboundQueue.getFailedCount(),
        ]);
        return { waiting, active, failed, inMemory: this.inMemoryQueue.length };
      } catch {
        // Redis read error
      }
    }
    return { waiting: 0, active: 0, failed: this.failedJobs.length, inMemory: this.inMemoryQueue.length };
  }

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
