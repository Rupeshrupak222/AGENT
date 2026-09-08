import { formatLocal, utcToZonedTime } from './calendar-time';

/**
 * Builds a template-friendly appointment context for the automation engine.
 * Values are formatted in the appointment's own timezone so WhatsApp/Email
 * templates can display local date/time without timezone math.
 */
export function buildAppointmentContext(
  appointment: {
    id: string;
    leadName: string;
    phone: string;
    email?: string | null;
    topic?: string | null;
    date: Date;
    startAt?: Date | null;
    endAt?: Date | null;
    duration: number;
    status: string;
    timezone?: string | null;
    location?: string | null;
    providerBookingUrl?: string | null;
  },
  lead?: { name?: string; phone?: string; email?: string | null } | null,
): Record<string, any> {
  const timezone = appointment.timezone || 'UTC';
  const startAt = appointment.startAt ?? new Date(appointment.date);
  const endAt = appointment.endAt ?? new Date(startAt.getTime() + appointment.duration * 60000);

  const localDate = utcToZonedTime(timezone, startAt);
  const localStart = utcToZonedTime(timezone, startAt);
  const localEnd = utcToZonedTime(timezone, endAt);

  const two = (n: number) => n.toString().padStart(2, '0');
  const dayKey = `${localDate.getFullYear()}-${two(localDate.getMonth() + 1)}-${two(localDate.getDate())}`;
  const isoLocal = `${dayKey}T${two(localStart.getHours())}:${two(localStart.getMinutes())}`;

  return {
    id: appointment.id,
    leadName: appointment.leadName,
    leadPhone: appointment.phone,
    leadEmail: appointment.email ?? lead?.email ?? null,
    topic: appointment.topic ?? null,
    service: appointment.topic ?? null,
    date: formatLocal(timezone, startAt, false),
    dateShort: localDate.toLocaleDateString('en-GB'),
    time: localStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    startTime: localStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    endTime: localEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    startLocal: isoLocal,
    dateIso: startAt.toISOString(),
    durationMinutes: appointment.duration,
    timezone,
    status: appointment.status,
    location: appointment.location ?? null,
    bookingUrl: appointment.providerBookingUrl ?? null,
    providerBookingUrl: appointment.providerBookingUrl ?? null,
  };
}