export type AudioSessionState =
  | 'initializing'
  | 'active'
  | 'paused'
  | 'closed'
  | 'error';

export interface IAudioSession {
  sessionId: string;
  callId: string;
  tenantId: string;
  agentId?: string;
  leadId?: string;
  provider: string;
  direction: 'inbound' | 'outbound';
  streamSid?: string;
  state: AudioSessionState;
  startedAt: number;
  lastActivityAt: number;
  endedAt?: number;
  metadata?: Record<string, unknown>;
  metrics: {
    inboundFramesCount: number;
    outboundFramesCount: number;
    inboundBytes: number;
    outboundBytes: number;
    droppedFrames: number;
  };
}
