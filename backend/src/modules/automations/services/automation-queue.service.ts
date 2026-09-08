import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import * as crypto from 'crypto';
import { MetricsService } from '../../../common/services/metrics.service';

export interface AutomationJobData {
  tenantId: string;
  automationRuleId?: string;
  triggerEventId: string;
  triggerName: string;
  leadId?: string;
  callId?: string;
  appointmentId?: string;
  actionType: 'send_whatsapp' | 'send_email' | 'whatsapp' | 'email';
  template?: string;
  subject?: string;
  variables?: Record<string, any>;
  destinationOverride?: string; // e.g. for test action
  isTestAction?: boolean;
}

@Injectable()
export class AutomationQueueService implements OnModuleInit {
  static failedJobCount = 0;
  private readonly logger = new Logger(AutomationQueueService.name);
  public isRedisAvailable = false;
  private readonly inMemoryQueue: Array<{
    id: string;
    data: AutomationJobData;
    availableAt: number;
    attempts: number;
  }> = [];
  private inMemoryProcessor?: (data: AutomationJobData) => Promise<void>;
  private isProcessingInMemory = false;
  private failedJobs: Array<{ jobId: string; data: AutomationJobData; error: string; timestamp: number }> = [];
  private readonly MAX_FAILED_JOBS = 100;
  private readonly processedJobIds = new Set<string>();

  constructor(
    @InjectQueue('automation-actions')
    private readonly queue: Queue<AutomationJobData>,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    try {
      const client = (this.queue as any).client;
      if (client && client.status === 'ready') {
        this.isRedisAvailable = true;
        this.logger.log('Bull queue [automation-actions] connected to Redis');
        this.registerQueueEventListeners();
      } else {
        this.isRedisAvailable = false;
        this.logger.warn(
          'Redis is offline on localhost:6379. AutomationQueueService operating in in-memory offline fallback mode.',
        );
      }
    } catch {
      this.isRedisAvailable = false;
      this.logger.warn('Redis queue check deferred; AutomationQueueService operating in offline dev mode.');
    }
  }

  private registerQueueEventListeners() {
    this.queue.on('completed', (job) => {
      this.metrics.increment('queue.automation.completed');
      this.logger.log(
        JSON.stringify({ event: 'queue.job.completed', queue: 'automation-actions', jobId: job.id }),
      );
    });

    this.queue.on('failed', (job, err) => {
      this.metrics.increment('queue.automation.failed');
      this.addFailedJob(String(job.id), job.data, err.message);
      this.logger.error(
        JSON.stringify({
          event: 'queue.job.failed',
          queue: 'automation-actions',
          jobId: job.id,
          attempt: job.attemptsMade,
          error: err.message,
        }),
      );
    });

    this.queue.on('stalled', (jobId) => {
      this.metrics.increment('queue.automation.stalled');
      this.logger.warn(
        JSON.stringify({ event: 'queue.job.stalled', queue: 'automation-actions', jobId }),
      );
    });
  }

  private addFailedJob(jobId: string, data: AutomationJobData, error: string) {
    this.failedJobs.push({ jobId, data, error, timestamp: Date.now() });
    AutomationQueueService.failedJobCount += 1;
    if (this.failedJobs.length > this.MAX_FAILED_JOBS) {
      this.failedJobs = this.failedJobs.slice(-this.MAX_FAILED_JOBS);
    }
  }

  getFailedJobs() {
    return [...this.failedJobs];
  }

  setInMemoryProcessor(fn: (data: AutomationJobData) => Promise<void>) {
    this.inMemoryProcessor = fn;
  }

  /**
   * Generates a deterministic job ID for deduplication and idempotency.
   */
  generateJobId(data: AutomationJobData): string {
    const raw = `${data.tenantId}:${data.automationRuleId || 'direct'}:${data.triggerEventId}:${data.leadId || 'none'}:${data.appointmentId || 'none'}:${data.actionType}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 24);
  }

  /**
   * Enqueue an automation action.
   */
  async enqueueAction(data: AutomationJobData): Promise<{ jobId: string; queued: boolean }> {
    const jobId = this.generateJobId(data);

    // Guard duplicate trigger in-memory
    if (this.processedJobIds.has(jobId)) {
      this.logger.warn(`Duplicate automation action suppressed: ${jobId}`);
      return { jobId, queued: false };
    }

    this.metrics.increment('automation.action.queued');

    if (this.isRedisAvailable) {
      try {
        await this.queue.add(data, {
          jobId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        });
        this.processedJobIds.add(jobId);
        return { jobId, queued: true };
      } catch (err: any) {
        this.logger.warn(`Redis enqueue failed (${err.message}). Falling back to in-memory queue.`);
        this.isRedisAvailable = false;
      }
    }

    // In-memory fallback
    this.processedJobIds.add(jobId);
    this.inMemoryQueue.push({
      id: jobId,
      data,
      availableAt: Date.now(),
      attempts: 0,
    });

    // Process asynchronously without blocking caller
    setImmediate(() => this.processNextInMemoryJob());

    return { jobId, queued: true };
  }

  private async processNextInMemoryJob() {
    if (this.isProcessingInMemory || !this.inMemoryProcessor) return;
    this.isProcessingInMemory = true;

    try {
      while (this.inMemoryQueue.length > 0) {
        const item = this.inMemoryQueue.shift();
        if (!item) break;

        try {
          await this.inMemoryProcessor(item.data);
          this.metrics.increment('queue.automation.completed');
        } catch (err: any) {
          item.attempts += 1;
          this.metrics.increment('queue.automation.failed');
          this.addFailedJob(item.id, item.data, err.message);

          // Retry logic in-memory (up to 3 attempts with exponential delay)
          if (item.attempts < 3) {
            const delay = Math.pow(2, item.attempts) * 1000;
            setTimeout(() => {
              this.inMemoryQueue.push(item);
              this.processNextInMemoryJob();
            }, delay);
          } else {
            this.logger.error(`In-memory automation job ${item.id} exhausted retries: ${err.message}`);
          }
        }
      }
    } finally {
      this.isProcessingInMemory = false;
    }
  }
}
