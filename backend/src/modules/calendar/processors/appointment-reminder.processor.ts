import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../../../common/services/metrics.service';
import { AutomationsService } from '../../automations/automations.service';
import {
  AppointmentReminderJobData,
  AppointmentReminderQueueService,
} from '../services/appointment-reminder-queue.service';
import { buildAppointmentContext } from '../lib/appointment-context';

/**
 * Executes pending appointment reminders.
 * Idempotency: the sent-flag is claimed atomically (updateMany ... where sentAt null),
 * so a cancelled app, a concurrent duplicate, or a retried Bull job can never
 * produce a double notification.
 */
@Injectable()
@Processor('appointment-reminders')
export class AppointmentReminderProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppointmentReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly queueService: AppointmentReminderQueueService,
    private readonly automationsService: AutomationsService,
  ) {}

  onModuleInit() {
    this.queueService.setInMemoryProcessor(async (data) => {
      await this.processJob(data);
    });
  }

  onModuleDestroy() {
    this.queueService.setInMemoryProcessor(async () => {});
  }

  @Process()
  async handleBullJob(job: Job<AppointmentReminderJobData>): Promise<void> {
    await this.processJob(job.data);
  }

  async processJob(data: AppointmentReminderJobData): Promise<void> {
    this.metrics.increment('appointment.reminder.started');
    const { appointmentId, tenantId, kind } = data;

    if (!this.prisma.isConnected) {
      this.logger.warn(`Reminder skipped: DB offline (appointment ${appointmentId}, ${kind}).`);
      this.metrics.increment('appointment.reminder.dbskipped');
      return;
    }

    // 1. Authoritative reload — never trust queued payload state.
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
    });
    if (!appointment) {
      this.logger.warn(`Reminder skipped: appointment ${appointmentId} not found.`);
      this.metrics.increment('appointment.reminder.skipped');
      return;
    }

    // 2. Only remind active future appointments.
    if (
      appointment.status !== 'confirmed' &&
      appointment.status !== 'scheduled' &&
      appointment.status !== 'pending'
    ) {
      this.logger.log(`Reminder skipped: appointment ${appointmentId} is ${appointment.status}.`);
      this.metrics.increment('appointment.reminder.skipped');
      return;
    }

    const startAt = appointment.startAt ?? appointment.date;
    const now = Date.now();
    if (startAt.getTime() <= now) {
      this.logger.log(`Reminder skipped: appointment ${appointmentId} already started.`);
      this.metrics.increment('appointment.reminder.skipped');
      return;
    }

    // 3. Atomic claim — only one processor may fire this reminder.
    const nudgeField = kind === '24h' ? 'reminder24hSentAt' : 'reminder1hSentAt';
    const claim = await this.prisma.appointment.updateMany({
      where: { id: appointmentId, tenantId, [nudgeField]: null },
      data: { [nudgeField]: new Date() },
    });
    if (claim.count === 0) {
      this.logger.warn(`Reminder suppressed: duplicate execution for ${kind} on ${appointmentId}.`);
      this.metrics.increment('appointment.reminder.duplicate');
      return;
    }

    // 4. Lead DND / opt-out guard (defense in depth on top of the automation engine).
    const lead = appointment.leadId
      ? await this.prisma.lead.findFirst({ where: { id: appointment.leadId, tenantId } })
      : await this.prisma.lead.findFirst({ where: { phone: appointment.phone, tenantId } }).catch(() => null);

    const leadMeta = (lead?.metadata as Record<string, any>) || {};
    if (leadMeta.isDnd || leadMeta.dnd || leadMeta.optOut || leadMeta.unsubscribed) {
      this.logger.warn(`Reminder skipped: lead ${lead?.id} has DND/opt-out active.`);
      this.metrics.increment('appointment.reminder.dnd');
      return;
    }

    // 5. Fire the appointment_reminder automation (defaults to a WhatsApp nudge).
    try {
      await this.automationsService.triggerAutomation(tenantId, {
        trigger: 'appointment_reminder',
        tenantId,
        appointmentId: appointment.id,
        leadId: lead?.id ?? appointment.leadId ?? undefined,
        callId: appointment.callId ?? undefined,
        data: {
          appointment: buildAppointmentContext(appointment, lead),
          lead: lead ? (lead as any) : undefined,
        },
      });
      this.metrics.increment('appointment.reminder.triggered');
      this.logger.log(`Appointment reminder ${kind} fired for ${appointmentId}.`);
    } catch (err: any) {
      this.metrics.increment('appointment.reminder.error');
      this.logger.error(`Reminder automation failed for ${appointmentId}: ${err.message}`);
      throw err;
    }
  }
}