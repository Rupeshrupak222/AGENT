import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  BookingAttendee,
  CalendarBooking,
  CalendarCancelResult,
  CalendarCredentials,
  CalendarSettings,
  CalendarSlot,
  CreateBookingRequest,
  ICalendarProvider,
  ProviderConnectionTestResult,
  SlotAvailabilityQuery,
} from './calendar-provider.interface';
import {
  CalendarErrorCode,
  CalendarProviderException,
} from './calendar-errors';
import {
  BusinessHours,
  DEFAULT_BUSINESS_HOURS,
  enumerateSlots,
  startOfUtcDay,
  toIso,
} from '../lib/calendar-time';

export type MockCalendarMode =
  | 'success'
  | 'timeout'
  | 'rate_limit'
  | 'auth'
  | 'server_error';

interface MockBookingRecord {
  id: string;
  tenantId: string;
  eventTypeId?: number | string;
  startAt: string;
  endAt: string;
  timezone: string;
  attendee: BookingAttendee;
  title?: string;
  location?: string;
  metadata?: Record<string, any>;
  status: string;
  createdAt: string;
}

/**
 * Deterministic in-memory calendar provider used for development and tests.
 * - Availability respects business hours in the queried timezone.
 * - Bookings reserve slots; already-reserved slots drop out of availability.
 * - Failure-injection hooks exist for timeout / rate-limit / 500 and auth tests.
 */
@Injectable()
export class MockCalendarAdapter implements ICalendarProvider {
  readonly providerName = 'mock';

  private readonly logger = new Logger(MockCalendarAdapter.name);

  public mode: MockCalendarMode = 'success';
  public businessHours: BusinessHours[] = DEFAULT_BUSINESS_HOURS;
  private bookings = new Map<string, MockBookingRecord>();
  public autoConfirm = false;

  setMode(mode: MockCalendarMode) {
    this.mode = mode;
  }

  reset() {
    this.mode = 'success';
    this.bookings.clear();
  }

  /** Test hook: seed an existing booking to force a slot conflict. */
  seedBooking(record: MockBookingRecord) {
    this.bookings.set(record.id, record);
  }

  get bookedRecords(): MockBookingRecord[] {
    return Array.from(this.bookings.values());
  }

  private maybeThrow() {
    if (this.mode === 'timeout') {
      throw new CalendarProviderException(
        CalendarErrorCode.TIMEOUT,
        'Mock calendar request timed out',
        true,
        'ETIMEDOUT',
      );
    }
    if (this.mode === 'rate_limit') {
      throw new CalendarProviderException(
        CalendarErrorCode.RATE_LIMITED,
        'Mock calendar rate limit exceeded',
        true,
        'HTTP 429',
      );
    }
    if (this.mode === 'auth') {
      throw new CalendarProviderException(
        CalendarErrorCode.AUTH_FAILED,
        'Mock calendar invalid API key',
        false,
        'HTTP 401',
      );
    }
    if (this.mode === 'server_error') {
      throw new CalendarProviderException(
        CalendarErrorCode.PROVIDER_ERROR,
        'Mock calendar server error',
        false,
        'HTTP 500',
      );
    }
  }

  private isSlotBooked(tenantId: string, startAt: Date, endAt: Date): boolean {
    for (const b of this.bookings.values()) {
      const bs = new Date(b.startAt);
      const be = new Date(b.endAt);
      if (b.status === 'cancelled') continue;
      if (bs < endAt && be > startAt) return true;
    }
    return false;
  }

  async testConnection(
    _credentials: CalendarCredentials,
    _settings?: CalendarSettings,
  ): Promise<ProviderConnectionTestResult> {
    this.maybeThrow();
    return {
      success: true,
      provider: 'mock',
      message: 'Connected to booking calendar (Mock Mode)',
      details: {
        provider: 'mock',
        timezone: _settings?.timezone ?? 'UTC',
        businessHours: this.businessHours,
      },
    };
  }

  async getAvailability(
    _credentials: CalendarCredentials,
    query: SlotAvailabilityQuery,
  ): Promise<CalendarSlot[]> {
    this.maybeThrow();

    const duration = query.durationMinutes ?? 30;
    const from = new Date(query.startAt);
    const to = new Date(Math.max(query.endAt.getTime(), from.getTime() + duration * 60000));

    const candidates = enumerateSlots(query.timezone, from, to, duration, this.businessHours);

    return candidates.map((startAt) => {
      const endAt = new Date(startAt.getTime() + duration * 60000);
      const available = !this.isSlotBooked('__mock__', startAt, endAt);
      return {
        provider: 'mock',
        startAt,
        endAt,
        timezone: query.timezone,
        available,
      };
    });
  }

