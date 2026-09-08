import { Injectable, Logger } from '@nestjs/common';
import {
  MessageSendResult,
  WhatsAppSendOptions,
  ConnectionTestResult,
  WhatsAppWebhookStatusUpdate,
} from '../../interfaces/message-provider.interface';
import { WhatsAppCredentials } from './whatsapp.interface';

export type MockWhatsAppMode = 'success' | 'failure' | 'rate_limit' | 'invalid_credentials' | 'timeout';

@Injectable()
export class MockWhatsAppAdapter {
  private readonly logger = new Logger(MockWhatsAppAdapter.name);
  public mode: MockWhatsAppMode = 'success';
  public sentMessages: Array<{ options: WhatsAppSendOptions; timestamp: number }> = [];

  setMode(mode: MockWhatsAppMode) {
    this.mode = mode;
  }

  reset() {
    this.mode = 'success';
    this.sentMessages = [];
  }

  async sendMessage(
    creds: WhatsAppCredentials,
    options: WhatsAppSendOptions,
  ): Promise<MessageSendResult> {
    this.sentMessages.push({ options, timestamp: Date.now() });

    if (this.mode === 'invalid_credentials') {
      return {
        success: false,
        status: 'failed',
        error: 'Invalid OAuth access token (Mock 401)',
        isRetryable: false,
        metadata: { code: 190 },
      };
    }

    if (this.mode === 'rate_limit') {
      return {
        success: false,
        status: 'failed',
        error: 'Message rate limit exceeded for phone number (Mock 429)',
        isRetryable: true,
        metadata: { code: 80007 },
      };
    }

    if (this.mode === 'timeout') {
      return {
        success: false,
        status: 'failed',
        error: 'Meta Graph API connection timed out (Mock)',
        isRetryable: true,
      };
    }

    if (this.mode === 'failure') {
      return {
        success: false,
        status: 'failed',
        error: 'Simulated WhatsApp delivery failure',
        isRetryable: false,
      };
    }

    const mockId = `wamid.mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.logger.log(`[MockWhatsApp] Message dispatched to ${options.to}: ${mockId}`);

    return {
      success: true,
      providerMessageId: mockId,
      status: 'sent',
      metadata: {
        to: options.to,
        template: options.templateName,
        mock: true,
      },
    };
  }

  validateWebhookSignature(signatureHeader: string, _rawBody: Buffer | string, _appSecret: string): boolean {
    return signatureHeader === 'sha256=mock_valid_signature';
  }

  parseWebhookStatuses(body: any): WhatsAppWebhookStatusUpdate[] {
    if (body?.mockStatuses && Array.isArray(body.mockStatuses)) {
      return body.mockStatuses;
    }
    return [
      {
        messageId: 'wamid.mock_12345',
        status: 'delivered',
        recipientId: '919876543210',
        timestamp: Math.floor(Date.now() / 1000),
      },
    ];
  }

  async testConnection(_creds: WhatsAppCredentials): Promise<ConnectionTestResult> {
    if (this.mode === 'invalid_credentials') {
      return {
        success: false,
        provider: 'whatsapp',
        message: 'Mock WhatsApp connection failed: Invalid credentials',
      };
    }
    return {
      success: true,
      provider: 'whatsapp',
      latencyMs: 12,
      message: 'Connected to WhatsApp Cloud API (Mock Mode)',
      details: { verified_name: 'AgentCall Demo Account', status: 'VERIFIED' },
    };
  }
}
