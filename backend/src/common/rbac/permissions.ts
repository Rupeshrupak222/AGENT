/**
 * Centralized Permission Constants for AgentCall AI
 * Every permission in the system is defined here.
 * No permission should be scattered across the codebase.
 */

// ── Tenant ──────────────────────────────────────────────────
export const TENANT_VIEW = 'tenant:view' as const;
export const TENANT_UPDATE = 'tenant:update' as const;

// ── Team ────────────────────────────────────────────────────
export const TEAM_VIEW = 'team:view' as const;
export const TEAM_INVITE = 'team:invite' as const;
export const TEAM_UPDATE_ROLE = 'team:update_role' as const;
export const TEAM_REVOKE = 'team:revoke' as const;

// ── Billing ─────────────────────────────────────────────────
export const BILLING_VIEW = 'billing:view' as const;
export const BILLING_MANAGE = 'billing:manage' as const;
export const SUBSCRIPTION_UPGRADE = 'subscription:upgrade' as const;
export const SUBSCRIPTION_DOWNGRADE = 'subscription:downgrade' as const;

// ── Telephony ───────────────────────────────────────────────
export const TELEPHONY_VIEW = 'telephony:view' as const;
export const TELEPHONY_MANAGE = 'telephony:manage' as const;

// ── Integrations ────────────────────────────────────────────
export const INTEGRATIONS_VIEW = 'integrations:view' as const;
export const INTEGRATIONS_MANAGE = 'integrations:manage' as const;

// ── AI Agent ────────────────────────────────────────────────
export const AI_AGENT_VIEW = 'ai_agent:view' as const;
export const AI_AGENT_CREATE = 'ai_agent:create' as const;
export const AI_AGENT_UPDATE = 'ai_agent:update' as const;
export const AI_AGENT_DELETE = 'ai_agent:delete' as const;

// ── AI Prompt ───────────────────────────────────────────────
export const AI_PROMPT_VIEW = 'ai_prompt:view' as const;
export const AI_PROMPT_UPDATE = 'ai_prompt:update' as const;

// ── AI Voice ────────────────────────────────────────────────
export const AI_VOICE_MANAGE = 'ai_voice:manage' as const;

// ── AI Knowledge Base ───────────────────────────────────────
export const AI_KNOWLEDGE_MANAGE = 'ai_knowledge:manage' as const;

// ── Campaign ────────────────────────────────────────────────
export const CAMPAIGN_VIEW = 'campaign:view' as const;
export const CAMPAIGN_CREATE = 'campaign:create' as const;
export const CAMPAIGN_UPDATE = 'campaign:update' as const;
export const CAMPAIGN_EXECUTE = 'campaign:execute' as const;
export const CAMPAIGN_PAUSE = 'campaign:pause' as const;

// ── Lead ────────────────────────────────────────────────────
export const LEAD_VIEW = 'lead:view' as const;
export const LEAD_CREATE = 'lead:create' as const;
export const LEAD_UPDATE = 'lead:update' as const;
export const LEAD_DELETE = 'lead:delete' as const;
export const LEAD_IMPORT = 'lead:import' as const;
export const LEAD_ASSIGN = 'lead:assign' as const;
export const LEAD_EXPORT = 'lead:export' as const;

// ── Call ────────────────────────────────────────────────────
export const CALL_VIEW = 'call:view' as const;
export const CALL_INITIATE = 'call:initiate' as const;
export const CALL_MONITOR = 'call:monitor' as const;
export const CALL_INTERVENE = 'call:intervene' as const;
export const CALL_DISPOSITION = 'call:disposition' as const;

// ── Recording ───────────────────────────────────────────────
export const RECORDING_VIEW = 'recording:view' as const;
export const RECORDING_EXPORT = 'recording:export' as const;

// ── Analytics ───────────────────────────────────────────────
export const ANALYTICS_VIEW = 'analytics:view' as const;
export const ANALYTICS_EXPORT = 'analytics:export' as const;

// ── Automation ──────────────────────────────────────────────
export const AUTOMATION_VIEW = 'automation:view' as const;
export const AUTOMATION_CREATE = 'automation:create' as const;
export const AUTOMATION_UPDATE = 'automation:update' as const;
export const AUTOMATION_EXECUTE = 'automation:execute' as const;

