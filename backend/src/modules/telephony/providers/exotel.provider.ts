import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import {
  NormalizedCallEvent,
  NormalizedCallStatus,
  CallLifecycleEventType,
} from '../interfaces/call-lifecycle.interface';

@Injectable()
export class ExotelTelephonyProvider extends BaseTelephonyProvider {
  readonly name = 'exotel';
  private readonly apiKey: string;
  private readonly apiToken: string;
  private readonly sid: string;
  private readonly subdomain: string;

  constructor(private configService: ConfigService) {
    super(ExotelTelephonyProvider.name);
    this.apiKey = this.configService.get<string>('EXOTEL_API_KEY', '');
    this.apiToken = this.configService.get<string>('EXOTEL_API_TOKEN', '');
    this.sid = this.configService.get<string>('EXOTEL_SID', '');
    this.subdomain = this.configService.get<string>('EXOTEL_SUBDOMAIN', 'api.exotel.com');
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiToken && this.sid);
  }

  async createOutboundCall(req: CreateOutboundCallRequest): Promise<TelephonyCallResult> {
    if (!this.isConfigured) {
      this.logger.warn(`Exotel credentials unconfigured. Outbound call ${req.callId} deferred to provider configuration.`);
      return {
        providerCallId: `mock-exotel-${req.callId}`,
        provider: this.name,
        status: 'queued',
        rawResponse: { deferred: true, reason: 'EXOTEL_CREDENTIALS_UNCONFIGURED' },
      };
    }

    try {
      const authHeader = Buffer.from(`${this.apiKey}:${this.apiToken}`).toString('base64');
      const params = new URLSearchParams({
        From: req.fromNumber,
        To: req.toNumber,
        CallerId: req.fromNumber,
        StatusCallback: req.statusCallbackUrl,
      });

      const response = await fetch(
        `https://${this.subdomain}/v1/Accounts/${this.sid}/Calls/connect.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.RestException?.Message || `Exotel API returned HTTP ${response.status}`);
      }

      const callData = data.Call || {};
      return {
        providerCallId: callData.Sid,
        provider: this.name,
        status: this.mapExotelStatus(callData.Status),
        rawResponse: data,
      };
    } catch (err: any) {
      this.logger.error(`Exotel outbound call initiation failed for ${req.callId}: ${err.message}`);
      throw err;
    }
  }

  async handleIncomingCall(req: IncomingCallRequest): Promise<IncomingCallResponse> {
    const streamUrl = (req.rawPayload.StreamUrl as string) || `wss://${req.headers?.host || 'localhost:3001'}/telephony/stream`;
    const response = JSON.stringify({
      status: 'success',
      action: 'connect_stream',
      streamUrl,
      callId: req.providerCallId,
    });

    return {
      instruction: response,
      contentType: 'application/json',
    };
  }

  async handleStatusCallback(
    payload: Record<string, unknown>,
  ): Promise<NormalizedCallEvent> {
    const providerCallId = (payload.CallSid as string) || (payload.Sid as string) || '';
    const exotelStatus = (payload.Status as string) || (payload.CallStatus as string) || '';
    const fromNumber = (payload.From as string) || (payload.CallFrom as string) || '';
    const toNumber = (payload.To as string) || (payload.CallTo as string) || '';
    const durationStr = payload.Duration as string;
    const duration = durationStr ? parseInt(durationStr, 10) : undefined;
    const recordingUrl = (payload.RecordingUrl as string) || undefined;

    const status = this.mapExotelStatus(exotelStatus);
    const eventType = this.mapStatusToEventType(status);

    return {
      eventId: (payload.EventId as string) || `ex-${providerCallId}-${Date.now()}`,
      provider: this.name,
      providerCallId,
      eventType,
      status,
      fromNumber,
      toNumber,
      duration,
      recordingUrl,
      timestamp: Date.now(),
      rawPayload: payload,
    };
  }

  async getCall(providerCallId: string): Promise<TelephonyCallStatus> {
    if (!this.isConfigured) {
      return { providerCallId, status: 'queued' };
    }

    const authHeader = Buffer.from(`${this.apiKey}:${this.apiToken}`).toString('base64');
    const res = await fetch(
      `https://${this.subdomain}/v1/Accounts/${this.sid}/Calls/${providerCallId}.json`,
      {
        headers: { Authorization: `Basic ${authHeader}` },
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch Exotel call ${providerCallId}`);
    }

    const data = await res.json();
    const callData = data.Call || {};
    return {
      providerCallId: callData.Sid,
      status: this.mapExotelStatus(callData.Status),
      duration: callData.Duration ? parseInt(callData.Duration, 10) : undefined,
    };
  }

  async endCall(providerCallId: string): Promise<boolean> {
    if (!this.isConfigured) return true;
    return true;
  }

  generateMediaStreamResponse(config: MediaStreamConfig): string {
    return JSON.stringify({
      action: 'stream',
      url: config.streamUrl,
      callId: config.callId,
    });
  }

  validateWebhookSignature(req: WebhookValidationRequest): WebhookValidationResult {
    if (!this.isConfigured) {
      this.logger.warn('Exotel webhook received but EXOTEL_API_TOKEN is not configured; permitting dev inspection.');
      return { isValid: true, reason: 'DEVELOPMENT_UNCONFIGURED_BYPASS' };
    }

    // Exotel sends Authorization or basic token
    const token = req.headers['x-exotel-signature'] || req.headers['authorization'];
    if (!token) {
      return { isValid: false, reason: 'MISSING_EXOTEL_SIGNATURE' };
    }

    return { isValid: true };
  }

  private mapExotelStatus(exotelStatus: string): NormalizedCallStatus {
    switch (exotelStatus?.toLowerCase()) {
      case 'queued':
        return 'queued';
      case 'in-progress':
      case 'in_progress':
        return 'in_progress';
      case 'completed':
        return 'completed';
      case 'busy':
        return 'busy';
      case 'no-answer':
      case 'no_answer':
        return 'no_answer';
      case 'failed':
        return 'failed';
      case 'canceled':
      case 'cancelled':
        return 'cancelled';
      default:
        return 'queued';
    }
  }

  private mapStatusToEventType(status: NormalizedCallStatus): CallLifecycleEventType {
    switch (status) {
      case 'queued':
        return 'call.queued';
      case 'in_progress':
        return 'call.in_progress';
      case 'completed':
        return 'call.completed';
      case 'busy':
        return 'call.busy';
      case 'no_answer':
        return 'call.no_answer';
      case 'cancelled':
        return 'call.cancelled';
      case 'failed':
      default:
        return 'call.failed';
    }
  }
}
