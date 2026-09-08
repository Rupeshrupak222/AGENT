import { Injectable, Logger } from '@nestjs/common';
import {
  MessageSendResult,
  EmailSendOptions,
  ConnectionTestResult,
} from '../../interfaces/message-provider.interface';
import { ResendCredentials } from './resend.interface';

export type MockEmailMode = 'success' | 'failure' | 'rate_limit' | 'invalid_credentials' | 'timeout';

@Injectable()
export class MockEmailAdapter {
  private readonly logger = new Logger(MockEmailAdapter.name);
  public mode: MockEmailMode = 'success';
  public sentEmails: Array<{ options: EmailSendOptions; timestamp: number }> = [];

  setMode(mode: MockEmailMode) {
    this.mode = mode;
  }

  reset() {
    this.mode = 'success';
    this.sentEmails = [];
  }

  async sendEmail(
    _creds: ResendCredentials,
    options: EmailSendOptions,
  ): Promise<MessageSendResult> {
    this.sentEmails.push({ options, timestamp: Date.now() });

    if (this.mode === 'invalid_credentials') {
      return {
        success: false,
        status: 'failed',
        error: 'Invalid API key (Mock 401)',
        isRetryable: false,
        metadata: { status: 401 },
      };
    }

    if (this.mode === 'rate_limit') {
      return {
        success: false,
        status: 'failed',
        error: 'Too many requests (Mock 429)',
        isRetryable: true,
        metadata: { status: 429 },
      };
    }

    if (this.mode === 'timeout') {
      return {
        success: false,
        status: 'failed',
        error: 'Resend API connection timeout (Mock)',
        isRetryable: true,
      };
    }

    if (this.mode === 'failure') {
      return {
        success: false,
        status: 'failed',
        error: 'Simulated Resend email failure',
        isRetryable: false,
      };
    }

    const mockId = `resend_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.logger.log(`[MockEmail] Email dispatched to ${options.to}: ${mockId}`);

    return {
      success: true,
      providerMessageId: mockId,
      status: 'sent',
      metadata: {
        to: options.to,
        subject: options.subject,
        mock: true,
      },
    };
  }

  async testConnection(_creds: ResendCredentials): Promise<ConnectionTestResult> {
    if (this.mode === 'invalid_credentials') {
      return {
        success: false,
        provider: 'resend',
        message: 'Mock Resend connection failed: Invalid API key',
      };
    }
    return {
      success: true,
      provider: 'resend',
      latencyMs: 8,
      message: 'Connected to Resend API (Mock Mode)',
      details: { verifiedDomains: 1 },
    };
  }
}
