export type AudioEncoding =
  | 'audio/x-mulaw'
  | 'audio/x-alaw'
  | 'audio/pcm'
  | 'audio/wav'
  | 'audio/ogg';

export interface AudioFrame {
  sessionId: string;
  sequenceNumber: number;
  timestamp: number;
  payload: Buffer;
  encoding: AudioEncoding;
  sampleRate: number; // e.g. 8000 for standard telephony, 16000 for standard AI STT
  channels: number;   // 1 for mono
}
