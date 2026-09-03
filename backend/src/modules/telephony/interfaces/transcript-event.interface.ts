export interface TranscriptEvent {
  sessionId: string;
  callId: string;
  speaker: 'agent' | 'user' | 'system';
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
  sequenceNumber: number;
}
