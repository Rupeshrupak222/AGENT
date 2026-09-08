import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { MetricsService } from '../../../common/services/metrics.service';

export interface PostCallAnalysisJobData {
  callId: string;
  tenantId: string;
  triggerSource: 'call_completed' | 'recording_uploaded' | 'manual_retry';
  enqueuedAt: string;
}

export interface EnqueueAnalysisOptions {
  delayMs?: number;
  priority?: number;
}

@Injectable()
export class PostCallQueueService implements OnModuleInit {
  static failedJobCount = 0;
  private readonly logger = new Logger(PostCallQueueService.name);
  public isRedisAvailable = false;
  private readonly inMemoryQueue: Array<{
    id: string;
    data: PostCallAnalysisJobData;
    availableAt: number;
  }> = [];
  private inMemoryProcessor?: (data: PostCallAnalysisJobData) => Promise<void>;
  private isProcessingInMemory = false;
  private failedJobs: Array<{ jobId: string; data: PostCallAnalysisJobData; error: string; timestamp: number }> = [];
  private readonly MAX_FAILED_JOBS = 100;

  constructor(
    @InjectQueue('post-call-analysis')
    private readonly analysisQueue: Queue<PostCallAnalysisJobData>,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    try {
      const client = (this.analysisQueue as any).client;
      if (client && client.status === 'ready') {
        this.isRedisAvailable = true;
        this.logger.log('Bull queue [post-call-analysis] connected to Redis');
        this.registerQueueEventListeners();
      } else {
        this.isRedisAvailable = false;
        this.logger.warn(
          'Redis is offline on localhost:6379. PostCallQueueService activated in-memory offline fallback mode.',
        );
      }
    } catch {
      this.isRedisAvailable = false;
      this.logger.warn('Redis queue check deferred; operating in safe offline dev mode.');
    }
  }

  private registerQueueEventListeners() {
    this.analysisQueue.on('completed', (job) => {
      this.metrics.increment('queue.post-call-analysis.completed');
      this.logger.log(
        JSON.stringify({ event: 'queue.job.completed', queue: 'post-call-analysis', jobId: job.id }),
      );
    });

    this.analysisQueue.on('failed', (job, err) => {
      this.metrics.increment('queue.post-call-analysis.failed');
      this.addFailedJob(String(job.id), job.data, err.message);
      this.logger.error(
        JSON.stringify({
          event: 'queue.job.failed',
          queue: 'post-call-analysis',
          jobId: job.id,
          attempt: job.attemptsMade,
          error: err.message,
        }),
      );
    });

    this.analysisQueue.on('stalled', (jobId) => {
      this.metrics.increment('queue.post-call-analysis.stalled');
      this.logger.warn(
        JSON.stringify({ event: 'queue.job.stalled', queue: 'post-call-analysis', jobId }),
      );
    });
  }

  private addFailedJob(jobId: string, data: PostCallAnalysisJobData, error: string) {
    this.failedJobs.push({ jobId, data, error, timestamp: Date.now() });
    PostCallQueueService.failedJobCount += 1;
    if (this.failedJobs.length > this.MAX_FAILED_JOBS) {
      this.failedJobs = this.failedJobs.slice(-this.MAX_FAILED_JOBS);
    }
  }

  getFailedJobs() {
    return [...this.failedJobs];
  }

  setInMemoryProcessor(fn: (data: PostCallAnalysisJobData) => Promise<void>) {
    this.inMemoryProcessor = fn;
    this.triggerInMemoryProcessing();
  }

  async enqueueAnalysisJob(
    data: PostCallAnalysisJobData,
    options: EnqueueAnalysisOptions = {},
  ): Promise<{ jobId: string; queued: boolean; mode: 'bull' | 'in_memory' }> {
    const jobId = `analysis:${data.tenantId}:${data.callId}`;
    this.metrics.increment('queue.post-call-analysis.enqueued');

    if (this.isRedisAvailable) {
      try {
        await this.analysisQueue.add(data, {
          jobId,
          delay: options.delayMs || 0,
          priority: options.priority || 1,
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        });
        this.logger.log(
          `[POST_CALL_ANALYSIS_QUEUED] jobId=${jobId} callId=${data.callId} trigger=${data.triggerSource}`,
        );
        return { jobId, queued: true, mode: 'bull' };
      } catch (err: any) {
        this.logger.warn(
          `Failed to enqueue job to Bull queue (${err.message}). Falling back to in-memory queue.`,
        );
      }
    }

    const exists = this.inMemoryQueue.some((j) => j.id === jobId);
    if (exists) {
      this.logger.log(`Skipping duplicate in-memory post-call analysis job [${jobId}]`);
      return { jobId, queued: false, mode: 'in_memory' };
    }

    const availableAt = Date.now() + (options.delayMs || 0);
    this.inMemoryQueue.push({ id: jobId, data, availableAt });
    this.logger.log(`[POST_CALL_ANALYSIS_QUEUED_DEV] jobId=${jobId}`);

    this.triggerInMemoryProcessing();
    return { jobId, queued: true, mode: 'in_memory' };
  }

  private triggerInMemoryProcessing() {
    if (this.isProcessingInMemory || !this.inMemoryProcessor) return;
    this.isProcessingInMemory = true;

    setImmediate(async () => {
      try {
        const now = Date.now();
        const eligibleIndices: number[] = [];

        for (let i = 0; i < this.inMemoryQueue.length; i++) {
          if (this.inMemoryQueue[i].availableAt <= now) {
            eligibleIndices.push(i);
          }
        }

        for (const idx of eligibleIndices.reverse()) {
          const item = this.inMemoryQueue.splice(idx, 1)[0];
          if (item && this.inMemoryProcessor) {
            try {
              await this.inMemoryProcessor(item.data);
            } catch (procErr: any) {
              this.logger.error(`Error in in-memory analysis processing: ${procErr.message}`);
            }
          }
        }
      } finally {
        this.isProcessingInMemory = false;
      }
    });
  }
}