// ── Calendar ────────────────────────────────────────────────
export const CALENDAR_VIEW = 'calendar:view' as const;
export const CALENDAR_MANAGE = 'calendar:manage' as const;

// ── Security ────────────────────────────────────────────────
export const SECURITY_VIEW = 'security:view' as const;
export const SECURITY_MANAGE = 'security:manage' as const;

// ── Audit Log ───────────────────────────────────────────────
export const AUDIT_LOG_VIEW = 'audit_log:view' as const;

// ── Workspace ───────────────────────────────────────────────
export const WORKSPACE_VIEW = 'workspace:view' as const;
export const WORKSPACE_MANAGE = 'workspace:manage' as const;

// ── Platform (Super Admin only) ─────────────────────────────
export const PLATFORM_TENANT_CREATE = 'platform:tenant_create' as const;
export const PLATFORM_TENANT_MANAGE = 'platform:tenant_manage' as const;
export const PLATFORM_TELEPHONY = 'platform:telephony' as const;
export const PLATFORM_AI_PROVIDERS = 'platform:ai_providers' as const;
export const PLATFORM_BILLING_CONFIG = 'platform:billing_config' as const;
export const PLATFORM_DIAGNOSTICS = 'platform:diagnostics' as const;
export const PLATFORM_AUDIT = 'platform:audit' as const;

/** Union type of all permission strings */
export type Permission =
  | typeof TENANT_VIEW | typeof TENANT_UPDATE
  | typeof TEAM_VIEW | typeof TEAM_INVITE | typeof TEAM_UPDATE_ROLE | typeof TEAM_REVOKE
  | typeof BILLING_VIEW | typeof BILLING_MANAGE
  | typeof SUBSCRIPTION_UPGRADE | typeof SUBSCRIPTION_DOWNGRADE
  | typeof TELEPHONY_VIEW | typeof TELEPHONY_MANAGE
  | typeof INTEGRATIONS_VIEW | typeof INTEGRATIONS_MANAGE
  | typeof AI_AGENT_VIEW | typeof AI_AGENT_CREATE | typeof AI_AGENT_UPDATE | typeof AI_AGENT_DELETE
  | typeof AI_PROMPT_VIEW | typeof AI_PROMPT_UPDATE
  | typeof AI_VOICE_MANAGE | typeof AI_KNOWLEDGE_MANAGE
  | typeof CAMPAIGN_VIEW | typeof CAMPAIGN_CREATE | typeof CAMPAIGN_UPDATE
  | typeof CAMPAIGN_EXECUTE | typeof CAMPAIGN_PAUSE
  | typeof LEAD_VIEW | typeof LEAD_CREATE | typeof LEAD_UPDATE | typeof LEAD_DELETE
  | typeof LEAD_IMPORT | typeof LEAD_ASSIGN | typeof LEAD_EXPORT
  | typeof CALL_VIEW | typeof CALL_INITIATE | typeof CALL_MONITOR | typeof CALL_INTERVENE | typeof CALL_DISPOSITION
  | typeof RECORDING_VIEW | typeof RECORDING_EXPORT
  | typeof ANALYTICS_VIEW | typeof ANALYTICS_EXPORT
  | typeof AUTOMATION_VIEW | typeof AUTOMATION_CREATE | typeof AUTOMATION_UPDATE | typeof AUTOMATION_EXECUTE
  | typeof CALENDAR_VIEW | typeof CALENDAR_MANAGE
  | typeof SECURITY_VIEW | typeof SECURITY_MANAGE
  | typeof AUDIT_LOG_VIEW
  | typeof WORKSPACE_VIEW | typeof WORKSPACE_MANAGE
  | typeof PLATFORM_TENANT_CREATE | typeof PLATFORM_TENANT_MANAGE
  | typeof PLATFORM_TELEPHONY | typeof PLATFORM_AI_PROVIDERS
  | typeof PLATFORM_BILLING_CONFIG | typeof PLATFORM_DIAGNOSTICS | typeof PLATFORM_AUDIT;
