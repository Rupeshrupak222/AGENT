import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { MetricsService } from '../../../common/services/metrics.service';
import { AutomationsService } from '../../automations/automations.service';
import { CalendarProviderRegistry } from '../providers/calendar-provider-registry.service';
import { CalendarProviderException, CalendarErrorCode, CalendarErrorFactory } from '../providers/calendar-errors';
import {
  AppointmentReminderQueueService,
} from './appointment-reminder-queue.service';
import { buildAppointmentContext } from '../lib/appointment-context';
import {
  AvailabilityQueryDto,
  ScheduleAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  AppointmentQueryDto,
} from '../dto/appointment-schedule.dto';

const MIN_PAST_TOLERANCE_MS = 5 * 60 * 1000;
const ACTIVE_STATUSES = ['scheduled', 'pending', 'confirmed', 'rescheduled'];

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly metrics: MetricsService,
    private readonly providerRegistry: CalendarProviderRegistry,
    private readonly reminderQueue: AppointmentReminderQueueService,
    @Inject(forwardRef(() => AutomationsService))
    private readonly automationsService: AutomationsService,
    private readonly errorFactory: CalendarErrorFactory,
  ) {}

  // ── Availability & Provider status ───────────────────────────

  async getAvailability(tenantId: string, query: AvailabilityQueryDto) {
    const timezone = query.timezone || 'UTC';
    const duration = query.duration || 30;
    const from = new Date(query.from);
    const to = new Date(query.to);

    if (to.getTime() <= from.getTime()) {
      throw new BadRequestException('Availability window "to" must be after "from".');
    }
    if (to.getTime() - from.getTime() > 62 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Availability window is too large (max 62 days).');
    }

    const resolved = await this.providerRegistry.resolve(tenantId, query.provider ?? 'auto');
    this.metrics.increment('appointment.availability.requested');

    let slots: any[] = [];
    const started = Date.now();
    try {
      slots = await resolved.adapter.getAvailability(resolved.credentials, {
        startAt: from,
        endAt: to,
        timezone,
        durationMinutes: duration,
        eventTypeId:
          query.provider === 'calcom' || resolved.providerName === 'calcom'
            ? (query as any).eventTypeId ?? resolved.settings.eventTypeId ?? resolved.credentials.eventTypeId
            : undefined,
      });
    } catch (err: any) {
      const shape = err instanceof CalendarProviderException ? err.toShape() : this.errorFactory.toShape(err);
      this.metrics.increment('appointment.availability.failed');
      if (shape.code === CalendarErrorCode.AUTH_FAILED) {
        return {
          provider: resolved.providerName,
          isMock: resolved.isMock,
          source: resolved.source,
          timezone,
          authenticated: false,
          slots: [],
        };
      }
      this.metrics.recordLatency('appointment.availability', Date.now() - started);
      throw this.errorFactory.toHttpException(shape);
    }

    this.metrics.recordLatency('appointment.availability', Date.now() - started);

    // Overlap local commitments so we never advertise a double-booked slot.
    if (this.prisma.isConnected) {
      const local = await this.prisma.appointment.findMany({
        where: {
          tenantId,
          ...(query.agentId ? { agentId: query.agentId } : {}),
          status: { in: ACTIVE_STATUSES as any },
          startAt: { not: null as any },
          OR: [{ startAt: { lt: to } }, { startAt: null }],
        },
        select: { startAt: true, endAt: true },
      });
      const taken = local
        .filter((a) => a.startAt && a.endAt)
        .map((a) => ({ startAt: new Date(a.startAt!), endAt: new Date(a.endAt!) }));

      const availableSlots = slots.filter((slot) => {
        const s = new Date(slot.startAt);
        const e = new Date(slot.endAt);
        return !taken.some((t) => t.startAt < e && t.endAt > s);
      });

      return {
        provider: resolved.providerName,
        isMock: resolved.isMock,
        source: resolved.source,
        timezone,
        authenticated: true,
        slots: availableSlots,
        excluded: slots.length - availableSlots.length,
      };
    }

    return {
      provider: resolved.providerName,
      isMock: resolved.isMock,
      source: resolved.source,
      timezone,
      authenticated: true,
      slots,
      excluded: 0,
    };
  }

  async providerStatus(tenantId: string) {
    const resolved = await this.providerRegistry.resolve(tenantId, 'auto');
    if (resolved.providerName !== 'calcom') {
      return {
        provider: resolved.providerName,
        configured: false,
        source: resolved.source,
        isMock: resolved.isMock,
        message: resolved.isMock
          ? 'No calendar provider configured — using built-in mock calendar (dev mode).'
          : 'Native calendar mode',
      };
    }
    const res = await resolved.adapter.testConnection(resolved.credentials, resolved.settings);
    return {
      provider: 'calcom',
      configured: true,
      source: resolved.source,
      isMock: false,
      success: res.success,
      message: res.message,
      details: res.details,
    };
  }

  // ── Booking flow ─────────────────────────────────────────────

  async create(tenantId: string, userId: string, dto: ScheduleAppointmentDto) {
    this.metrics.increment('appointment.created.attempted');
    const startAt = dto.startAt ? new Date(dto.startAt) : dto.date ? new Date(dto.date) : null;
    if (!startAt || isNaN(startAt.getTime())) {
      throw new BadRequestException('A valid startAt/date is required to book an appointment.');
    }
    const duration = dto.duration || 30;
    const timezone = dto.timezone || 'UTC';
    const endAt = new Date(startAt.getTime() + duration * 60000);

    if (startAt.getTime() < Date.now() - MIN_PAST_TOLERANCE_MS) {
      throw new BadRequestException('Cannot book an appointment in the past.');
    }

    // Idempotent replay — same key returns the authoritative existing booking.
    if (dto.idempotencyKey) {
      const existing = await this.prisma.appointment.findUnique({
        where: {
          tenantId_idempotencyKey: { tenantId, idempotencyKey: dto.idempotencyKey },
        },
      });
      if (existing) {
        this.logger.log(`Idempotent replay: returning existing appointment ${existing.id}`);
        this.metrics.increment('appointment.created.idempotent');
        return { ...existing, idempotent: true };
      }
    }

    const providerOverride = dto.provider ?? 'auto';
    const nativeOnly = providerOverride === 'native';
    const resolved = nativeOnly
      ? { providerName: 'native' as const, adapter: null as any, credentials: {}, settings: {}, isMock: true, source: 'default' as const }
      : await this.providerRegistry.resolve(tenantId, providerOverride);

    let booking: any = null;
    if (!nativeOnly) {
      // Revalidate the slot against the live provider before booking.
      await this.assertSlotAvailable(resolved as any, startAt, duration, timezone);
      booking = await resolved.adapter.createBooking(resolved.credentials, {
        eventTypeId: (resolved.settings as any).eventTypeId ?? (resolved.credentials as any).eventTypeId,
        startAt,
        endAt,
        durationMinutes: duration,
        attendee: {
          name: dto.leadName,
          phone: dto.phone,
          email: dto.email,
          timezone,
        },
        title: dto.title ?? `Appointment — ${dto.leadName}`,
        description: dto.description ?? dto.topic,
        location: dto.location,
        metadata: {
          tenantId,
          leadId: dto.leadId,
          agentId: dto.agentId,
          source: dto.source ?? 'manual',
        },
      });
    }

    const status = nativeOnly ? 'scheduled' : 'confirmed';
    let appointment: any;
    try {
      appointment = await this.prisma.appointment.create({
        data: {
          leadName: dto.leadName,
          phone: dto.phone,
          email: dto.email,
          topic: dto.topic,
          title: dto.title,
          description: dto.description,
          date: startAt,
          startAt,
          endAt,
          duration,
          timezone,
          status,
          location: booking?.location ?? dto.location,
          calendarProvider: nativeOnly ? 'native' : resolved.providerName,
          providerAppointmentId: booking?.providerAppointmentId,
          providerEventId: booking?.providerEventId,
          providerBookingUrl: booking?.providerBookingUrl,
          attendeeEmail: dto.email,
          attendeePhone: dto.phone,
          metadata: {
            ...(booking?.raw ? { providerRaw: booking.raw } : {}),
            source: dto.source ?? 'manual',
            prevStatus: nativeOnly ? 'scheduled' : 'confirmed',
          },
          source: dto.source ?? 'manual',
          idempotencyKey: dto.idempotencyKey,
          leadId: dto.leadId,
          agentId: dto.agentId,
          callId: dto.callId,
          campaignId: dto.campaignId,
          createdById: userId,
          createdByEmail: dto.createdByEmail,
          tenantId,
        },
      });
    } catch (err: any) {
      // Compensate an orphaned external booking when the local write fails.
      if (booking?.providerAppointmentId && resolved.adapter?.cancelBooking) {
        await resolved.adapter.cancelBooking(resolved.credentials, booking.providerAppointmentId, 'local persist failed').catch(() => undefined);
      }
      throw err;
    }

    // Schedule 24h/1h reminders for confirmed bookings.
    if (status === 'confirmed' && appointment.startAt) {
      await this.reminderQueue.scheduleReminders(appointment).catch((err: any) =>
        this.logger.warn(`Reminder scheduling failed for ${appointment.id}: ${err.message}`),
      );
    }

    // Fire the single logical trigger for this state transition.
    await this.automationsService
      .triggerAutomation(tenantId, {
        trigger: nativeOnly ? 'appointment_booked' : 'appointment_confirmed',
        tenantId,
        appointmentId: appointment.id,
        leadId: appointment.leadId ?? undefined,
        callId: appointment.callId ?? undefined,
        data: {
          appointment: buildAppointmentContext(appointment),
          lead: { name: appointment.leadName, phone: appointment.phone, email: appointment.email },
        },
      })
      .catch((err: any) => this.logger.warn(`Automation trigger failed: ${err.message}`));

    this.auditService.log({
      action: nativeOnly ? 'APPOINTMENT_CREATED' : 'APPOINTMENT_BOOKED',
      resource: 'appointment',
      resourceId: appointment.id,
      details: {
        provider: appointment.calendarProvider,
        status,
        date: appointment.date,
        idempotencyKey: appointment.idempotencyKey ?? undefined,
      },
      tenantId,
      userId,
    });

    this.metrics.increment(nativeOnly ? 'appointment.created.completed' : 'appointment.booked.completed');
    return appointment;
  }

  // ── Reschedule ───────────────────────────────────────────────

  async reschedule(tenantId: string, userId: string, id: string, dto: RescheduleAppointmentDto) {
    this.metrics.increment('appointment.rescheduled.attempted');
    const existing = await this.findOneOrThrow(tenantId, id);
    if (existing.status === 'cancelled') {
      throw new BadRequestException('A cancelled appointment cannot be rescheduled.');
    }

    const newStartAt = new Date(dto.startAt);
    if (isNaN(newStartAt.getTime())) {
      throw new BadRequestException('A valid startAt is required to reschedule.');
    }
    if (newStartAt.getTime() < Date.now() - MIN_PAST_TOLERANCE_MS) {
      throw new BadRequestException('Cannot reschedule to a time in the past.');
    }

    const duration = existing.duration || 30;
    const newEndAt = new Date(newStartAt.getTime() + duration * 60000);
    const timezone = dto.timezone || existing.timezone || 'UTC';
    const provider = existing.calendarProvider || 'native';

    let booking: any = undefined;
    if (provider !== 'native') {
      const resolved = await this.providerRegistry.resolve(tenantId, provider);
      await this.assertSlotAvailable(resolved, newStartAt, duration, timezone);

      if (existing.providerAppointmentId) {
        booking = await resolved.adapter.rescheduleBooking(
          resolved.credentials,
          existing.providerAppointmentId,
          newStartAt,
          dto.reason,
        );
      }
    }

    const metadata = (existing.metadata as Record<string, any>) || {};
    const updated: any = await this.prisma.tenantUpdate(this.prisma.appointment, tenantId, id, {
      date: newStartAt,
      startAt: newStartAt,
      endAt: newEndAt,
      timezone,
      status: 'confirmed',
      rescheduledAt: new Date(),
      rescheduleReason: dto.reason,
      calendarProvider: booking?.provider ?? provider,
      ...(booking?.providerAppointmentId ? { providerAppointmentId: booking.providerAppointmentId } : {}),
      ...(booking?.providerBookingUrl ? { providerBookingUrl: booking.providerBookingUrl } : {}),
      metadata: {
        ...metadata,
        previousStartAt: (existing.startAt ?? existing.date)?.toISOString(),
        rescheduleReason: dto.reason,
      },
    } as any);

    // Replace old reminders with fresh ones for the new time.
    await this.reminderQueue.cancelReminders(id).catch(() => undefined);
    if (updated.startAt) {
      await this.reminderQueue.scheduleReminders(updated).catch((err: any) =>
        this.logger.warn(`Reschedule reminder scheduling failed: ${err.message}`),
      );
    }

    await this.automationsService
      .triggerAutomation(tenantId, {
        trigger: 'appointment_rescheduled',
        tenantId,
        appointmentId: id,
        leadId: updated.leadId ?? undefined,
        callId: updated.callId ?? undefined,
        data: { appointment: buildAppointmentContext(updated) },
      })
      .catch((err: any) => this.logger.warn(`Reschedule automation trigger failed: ${err.message}`));

    this.auditService.log({
      action: 'APPOINTMENT_RESCHEDULED',
      resource: 'appointment',
      resourceId: id,
      details: {
        from: (existing.startAt ?? existing.date)?.toISOString(),
        to: newStartAt.toISOString(),
        reason: dto.reason,
      },
      tenantId,
      userId,
    });

    this.metrics.increment('appointment.rescheduled.completed');
    return updated;
  }

  // ── Cancel ───────────────────────────────────────────────────

  async cancel(tenantId: string, userId: string, id: string, dto: CancelAppointmentDto) {
    this.metrics.increment('appointment.cancelled.attempted');
    const existing = await this.findOneOrThrow(tenantId, id);

    // Idempotent cancel — already cancelled returns as-is.
    if (existing.status === 'cancelled') {
      this.metrics.increment('appointment.cancelled.idempotent');
      return { ...existing, alreadyCancelled: true };
    }

    const provider = existing.calendarProvider || 'native';

    if (provider !== 'native') {
      const resolved = await this.providerRegistry.resolve(tenantId, provider);
      if (existing.providerAppointmentId) {
        await resolved.adapter.cancelBooking(
          resolved.credentials,
          existing.providerAppointmentId,
          dto.reason || 'Cancelled by scheduler',
        );
      } else if (!dto.force) {
        this.logger.warn(`Appointment ${id} has no provider booking id to cancel (provider=${provider}).`);
      }
    }

    const updated = await this.prisma.tenantUpdate(this.prisma.appointment, tenantId, id, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: dto.reason,
    } as any);

    await this.reminderQueue.cancelReminders(id).catch(() => undefined);

    await this.automationsService
      .triggerAutomation(tenantId, {
        trigger: 'appointment_cancelled',
        tenantId,
        appointmentId: id,
        leadId: existing.leadId ?? undefined,
        callId: existing.callId ?? undefined,
        data: { appointment: buildAppointmentContext(existing) },
      })
      .catch((err: any) => this.logger.warn(`Cancel automation trigger failed: ${err.message}`));

    this.auditService.log({
      action: 'APPOINTMENT_CANCELLED',
      resource: 'appointment',
      resourceId: id,
      details: { reason: dto.reason, provider },
      tenantId,
      userId,
    });

    this.metrics.increment('appointment.cancelled.completed');
    return updated;
  }

  // ── Reads ────────────────────────────────────────────────────

  async findAll(tenantId: string, query: AppointmentQueryDto) {
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.agentId) where.agentId = query.agentId;
    if (query.leadId) where.leadId = query.leadId;

    if (query.upcoming) {
      where.OR = [
        { startAt: { gte: new Date() } },
        { startAt: null as any, date: { gte: new Date() } },
      ];
    }

    if (query.from || query.to) {
      const dateRange: any = {};
      if (query.from) dateRange.gte = new Date(query.from);
      if (query.to) dateRange.lte = new Date(query.to);
      where.date = dateRange;
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      orderBy: query.upcoming ? { date: 'asc' } : { date: 'desc' },
    });

    return appointments.map((a) => ({ ...a, metadata: a.metadata as Record<string, any> }));
  }

  async findOne(tenantId: string, id: string) {
    const app = await this.findOneOrThrow(tenantId, id);
    return { ...app, metadata: app.metadata as Record<string, any> };
  }

  async overview(tenantId: string, query: { from?: string; to?: string }) {
    const range: any = {};
    if (query.from) range.gte = new Date(query.from);
    if (query.to) range.lte = new Date(query.to);

    const appointments = await this.prisma.appointment.findMany({
      where: { tenantId, ...(Object.keys(range).length ? { date: range } : {}) },
      select: { status: true, duration: true },
    });

    const count = (s: string) => appointments.filter((a) => a.status === s).length;
    const total = appointments.length;
    const cancelledAndNoShow = count('cancelled') + count('no_show');

    return {
      total,
      scheduled: count('scheduled'),
      pending: count('pending'),
      confirmed: count('confirmed'),
      completed: count('completed'),
      cancelled: count('cancelled'),
      noShow: count('no_show'),
      rescheduled: count('rescheduled'),
      failed: count('failed'),
      showUpRatio: total ? (((total - cancelledAndNoShow) / total) * 100).toFixed(1) : '0',
      avgDurationMins: total ? Math.round(appointments.reduce((s, a) => s + a.duration, 0) / total) : 0,
    };
  }

  async reminderStatus(tenantId: string, id: string) {
    const app = await this.findOneOrThrow(tenantId, id);
    const startAt = app.startAt ?? app.date;
    const describe = this.reminderQueue.describeReminders(startAt);

    const markFor = (kind: '24h' | '1h') => {
      const meta = describe.find((d) => d.kind === kind)!;
      return {
        kind,
        offsetMs: meta.offsetMs,
        remindAt: meta.remindAt,
        scheduled: meta.scheduled,
        sentAt: kind === '24h' ? app.reminder24hSentAt ?? null : app.reminder1hSentAt ?? null,
        status: kind === '24h'
          ? app.reminder24hSentAt ? 'sent' : !meta.scheduled ? 'passed' : 'scheduled'
          : app.reminder1hSentAt ? 'sent' : !meta.scheduled ? 'passed' : 'scheduled',
      };
    };

    return {
      appointmentId: id,
      startAt: startAt.toISOString(),
      timezone: app.timezone ?? 'UTC',
      status: app.status,
      reminders: [markFor('24h'), markFor('1h')],
    };
  }

  // ── Internals ────────────────────────────────────────────────

  private async findOneOrThrow(tenantId: string, id: string) {
    const app = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!app) throw new NotFoundException('Appointment not found');
    return app;
  }

  private async assertSlotAvailable(
    resolved: {
      adapter: { getAvailability: (credentials: any, query: any) => Promise<any[]> };
      credentials: any;
    },
    startAt: Date,
    duration: number,
    timezone: string,
  ) {
    const window = 12 * 60 * 60 * 1000;
    let slots: any[];
    try {
      slots = await resolved.adapter.getAvailability(resolved.credentials, {
        startAt: new Date(startAt.getTime() - window),
        endAt: new Date(startAt.getTime() + window),
        timezone,
        durationMinutes: duration,
      });
    } catch (err) {
      const shape = err instanceof CalendarProviderException ? err.toShape() : this.errorFactory.toShape(err);
      if (shape.code === CalendarErrorCode.AUTH_FAILED) {
        throw this.errorFactory.toHttpException(shape);
      }
      // If the provider is reachable but had a transient error, do not guess — surface it.
      throw this.errorFactory.toHttpException(shape);
    }

    const exact = slots.some(
      (s) => s.available && new Date(s.startAt).getTime() === startAt.getTime(),
    );
    if (!exact) {
      throw new CalendarProviderException(
        CalendarErrorCode.SLOT_UNAVAILABLE,
        `Slot ${startAt.toISOString()} is not available on the calendar provider`,
        false,
      );
    }
  }
}