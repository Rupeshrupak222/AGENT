import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MetaWhatsAppAdapter } from './whatsapp/whatsapp.adapter';
import { MockWhatsAppAdapter } from './whatsapp/mock-whatsapp.adapter';
import { ResendEmailAdapter } from './email/resend.adapter';
import { MockEmailAdapter } from './email/mock-email.adapter';
import { WhatsAppCredentials } from './whatsapp/whatsapp.interface';
import { ResendCredentials } from './email/resend.interface';
import { ConnectionTestResult } from '../interfaces/message-provider.interface';

export interface ProviderStatusInfo {
  provider: 'whatsapp' | 'resend';
  state: 'not_connected' | 'configured' | 'connected' | 'mock_mode' | 'disabled';
  isConfigured: boolean;
  isMock: boolean;
  from?: string;
  phoneNumberId?: string;
  lastSyncAt?: Date | null;
}

@Injectable()
export class AutomationProviderRegistry {
  private readonly logger = new Logger(AutomationProviderRegistry.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    public readonly metaWhatsApp: MetaWhatsAppAdapter,
    public readonly mockWhatsApp: MockWhatsAppAdapter,
    public readonly resendEmail: ResendEmailAdapter,
    public readonly mockEmail: MockEmailAdapter,
  ) {}

  /**
   * Resolve WhatsApp credentials and adapter for a given tenant.
   */
  async resolveWhatsApp(tenantId: string): Promise<{
    adapter: MetaWhatsAppAdapter | MockWhatsAppAdapter;
    creds: WhatsAppCredentials;
    isMock: boolean;
  }> {
    // 1. Check Tenant-specific Integration record
    try {
      if (this.prisma.isConnected) {
        const record = await this.prisma.integration.findUnique({
          where: {
            tenantId_provider: {
              tenantId,
              provider: 'whatsapp' as any,
            },
          },
        });

        if (record && record.isActive) {
          const creds = (record.credentials as Record<string, any>) || {};
          if (creds.accessToken && creds.phoneNumberId) {
            return {
              adapter: this.metaWhatsApp,
              creds: {
                accessToken: creds.accessToken,
                phoneNumberId: creds.phoneNumberId,
                businessAccountId: creds.businessAccountId,
                verifyToken: creds.verifyToken || this.config.get('WHATSAPP_VERIFY_TOKEN'),
                appSecret: creds.appSecret || this.config.get('WHATSAPP_APP_SECRET'),
              },
              isMock: false,
            };
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not load tenant WhatsApp integration: ${err.message}`);
    }

    // 2. Check Global / Environment variables
    const envToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    const envPhoneId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (envToken && envPhoneId) {
      return {
        adapter: this.metaWhatsApp,
        creds: {
          accessToken: envToken,
          phoneNumberId: envPhoneId,
          businessAccountId: this.config.get('WHATSAPP_BUSINESS_ACCOUNT_ID'),
          verifyToken: this.config.get('WHATSAPP_VERIFY_TOKEN'),
          appSecret: this.config.get('WHATSAPP_APP_SECRET'),
        },
        isMock: false,
      };
    }

    // 3. Fallback to Mock Adapter
    return {
      adapter: this.mockWhatsApp,
      creds: {},
      isMock: true,
    };
  }

  /**
   * Resolve Resend email credentials and adapter for a given tenant.
   */
  async resolveEmail(tenantId: string): Promise<{
    adapter: ResendEmailAdapter | MockEmailAdapter;
    creds: ResendCredentials;
    isMock: boolean;
  }> {
    // 1. Check Tenant-specific Integration record
    try {
      if (this.prisma.isConnected) {
        const record = await this.prisma.integration.findUnique({
          where: {
            tenantId_provider: {
              tenantId,
              provider: 'resend' as any,
            },
          },
        });

        if (record && record.isActive) {
          const creds = (record.credentials as Record<string, any>) || {};
          if (creds.apiKey) {
            return {
              adapter: this.resendEmail,
              creds: {
                apiKey: creds.apiKey,
                fromEmail: creds.fromEmail || this.config.get('RESEND_FROM_EMAIL'),
                fromName: creds.fromName || 'AgentCall AI',
                replyTo: creds.replyTo,
              },
              isMock: false,
            };
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not load tenant Resend integration: ${err.message}`);
    }

    // 2. Check Global / Environment variables
    const envKey = this.config.get<string>('RESEND_API_KEY');
    if (envKey) {
      return {
        adapter: this.resendEmail,
        creds: {
          apiKey: envKey,
          fromEmail: this.config.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev',
          fromName: 'AgentCall AI',
        },
        isMock: false,
      };
    }

    // 3. Fallback to Mock Adapter
    return {
      adapter: this.mockEmail,
      creds: {},
      isMock: true,
    };
  }

  /**
   * Get configuration status for WhatsApp and Resend for dashboard settings.
   */
  async getProviderStatuses(tenantId: string): Promise<ProviderStatusInfo[]> {
    const wa = await this.resolveWhatsApp(tenantId);
    const email = await this.resolveEmail(tenantId);

    return [
      {
        provider: 'whatsapp',
        state: wa.isMock ? 'mock_mode' : 'configured',
        isConfigured: !wa.isMock,
        isMock: wa.isMock,
        phoneNumberId: wa.creds.phoneNumberId ? `••••${wa.creds.phoneNumberId.slice(-4)}` : undefined,
      },
      {
        provider: 'resend',
        state: email.isMock ? 'mock_mode' : 'configured',
        isConfigured: !email.isMock,
        isMock: email.isMock,
        from: email.creds.fromEmail,
      },
    ];
  }

  /**
   * Safely test a provider connection for a tenant without sending live recipient messages.
   */
  async testProvider(tenantId: string, provider: 'whatsapp' | 'resend'): Promise<ConnectionTestResult> {
    if (provider === 'whatsapp') {
      const { adapter, creds } = await this.resolveWhatsApp(tenantId);
      return adapter.testConnection(creds);
    }
    if (provider === 'resend') {
      const { adapter, creds } = await this.resolveEmail(tenantId);
      return adapter.testConnection(creds);
    }
    return {
      success: false,
      provider,
      message: `Unknown provider: ${provider}`,
    };
  }
}
