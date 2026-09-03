export type NormalizedCallStatus =
  | 'queued'
  | 'initiated'
  | 'ringing'
  | 'in_progress'
  | 'completed'
  | 'missed'
  | 'failed'
  | 'busy'
  | 'no_answer'
  | 'cancelled'
  | 'transferred';

export type CallLifecycleEventType =
  | 'call.created'
  | 'call.queued'
  | 'call.initiated'
  | 'call.ringing'
  | 'call.answered'
  | 'call.in_progress'
  | 'call.completed'
  | 'call.failed'
  | 'call.no_answer'
  | 'call.busy'
  | 'call.cancelled'
  | 'call.transferred';

export interface NormalizedCallEvent {
  eventId: string;
  provider: string;
  providerCallId: string;
  callId?: string;
  tenantId?: string;
  eventType: CallLifecycleEventType;
  status: NormalizedCallStatus;
  fromNumber: string;
  toNumber: string;
  duration?: number;
  recordingUrl?: string;
  timestamp: number;
  rawPayload: Record<string, unknown>;
}
