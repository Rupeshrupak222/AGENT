import { Injectable } from '@nestjs/common';
import { BaseTelephonyProvider } from './base-telephony.provider';
import {
  CreateOutboundCallRequest,
  TelephonyCallResult,
  IncomingCallRequest,
  IncomingCallResponse,
  MediaStreamConfig,
  WebhookValidationRequest,
  WebhookValidationResult,
  TelephonyCallStatus,
} from '../interfaces/telephony-provider.interface';
import { NormalizedCallEvent } from '../interfaces/call-lifecycle.interface';

@Injectable()
export class SandboxTelephonyProvider extends BaseTelephonyProvider {
  readonly name = 'sandbox';

  constructor() {
    super(SandboxTelephonyProvider.name);
  }

  get isConfigured(): boolean {
    return true; // Always available for in-browser WebRTC testing and local simulation
  }

  async createOutboundCall(req: CreateOutboundCallRequest): Promise<TelephonyCallResult> {
    const sandboxCallSid = `sandbox-stream-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.logger.log(
      `[Sandbox WebRTC Carrier] Dispatched interactive voice session for Call [${req.callId}] to ${req.toNumber}`,
    );

    return {
      providerCallId: sandboxCallSid,
      provider: this.name,
      status: 'in_progress',
      rawResponse: {
        disposition: 'SANDBOX_ACTIVE',
        streamUrl: req.mediaStreamUrl,
        mode: 'webrtc_sandbox',
      },
    };
  }

  async handleIncomingCall(req: IncomingCallRequest): Promise<IncomingCallResponse> {
    return {
      instruction: `<Response><Say>Connected to AgentCall AI WebRTC Sandbox.</Say></Response>`,
      contentType: 'text/xml',
    };
  }

  async handleStatusCallback(
    payload: Record<string, unknown>,
  ): Promise<NormalizedCallEvent> {
    const callId = (payload.callId as string) || 'sandbox-call';
    return {
      eventId: `evt-sandbox-${Date.now()}`,
      provider: this.name,
      providerCallId: callId,
      callId,
      eventType: 'call.in_progress',
      status: 'in_progress',
      fromNumber: (payload.from as string) || '+10000000000',
      toNumber: (payload.to as string) || '+19999999999',
      duration: 0,
      timestamp: Date.now(),
      rawPayload: payload,
    };
  }

  async getCall(providerCallId: string): Promise<TelephonyCallStatus> {
    return {
      providerCallId,
      status: 'in_progress',
      duration: 0,
    };
  }

  async endCall(providerCallId: string): Promise<boolean> {
    this.logger.log(`[Sandbox WebRTC Carrier] Terminated voice session [${providerCallId}]`);
    return true;
  }

  generateMediaStreamResponse(config: MediaStreamConfig): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${config.streamUrl}">
      <Parameter name="callId" value="${config.callId}" />
    </Stream>
  </Connect>
</Response>`;
  }

  validateWebhookSignature(_req: WebhookValidationRequest): WebhookValidationResult {
    return { isValid: true };
  }
}
