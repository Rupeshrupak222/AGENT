import { Logger } from '@nestjs/common';
import {
  ITelephonyProvider,
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

export abstract class BaseTelephonyProvider implements ITelephonyProvider {
  protected readonly logger: Logger;
  abstract readonly name: string;
  abstract readonly isConfigured: boolean;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  abstract createOutboundCall(req: CreateOutboundCallRequest): Promise<TelephonyCallResult>;
  abstract handleIncomingCall(req: IncomingCallRequest): Promise<IncomingCallResponse>;
  abstract handleStatusCallback(
    payload: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<NormalizedCallEvent>;
  abstract getCall(providerCallId: string): Promise<TelephonyCallStatus>;
  abstract endCall(providerCallId: string): Promise<boolean>;
  abstract generateMediaStreamResponse(config: MediaStreamConfig): string;
  abstract validateWebhookSignature(req: WebhookValidationRequest): WebhookValidationResult;

  /**
   * Helper to check timestamp replay protection (e.g. Reject requests older than 5 minutes)
   */
  protected validateTimestamp(timestampSeconds: number, maxDriftSeconds = 300): boolean {
    const now = Math.floor(Date.now() / 1000);
    return Math.abs(now - timestampSeconds) <= maxDriftSeconds;
  }
}
