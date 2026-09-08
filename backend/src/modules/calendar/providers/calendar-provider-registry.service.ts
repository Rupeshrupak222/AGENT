import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ICalendarProvider } from './calendar-provider.interface';
import { MockCalendarAdapter } from './mock-calendar.adapter';
import { CalComCalendarAdapter } from './calcom.adapter';
import { CalendarProviderException, CalendarErrorCode } from './calendar-errors';

export const SUPPORTED_CALENDAR_PROVIDERS = ['native', 'calcom', 'mock'] as const;
export type CalendarProviderName = (typeof SUPPORTED_CALENDAR_PROVIDERS)[number];

export interface ResolvedCalendarProvider {
  providerName: CalendarProviderName;
  adapter: ICalendarProvider;
  credentials: Record<string, any>;
  settings: Record<string, any>;
  isMock: boolean;
  source: 'integration' | 'env' | 'default';
}

/**
 * Resolves the calendar provider for a tenant:
 *   1. Explicit provider override (request-level)
 *   2. Tenant's saved `calcom` Integration (apiKey/eventTypeId/timezone)
 *   3. Global env vars (CALCOM_API_KEY / CALCOM_EVENT_TYPE_ID / CALCOM_API_URL)
 *   4. Deterministic MockCalendarAdapter (dev/test fallback)
 * Credentials are never logged or returned wholesale by callers.
 */
@Injectable()
export class CalendarProviderRegistry {
  private readonly logger = new Logger(CalendarProviderRegistry.name);

  constructor(
    private prisma: PrismaService,
    private mockAdapter: MockCalendarAdapter,
    private calcomAdapter: CalComCalendarAdapter,
  ) {}

  isValidProvider(name: string | undefined): name is CalendarProviderName {
    return !!name && (SUPPORTED_CALENDAR_PROVIDERS as readonly string[]).includes(name);
  }

  async resolve(
    tenantId: string,
    providerOverride?: string,
  ): Promise<ResolvedCalendarProvider> {
    if (providerOverride && providerOverride !== 'auto') {
      if (this.isValidProvider(providerOverride)) {
        if (providerOverride === 'calcom') {
          const env = this.fromEnv();
          if (env) return env;
        }
        return this.providerFor(providerOverride, {});
      }
      // Unknown override → fall through to tenant config
    }

    const tenantConfig = await this.fromIntegration(tenantId);
    if (tenantConfig) return tenantConfig;

    const env = this.fromEnv();
    if (env) return env;

    return this.providerFor('mock', {});
  }

  private providerFor(
    providerName: CalendarProviderName,
    credentials: Record<string, any>,
    settings: Record<string, any> = {},
    source: ResolvedCalendarProvider['source'] = 'default',
  ): ResolvedCalendarProvider {
    const adapter: ICalendarProvider =
      providerName === 'calcom' ? this.calcomAdapter : this.mockAdapter;
    return {
      providerName,
      adapter,
      credentials,
      settings,
      isMock: providerName === 'mock' || providerName === 'native',
      source,
    };
  }

  private async fromIntegration(tenantId: string): Promise<ResolvedCalendarProvider | null> {
    if (!this.prisma.isConnected) {
      this.logger.debug('[CalendarProviderRegistry] Prisma offline — skipping tenant integration lookup');
      return null;
    }
    try {
      const integration = await this.prisma.integration.findUnique({
        where: { tenantId_provider: { tenantId, provider: 'calcom' } },
      });
      if (!integration || !integration.isActive) return null;

      const credentials = (integration.credentials ?? {}) as Record<string, any>;
      const settings = (integration.settings ?? {}) as Record<string, any>;
      if (!credentials.apiKey) return null;

      return this.providerFor('calcom', credentials, settings, 'integration');
    } catch (err: any) {
      this.logger.warn(
        `[CalendarProviderRegistry] Integration lookup failed: ${err?.message ?? 'unknown error'}`,
      );
      return null;
    }
  }

  private fromEnv(): ResolvedCalendarProvider | null {
    const apiKey = process.env.CALCOM_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) return null;
    const settings: Record<string, any> = {
      eventTypeId: process.env.CALCOM_EVENT_TYPE_ID ?? undefined,
      timezone: process.env.CALCOM_TIMEZONE ?? 'UTC',
      defaultDuration: process.env.CALCOM_DEFAULT_DURATION ? parseInt(process.env.CALCOM_DEFAULT_DURATION, 10) : undefined,
    };
    return this.providerFor(
      'calcom',
      { apiKey, apiUrl: process.env.CALCOM_API_URL },
      settings,
      'env',
    );
  }

  /** Throws a normalized exception when a caller explicitly requires calcom but none is configured. */
  requireCalcom(tenantId: string): Promise<ResolvedCalendarProvider> {
    return Promise.resolve()
      .then(() => this.resolve(tenantId, 'calcom'))
      .then((resolved) => {
        if (resolved.providerName !== 'calcom') {
          throw new CalendarProviderException(
            CalendarErrorCode.AUTH_FAILED,
            'Cal.com is not configured for this tenant. Configure it in Settings.',
            false,
          );
        }
        return resolved;
      });
  }
}