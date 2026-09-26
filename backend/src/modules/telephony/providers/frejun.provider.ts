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
export class FrejunTelephonyProvider extends BaseTelephonyProvider {
  readonly name = 'frejun';
  private readonly apiKey: string;
  private readonly virtualNumber: string;
  private readonly baseUrl: string;
  private readonly clientSecret: string;

  constructor(private configService: ConfigService) {
    super(FrejunTelephonyProvider.name);
    this.apiKey = this.configService.get<string>('FREJUN_API_KEY', '');
    this.virtualNumber = this.configService.get<string>('FREJUN_VIRTUAL_NUMBER', '');
    this.baseUrl = this.configService.get<string>(
      'FREJUN_API_BASE_URL',
      'https://api.frejun.com/v1',
    ).replace(/\/$/, '');
    this.clientSecret =
      this.configService.get<string>('FREJUN_CLIENT_SECRET', '')
      || this.configService.get<string>('FREJUN_WEBHOOK_SECRET', '');
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.virtualNumber);
  }

  /**
   * Initiate an outbound call via Frejun REST API
   */
  async createOutboundCall(req: CreateOutboundCallRequest): Promise<TelephonyCallResult> {
    if (!this.isConfigured) {
      this.logger.warn(`Frejun credentials unconfigured. Outbound call ${req.callId} cannot be placed.`);
      return {
        providerCallId: '',
        provider: this.name,
        status: 'failed',
        rawResponse: {
          disposition: 'NOT_CONFIGURED',
          reason: 'FREJUN_CREDENTIALS_UNCONFIGURED',
        },
      };
    }

    try {
      const payload = {
        from: req.fromNumber || this.virtualNumber,
        to: req.toNumber,
        virtual_number: this.virtualNumber,
        custom_id: req.callId,
        callback_url: req.statusCallbackUrl,
        metadata: {
          callId: req.callId,
          tenantId: req.tenantId,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${this.baseUrl}/calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || `Frejun API returned HTTP ${response.status}`);
      }

      const providerCallId = data.call_id || data.id || data.call_sid || `frejun-${Date.now()}`;
      return {
        providerCallId,
        provider: this.name,
        status: this.mapFrejunStatus(data.status || 'queued'),
        rawResponse: data,
      };
    } catch (err: any) {
      this.logger.error(`Frejun outbound call initiation failed for ${req.callId}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Handle incoming call routing instruction
   */
  async handleIncomingCall(req: IncomingCallRequest): Promise<IncomingCallResponse> {
    const streamUrl =
      (req.rawPayload.StreamUrl as string) ||
      `wss://${req.headers?.host || 'localhost:3001'}/telephony/stream`;

    const response = JSON.stringify({
      status: 'success',
      action: 'connect_stream',
      streamUrl: this.withMediaStreamToken(streamUrl, req.mediaStreamToken),
      callId: req.callId || req.providerCallId,
      custom_id: req.providerCallId,
    });

    return {
      instruction: response,
      contentType: 'application/json',
    };
  }

  /**
   * Parse status webhooks sent by Frejun
   */
  async handleStatusCallback(payload: Record<string, unknown>): Promise<NormalizedCallEvent> {
    const providerCallId =
      (payload.call_id as string) ||
      (payload.call_sid as string) ||
      (payload.id as string) ||
      (payload.custom_id as string) ||
      '';

    const frejunStatus = (payload.status as string) || (payload.call_status as string) || '';
    const fromNumber = (payload.from as string) || (payload.caller as string) || '';
    const toNumber = (payload.to as string) || (payload.callee as string) || '';
    const durationVal = payload.duration || payload.call_duration;
    const duration = typeof durationVal === 'number'
      ? durationVal
      : typeof durationVal === 'string'
      ? parseInt(durationVal, 10)
      : undefined;

    const recordingUrl =
      (payload.recording_url as string) ||
      (payload.call_recording as string) ||
      (payload.audio_url as string) ||
      undefined;

    const status = this.mapFrejunStatus(frejunStatus);
    const eventType = this.mapStatusToEventType(status);

    return {
      eventId: (payload.event_id as string) || `fj-${providerCallId}-${Date.now()}`,
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

  /**
   * Query status of an existing call on Frejun
   */
  async getCall(providerCallId: string): Promise<TelephonyCallStatus> {
    if (!this.isConfigured) {
      this.logger.warn(`Frejun getCall ${providerCallId}: provider not configured.`);
      return { providerCallId, status: 'failed' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${this.baseUrl}/calls/${providerCallId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'x-api-key': this.apiKey,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to fetch Frejun call ${providerCallId}`);
    }

    const data = await res.json();
    const callData = data.call || data.data || data;

    return {
      providerCallId: callData.call_id || providerCallId,
      status: this.mapFrejunStatus(callData.status),
      duration: callData.duration ? parseInt(callData.duration, 10) : undefined,
      recordingUrl: callData.recording_url || undefined,
    };
  }

  /**
   * Terminate active call on Frejun
   */
  async endCall(providerCallId: string): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(`Frejun endCall skipped: provider not configured.`);
      return false;
    }

    try {
      const res = await fetch(`${this.baseUrl}/calls/${providerCallId}/hangup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'x-api-key': this.apiKey,
        },
      });
      return res.ok;
    } catch (err: any) {
      this.logger.error(`Failed to terminate Frejun call ${providerCallId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Produce stream payload config for real-time bidirectional audio
   */
  generateMediaStreamResponse(config: MediaStreamConfig): string {
    return JSON.stringify({
      action: 'stream',
      url: this.withMediaStreamToken(config.streamUrl, config.mediaStreamToken),
      callId: config.callId,
      track: config.track || 'both_tracks',
    });
  }

  /**
   * Validate incoming webhook authenticity from Frejun
   */
  validateWebhookSignature(req: WebhookValidationRequest): WebhookValidationResult {
    if (!this.clientSecret) {
      this.logger.warn('Frejun webhook dropped: FREJUN_CLIENT_SECRET is not configured, so signature verification is impossible.');
      return { isValid: false, reason: 'PROVIDER_NOT_CONFIGURED' };
    }

    const signature =
      (req.headers['x-frejun-signature'] as string) ||
      (req.headers['x-signature'] as string);

    if (!signature) {
      return { isValid: false, reason: 'MISSING_FREJUN_SIGNATURE' };
    }

    if (typeof req.rawBody !== 'string') {
      return { isValid: false, reason: 'MISSING_RAW_BODY' };
    }

    try {
      const method = (req.method || 'POST').toUpperCase();
      const signedPayload = `${method}${req.requestUrl}${req.rawBody}`;
      const expectedSig = crypto
        .createHmac('sha256', this.clientSecret)
        .update(signedPayload, 'utf-8')
        .digest('base64');

      const provided = this.stripDigestPrefix(signature);

      const providedBuf = Buffer.from(provided, 'utf-8');
      const expectedBuf = Buffer.from(expectedSig, 'utf-8');
      const isValid =
        providedBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(providedBuf, expectedBuf);

      return isValid ? { isValid: true } : { isValid: false, reason: 'SIGNATURE_MISMATCH' };
    } catch (err: any) {
      return { isValid: false, reason: `SIGNATURE_VERIFICATION_ERROR: ${err.message}` };
    }
  }

  private stripDigestPrefix(signature: string): string {
    const separatorIndex = signature.indexOf('=');
    if (separatorIndex <= 0) {
      return signature;
    }
    const algorithm = signature.slice(0, separatorIndex).toLowerCase();
    return /^(sha-?\d+|hmac-sha-?\d+|v1)$/.test(algorithm) ? signature.slice(separatorIndex + 1) : signature;
  }

  private mapFrejunStatus(frejunStatus: string): NormalizedCallStatus {
    switch (frejunStatus?.toLowerCase()) {
      case 'queued':
      case 'pending':
      case 'initiated':
        return 'queued';
      case 'ringing':
        return 'ringing';
      case 'in-progress':
      case 'in_progress':
      case 'connected':
      case 'answered':
        return 'in_progress';
      case 'completed':
      case 'ended':
      case 'hungup':
        return 'completed';
      case 'busy':
        return 'busy';
      case 'no-answer':
      case 'no_answer':
      case 'missed':
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
      case 'ringing':
        return 'call.ringing';
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
