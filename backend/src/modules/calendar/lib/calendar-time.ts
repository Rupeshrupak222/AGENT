/**
 * Lightweight timezone helpers built on the Intl API.
 * Avoids a hard dependency on luxon/date-fns-tz while staying accurate
 * for day-to-day scheduling (business hours, slot math) on Node 18+.
 */

export function timezoneOffsetMs(timeZone: string, date: Date = new Date()): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  });
  const parts = dtf.formatToParts(date);
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const match = tzName.match(/^(?:GMT|UTC)?([+-])(\d{2}):?(\d{2})?$/);
  if (!match) return new Date(date.toLocaleString('en-US', { timeZone })).getTime() - date.getTime();
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  return sign * (hours * 60 + minutes) * 60 * 1000;
}

/** Convert a local wall-clock time (at an instant) in a zone back to UTC. */
export function zonedTimeToUtc(timeZone: string, local: Date): Date {
  const offset = timezoneOffsetMs(timeZone, local);
  return new Date(local.getTime() - offset);
}

/** Convert a UTC instant to the local wall-clock time of the zone. */
export function utcToZonedTime(timeZone: string, utc: Date): Date {
  const offset = timezoneOffsetMs(timeZone, utc);
  return new Date(utc.getTime() + offset);
}

export function toIso(utc: Date): string {
  return utc.toISOString();
}

export function startOfUtcDay(utc: Date): Date {
  const d = new Date(utc);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function isWeekendDay(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export interface BusinessHours {
  /** JS getDay() value 0 (Sunday) - 6 (Saturday) */
  day: number;
  start: string; // "HH:MM" local 24h
  end: string;   // "HH:MM" local 24h
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours[] = [
  { day: 1, start: '09:00', end: '17:00' },
  { day: 2, start: '09:00', end: '17:00' },
  { day: 3, start: '09:00', end: '17:00' },
  { day: 4, start: '09:00', end: '17:00' },
  { day: 5, start: '09:00', end: '17:00' },
];

function hoursToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((s) => parseInt(s, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Enumerates candidate slot start times (UTC) for a zone across a day range,
 * constrained to configured business hours and a step duration.
 */
export function enumerateSlots(
  timeZone: string,
  dateFrom: Date,
  dateTo: Date,
  durationMinutes: number,
  businessHours: BusinessHours[],
): Date[] {
  const slots: Date[] = [];
  const cursor = new Date(dateFrom);
  cursor.setUTCMinutes(0, 0, 0);

  let guard = 0;
  while (cursor < dateTo && guard < 24 * 12 * 31) {
    guard++;
    const local = utcToZonedTime(timeZone, cursor);
    const day = local.getDay();
    const todayHours = businessHours.find((bh) => bh.day === day);
    if (todayHours) {
      const localMin = local.getHours() * 60 + local.getMinutes();
      const startMin = hoursToMinutes(todayHours.start);
      const endMin = hoursToMinutes(todayHours.end);
      if (localMin >= startMin && localMin + durationMinutes <= endMin) {
        slots.push(new Date(cursor));
      }
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + durationMinutes);
  }
  return slots;
}

export function formatLocal(timeZone: string, utc: Date, includeTime = true): string {
  const local = utcToZonedTime(timeZone, utc);
  const date = local.toLocaleDateString('en-GB');
  if (!includeTime) return date;
  const time = local.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}