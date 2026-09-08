import { Injectable, Logger } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CalendarErrorFactory } from '../providers/calendar-errors';
import { ScheduleSourceEnum } from '../dto/appointment-schedule.dto';

export interface CalendarAvailabilityIntent {
  from: string;               // ISO UTC
  to: string;                 // ISO UTC
  timezone?: string;
  durationMinutes?: number;
  provider?: 'auto' | 'native' | 'calcom' | 'mock';
}

export interface BookAppointmentIntent {
  leadName: string;
  phone: string;
  email?: string;
  startAt: string;            // ISO UTC
  timezone?: string;
  durationMinutes?: number;
  topic?: string;
  leadId?: string;
  idempotencyKey?: string;
}

export interface RescheduleIntent {
  appointmentId?: string;
  phone?: string;
  startAt: string;            // ISO UTC
  timezone?: string;
  reason?: string;
}

export interface CancelIntent {
  appointmentId?: string;
  phone?: string;
  reason?: string;
}

/**
 * Provider-neutral scheduling tools the AI brain / WhatsApp router can call.
 * Every tool returns a structured, LLM-friendly result and NEVER surfaces
 * provider secrets or raw exception payloads.
 */
@Injectable()
export class AppointmentAgentTools {
  private readonly logger = new Logger(AppointmentAgentTools.name);

  constructor(
    private readonly appointments: AppointmentService,
    private readonly prisma: PrismaService,
    private readonly errorFactory: CalendarErrorFactory,
  ) {}

  /** Tool 1 — checkCalendarAvailability */
  async checkCalendarAvailability(tenantId: string, intent: CalendarAvailabilityIntent) {
    try {
      const res = await this.appointments.getAvailability(tenantId, {
        from: intent.from,
        to: intent.to,
        timezone: intent.timezone ?? 'UTC',
        duration: intent.durationMinutes ?? 30,
        provider: (intent.provider ?? 'auto') as any,
      });
      return {
        success: true,
        provider: res.provider,
        timezone: res.timezone,
        slots: res.slots.map((s: any) => ({
          startAt: new Date(s.startAt).toISOString(),
          endAt: new Date(s.endAt).toISOString(),
        })),
        count: res.slots.length,
      };
    } catch (err) {
      const shape = this.errorFactory.toShape(err);
      return {
        success: false,
        errorCode: shape.code,
        message: 'Could not check availability.',
        reason: shape.code,
      };
    }
  }

  /** Tool 2 — bookAppointment */
  async bookAppointment(tenantId: string, intent: BookAppointmentIntent) {
    try {
      if (!intent.leadName || !intent.phone || !intent.startAt) {
        return { success: false, reason: 'MISSING_REQUIRED_FIELDS', message: 'leadName, phone and startAt are required.' };
      }
      const appointment = await this.appointments.create(tenantId, 'ai-tool', {
        leadName: intent.leadName,
        phone: intent.phone,
        email: intent.email,
        startAt: intent.startAt,
        timezone: intent.timezone ?? 'UTC',
        duration: intent.durationMinutes ?? 30,
        topic: intent.topic,
        leadId: intent.leadId,
        idempotencyKey: intent.idempotencyKey,
        source: ScheduleSourceEnum.AI,
      });
      return {
        success: true,
        appointmentId: appointment.id,
        status: appointment.status,
        startAt: (appointment.startAt ?? appointment.date)?.toISOString(),
        durationMinutes: appointment.duration,
        timezone: appointment.timezone,
        bookingUrl: appointment.providerBookingUrl ?? null,
        confirmationSent: appointment.status === 'confirmed',
      };
    } catch (err: any) {
      const shape = this.errorFactory.toShape(err);
      this.logger.warn(`bookAppointment failed: ${shape.code}`);
      return {
        success: false,
        reason: shape.code,
        message: 'The booking could not be confirmed.',
        isRetryable: shape.isRetryable,
      };
    }
  }

