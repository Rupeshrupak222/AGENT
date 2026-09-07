import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  ICrmProvider,
  CrmConnectionTestResult,
  CrmSyncPayload,
  CrmSyncResult,
  CrmLeadRecord,
} from '../interfaces/crm-provider.interface';

@Injectable()
export class SalesforceAdapter implements ICrmProvider {
  private readonly logger = new Logger(SalesforceAdapter.name);
  readonly providerName = 'salesforce';

  async testConnection(credentials: Record<string, any>): Promise<CrmConnectionTestResult> {
    const token = credentials?.accessToken || credentials?.apiKey;
    const instanceUrl = credentials?.instanceUrl || 'https://login.salesforce.com';

    if (!token) {
      return {
        success: false,
        provider: 'salesforce',
        message: 'Missing Salesforce access token.',
      };
    }

    try {
      const res = await axios.get(`${instanceUrl}/services/data/v58.0/limits`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return {
        success: res.status >= 200 && res.status < 300,
        provider: 'salesforce',
        message: 'Connected to Salesforce CRM successfully.',
      };
    } catch (err: any) {
      this.logger.error(`Salesforce test connection error: ${err.message}`);
      return {
        success: false,
        provider: 'salesforce',
        message: `Salesforce connection failed: ${err.response?.data?.[0]?.message || err.message}`,
      };
    }
  }

  async syncCallAnalysis(
    credentials: Record<string, any>,
    payload: CrmSyncPayload,
    settings?: Record<string, any>
  ): Promise<CrmSyncResult> {
    const token = credentials?.accessToken || credentials?.apiKey;
    const instanceUrl = credentials?.instanceUrl;

    if (!token || !instanceUrl) {
      throw new Error('Salesforce accessToken and instanceUrl are required.');
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // 1. Check if Lead exists with this phone
      const cleanPhone = payload.phone.replace(/[^0-9]/g, '');
      const query = encodeURIComponent(`SELECT Id, Name, Status FROM Lead WHERE Phone LIKE '%${cleanPhone}%' LIMIT 1`);
      const queryRes = await axios.get(`${instanceUrl}/services/data/v58.0/query?q=${query}`, {
        headers,
        timeout: 10000,
      });

      let leadId: string | undefined = queryRes.data?.records?.[0]?.Id;
      let actionTaken: 'created' | 'updated' | 'noted' = 'noted';

      // 2. If no lead found, optionally create Lead
      if (!leadId) {
        const createLeadRes = await axios.post(
          `${instanceUrl}/services/data/v58.0/sobjects/Lead`,
          {
            LastName: `Lead (${payload.phone})`,
            Company: 'Direct Call Outreach',
            Phone: payload.phone,
            Rating: payload.analysis?.qualification?.qualified ? 'Hot' : 'Warm',
            Status: 'Open - Not Contacted',
          },
          { headers, timeout: 10000 }
        );
        leadId = createLeadRes.data?.id;
        actionTaken = 'created';
      }

      // 3. Create Task (Activity) in Salesforce
      const callScore = payload.analysis?.qualificationScore ?? 0;
      const callSummary = payload.analysis?.summary || 'No summary';

      const taskRes = await axios.post(
        `${instanceUrl}/services/data/v58.0/sobjects/Task`,
        {
          WhoId: leadId,
          Subject: `AI Voice Call (${payload.direction}) - Score: ${callScore}/100`,
          Status: 'Completed',
          Priority: callScore >= 70 ? 'High' : 'Normal',
          Description: `[AgentCall AI Intelligence]\nScore: ${callScore}/100\nSentiment: ${payload.analysis?.sentiment || 'unknown'}\nSummary: ${callSummary}\nNext Action: ${payload.analysis?.nextAction || 'None'}`,
        },
        { headers, timeout: 10000 }
      );

      return {
        success: true,
        provider: 'salesforce',
        externalRecordId: leadId,
        externalActivityId: taskRes.data?.id,
        actionTaken,
        syncedFields: {
          leadId,
          taskId: taskRes.data?.id,
          score: callScore,
        },
        syncedAt: new Date(),
      };
    } catch (err: any) {
      this.logger.error(`Salesforce sync error: ${err.response?.data?.[0]?.message || err.message}`);
      return {
        success: false,
        provider: 'salesforce',
        actionTaken: 'skipped',
        syncedFields: {},
        error: err.response?.data?.[0]?.message || err.message,
        syncedAt: new Date(),
      };
    }
  }

  async fetchLeads(
    credentials: Record<string, any>,
    options?: { limit?: number; search?: string }
  ): Promise<CrmLeadRecord[]> {
    const token = credentials?.accessToken;
    const instanceUrl = credentials?.instanceUrl;
    if (!token || !instanceUrl) return [];

    try {
      const query = encodeURIComponent(`SELECT Id, Name, Phone, Email, Company FROM Lead LIMIT ${options?.limit ?? 50}`);
      const res = await axios.get(`${instanceUrl}/services/data/v58.0/query?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      return (res.data?.records || []).map((r: any) => ({
        id: r.Id,
        externalId: r.Id,
        name: r.Name || 'Salesforce Lead',
        phone: r.Phone || '',
        email: r.Email || undefined,
        company: r.Company || undefined,
      }));
    } catch (err) {
      this.logger.error(`Salesforce fetchLeads error: ${err}`);
      return [];
    }
  }
}
