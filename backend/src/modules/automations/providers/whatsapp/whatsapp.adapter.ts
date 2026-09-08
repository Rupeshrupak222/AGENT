import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import {
  MessageSendResult,
  WhatsAppSendOptions,
  ConnectionTestResult,
  WhatsAppWebhookStatusUpdate,
} from '../../interfaces/message-provider.interface';
import { WhatsAppCredentials, MetaWhatsAppPayload, MetaWhatsAppResponse } from './whatsapp.interface';

@Injectable()
export class MetaWhatsAppAdapter {
  private readonly logger = new Logger(MetaWhatsAppAdapter.name);
  private readonly GRAPH_API_VERSION = 'v20.0';
  private readonly BASE_URL = 'https://graph.facebook.com';

  /**
   * Send WhatsApp message via Meta Cloud API.
   */
  async sendMessage(
    creds: WhatsAppCredentials,
    options: WhatsAppSendOptions,
  ): Promise<MessageSendResult> {
    if (!creds.accessToken || !creds.phoneNumberId) {
      return {
        success: false,
        status: 'failed',
        error: 'WhatsApp credentials incomplete: accessToken and phoneNumberId are required',
        isRetryable: false,
      };
    }

    // Clean phone number: remove '+' and spaces/dashes
    const cleanPhone = options.to.replace(/[^\d]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      return {
        success: false,
        status: 'failed',
        error: `Invalid destination phone number: ${options.to}`,
        isRetryable: false,
      };
    }

    const url = `${this.BASE_URL}/${this.GRAPH_API_VERSION}/${creds.phoneNumberId}/messages`;

    // Construct Meta payload
    let payload: MetaWhatsAppPayload;

    if (options.templateName) {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'template',
        template: {
          name: options.templateName,
          language: {
            code: options.languageCode || 'en_US',
          },
          components: options.components || (options.variables ? [
            {
              type: 'body',
              parameters: Object.entries(options.variables).map(([_, text]) => ({
                type: 'text',
                text: String(text),
              })),
            },
          ] : undefined),
        },
      };
    } else {
      // Direct text message
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          body: options.textBody || '',
          preview_url: false,
        },
      };
    }

    try {
      const response = await axios.post<MetaWhatsAppResponse>(url, payload, {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const messageId = response.data?.messages?.[0]?.id;
      this.logger.log(`WhatsApp message sent successfully: ${messageId} -> ${cleanPhone}`);

      return {
        success: true,
        providerMessageId: messageId,
        status: 'sent',
        metadata: {
          waId: response.data?.contacts?.[0]?.wa_id,
          to: cleanPhone,
        },
      };
    } catch (err: any) {
      const axiosErr = err as AxiosError<any>;
      const status = axiosErr.response?.status;
      const errorData = axiosErr.response?.data?.error;
      const errorMessage = errorData?.message || axiosErr.message || 'WhatsApp dispatch error';

      const isRateLimited = status === 429 || errorData?.code === 80007;
      const isAuthError = status === 401 || errorData?.code === 190;
      const isRetryable = isRateLimited || (status !== undefined && status >= 500) || axiosErr.code === 'ECONNABORTED';

      this.logger.error(
        `WhatsApp dispatch failed (status ${status}, code ${errorData?.code}): ${errorMessage}`,
      );

      return {
        success: false,
        status: 'failed',
        error: errorMessage,
        isRetryable,
        metadata: {
          errorCode: errorData?.code,
          errorSubcode: errorData?.error_subcode,
          status,
        },
      };
    }
  }

  /**
   * Validates Meta webhook signature using HMAC-SHA256 and timingSafeEqual.
   */
  validateWebhookSignature(signatureHeader: string, rawBody: Buffer | string, appSecret: string): boolean {
    if (!signatureHeader || !appSecret) return false;

    // Header format: "sha256=abcdef..."
    const prefix = 'sha256=';
    if (!signatureHeader.startsWith(prefix)) return false;
    const providedHash = signatureHeader.substring(prefix.length);

    try {
      const hmac = crypto.createHmac('sha256', appSecret);
      const computedHash = hmac.update(rawBody).digest('hex');

      const expectedBuf = Buffer.from(computedHash, 'utf8');
      const providedBuf = Buffer.from(providedHash, 'utf8');

      if (expectedBuf.length !== providedBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, providedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Parses WhatsApp webhook payload into standardized status updates.
   */
  parseWebhookStatuses(body: any): WhatsAppWebhookStatusUpdate[] {
    const results: WhatsAppWebhookStatusUpdate[] = [];
    if (!body || body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) {
      return results;
    }

    for (const entry of body.entry) {
      if (!Array.isArray(entry.changes)) continue;
      for (const change of entry.changes) {
        const statuses = change.value?.statuses;
        if (!Array.isArray(statuses)) continue;

        for (const s of statuses) {
          if (!s.id || !s.status) continue;
          results.push({
            messageId: s.id,
            status: s.status,
            recipientId: s.recipient_id,
            timestamp: Number(s.timestamp) || Math.floor(Date.now() / 1000),
            error: s.errors?.[0] ? {
              code: s.errors[0].code,
              title: s.errors[0].title,
              message: s.errors[0].message || s.errors[0].error_data?.details,
            } : undefined,
          });
        }
      }
    }

    return results;
  }

  /**
   * Test WhatsApp API connection without sending message.
   */
  async testConnection(creds: WhatsAppCredentials): Promise<ConnectionTestResult> {
    if (!creds.accessToken || !creds.phoneNumberId) {
      return {
        success: false,
        provider: 'whatsapp',
        message: 'Missing accessToken or phoneNumberId',
      };
    }

    const startTime = Date.now();
    try {
      // Query phone number status
      const url = `${this.BASE_URL}/${this.GRAPH_API_VERSION}/${creds.phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
        timeout: 10000,
      });

      return {
        success: true,
        provider: 'whatsapp',
        latencyMs: Date.now() - startTime,
        message: `Connected to WhatsApp Business: ${response.data?.verified_name || response.data?.display_phone_number || creds.phoneNumberId}`,
        details: response.data,
      };
    } catch (err: any) {
      const axiosErr = err as AxiosError<any>;
      const errorMsg = axiosErr.response?.data?.error?.message || axiosErr.message;
      return {
        success: false,
        provider: 'whatsapp',
        latencyMs: Date.now() - startTime,
        message: `WhatsApp connection failed: ${errorMsg}`,
      };
    }
  }
}
