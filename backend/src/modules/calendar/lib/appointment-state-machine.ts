/**
 * Explicit State Machine for Appointment Lifecycle.
 *
 * Valid states:
 * - pending: Initial booking attempt / provisional reservation
 * - scheduled: Successfully scheduled (native)
 * - confirmed: Confirmed with provider / attendee
 * - rescheduled: Time changed, previous appointment replaced
 * - completed: Successfully attended
 * - cancelled: Cancelled by user/lead/operator (terminal)
 * - no_show: Attendee failed to show (terminal)
 * - failed: Provider booking or local write failed (terminal)
 */

export type AppointmentStatus =
  | 'pending'
  | 'scheduled'
  | 'confirmed'
  | 'rescheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'failed';

export const VALID_APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  pending: ['scheduled', 'confirmed', 'failed', 'cancelled'],
  scheduled: ['confirmed', 'rescheduled', 'cancelled', 'failed'],
  confirmed: ['rescheduled', 'cancelled', 'completed', 'no_show'],
  rescheduled: ['confirmed', 'cancelled', 'completed', 'no_show'],
  completed: [], // terminal
  cancelled: [], // terminal
  no_show: [], // terminal
  failed: [], // terminal
};

export const TERMINAL_APPOINTMENT_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  'completed',
  'cancelled',
  'no_show',
  'failed',
]);

/**
 * Validates whether an appointment can transition from `currentStatus` to `nextStatus`.
 * Idempotent self-transitions (e.g. cancelled -> cancelled) are permitted.
 */
export function canTransitionAppointment(currentStatus: string, nextStatus: string): boolean {
  if (currentStatus === nextStatus) {
    return true; // idempotent
  }

  const validNext = VALID_APPOINTMENT_TRANSITIONS[currentStatus as AppointmentStatus];
  if (!validNext) {
    return false;
  }

  return validNext.includes(nextStatus as AppointmentStatus);
}

/**
 * Checks if a status is a terminal state that cannot be rescheduled or modified.
 */
export function isTerminalAppointmentStatus(status: string): boolean {
  return TERMINAL_APPOINTMENT_STATUSES.has(status as AppointmentStatus);
}
