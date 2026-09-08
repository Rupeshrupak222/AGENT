import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
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
      this.logger.warn(`Exotel credentials unconfigured. Outbound call ${req.callId} cannot be placed (no live provider).`);
      // Honest failure: never fabricate a provider call id or claim a call was queued.
      return {
        providerCallId: '',
        provider: this.name,
        status: 'failed',
        rawResponse: {
          disposition: 'NOT_CONFIGURED',
          reason: 'EXOTEL_CREDENTIALS_UNCONFIGURED',
        },
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `https://${this.subdomain}/v1/Accounts/${this.sid}/Calls/connect.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

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
      this.logger.warn(`Exotel getCall ${providerCallId}: provider not configured, cannot query live state.`);
      return { providerCallId, status: 'failed' };
    }

    const authHeader = Buffer.from(`${this.apiKey}:${this.apiToken}`).toString('base64');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(
      `https://${this.subdomain}/v1/Accounts/${this.sid}/Calls/${providerCallId}.json`,
      {
        headers: { Authorization: `Basic ${authHeader}` },
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

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
    if (!this.isConfigured) {
      this.logger.warn(`Exotel endCall skipped: provider is not configured (nothing was placed via Exotel).`);
      return false;
    }
    // Exotel does not expose a documented post-call termination endpoint for the current API surface.
    this.logger.warn(`Exotel endCall for ${providerCallId}: no supported termination endpoint; returning false (not ended).`);
    return false;
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
      this.logger.warn('Exotel webhook dropped: EXOTEL_API_TOKEN is not configured, so signature verification is impossible.');
      return { isValid: false, reason: 'PROVIDER_NOT_CONFIGURED' };
    }

    // Exotel sends Authorization header with Basic auth of api_key:api_token
    const authHeader = req.headers['authorization'] as string;
    if (!authHeader) {
      return { isValid: false, reason: 'MISSING_EXOTEL_SIGNATURE' };
    }

    try {
      // Exotel sends Basic auth: base64(apiKey:apiToken)
      if (authHeader.startsWith('Basic ')) {
        const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
        const [providedKey, providedToken] = decoded.split(':');

        if (!providedKey || !providedToken) {
          return { isValid: false, reason: 'MALFORMED_AUTH_HEADER' };
        }

        // Timing-safe comparison of both apiKey and apiToken
        const keyMatch = crypto.timingSafeEqual(
          Buffer.from(providedKey),
          Buffer.from(this.apiKey),
        );
        const tokenMatch = crypto.timingSafeEqual(
          Buffer.from(providedToken),
          Buffer.from(this.apiToken),
        );

        if (keyMatch && tokenMatch) {
          return { isValid: true };
        }

        return { isValid: false, reason: 'CREDENTIAL_MISMATCH' };
      }

      // Fallback: check for bearer token matching apiToken
      if (authHeader.startsWith('Bearer ')) {
        const providedToken = authHeader.slice(7);
        const tokenMatch = crypto.timingSafeEqual(
          Buffer.from(providedToken),
          Buffer.from(this.apiToken),
        );

        if (tokenMatch) {
          return { isValid: true };
        }

        return { isValid: false, reason: 'TOKEN_MISMATCH' };
      }

      return { isValid: false, reason: 'UNSUPPORTED_AUTH_SCHEME' };
    } catch (err: any) {
      return { isValid: false, reason: `VALIDATION_ERROR: ${err.message}` };
    }
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
