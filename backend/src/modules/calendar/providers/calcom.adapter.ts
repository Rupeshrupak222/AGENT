import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
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
import { validateExternalUrl } from '../../../common/utils/url-validator';

const CALCOM_ALLOWED_HOSTS = [/\.cal\.com$/, /^cal\.com$/];

interface CalComApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data: T;
}

interface CalComSlotEntry {
  time: string;
  attendees?: number;
  bookingUid: string | null;
}

interface CalComBooking {
  id: number;
  uid: string;
  userId?: number;
  eventTypeId?: number;
  title?: string;
  description?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  cancelUrl?: string;
  rescheduleUrl?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

const CALCOM_DEFAULT_API_URL = 'https://api.cal.com/v1';
const MAX_RETRIES = 2;

/**
 * Cal.com Booking API v1 adapter.
 * - Live availability via the slots endpoint (event types are filtered by the
 *   provider account; only available slots are returned).
 * - Redirect/round-trip-free booking via the bookings endpoint.
 * - Retries idempotent calls (availability/cancel/get) with exponential backoff.
 * - createBooking is NEVER retried, to avoid double bookings.
 */
@Injectable()
export class CalComCalendarAdapter implements ICalendarProvider {
  readonly providerName = 'calcom';

  private readonly logger = new Logger(CalComCalendarAdapter.name);

  private buildClient(credentials: CalendarCredentials): AxiosInstance {
    const rawUrl = (credentials.apiUrl || process.env.CALCOM_API_URL || CALCOM_DEFAULT_API_URL).replace(/\/+$/, '');
    const validation = validateExternalUrl(rawUrl, CALCOM_ALLOWED_HOSTS);
    if (!validation.isValid) {
      throw new CalendarProviderException(
        CalendarErrorCode.AUTH_FAILED,
        `Cal.com API URL rejected: ${validation.reason}`,
        false,
        `URL: ${rawUrl}, Reason: ${validation.reason}`,
      );
    }
    const client = axios.create({
      baseURL: rawUrl,
      timeout: 10000,
      params: { apiKey: credentials.apiKey },
      headers: { 'Content-Type': 'application/json' },
    });
    return client;
  }

  private toError(error: any): CalendarProviderException {
    if (error instanceof CalendarProviderException) {
      return error;
    }
    const status = error?.response?.status as number | undefined;
    const message =
      error?.response?.data?.message ??
      error?.message ??
      'Unknown Cal.com error';

    if (status === 401 || status === 403) {
      return new CalendarProviderException(
        CalendarErrorCode.AUTH_FAILED,
        'Cal.com API key rejected',
        false,
        String(message),
      );
    }
    if (status === 429) {
      return new CalendarProviderException(
        CalendarErrorCode.RATE_LIMITED,
        'Cal.com rate limit exceeded',
        true,
        String(message),
      );
    }
    if (status === 409) {
      return new CalendarProviderException(
        CalendarErrorCode.SLOT_CONFLICT,
        'Cal.com reported a conflict for this slot',
        false,
        String(message),
      );
    }
    if (status === 404) {
      return new CalendarProviderException(
        CalendarErrorCode.NOT_FOUND,
        'Cal.com resource not found',
        false,
        String(message),
      );
    }
    if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
      return new CalendarProviderException(
        CalendarErrorCode.TIMEOUT,
        'Cal.com request timed out',
        true,
        String(message),
      );
    }
    return new CalendarProviderException(
      CalendarErrorCode.PROVIDER_ERROR,
      'Cal.com provider error',
      status !== undefined && status >= 500,
      String(message),
    );
  }