  private normalizeAttendee(attendee: BookingAttendee): BookingAttendee {
    return {
      name: attendee.name?.trim() || 'Guest',
      phone: attendee.phone?.trim() || '',
      email: attendee.email?.trim() || undefined,
      timezone: attendee.timezone || 'UTC',
    };
  }

  async createBooking(
    _credentials: CalendarCredentials,
    request: CreateBookingRequest,
  ): Promise<CalendarBooking> {
    this.maybeThrow();

    const startAt = new Date(request.startAt);
    const endAt = request.endAt
      ? new Date(request.endAt)
      : new Date(startAt.getTime() + (request.durationMinutes ?? 30) * 60000);

    if (this.isSlotBooked('__mock__', startAt, endAt)) {
      throw new CalendarProviderException(
        CalendarErrorCode.SLOT_CONFLICT,
        'Slot unavailable: overlaps an existing booking',
        false,
      );
    }

    const attendee = this.normalizeAttendee(request.attendee);
    const record: MockBookingRecord = {
      id: `mock_${uuidv4()}`,
      tenantId: '__mock__',
      eventTypeId: request.eventTypeId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      timezone: attendee.timezone,
      attendee,
      title: request.title,
      location: request.location,
      metadata: request.metadata,
      status: this.autoConfirm ? 'ACCEPTED' : 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.bookings.set(record.id, record);

    this.logger.log(`[MockCalendar] Booking created ${record.id} @ ${record.startAt}`);

    return {
      provider: 'mock',
      providerAppointmentId: record.id,
      providerEventId: record.id,
      providerBookingUrl: `https://mock.calendar/booking/${record.id}`,
      status: record.status,
      startAt: record.startAt,
      endAt: record.endAt,
      timezone: record.timezone,
      location: record.location,
      title: record.title,
      raw: { ...record },
    };
  }

  async getBooking(
    _credentials: CalendarCredentials,
    providerAppointmentId: string,
  ): Promise<CalendarBooking> {
    this.maybeThrow();
    const record = this.bookings.get(providerAppointmentId);
    if (!record) {
      throw new CalendarProviderException(
        CalendarErrorCode.NOT_FOUND,
        'Mock booking not found',
        false,
      );
    }
    return {
      provider: 'mock',
      providerAppointmentId: record.id,
      providerEventId: record.id,
      providerBookingUrl: `https://mock.calendar/booking/${record.id}`,
      status: record.status,
      startAt: record.startAt,
      endAt: record.endAt,
      timezone: record.timezone,
      location: record.location,
      title: record.title,
      raw: { ...record },
    };
  }

  async cancelBooking(
    _credentials: CalendarCredentials,
    providerAppointmentId: string,
    reason?: string,
  ): Promise<CalendarCancelResult> {
    this.maybeThrow();
    const record = this.bookings.get(providerAppointmentId);
    if (!record) {
      throw new CalendarProviderException(
        CalendarErrorCode.NOT_FOUND,
        'Mock booking not found',
        false,
      );
    }
    record.status = 'cancelled';
    record.metadata = { ...(record.metadata ?? {}), cancellationReason: reason };
    this.logger.log(`[MockCalendar] Booking cancelled ${providerAppointmentId}`);
    return {
      success: true,
      provider: 'mock',
      providerAppointmentId,
      cancelledAt: new Date().toISOString(),
    };
  }

  async rescheduleBooking(
    _credentials: CalendarCredentials,
    providerAppointmentId: string,
    newStartAt: Date,
    reason?: string,
  ): Promise<CalendarBooking> {
    this.maybeThrow();
    const record = this.bookings.get(providerAppointmentId);
    if (!record) {
      throw new CalendarProviderException(
        CalendarErrorCode.NOT_FOUND,
        'Mock booking not found',
        false,
      );
    }
    const prevStart = new Date(record.startAt);
    const duration = new Date(record.endAt).getTime() - prevStart.getTime();
    const endAt = new Date(newStartAt.getTime() + duration);

    if (this.isSlotBooked('__mock__', newStartAt, endAt)) {
      throw new CalendarProviderException(
        CalendarErrorCode.SLOT_CONFLICT,
        'Slot unavailable for reschedule',
        false,
      );
    }

    record.startAt = newStartAt.toISOString();
    record.endAt = endAt.toISOString();
    record.metadata = {
      ...(record.metadata ?? {}),
      previousStartAt: prevStart.toISOString(),
      rescheduleReason: reason,
    };
    record.status = 'ACCEPTED';

    return {
      provider: 'mock',
      providerAppointmentId: record.id,
      providerEventId: record.id,
      providerBookingUrl: `https://mock.calendar/booking/${record.id}`,
      status: record.status,
      startAt: record.startAt,
      endAt: record.endAt,
      timezone: record.timezone,
      location: record.location,
      title: record.title,
      raw: { ...record },
    };
  }
}

export { uuidv4 };

// Re-exported for convenience when consumers need day-window slicing
export { startOfUtcDay, toIso };
