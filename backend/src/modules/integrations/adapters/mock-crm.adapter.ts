import { Injectable, Logger } from '@nestjs/common';
import {
  ICrmProvider,
  CrmConnectionTestResult,
  CrmSyncPayload,
  CrmSyncResult,
  CrmLeadRecord,
} from '../interfaces/crm-provider.interface';

@Injectable()
export class MockCrmAdapter implements ICrmProvider {
  private readonly logger = new Logger(MockCrmAdapter.name);
  readonly providerName = 'mock';

  // In-memory contact & activity store for tests/dev
  private contacts = new Map<string, CrmLeadRecord>();
  private activities = new Map<string, any[]>();

  async testConnection(credentials: Record<string, any>): Promise<CrmConnectionTestResult> {
    const apiKey = credentials?.apiKey || credentials?.accessToken || credentials?.token;
    if (apiKey === 'invalid_key') {
      return {
        success: false,
        provider: 'mock',
        message: 'Invalid API Key supplied for Mock CRM.',
      };
    }

    return {
      success: true,
      provider: 'mock',
      message: 'Connection to Mock CRM successfully verified.',
      accountInfo: {
        organization: 'Mock Enterprise Dev Workspace',
        userId: 'mock-user-001',
        email: 'admin@devmockcrm.local',
      },
    };
  }

  async syncCallAnalysis(
    credentials: Record<string, any>,
    payload: CrmSyncPayload,
    settings?: Record<string, any>
  ): Promise<CrmSyncResult> {
    this.logger.log(`[MockCRM] Syncing call ${payload.callId} for phone ${payload.phone}`);

    const existingId = `mock-contact-${payload.phone.replace(/\D/g, '')}`;
    const isNew = !this.contacts.has(existingId);

    const contact: CrmLeadRecord = {
      id: existingId,
      externalId: existingId,
      name: `Contact (${payload.phone})`,
      phone: payload.phone,
      status: payload.analysis?.qualification?.qualified ? 'qualified' : 'contacted',
      customFields: {
        lastCallId: payload.callId,
        lastCallScore: payload.analysis?.qualificationScore ?? 0,
        lastCallSentiment: payload.analysis?.sentiment ?? 'unknown',
        lastCallSummary: payload.analysis?.summary ?? '',
        nextAction: payload.analysis?.nextAction ?? '',
        recordingUrl: payload.recordingUrl ?? '',
      },
    };

    this.contacts.set(existingId, contact);

    const activity = {
      activityId: `mock-act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      callId: payload.callId,
      duration: payload.duration,
      score: payload.analysis?.qualificationScore,
      summary: payload.analysis?.summary,
      timestamp: payload.timestamp,
    };

    const leadActs = this.activities.get(existingId) || [];
    leadActs.push(activity);
    this.activities.set(existingId, leadActs);

    return {
      success: true,
      provider: 'mock',
      externalRecordId: existingId,
      externalActivityId: activity.activityId,
      actionTaken: isNew ? 'created' : 'updated',
      syncedFields: {
        score: contact.customFields?.lastCallScore,
        sentiment: contact.customFields?.lastCallSentiment,
        summary: contact.customFields?.lastCallSummary,
      },
      syncedAt: new Date(),
    };
  }

  async fetchLeads(
    credentials: Record<string, any>,
    options?: { limit?: number; search?: string }
  ): Promise<CrmLeadRecord[]> {
    const list = Array.from(this.contacts.values());
    if (options?.search) {
      const q = options.search.toLowerCase();
      return list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
      );
    }
    return list.slice(0, options?.limit ?? 50);
  }

  // Test helpers
  getContact(phone: string): CrmLeadRecord | undefined {
    return this.contacts.get(`mock-contact-${phone.replace(/\D/g, '')}`);
  }

  clearStore(): void {
    this.contacts.clear();
    this.activities.clear();
  }
}
