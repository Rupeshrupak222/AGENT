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
export class HubSpotAdapter implements ICrmProvider {
  private readonly logger = new Logger(HubSpotAdapter.name);
  readonly providerName = 'hubspot';
  private readonly baseUrl = 'https://api.hubapi.com';

  async testConnection(credentials: Record<string, any>): Promise<CrmConnectionTestResult> {
    const token = credentials?.accessToken || credentials?.apiKey;
    if (!token) {
      return {
        success: false,
        provider: 'hubspot',
        message: 'Missing HubSpot access token.',
      };
    }

    try {
      const res = await axios.get(`${this.baseUrl}/crm/v3/objects/contacts?limit=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return {
        success: res.status >= 200 && res.status < 300,
        provider: 'hubspot',
        message: 'Connected to HubSpot CRM successfully.',
      };
    } catch (err: any) {
      this.logger.error(`HubSpot test connection error: ${err.message}`);
      return {
        success: false,
        provider: 'hubspot',
        message: `HubSpot connection failed: ${err.response?.data?.message || err.message}`,
      };
    }
  }

  async syncCallAnalysis(
    credentials: Record<string, any>,
    payload: CrmSyncPayload,
    settings?: Record<string, any>
  ): Promise<CrmSyncResult> {
    const token = credentials?.accessToken || credentials?.apiKey;
    if (!token) {
      throw new Error('HubSpot access token missing.');
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // 1. Search for contact by phone
      let contactId: string | undefined;
      try {
        const searchRes = await axios.post(
          `${this.baseUrl}/crm/v3/objects/contacts/search`,
          {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: 'phone',
                    operator: 'EQ',
                    value: payload.phone,
                  },
                ],
              },
            ],
          },
          { headers, timeout: 10000 }
        );

        if (searchRes.data?.results?.length > 0) {
          contactId = searchRes.data.results[0].id;
        }
      } catch (searchErr) {
        this.logger.warn(`HubSpot search failed, proceeding with contact creation: ${searchErr}`);
      }

      // 2. If contact not found, create contact
      let actionTaken: 'created' | 'updated' | 'noted' = 'updated';
      if (!contactId) {
        const createRes = await axios.post(
          `${this.baseUrl}/crm/v3/objects/contacts`,
          {
            properties: {
              phone: payload.phone,
              lifecyclestage: payload.analysis?.qualification?.qualified ? 'qualifiedlead' : 'lead',
            },
          },
          { headers, timeout: 10000 }
        );
        contactId = createRes.data?.id;
        actionTaken = 'created';
      }

      // 3. Log Call engagement in HubSpot
      const callScore = payload.analysis?.qualificationScore ?? 0;
      const callSummary = payload.analysis?.summary || 'No AI summary generated';
      const nextAction = payload.analysis?.nextAction || 'None';

      const callProperties: Record<string, any> = {
        hs_timestamp: new Date(payload.timestamp).toISOString(),
        hs_call_direction: payload.direction === 'inbound' ? 'INBOUND' : 'OUTBOUND',
        hs_call_duration: payload.duration ? payload.duration * 1000 : 0,
        hs_call_status: 'COMPLETED',
        hs_call_title: `AI Call (${payload.direction}) - Score: ${callScore}/100`,
        hs_call_body: `[AgentCall AI Post-Call Intelligence]\n\n• Score: ${callScore}/100\n• Sentiment: ${payload.analysis?.sentiment || 'unknown'}\n• Summary: ${callSummary}\n• Next Action: ${nextAction}\n• Recording: ${payload.recordingUrl || 'N/A'}`,
      };

      const callRes = await axios.post(
        `${this.baseUrl}/crm/v3/objects/calls`,
        { properties: callProperties },
        { headers, timeout: 10000 }
      );

      const externalActivityId = callRes.data?.id;

      // 4. Associate call with contact if contactId exists
      if (contactId && externalActivityId) {
        try {
          await axios.put(
            `${this.baseUrl}/crm/v3/objects/calls/${externalActivityId}/associations/contacts/${contactId}/call_to_contact`,
            {},
            { headers, timeout: 10000 }
          );
        } catch (assocErr) {
          this.logger.warn(`Could not associate call with contact in HubSpot: ${assocErr}`);
        }
      }

      return {
        success: true,
        provider: 'hubspot',
        externalRecordId: contactId,
        externalActivityId,
        actionTaken,
        syncedFields: {
          score: callScore,
          sentiment: payload.analysis?.sentiment,
          summary: callSummary,
          associatedContactId: contactId,
        },
        syncedAt: new Date(),
      };
    } catch (err: any) {
      this.logger.error(`HubSpot syncCallAnalysis error: ${err.response?.data?.message || err.message}`);
      return {
        success: false,
        provider: 'hubspot',
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
    if (!token) return [];

    try {
      const res = await axios.get(
        `${this.baseUrl}/crm/v3/objects/contacts?limit=${options?.limit ?? 50}&properties=firstname,lastname,phone,email,company`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );

      return (res.data?.results || []).map((c: any) => ({
        id: c.id,
        externalId: c.id,
        name: `${c.properties?.firstname || ''} ${c.properties?.lastname || ''}`.trim() || 'HubSpot Contact',
        phone: c.properties?.phone || '',
        email: c.properties?.email || undefined,
        company: c.properties?.company || undefined,
      }));
    } catch (err) {
      this.logger.error(`HubSpot fetchLeads error: ${err}`);
      return [];
    }
  }
}
