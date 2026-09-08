/**
 * Provider-Agnostic Calendar/Scheduling Interfaces (Day 17)
 * Adyapan AI / AgentCall AI Production Platform
 */

export interface CalendarCredentials {
  apiKey?: string;
  apiUrl?: string;
  eventTypeId?: number | string;
  username?: string;
  [key: string]: any;
}

export interface CalendarSettings {
  timezone?: string;
  defaultDuration?: number;
  minBookingNoticeHours?: number;
  [key: string]: any;
}

export interface SlotAvailabilityQuery {
  startAt: Date;
  endAt: Date;
  timezone: string;
  durationMinutes?: number;
  eventTypeId?: number | string;
}

export interface CalendarSlot {
  provider: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  available: boolean;
  providerSlotId?: string;
}

export interface BookingAttendee {
  name: string;
  phone: string;
  email?: string;
  timezone: string;
}

export interface CreateBookingRequest {
  eventTypeId?: number | string;
  startAt: Date;
  endAt?: Date;
  durationMinutes?: number;
  attendee: BookingAttendee;
  title?: string;
  description?: string;
  location?: string;
  metadata?: Record<string, any>;
  responses?: Record<string, any>;
}

export interface CalendarBooking {
  provider: string;
  providerAppointmentId?: string;
  providerEventId?: string;
  providerBookingUrl?: string;
  status: string;
  startAt: string;
  endAt: string;
  timezone: string;
  location?: string;
  title?: string;
  raw?: Record<string, any>;
}

export interface CalendarCancelResult {
  success: boolean;
  provider: string;
  providerAppointmentId?: string;
  cancelledAt: string;
}

export interface ProviderConnectionTestResult {
  success: boolean;
  provider: string;
  message: string;
  details?: Record<string, any>;
}

export interface ICalendarProvider {
  readonly providerName: string;

  testConnection(credentials: CalendarCredentials, settings?: CalendarSettings): Promise<ProviderConnectionTestResult>;

  getAvailability(credentials: CalendarCredentials, query: SlotAvailabilityQuery): Promise<CalendarSlot[]>;

  createBooking(credentials: CalendarCredentials, request: CreateBookingRequest): Promise<CalendarBooking>;

  getBooking(
    credentials: CalendarCredentials,
    providerAppointmentId: string,
  ): Promise<CalendarBooking>;

  cancelBooking(
    credentials: CalendarCredentials,
    providerAppointmentId: string,
    reason?: string,
  ): Promise<CalendarCancelResult>;

  rescheduleBooking(
    credentials: CalendarCredentials,
    providerAppointmentId: string,
    newStartAt: Date,
    reason?: string,
  ): Promise<CalendarBooking>;
}