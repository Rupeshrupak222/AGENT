import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  MessageSendResult,
  EmailSendOptions,
  ConnectionTestResult,
} from '../../interfaces/message-provider.interface';
import { ResendCredentials, ResendSendPayload, ResendSendResponse } from './resend.interface';

@Injectable()
export class ResendEmailAdapter {
  private readonly logger = new Logger(ResendEmailAdapter.name);
  private readonly BASE_URL = 'https://api.resend.com';

  /**
   * Send email via Resend API.
   */
  async sendEmail(
    creds: ResendCredentials,
    options: EmailSendOptions,
  ): Promise<MessageSendResult> {
    if (!creds.apiKey) {
      return {
        success: false,
        status: 'failed',
        error: 'Resend API key is unconfigured',
        isRetryable: false,
      };
    }

    // Validate recipient email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipient = this.cleanHeader(options.to);
    if (!emailRegex.test(recipient)) {
      return {
        success: false,
        status: 'failed',
        error: `Invalid recipient email address: ${options.to}`,
        isRetryable: false,
      };
    }

    // Sanitize subject and sender
    const subject = this.cleanHeader(options.subject) || 'Notification from AgentCall AI';
    const fromName = this.cleanHeader(creds.fromName || 'AgentCall AI');
    const fromAddr = this.cleanHeader(creds.fromEmail || options.from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev');
    const formattedFrom = `${fromName} <${fromAddr}>`;

    const payload: ResendSendPayload = {
      from: formattedFrom,
      to: [recipient],
      subject,
      text: options.text,
      html: options.html,
      reply_to: options.replyTo ? this.cleanHeader(options.replyTo) : undefined,
    };

    // If neither text nor html was supplied, fallback to empty text
    if (!payload.text && !payload.html) {
      payload.text = 'Automated message from AgentCall AI.';
    }

    try {
      const response = await axios.post<ResendSendResponse>(`${this.BASE_URL}/emails`, payload, {
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const messageId = response.data?.id;
      this.logger.log(`Resend email sent successfully: ${messageId} -> ${recipient}`);

      return {
        success: true,
        providerMessageId: messageId,
        status: 'sent',
        metadata: {
          to: recipient,
          from: formattedFrom,
          subject,
        },
      };
    } catch (err: any) {
      const axiosErr = err as AxiosError<any>;
      const status = axiosErr.response?.status;
      const errorMsg = axiosErr.response?.data?.message || axiosErr.message || 'Resend email dispatch error';

      const isRateLimited = status === 429;
      const isAuthError = status === 401 || status === 403;
      const isRetryable = isRateLimited || (status !== undefined && status >= 500) || axiosErr.code === 'ECONNABORTED';

      this.logger.error(`Resend dispatch failed (status ${status}): ${errorMsg}`);

      return {
        success: false,
        status: 'failed',
        error: errorMsg,
        isRetryable,
        metadata: {
          status,
          name: axiosErr.response?.data?.name,
        },
      };
    }
  }

  /**
   * Test Resend API connection safely without sending an email.
   */
  async testConnection(creds: ResendCredentials): Promise<ConnectionTestResult> {
    if (!creds.apiKey) {
      return {
        success: false,
        provider: 'resend',
        message: 'Missing Resend API key',
      };
    }

    const startTime = Date.now();
    try {
      // Query domains or api-keys list endpoint to verify token validity
      const response = await axios.get(`${this.BASE_URL}/domains`, {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
        timeout: 10000,
      });

      return {
        success: true,
        provider: 'resend',
        latencyMs: Date.now() - startTime,
        message: 'Connected to Resend API successfully',
        details: { domainsCount: response.data?.data?.length ?? 0 },
      };
    } catch (err: any) {
      const axiosErr = err as AxiosError<any>;
      const errorMsg = axiosErr.response?.data?.message || axiosErr.message;
      return {
        success: false,
        provider: 'resend',
        latencyMs: Date.now() - startTime,
        message: `Resend connection failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Cleans header values to prevent CRLF injection.
   */
  private cleanHeader(val?: string): string {
    if (!val || typeof val !== 'string') return '';
    return val.replace(/[\r\n\0]/g, ' ').trim();
  }
}
