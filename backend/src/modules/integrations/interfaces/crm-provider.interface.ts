/**
 * Provider-Agnostic CRM Integration Interfaces
 * Adyapan AI / AgentCall AI Production Platform
 */

export interface CrmLeadRecord {
  id?: string;
  externalId?: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  status?: string;
  customFields?: Record<string, any>;
}

export interface CrmPostCallAnalysis {
  qualificationScore?: number;
  sentiment?: string;
  summary?: string;
  outcome?: string;
  nextAction?: string;
  appointmentDetected?: boolean;
  appointmentDetails?: any;
  qualification?: {
    qualified?: boolean;
    reasons?: string[];
    metCriteria?: string[];
    unmetCriteria?: string[];
  };
}

export interface CrmSyncPayload {
  tenantId: string;
  callId: string;
  leadId?: string;
  phone: string;
  direction: 'inbound' | 'outbound';
  duration?: number;
  callStatus: string;
  analysis?: CrmPostCallAnalysis;
  recordingUrl?: string;
  timestamp: Date;
}

export interface CrmSyncResult {
  success: boolean;
  provider: string;
  externalRecordId?: string;
  externalActivityId?: string;
  actionTaken: 'created' | 'updated' | 'noted' | 'skipped';
  syncedFields: Record<string, any>;
  error?: string;
  syncedAt: Date;
}

export interface CrmConnectionTestResult {
  success: boolean;
  provider: string;
  message: string;
  accountInfo?: {
    organization?: string;
    userId?: string;
    email?: string;
  };
}

export interface ICrmProvider {
  readonly providerName: string;

  /**
   * Validates API credentials with the external CRM
   */
  testConnection(credentials: Record<string, any>): Promise<CrmConnectionTestResult>;

  /**
   * Syncs post-call analysis, lead qualification score, and summary
   */
  syncCallAnalysis(
    credentials: Record<string, any>,
    payload: CrmSyncPayload,
    settings?: Record<string, any>
  ): Promise<CrmSyncResult>;

  /**
   * Optional: Fetches leads from external CRM for campaign enrollment
   */
  fetchLeads?(
    credentials: Record<string, any>,
    options?: { limit?: number; search?: string }
  ): Promise<CrmLeadRecord[]>;
}