  /** Tool 3 — rescheduleAppointment */
  async rescheduleAppointment(tenantId: string, intent: RescheduleIntent) {
    try {
      const id = await this.resolveAppointmentId(tenantId, intent.appointmentId, intent.phone);
      if (!id) return { success: false, reason: 'APPOINTMENT_NOT_FOUND', message: 'No matching appointment found.' };

      const updated: any = await this.appointments.reschedule(tenantId, 'ai-tool', id, {
        startAt: intent.startAt,
        timezone: intent.timezone,
        reason: intent.reason,
      });
      return {
        success: true,
        appointmentId: id,
        status: updated.status,
        newStartAt: updated.startAt?.toISOString() ?? updated.date.toISOString(),
        timezone: updated.timezone,
      };
    } catch (err: any) {
      const shape = this.errorFactory.toShape(err);
      this.logger.warn(`rescheduleAppointment failed: ${shape.code}`);
      return {
        success: false,
        reason: shape.code,
        message: 'Rescheduling was not confirmed.',
        isRetryable: shape.isRetryable,
      };
    }
  }

  /** Tool 4 — cancelAppointment */
  async cancelAppointment(tenantId: string, intent: CancelIntent) {
    try {
      const id = await this.resolveAppointmentId(tenantId, intent.appointmentId, intent.phone);
      if (!id) return { success: false, reason: 'APPOINTMENT_NOT_FOUND', message: 'No matching appointment found.' };

      const cancelled: any = await this.appointments.cancel(tenantId, 'ai-tool', id, {
        reason: intent.reason,
      });
      return { success: true, appointmentId: id, status: cancelled.status ?? 'cancelled' };
    } catch (err: any) {
      const shape = this.errorFactory.toShape(err);
      this.logger.warn(`cancelAppointment failed: ${shape.code}`);
      return {
        success: false,
        reason: shape.code,
        message: 'Cancellation was not confirmed.',
        isRetryable: shape.isRetryable,
      };
    }
  }

  /** Tool 5 — lookupAppointment */
  async lookupAppointment(tenantId: string, phone: string) {
    if (!this.prisma.isConnected) return { success: false, reason: 'DB_OFFLINE', message: 'Lookup is unavailable right now.' };
    try {
      const upcoming = await this.prisma.appointment.findFirst({
        where: {
          tenantId,
          phone,
          status: { not: 'cancelled' },
          OR: [{ startAt: { gte: new Date() } }, { startAt: null, date: { gte: new Date() } }],
        },
        orderBy: { date: 'asc' },
      });
      if (!upcoming) {
        return { success: false, reason: 'APPOINTMENT_NOT_FOUND', message: 'No upcoming appointment found for this number.' };
      }
      return {
        success: true,
        appointmentId: upcoming.id,
        status: upcoming.status,
        startAt: (upcoming.startAt ?? upcoming.date).toISOString(),
        timezone: upcoming.timezone ?? 'UTC',
        topic: upcoming.topic ?? null,
        leadName: upcoming.leadName,
        bookingUrl: upcoming.providerBookingUrl ?? null,
      };
    } catch (err: any) {
      const shape = this.errorFactory.toShape(err);
      return { success: false, reason: shape.code, message: 'Lookup failed.' };
    }
  }

  private async resolveAppointmentId(tenantId: string, appointmentId?: string, phone?: string): Promise<string | null> {
    if (appointmentId) {
      const byId = await this.prisma.appointment.findFirst({ where: { id: appointmentId, tenantId }, select: { id: true } });
      if (byId) return byId.id;
      return null;
    }
    if (!phone) return null;
    const byPhone = await this.prisma.appointment.findFirst({
      where: { tenantId, phone, status: { not: 'cancelled' } },
      orderBy: { date: 'asc' },
      select: { id: true },
    });
    return byPhone?.id ?? null;
  }
}