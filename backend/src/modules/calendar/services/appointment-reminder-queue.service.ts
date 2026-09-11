import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { MetricsService } from '../../../common/services/metrics.service';

export type ReminderKind = '24h' | '1h';

export interface AppointmentReminderJobData {
  appointmentId: string;
  tenantId: string;
  kind: ReminderKind;
  remindAt: string; // ISO UTC target execution time
}

export const REMINDER_OFFSETS: Record<ReminderKind, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '1h': 60 * 60 * 1000,
};

function reminderJobId(appointmentId: string, kind: ReminderKind): string {
  return `apnt:reminder:${appointmentId}:${kind}`;
}

/**
 * Schedules the 24h + 1h pre-appointment reminder jobs.
 * Mirrors the automations queue: Bull when Redis is up, an in-memory
 * timer map otherwise. Job ids are deterministic so reschedules/cancels
 * can reliably drop stale jobs.
 */
@Injectable()
export class AppointmentReminderQueueService implements OnModuleInit, OnModuleDestroy {
  static failedJobCount = 0;
  private readonly logger = new Logger(AppointmentReminderQueueService.name);
  public isRedisAvailable = false;

  private readonly inMemoryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private inMemoryProcessor?: (data: AppointmentReminderJobData) => Promise<void>;

  constructor(
    @InjectQueue('appointment-reminders')
    private readonly queue: Queue<AppointmentReminderJobData>,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    try {
      const client = (this.queue as any).client;
      if (client && client.status === 'ready') {
        this.isRedisAvailable = true;
        this.logger.log('Bull queue [appointment-reminders] connected to Redis');
        this.registerQueueEventListeners();
      } else {
        this.logger.warn(
          'Redis offline — appointment reminders operating in in-memory timer mode.',
        );
      }
    } catch {
      this.logger.warn('Redis queue check deferred; appointment reminders in in-memory mode.');
    }
  }

  private registerQueueEventListeners() {
    this.queue.on('completed', (job) => {
      this.metrics.increment('queue.appointmentReminder.completed');
      this.logger.log(
        JSON.stringify({ event: 'queue.job.completed', queue: 'appointment-reminders', jobId: job.id }),
      );
    });
    this.queue.on('failed', (job, err) => {
      AppointmentReminderQueueService.failedJobCount += 1;
      this.metrics.increment('queue.appointmentReminder.failed');
      this.logger.error(
        JSON.stringify({
          event: 'queue.job.failed',
          queue: 'appointment-reminders',
          jobId: job.id,
          error: err.message,
        }),
      );
    });
    this.queue.on('stalled', (jobId) => {
      this.logger.warn(
        JSON.stringify({ event: 'queue.job.stalled', queue: 'appointment-reminders', jobId }),
      );
    });
  }

  onModuleDestroy() {
    for (const timer of this.inMemoryTimers.values()) {
      clearTimeout(timer);
    }
    this.inMemoryTimers.clear();
    if (this.queue && typeof this.queue.removeAllListeners === 'function') {
      this.queue.removeAllListeners();
    }
  }

  setInMemoryProcessor(fn: (data: AppointmentReminderJobData) => Promise<void>) {
    this.inMemoryProcessor = fn;
  }

  /** Strip any registered in-memory timer for a scheduled (not yet sent) reminder. */
  clearInMemoryTimer(appointmentId: string, kind: ReminderKind) {
    const id = reminderJobId(appointmentId, kind);
    const timer = this.inMemoryTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.inMemoryTimers.delete(id);
    }
  }

  /**
   * Removes every pending reminder job for an appointment (both Bull and in-memory).
   */
  async cancelReminders(appointmentId: string): Promise<{ removed: number }> {
    let removed = 0;
    for (const kind of Object.keys(REMINDER_OFFSETS) as ReminderKind[]) {
      if (this.inMemoryTimers.has(reminderJobId(appointmentId, kind))) removed += 1;
      this.clearInMemoryTimer(appointmentId, kind);
    }
    if (this.isRedisAvailable) {
      try {
        await this.queue.removeJobs(`apnt:reminder:${appointmentId}:*`);
      } catch (err: any) {
        this.logger.warn(`Could not remove Redis reminder jobs: ${err.message}`);
      }
    }
    this.logger.log(`Cancelled pending reminders for appointment ${appointmentId} (removed ${removed} in-memory)`);
    return { removed };
  }

  /** Returns the scheduled/expected metadata for both reminders (never sends). */
  describeReminders(startAt: Date): Array<{ kind: ReminderKind; offsetMs: number; remindAt: string; scheduled: boolean }> {
    const now = Date.now();
    return (Object.keys(REMINDER_OFFSETS) as ReminderKind[]).map((kind) => {
      const remindAt = new Date(startAt.getTime() - REMINDER_OFFSETS[kind]);
      return {
        kind,
        offsetMs: REMINDER_OFFSETS[kind],
        remindAt: remindAt.toISOString(),
        scheduled: remindAt.getTime() > now,
      };
    });
  }

  /**
   * Schedules (or reschedules) both reminders for a confirmed appointment.
   * Past-due reminder windows are skipped.
   */
  async scheduleReminders(appointment: { id: string; tenantId: string; startAt: Date }): Promise<
    Array<{ kind: ReminderKind; jobId: string; queued: boolean; remindAt: string }>
  > {
    const results: Array<{ kind: ReminderKind; jobId: string; queued: boolean; remindAt: string }> = [];

    for (const kind of Object.keys(REMINDER_OFFSETS) as ReminderKind[]) {
      const remindAt = new Date(appointment.startAt.getTime() - REMINDER_OFFSETS[kind]);
      if (remindAt.getTime() <= Date.now()) {
        this.logger.log(
          `Reminder ${kind} for appointment ${appointment.id} is already due — skipping schedule`,
        );
        continue;
      }

      const data: AppointmentReminderJobData = {
        appointmentId: appointment.id,
        tenantId: appointment.tenantId,
        kind,
        remindAt: remindAt.toISOString(),
      };
      const jobId = reminderJobId(appointment.id, kind);

      if (this.isRedisAvailable) {
        try {
          await this.queue.add(data, {
            jobId,
            delay: Math.max(0, remindAt.getTime() - Date.now()),
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: 100,
          });
          results.push({ kind, jobId, queued: true, remindAt: remindAt.toISOString() });
          continue;
        } catch (err: any) {
          this.logger.warn(`Redis reminder enqueue failed (${err.message}); using in-memory timer.`);
          this.isRedisAvailable = false;
        }
      }

      this.clearInMemoryTimer(appointment.id, kind);
      const delay = Math.max(0, remindAt.getTime() - Date.now());
      const id = jobId;
      const timer = setTimeout(async () => {
        this.inMemoryTimers.delete(id);
        if (this.inMemoryProcessor) {
          try {
            await this.inMemoryProcessor(data);
          } catch (err: any) {
            this.logger.error(`In-memory reminder job ${id} failed: ${err.message}`);
          }
        }
      }, delay);
      this.inMemoryTimers.set(id, timer);
      results.push({ kind, jobId, queued: true, remindAt: remindAt.toISOString() });
    }

    this.logger.log(
      `Scheduled reminders for appointment ${appointment.id}: ${results.map((r) => r.kind).join(', ')}`,
    );
    return results;
  }
}