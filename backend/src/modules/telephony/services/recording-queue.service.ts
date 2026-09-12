import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { MetricsService } from '../../../common/services/metrics.service';
import {
  assertDurableQueueAvailable,
  isProductionQueueFallbackForbidden,
  RedisUnavailableError,
} from '../../../common/utils/queue-fallback';

export interface RecordingJobData {
  recordingId: string;
  providerRecordingId: string;
  callId: string;
  tenantId: string;
  sourceUrl: string;
  duration?: number;
  provider: string;
  enqueuedAt: string;
}

export interface EnqueueRecordingOptions {
  delayMs?: number;
  priority?: number;
}

@Injectable()
export class RecordingQueueService implements OnModuleInit {
  static failedJobCount = 0;
  private readonly logger = new Logger(RecordingQueueService.name);
  public isRedisAvailable = false;
  private readonly inMemoryQueue: Array<{
    id: string;
    data: RecordingJobData;
    availableAt: number;
  }> = [];
  private inMemoryProcessor?: (data: RecordingJobData) => Promise<void>;
  private isProcessingInMemory = false;
  private failedJobs: Array<{ jobId: string; data: RecordingJobData; error: string; timestamp: number }> = [];
  private readonly MAX_FAILED_JOBS = 100;

  constructor(
    @InjectQueue('recording-processing')
    private readonly recordingQueue: Queue<RecordingJobData>,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    try {
      const client = (this.recordingQueue as any).client;
      if (client && client.status === 'ready') {
        this.isRedisAvailable = true;
        this.logger.log('Bull queue [recording-processing] connected to Redis');
        this.registerQueueEventListeners();
      } else {
        this.isRedisAvailable = false;
        this.logger.warn(
          'Redis is offline on localhost:6379. RecordingQueueService activated in-memory offline fallback mode.',
        );
      }
    } catch {
      this.isRedisAvailable = false;
      this.logger.warn('Redis queue check deferred; operating in safe offline dev mode.');
    }
  }

  private registerQueueEventListeners() {
    this.recordingQueue.on('completed', (job) => {
      this.metrics.increment('queue.recording-processing.completed');
      this.logger.log(
        JSON.stringify({ event: 'queue.job.completed', queue: 'recording-processing', jobId: job.id }),
      );
    });

    this.recordingQueue.on('failed', (job, err) => {
      this.metrics.increment('queue.recording-processing.failed');
      this.addFailedJob(String(job.id), job.data, err.message);
      this.logger.error(
        JSON.stringify({
          event: 'queue.job.failed',
          queue: 'recording-processing',
          jobId: job.id,
          attempt: job.attemptsMade,
          error: err.message,
        }),
      );
    });

    this.recordingQueue.on('stalled', (jobId) => {
      this.metrics.increment('queue.recording-processing.stalled');
      this.logger.warn(
        JSON.stringify({ event: 'queue.job.stalled', queue: 'recording-processing', jobId }),
      );
    });
  }

  private addFailedJob(jobId: string, data: RecordingJobData, error: string) {
    this.failedJobs.push({ jobId, data, error, timestamp: Date.now() });
    RecordingQueueService.failedJobCount += 1;
    if (this.failedJobs.length > this.MAX_FAILED_JOBS) {
      this.failedJobs = this.failedJobs.slice(-this.MAX_FAILED_JOBS);
    }
  }

  getFailedJobs() {
    return [...this.failedJobs];
  }

  setInMemoryProcessor(fn: (data: RecordingJobData) => Promise<void>) {
    this.inMemoryProcessor = fn;
    this.triggerInMemoryProcessing();
  }

  async enqueueRecordingJob(
    data: RecordingJobData,
    options: EnqueueRecordingOptions = {},
  ): Promise<{ jobId: string; queued: boolean; mode: 'bull' | 'in_memory' }> {
    const jobId = `recording:${data.tenantId}:${data.callId}:${data.providerRecordingId}`;
    this.metrics.increment('queue.recording-processing.enqueued');

    if (this.isRedisAvailable) {
      try {
        await this.recordingQueue.add(data, {
          jobId,
          delay: options.delayMs || 0,
          priority: options.priority || 1,
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        });
        this.logger.log(
          `[RECORDING_JOB_QUEUED] jobId=${jobId} callId=${data.callId} providerRecordingId=${data.providerRecordingId}`,
        );
        return { jobId, queued: true, mode: 'bull' };
      } catch (err: any) {
        this.logger.warn(
          `Failed to enqueue job to Bull queue (${err.message}).${isProductionQueueFallbackForbidden(process.env.NODE_ENV) ? ' PRODUCTION: durable submission rejected.' : ' Falling back to in-memory queue.'}`,
        );
        if (isProductionQueueFallbackForbidden(process.env.NODE_ENV)) {
          throw new RedisUnavailableError('recording-processing');
        }
      }
    }

    assertDurableQueueAvailable('recording-processing', process.env.NODE_ENV);

    const exists = this.inMemoryQueue.some((j) => j.id === jobId);
    if (exists) {
      this.logger.log(`Skipping duplicate in-memory recording job [${jobId}]`);
      return { jobId, queued: false, mode: 'in_memory' };
    }

    const availableAt = Date.now() + (options.delayMs || 0);
    this.inMemoryQueue.push({ id: jobId, data, availableAt });
    this.logger.log(`[RECORDING_JOB_QUEUED_DEV] jobId=${jobId}`);

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
              this.logger.error(`Error in in-memory recording processing: ${procErr.message}`);
            }
          }
        }
      } finally {
        this.isProcessingInMemory = false;
      }
    });
  }
}
