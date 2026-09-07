import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrmQueueService } from './services/crm-queue.service';
import { CrmSyncProcessor } from './processors/crm-sync.processor';
import { CrmSyncPayload, CrmConnectionTestResult } from './interfaces/crm-provider.interface';
import { IntegrationProvider } from '@prisma/client';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crmQueueService: CrmQueueService,
    private readonly crmSyncProcessor: CrmSyncProcessor,
  ) {}

  /**
   * List all configured integrations for tenant.
   */
  async listIntegrations(tenantId: string) {
    const records = await this.prisma.integration.findMany({
      where: { tenantId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        settings: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
        // Omit raw sensitive credentials for security; indicate presence
        credentials: true,
      },
    });

    return records.map((r) => {
      const creds = (r.credentials as Record<string, any>) || {};
      const hasKey = Boolean(creds.apiKey || creds.accessToken || creds.token);
      return {
        id: r.id,
        provider: r.provider,
        isActive: r.isActive,
        settings: r.settings,
        lastSyncAt: r.lastSyncAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        isConfigured: hasKey,
        maskedKey: hasKey ? '••••••••' : null,
      };
    });
  }

  /**
   * Get specific integration for tenant and provider.
   */
  async getIntegration(tenantId: string, provider: IntegrationProvider) {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
    });

    if (!integration) {
      return null;
    }

    const creds = (integration.credentials as Record<string, any>) || {};
    return {
      id: integration.id,
      provider: integration.provider,
      isActive: integration.isActive,
      settings: integration.settings,
      lastSyncAt: integration.lastSyncAt,
      isConfigured: Boolean(creds.apiKey || creds.accessToken || creds.token),
    };
  }

  /**
   * Upsert integration configuration.
   */
  async upsertIntegration(
    tenantId: string,
    provider: IntegrationProvider,
    data: {
      isActive?: boolean;
      credentials?: Record<string, any>;
      settings?: Record<string, any>;
    },
  ) {
    const existing = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
    });

    const mergedCredentials = {
      ...((existing?.credentials as Record<string, any>) || {}),
      ...(data.credentials || {}),
    };

    const mergedSettings = {
      ...((existing?.settings as Record<string, any>) || {}),
      ...(data.settings || {}),
    };

    const updated = await this.prisma.integration.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
      create: {
        tenantId,
        provider,
        isActive: data.isActive ?? false,
        credentials: mergedCredentials,
        settings: mergedSettings,
      },
      update: {
        isActive: data.isActive !== undefined ? data.isActive : existing?.isActive,
        credentials: mergedCredentials,
        settings: mergedSettings,
      },
    });

    this.logger.log(`Upserted integration [${provider}] for tenant [${tenantId}], active=${updated.isActive}`);
    return {
      id: updated.id,
      provider: updated.provider,
      isActive: updated.isActive,
      settings: updated.settings,
      lastSyncAt: updated.lastSyncAt,
    };
  }

  /**
   * Test connection to CRM provider.
   */
  async testConnection(
    tenantId: string,
    provider: string,
    providedCredentials?: Record<string, any>,
  ): Promise<CrmConnectionTestResult> {
    const adapter = this.crmSyncProcessor.getProvider(provider);
    if (!adapter) {
      throw new BadRequestException(`Unsupported CRM provider: ${provider}`);
    }

    let credentials = providedCredentials;
    if (!credentials || Object.keys(credentials).length === 0) {
      // Load saved credentials from DB
      const integration = await this.prisma.integration.findUnique({
        where: {
          tenantId_provider: {
            tenantId,
            provider: provider as IntegrationProvider,
          },
        },
      });
      credentials = (integration?.credentials as Record<string, any>) || {};
    }

    if (!credentials || Object.keys(credentials).length === 0) {
      return {
        success: false,
        provider,
        message: 'No credentials configured or provided for connection test.',
      };
    }

    return adapter.testConnection(credentials);
  }

  /**
   * Enqueues call synchronization to BullMQ / In-Memory queue.
   */
  async enqueueCallSync(payload: CrmSyncPayload) {
    return this.crmQueueService.enqueueSyncJob(payload);
  }

  /**
   * Manually trigger immediate CRM sync for a call.
   */
  async syncCallNow(tenantId: string, callId: string) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: {
        analysis: true,
        recordings: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!call || call.tenantId !== tenantId) {
      throw new NotFoundException(`Call [${callId}] not found for tenant.`);
    }

    const analysis = call.analysis;
    const recording = call.recordings?.[0];

    const payload: CrmSyncPayload = {
      tenantId,
      callId: call.id,
      leadId: call.leadId || undefined,
      phone: call.phone,
      direction: call.direction as any,
      duration: call.duration || 0,
      callStatus: call.status,
      recordingUrl: recording?.storageUrl || call.recordingUrl || undefined,
      analysis: analysis
        ? {
            qualificationScore: analysis.leadScore || 0,
            sentiment: analysis.sentiment || 'unknown',
            summary: analysis.summary || '',
            outcome: analysis.outcome || undefined,
            nextAction: analysis.nextAction || undefined,
            qualification: (analysis.qualification as any) || undefined,
          }
        : undefined,
      timestamp: call.startedAt,
    };

    return this.crmSyncProcessor.processPayload(payload);
  }
}
