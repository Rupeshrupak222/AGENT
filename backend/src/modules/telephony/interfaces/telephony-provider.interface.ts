import { NormalizedCallEvent, NormalizedCallStatus } from './call-lifecycle.interface';

export interface CreateOutboundCallRequest {
  tenantId: string;
  callId: string;
  fromNumber: string;
  toNumber: string;
  statusCallbackUrl: string;
  mediaStreamUrl: string;
  metadata?: Record<string, unknown>;
}

export interface TelephonyCallResult {
  providerCallId: string;
  provider: string;
  status: NormalizedCallStatus;
  rawResponse?: unknown;
}

export interface IncomingCallRequest {
  providerCallId: string;
  fromNumber: string;
  toNumber: string;
  provider: string;
  rawPayload: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface IncomingCallResponse {
  instruction: string; // TwiML XML or provider-specific response string
  contentType: string; // e.g. 'text/xml' or 'application/json'
}

export interface MediaStreamConfig {
  streamUrl: string;
  callId: string;
  track?: 'inbound_track' | 'outbound_track' | 'both_tracks';
  customParameters?: Record<string, string>;
}

export interface WebhookValidationRequest {
  rawBody?: string;
  payload: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  requestUrl: string;
  method?: string;
}

export interface WebhookValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface TelephonyCallStatus {
  providerCallId: string;
  status: NormalizedCallStatus;
  duration?: number;
  recordingUrl?: string;
  price?: number;
  priceUnit?: string;
}

export interface ITelephonyProvider {
  readonly name: string;
  readonly isConfigured: boolean;

  createOutboundCall(req: CreateOutboundCallRequest): Promise<TelephonyCallResult>;
  handleIncomingCall(req: IncomingCallRequest): Promise<IncomingCallResponse>;
  handleStatusCallback(payload: Record<string, unknown>, headers?: Record<string, string>): Promise<NormalizedCallEvent>;
  getCall(providerCallId: string): Promise<TelephonyCallStatus>;
  endCall(providerCallId: string): Promise<boolean>;
  generateMediaStreamResponse(config: MediaStreamConfig): string;
  validateWebhookSignature(req: WebhookValidationRequest): WebhookValidationResult;
}
