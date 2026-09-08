import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { CallsGateway } from '../../calls/calls.gateway';
import { CrmQueueService } from '../services/crm-queue.service';
import {
  CrmSyncPayload,
  ICrmProvider,
  CrmSyncResult,
} from '../interfaces/crm-provider.interface';
import { MockCrmAdapter } from '../adapters/mock-crm.adapter';
import { HubSpotAdapter } from '../adapters/hubspot.adapter';
import { SalesforceAdapter } from '../adapters/salesforce.adapter';
import { ZohoAdapter } from '../adapters/zoho.adapter';

@Injectable()
@Processor('crm-sync')
export class CrmSyncProcessor implements OnModuleInit {
  private readonly logger = new Logger(CrmSyncProcessor.name);
  private readonly providers = new Map<string, ICrmProvider>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly callsGateway: CallsGateway,
    private readonly crmQueueService: CrmQueueService,
    private readonly mockCrm: MockCrmAdapter,
    private readonly hubspot: HubSpotAdapter,
    private readonly salesforce: SalesforceAdapter,
    private readonly zoho: ZohoAdapter,
  ) {
    this.registerProvider(this.mockCrm);
    this.registerProvider(this.hubspot);
    this.registerProvider(this.salesforce);
    this.registerProvider(this.zoho);
  }

  onModuleInit() {
    this.crmQueueService.setInMemoryProcessor(async (payload) => {
      await this.processPayload(payload);
    });
  }

  private registerProvider(provider: ICrmProvider) {
    this.providers.set(provider.providerName.toLowerCase(), provider);
  }

  getProvider(name: string): ICrmProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  @Process()
  async handleBullJob(job: Job<CrmSyncPayload>): Promise<CrmSyncResult[]> {
    return this.processPayload(job.data);
  }

  /**
   * Main processor logic shared between BullMQ and In-Memory fallback.
   */
  async processPayload(payload: CrmSyncPayload): Promise<CrmSyncResult[]> {
    this.logger.log(
      `[CRM_SYNC_PROCESSING] callId=${payload.callId} tenantId=${payload.tenantId} phone=${payload.phone}`,
    );

    // Idempotency: Check if this sync was already completed successfully
    try {
      if (this.prisma.isConnected) {
        const existingAudit = await this.prisma.auditLog.findFirst({
          where: {
            tenantId: payload.tenantId,
            action: 'CRM_SYNC_SUCCESS',
            resource: 'Call',
            resourceId: payload.callId,
          },
        });

        if (existingAudit) {
          this.logger.log(
            `[CRM_SYNC_IDEMPOTENT_SKIP] callId=${payload.callId} — sync already completed successfully`,
          );
          return [{
            success: true,
            provider: 'idempotent_skip',
            actionTaken: 'skipped',
            syncedFields: {},
            syncedAt: new Date(),
          }];
        }
      }
    } catch {
      // If idempotency check fails, proceed with sync (safe fallback)
    }

    // 1. Fetch all active integrations for this tenant
    const activeIntegrations = await this.prisma.integration.findMany({
      where: {
        tenantId: payload.tenantId,
        isActive: true,
      },
    });

    if (activeIntegrations.length === 0) {
      this.logger.debug(`No active CRM integrations found for tenant [${payload.tenantId}].`);
      return [];
    }

    const results: CrmSyncResult[] = [];

    // 2. Iterate through each active CRM provider and synchronize
    for (const integration of activeIntegrations) {
      const providerName = integration.provider.toLowerCase();
      const adapter = this.providers.get(providerName);

      if (!adapter) {
        this.logger.warn(`No CRM adapter registered for provider [${integration.provider}]. Skipping.`);
        continue;
      }

      try {
        const credentials = (integration.credentials as Record<string, any>) || {};
        const settings = (integration.settings as Record<string, any>) || {};

        const result = await adapter.syncCallAnalysis(credentials, payload, settings);
        results.push(result);

        if (result.success) {
          // Update lastSyncAt on integration
          await this.prisma.integration.update({
            where: { id: integration.id },
            data: { lastSyncAt: new Date() },
          });

          // Log Audit Record
          try {
            await this.prisma.auditLog.create({
              data: {
                tenantId: payload.tenantId,
                action: 'CRM_SYNC_SUCCESS',
                resource: 'Call',
                resourceId: payload.callId,
                details: {
                  provider: integration.provider,
                  externalRecordId: result.externalRecordId,
                  externalActivityId: result.externalActivityId,
                  actionTaken: result.actionTaken,
                },
              },
            });
          } catch (auditErr) {
            this.logger.warn(`Failed to create audit log for CRM sync: ${auditErr}`);
          }

          // Broadcast Real-Time Gateway Event
          this.callsGateway.broadcastCrmSyncStatus(payload.tenantId, {
            callId: payload.callId,
            provider: integration.provider,
            status: 'synced',
            externalRecordId: result.externalRecordId,
          });

          this.logger.log(
            `[CRM_SYNC_SUCCESS] provider=${integration.provider} callId=${payload.callId} recordId=${result.externalRecordId}`,
          );
        } else {
          this.logger.warn(
            `[CRM_SYNC_FAILED] provider=${integration.provider} callId=${payload.callId} error=${result.error}`,
          );

          this.callsGateway.broadcastCrmSyncStatus(payload.tenantId, {
            callId: payload.callId,
            provider: integration.provider,
            status: 'failed',
            error: result.error,
          });
        }
      } catch (err: any) {
        this.logger.error(
          `[CRM_SYNC_EXCEPTION] provider=${integration.provider} callId=${payload.callId} err=${err.message}`,
        );

        this.callsGateway.broadcastCrmSyncStatus(payload.tenantId, {
          callId: payload.callId,
          provider: integration.provider,
          status: 'failed',
          error: err.message,
        });

        results.push({
          success: false,
          provider: integration.provider,
          actionTaken: 'skipped',
          syncedFields: {},
          error: err.message,
          syncedAt: new Date(),
        });
      }
    }

    return results;
  }
}
