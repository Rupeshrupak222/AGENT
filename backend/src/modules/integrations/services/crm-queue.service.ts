import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { CrmSyncPayload } from '../interfaces/crm-provider.interface';
import { MetricsService } from '../../../common/services/metrics.service';

@Injectable()
export class CrmQueueService implements OnModuleInit {
  static failedJobCount = 0;
  private readonly logger = new Logger(CrmQueueService.name);
  public isRedisAvailable = false;
  private readonly inMemoryQueue: Array<{
    id: string;
    data: CrmSyncPayload;
    availableAt: number;
  }> = [];
  private inMemoryProcessor?: (data: CrmSyncPayload) => Promise<void>;
  private isProcessingInMemory = false;
  private failedJobs: Array<{ jobId: string; data: CrmSyncPayload; error: string; timestamp: number }> = [];
  private readonly MAX_FAILED_JOBS = 100;

  constructor(
    @InjectQueue('crm-sync')
    private readonly crmQueue: Queue<CrmSyncPayload>,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    try {
      const client = (this.crmQueue as any).client;
      if (client && client.status === 'ready') {
        this.isRedisAvailable = true;
        this.logger.log('Bull queue [crm-sync] connected to Redis');
        this.registerQueueEventListeners();
      } else {
        this.isRedisAvailable = false;
        this.logger.warn(
          'Redis is offline on localhost:6379. CrmQueueService operating in in-memory offline fallback mode.',
        );
      }
    } catch {
      this.isRedisAvailable = false;
      this.logger.warn('Redis queue check deferred; CrmQueueService operating in offline dev mode.');
    }
  }

  private registerQueueEventListeners() {
    this.crmQueue.on('completed', (job) => {
      this.metrics.increment('queue.crm-sync.completed');
      this.logger.log(
        JSON.stringify({ event: 'queue.job.completed', queue: 'crm-sync', jobId: job.id }),
      );
    });

    this.crmQueue.on('failed', (job, err) => {
      this.metrics.increment('queue.crm-sync.failed');
      this.addFailedJob(String(job.id), job.data, err.message);
      this.logger.error(
        JSON.stringify({
          event: 'queue.job.failed',
          queue: 'crm-sync',
          jobId: job.id,
          attempt: job.attemptsMade,
          error: err.message,
        }),
      );
    });

    this.crmQueue.on('stalled', (jobId) => {
      this.metrics.increment('queue.crm-sync.stalled');
      this.logger.warn(
        JSON.stringify({ event: 'queue.job.stalled', queue: 'crm-sync', jobId }),
      );
    });
  }

  private addFailedJob(jobId: string, data: CrmSyncPayload, error: string) {
    this.failedJobs.push({ jobId, data, error, timestamp: Date.now() });
    CrmQueueService.failedJobCount += 1;
    if (this.failedJobs.length > this.MAX_FAILED_JOBS) {
      this.failedJobs = this.failedJobs.slice(-this.MAX_FAILED_JOBS);
    }
  }

  getFailedJobs() {
    return [...this.failedJobs];
  }

  setInMemoryProcessor(fn: (data: CrmSyncPayload) => Promise<void>) {
    this.inMemoryProcessor = fn;
    this.triggerInMemoryProcessing();
  }

  async enqueueSyncJob(
    data: CrmSyncPayload,
    options: { delayMs?: number } = {},
  ): Promise<{ jobId: string; queued: boolean; mode: 'bull' | 'in_memory' }> {
    const jobId = `crm-sync:${data.tenantId}:${data.callId}`;
    this.metrics.increment('queue.crm-sync.enqueued');

    if (this.isRedisAvailable) {
      try {
        await this.crmQueue.add(data, {
          jobId,
          delay: options.delayMs || 0,
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
        });
        this.logger.log(`[CRM_SYNC_QUEUED] jobId=${jobId} callId=${data.callId}`);
        return { jobId, queued: true, mode: 'bull' };
      } catch (err: any) {
        this.logger.warn(`Failed to enqueue CRM sync to Bull (${err.message}). Using in-memory queue.`);
      }
    }

    const exists = this.inMemoryQueue.some((j) => j.id === jobId);
    if (exists) {
      this.logger.log(`Skipping duplicate in-memory CRM sync job [${jobId}]`);
      return { jobId, queued: false, mode: 'in_memory' };
    }

    const availableAt = Date.now() + (options.delayMs || 0);
    this.inMemoryQueue.push({ id: jobId, data, availableAt });
    this.logger.log(`[CRM_SYNC_QUEUED_DEV] jobId=${jobId}`);

    this.triggerInMemoryProcessing();
    return { jobId, queued: true, mode: 'in_memory' };
  }

  private async triggerInMemoryProcessing() {
    if (this.isProcessingInMemory || !this.inMemoryProcessor) return;
    this.isProcessingInMemory = true;

    try {
      while (this.inMemoryQueue.length > 0) {
        const now = Date.now();
        const nextIdx = this.inMemoryQueue.findIndex((j) => j.availableAt <= now);
        if (nextIdx === -1) {
          const earliest = Math.min(...this.inMemoryQueue.map((j) => j.availableAt));
          const waitTime = Math.max(100, earliest - now);
          setTimeout(() => this.triggerInMemoryProcessing(), waitTime);
          break;
        }

        const [item] = this.inMemoryQueue.splice(nextIdx, 1);
        try {
          await this.inMemoryProcessor(item.data);
        } catch (err: any) {
          this.logger.error(`Error processing in-memory CRM sync job [${item.id}]: ${err.message}`);
        }
      }
    } finally {
      this.isProcessingInMemory = false;
    }
  }
}
