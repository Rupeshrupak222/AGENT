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
export class TwilioTelephonyProvider extends BaseTelephonyProvider {
  readonly name = 'twilio';
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;

  constructor(private configService: ConfigService) {
    super(TwilioTelephonyProvider.name);
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER', '');
  }

  get isConfigured(): boolean {
    return Boolean(this.accountSid && this.authToken && this.fromNumber);
  }

  async createOutboundCall(req: CreateOutboundCallRequest): Promise<TelephonyCallResult> {
    if (!this.isConfigured) {
      this.logger.warn(`Twilio credentials unconfigured. Outbound call ${req.callId} deferred to provider configuration.`);
      return {
        providerCallId: `mock-twilio-${req.callId}`,
        provider: this.name,
        status: 'queued',
        rawResponse: { deferred: true, reason: 'TWILIO_CREDENTIALS_UNCONFIGURED' },
      };
    }

    try {
      // In production with live credentials:
      // Using Twilio REST API / SDK to create outbound call:
      const twiml = this.generateMediaStreamResponse({
        streamUrl: req.mediaStreamUrl,
        callId: req.callId,
      });

      const params = new URLSearchParams({
        To: req.toNumber,
        From: req.fromNumber || this.fromNumber,
        Twiml: twiml,
        StatusCallback: req.statusCallbackUrl,
        StatusCallbackEvent: 'initiated ringing answered completed',
      });

      const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`,
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
        throw new Error(data.message || `Twilio API returned HTTP ${response.status}`);
      }

      return {
        providerCallId: data.sid,
        provider: this.name,
        status: this.mapTwilioStatus(data.status),
        rawResponse: data,
      };
    } catch (err: any) {
      this.logger.error(`Twilio outbound call initiation failed for ${req.callId}: ${err.message}`);
      throw err;
    }
  }

  async handleIncomingCall(req: IncomingCallRequest): Promise<IncomingCallResponse> {
    const streamUrl = (req.rawPayload.StreamUrl as string) || `wss://${req.headers?.host || 'localhost:3001'}/telephony/stream`;
    const xml = this.generateMediaStreamResponse({
      streamUrl,
      callId: req.providerCallId,
    });

    return {
      instruction: xml,
      contentType: 'text/xml',
    };
  }

  async handleStatusCallback(
    payload: Record<string, unknown>,
  ): Promise<NormalizedCallEvent> {
    const providerCallId = (payload.CallSid as string) || '';
    const twilioStatus = (payload.CallStatus as string) || '';
    const fromNumber = (payload.From as string) || '';
    const toNumber = (payload.To as string) || '';
    const durationStr = payload.CallDuration as string;
    const duration = durationStr ? parseInt(durationStr, 10) : undefined;
    const recordingUrl = (payload.RecordingUrl as string) || undefined;

    const status = this.mapTwilioStatus(twilioStatus);
    const eventType = this.mapStatusToEventType(status);

    return {
      eventId: (payload.SequenceNumber as string) || `tw-${providerCallId}-${Date.now()}`,
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
      return {
        providerCallId,
        status: 'queued',
      };
    }

    const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls/${providerCallId}.json`,
      {
        headers: { Authorization: `Basic ${authHeader}` },
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch Twilio call ${providerCallId}`);
    }

    const data = await res.json();
    return {
      providerCallId: data.sid,
      status: this.mapTwilioStatus(data.status),
      duration: data.duration ? parseInt(data.duration, 10) : undefined,
    };
  }

  async endCall(providerCallId: string): Promise<boolean> {
    if (!this.isConfigured) return true;

    const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const params = new URLSearchParams({ Status: 'completed' });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls/${providerCallId}.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    );

    return res.ok;
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

  validateWebhookSignature(req: WebhookValidationRequest): WebhookValidationResult {
    if (!this.isConfigured) {
      // In development mode without credentials, log warning and allow for local testing
      this.logger.warn('Twilio webhook received but TWILIO_AUTH_TOKEN is not configured; permitting dev inspection.');
      return { isValid: true, reason: 'DEVELOPMENT_UNCONFIGURED_BYPASS' };
    }

    const signature = req.headers['x-twilio-signature'] as string;
    if (!signature) {
      return { isValid: false, reason: 'MISSING_TWILIO_SIGNATURE' };
    }

    try {
      // Twilio signature verification algorithm:
      // Sort keys alphabetically, append key + value to full URL, compute HMAC-SHA1 with authToken
      const keys = Object.keys(req.payload).sort();
      let data = req.requestUrl;
      for (const key of keys) {
        data += `${key}${req.payload[key]}`;
      }

      const expectedSignature = crypto
        .createHmac('sha1', this.authToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );

      return {
        isValid,
        reason: isValid ? undefined : 'SIGNATURE_MISMATCH',
      };
    } catch (err: any) {
      return { isValid: false, reason: `VALIDATION_ERROR: ${err.message}` };
    }
  }

  private mapTwilioStatus(twilioStatus: string): NormalizedCallStatus {
    switch (twilioStatus?.toLowerCase()) {
      case 'queued':
        return 'queued';
      case 'initiated':
        return 'initiated';
      case 'ringing':
        return 'ringing';
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
      case 'canceled':
      case 'cancelled':
        return 'cancelled';
      case 'failed':
        return 'failed';
      default:
        return 'queued';
    }
  }

  private mapStatusToEventType(status: NormalizedCallStatus): CallLifecycleEventType {
    switch (status) {
      case 'queued':
        return 'call.queued';
      case 'initiated':
        return 'call.initiated';
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