  /** Exponential backoff retry for idempotent requests. */
  private async withRetry<T>(
    fn: () => Promise<T>,
    label: string,
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        const shape = this.toError(err);
        const retryable = shape.isRetryable || shape.code === CalendarErrorCode.TIMEOUT;
        if (!retryable || attempt > MAX_RETRIES) throw shape;
        const delayMs = 250 * Math.pow(2, attempt - 1);
        this.logger.warn(`[CalCom] ${label} failed (attempt ${attempt}), retrying in ${delayMs}ms`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  private extractEventTypeId(
    credentials: CalendarCredentials,
    request: CreateBookingRequest,
  ): number {
    const raw = request.eventTypeId ?? credentials.eventTypeId;
    if (raw === undefined || raw === null || raw === '') {
      throw new CalendarProviderException(
        CalendarErrorCode.VALIDATION,
        'Cal.com eventTypeId is required to book',
        false,
      );
    }
    const id = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    if (Number.isNaN(id)) {
      throw new CalendarProviderException(
        CalendarErrorCode.VALIDATION,
        'Cal.com eventTypeId must be numeric',
        false,
      );
    }
    return id;
  }

  async testConnection(
    credentials: CalendarCredentials,
    settings?: CalendarSettings,
  ): Promise<ProviderConnectionTestResult> {
    try {
      const res = await this.withRetry(
        () =>
          this.buildClient(credentials)
            .get<CalComApiResponse<CalComBooking[]>>('/event-types')
            .then((r) => r.data),
        'testConnection',
      );
      const eventTypes = Array.isArray(res.data) ? res.data : [];
      const desired = settings?.eventTypeId ?? credentials.eventTypeId;
      const configured = desired
        ? eventTypes.find((et: any) => String(et.id) === String(desired))
        : undefined;
      const timezone = settings?.timezone ?? 'UTC';

      return {
        success: true,
        provider: 'calcom',
        message: configured
          ? `Connected to Cal.com — event type "${configured.title}" (id ${configured.id})`
          : 'Connected to Cal.com',
        details: {
          eventTypes: eventTypes.length,
          configuredEventType: configured ? { id: configured.id, title: configured.title, length: configured.length } : undefined,
          timezone,
        },
      };
    } catch (err) {
      const shape = err instanceof CalendarProviderException ? err.toShape() : this.toError(err).toShape();
      return {
        success: false,
        provider: 'calcom',
        message: `Cal.com connection failed: ${shape.code}`,
        details: { errorCode: shape.code },
      };
    }
  }

  async getAvailability(
    credentials: CalendarCredentials,
    query: SlotAvailabilityQuery,
  ): Promise<CalendarSlot[]> {
    const eventTypeId = query.eventTypeId ?? credentials.eventTypeId;
    if (eventTypeId === undefined || eventTypeId === null || eventTypeId === '') {
      throw new CalendarProviderException(
        CalendarErrorCode.VALIDATION,
        'Cal.com eventTypeId is required for availability',
        false,
      );
    }

    const params: Record<string, string> = {
      eventTypeId: String(eventTypeId),
      startTime: query.startAt.toISOString(),
      endTime: query.endAt.toISOString(),
      timeZone: query.timezone,
    };

    const res = await this.withRetry(
      () =>
        this.buildClient(credentials)
          .get<CalComApiResponse<{ slots: Record<string, CalComSlotEntry[]> }>>('/slots', { params })
          .then((r) => r.data),
      'getAvailability',
    );

    if (res.status !== 'success' || !res.data?.slots) {
      throw new CalendarProviderException(
        CalendarErrorCode.PROVIDER_ERROR,
        'Cal.com returned an unexpected slots payload',
        false,
      );
    }

    const duration = query.durationMinutes ?? 30;
    const slots: CalendarSlot[] = [];
    for (const dayKey of Object.keys(res.data.slots)) {
      const daySlots = res.data.slots[dayKey] ?? [];
      for (const entry of daySlots) {
        const startAt = new Date(entry.time);
        slots.push({
          provider: 'calcom',
          startAt,
          endAt: new Date(startAt.getTime() + duration * 60000),
          timezone: query.timezone,
          available: true,
          providerSlotId: entry.bookingUid ?? `${eventTypeId}@${entry.time}`,
        });
      }
    }
    slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    return slots;
  }

  async createBooking(
    credentials: CalendarCredentials,
    request: CreateBookingRequest,
  ): Promise<CalendarBooking> {
    const eventTypeId = this.extractEventTypeId(credentials, request);

    if (!request.attendee.email) {
      throw new CalendarProviderException(
        CalendarErrorCode.VALIDATION,
        'Cal.com requires an attendee email to book',
        false,
      );
    }

    const body: Record<string, any> = {
      eventTypeId,
      start: request.startAt.toISOString(),
      attendee: {
        email: request.attendee.email,
        name: request.attendee.name,
        timeZone: request.attendee.timezone,
      },
      timeZone: request.attendee.timezone,
      metadata: request.metadata ?? {},
    };
    if (request.location) body.location = request.location;
    if (request.title) body.title = request.title;
    if (request.description) body.description = request.description;
    if (request.responses) body.responses = request.responses;

    // Singleton attempt — never retried (avoids duplicate bookings).
    let res: CalComApiResponse<CalComBooking>;
    try {
      res = await this.buildClient(credentials)
        .post<CalComApiResponse<CalComBooking>>('/bookings', body)
        .then((r) => r.data);
    } catch (err) {
      throw this.toError(err);
    }

    const booking = res.data;
    if (res.status !== 'success' || !booking?.id) {
      throw new CalendarProviderException(
        CalendarErrorCode.BOOKING_FAILED,
        'Cal.com booking was not created',
        false,
        res.message,
      );
    }

    this.logger.log(`[CalCom] Booking created #${booking.id} (${booking.uid})`);

    return {
      provider: 'calcom',
      providerAppointmentId: String(booking.id),
      providerEventId: booking.uid,
      providerBookingUrl: booking.cancelUrl ?? booking.rescheduleUrl,
      status: booking.status ?? 'ACCEPTED',
      startAt: booking.startTime ?? request.startAt.toISOString(),
      endAt: booking.endTime ?? new Date(request.startAt.getTime() + (request.durationMinutes ?? 30) * 60000).toISOString(),
      timezone: request.attendee.timezone,
      location: booking.location,
      title: booking.title,
      raw: { ...booking },
    };
  }

  async getBooking(
    credentials: CalendarCredentials,
    providerAppointmentId: string,
  ): Promise<CalendarBooking> {
    const res = await this.withRetry(
      () =>
        this.buildClient(credentials)
          .get<CalComApiResponse<CalComBooking>>(`/bookings/${providerAppointmentId}`)
          .then((r) => r.data),
      'getBooking',
    );

    const booking = res.data;
    return {
      provider: 'calcom',
      providerAppointmentId: String(booking.id),
      providerEventId: booking.uid,
      providerBookingUrl: booking.cancelUrl ?? booking.rescheduleUrl,
      status: booking.status ?? 'ACCEPTED',
      startAt: booking.startTime ?? '',
      endAt: booking.endTime ?? '',
      timezone: '',
      location: booking.location,
      title: booking.title,
      raw: { ...booking },
    };
  }

  async cancelBooking(
    credentials: CalendarCredentials,
    providerAppointmentId: string,
    reason?: string,
  ): Promise<CalendarCancelResult> {
    await this.withRetry(
      () =>
        this.buildClient(credentials)
          .delete<CalComApiResponse<CalComBooking>>(`/bookings/${providerAppointmentId}`, {
            params: { allRemainingBookings: 'false', cancellationReason: reason ?? '' },
          })
          .then((r) => r.data),
      'cancelBooking',
    );

    return {
      success: true,
      provider: 'calcom',
      providerAppointmentId,
      cancelledAt: new Date().toISOString(),
    };
  }

  async rescheduleBooking(
    credentials: CalendarCredentials,
    providerAppointmentId: string,
    newStartAt: Date,
    reason?: string,
  ): Promise<CalendarBooking> {
    let res: CalComApiResponse<CalComBooking>;
    try {
      res = await this.buildClient(credentials)
        .post<CalComApiResponse<CalComBooking>>(`/bookings/${providerAppointmentId}/reschedule`, {
          start: newStartAt.toISOString(),
          rescheduleReason: reason ?? '',
        })
        .then((r) => r.data);
    } catch (err) {
      throw this.toError(err);
    }

    const booking = res.data;
    return {
      provider: 'calcom',
      providerAppointmentId: String(booking.id ?? providerAppointmentId),
      providerEventId: booking.uid ?? booking.bookingUid,
      providerBookingUrl: booking.cancelUrl ?? booking.rescheduleUrl,
      status: booking.status ?? 'ACCEPTED',
      startAt: booking.startTime ?? newStartAt.toISOString(),
      endAt: booking.endTime ?? '',
      timezone: '',
      location: booking.location,
      title: booking.title,
      raw: { ...booking },
    };
  }
}