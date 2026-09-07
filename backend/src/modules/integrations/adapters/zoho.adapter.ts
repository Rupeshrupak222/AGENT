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
export class ZohoAdapter implements ICrmProvider {
  private readonly logger = new Logger(ZohoAdapter.name);
  readonly providerName = 'zoho';

  private getBaseUrl(credentials: Record<string, any>): string {
    return credentials?.apiDomain || 'https://www.zohoapis.com/crm/v2';
  }

  async testConnection(credentials: Record<string, any>): Promise<CrmConnectionTestResult> {
    const token = credentials?.accessToken || credentials?.apiKey;
    const baseUrl = this.getBaseUrl(credentials);

    if (!token) {
      return {
        success: false,
        provider: 'zoho',
        message: 'Missing Zoho CRM access token.',
      };
    }

    try {
      const res = await axios.get(`${baseUrl}/Leads?per_page=1`, {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return {
        success: res.status >= 200 && res.status < 300,
        provider: 'zoho',
        message: 'Connected to Zoho CRM successfully.',
      };
    } catch (err: any) {
      this.logger.error(`Zoho test connection error: ${err.message}`);
      return {
        success: false,
        provider: 'zoho',
        message: `Zoho CRM connection failed: ${err.response?.data?.message || err.message}`,
      };
    }
  }

  async syncCallAnalysis(
    credentials: Record<string, any>,
    payload: CrmSyncPayload,
    settings?: Record<string, any>
  ): Promise<CrmSyncResult> {
    const token = credentials?.accessToken || credentials?.apiKey;
    const baseUrl = this.getBaseUrl(credentials);

    if (!token) {
      throw new Error('Zoho CRM access token missing.');
    }

    try {
      const headers = {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      };

      // 1. Search Lead by Phone
      let leadId: string | undefined;
      try {
        const searchRes = await axios.get(`${baseUrl}/Leads/search?phone=${encodeURIComponent(payload.phone)}`, {
          headers,
          timeout: 10000,
        });
        if (searchRes.data?.data?.length > 0) {
          leadId = searchRes.data.data[0].id;
        }
      } catch (searchErr) {
        this.logger.warn(`Zoho lead search failed: ${searchErr}`);
      }

      // 2. Create Lead if not exists
      let actionTaken: 'created' | 'updated' | 'noted' = 'noted';
      if (!leadId) {
        const createRes = await axios.post(
          `${baseUrl}/Leads`,
          {
            data: [
              {
                Last_Name: `Lead (${payload.phone})`,
                Phone: payload.phone,
                Company: 'Outbound Voice Outreach',
                Lead_Status: payload.analysis?.qualification?.qualified ? 'Pre-Qualified' : 'Attempted to Contact',
              },
            ],
          },
          { headers, timeout: 10000 }
        );
        leadId = createRes.data?.data?.[0]?.details?.id;
        actionTaken = 'created';
      }

      // 3. Attach Note to Lead with Post-Call Analysis
      const callScore = payload.analysis?.qualificationScore ?? 0;
      const callSummary = payload.analysis?.summary || 'No summary available';

      const noteRes = await axios.post(
        `${baseUrl}/Notes`,
        {
          data: [
            {
              Note_Title: `AI Call Analysis (Score: ${callScore}/100)`,
              Note_Content: `[AgentCall AI Intelligence]\n• Score: ${callScore}/100\n• Sentiment: ${payload.analysis?.sentiment || 'unknown'}\n• Summary: ${callSummary}\n• Next Action: ${payload.analysis?.nextAction || 'None'}\n• Direction: ${payload.direction}`,
              Parent_Id: leadId,
              se_module: 'Leads',
            },
          ],
        },
        { headers, timeout: 10000 }
      );

      const noteId = noteRes.data?.data?.[0]?.details?.id;

      return {
        success: true,
        provider: 'zoho',
        externalRecordId: leadId,
        externalActivityId: noteId,
        actionTaken,
        syncedFields: {
          leadId,
          noteId,
          score: callScore,
        },
        syncedAt: new Date(),
      };
    } catch (err: any) {
      this.logger.error(`Zoho sync error: ${err.response?.data?.message || err.message}`);
      return {
        success: false,
        provider: 'zoho',
        actionTaken: 'skipped',
        syncedFields: {},
        error: err.response?.data?.message || err.message,
        syncedAt: new Date(),
      };
    }
  }

  async fetchLeads(
    credentials: Record<string, any>,
    options?: { limit?: number; search?: string }
  ): Promise<CrmLeadRecord[]> {
    const token = credentials?.accessToken || credentials?.apiKey;
    const baseUrl = this.getBaseUrl(credentials);
    if (!token) return [];

    try {
      const res = await axios.get(`${baseUrl}/Leads?per_page=${options?.limit ?? 50}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        timeout: 10000,
      });

      return (res.data?.data || []).map((l: any) => ({
        id: l.id,
        externalId: l.id,
        name: l.Full_Name || `${l.First_Name || ''} ${l.Last_Name || ''}`.trim() || 'Zoho Lead',
        phone: l.Phone || '',
        email: l.Email || undefined,
        company: l.Company || undefined,
      }));
    } catch (err) {
      this.logger.error(`Zoho fetchLeads error: ${err}`);
      return [];
    }
  }
}
