import {
  TENANT_VIEW, TENANT_UPDATE,
  TEAM_VIEW, TEAM_INVITE, TEAM_UPDATE_ROLE, TEAM_REVOKE,
  BILLING_VIEW, BILLING_MANAGE, SUBSCRIPTION_UPGRADE, SUBSCRIPTION_DOWNGRADE,
  TELEPHONY_VIEW, TELEPHONY_MANAGE,
  INTEGRATIONS_VIEW, INTEGRATIONS_MANAGE,
  AI_AGENT_VIEW, AI_AGENT_CREATE, AI_AGENT_UPDATE, AI_AGENT_DELETE,
  AI_PROMPT_VIEW, AI_PROMPT_UPDATE,
  AI_VOICE_MANAGE, AI_KNOWLEDGE_MANAGE,
  CAMPAIGN_VIEW, CAMPAIGN_CREATE, CAMPAIGN_UPDATE, CAMPAIGN_DELETE, CAMPAIGN_EXECUTE, CAMPAIGN_PAUSE,
  LEAD_VIEW, LEAD_CREATE, LEAD_UPDATE, LEAD_DELETE, LEAD_IMPORT, LEAD_ASSIGN, LEAD_EXPORT,
  CALL_VIEW, CALL_INITIATE, CALL_MONITOR, CALL_INTERVENE, CALL_DISPOSITION,
  RECORDING_VIEW, RECORDING_EXPORT,
  ANALYTICS_VIEW, ANALYTICS_EXPORT,
  AUTOMATION_VIEW, AUTOMATION_CREATE, AUTOMATION_UPDATE, AUTOMATION_EXECUTE,
  CALENDAR_VIEW, CALENDAR_MANAGE,
  SECURITY_VIEW, SECURITY_MANAGE,
  AUDIT_LOG_VIEW,
  WORKSPACE_VIEW, WORKSPACE_MANAGE,
  NOTIFICATIONS_VIEW,
  PLATFORM_TENANT_CREATE, PLATFORM_TENANT_MANAGE,
  PLATFORM_TELEPHONY, PLATFORM_AI_PROVIDERS,
  PLATFORM_BILLING_CONFIG, PLATFORM_DIAGNOSTICS, PLATFORM_AUDIT, PLATFORM_FEATURE_FLAGS,
  PLATFORM_API_KEYS, PLATFORM_WEBHOOKS, PLATFORM_REPORTS,
} from './permissions';

export interface PermissionOption {
  value: string;
  label: string;
}

export interface PermissionGroup {
  group: string;
  permissions: PermissionOption[];
}

/** Grouped permission catalog used by the Super Admin role-matrix UI. */
export const GROUPED_PERMISSIONS: PermissionGroup[] = [
  {
    group: 'Platform',
    permissions: [
      { value: PLATFORM_TENANT_CREATE, label: 'Create tenant' },
      { value: PLATFORM_TENANT_MANAGE, label: 'Manage tenants' },
      { value: PLATFORM_TELEPHONY, label: 'Manage telephony' },
      { value: PLATFORM_AI_PROVIDERS, label: 'Manage AI providers' },
      { value: PLATFORM_BILLING_CONFIG, label: 'Configure billing' },
      { value: PLATFORM_DIAGNOSTICS, label: 'Run diagnostics' },
      { value: PLATFORM_AUDIT, label: 'View platform audit' },
      { value: PLATFORM_FEATURE_FLAGS, label: 'Manage feature flags' },
      { value: PLATFORM_API_KEYS, label: 'Manage API keys' },
      { value: PLATFORM_WEBHOOKS, label: 'Manage webhooks' },
      { value: PLATFORM_REPORTS, label: 'Manage scheduled reports' },
    ],
  },
  {
    group: 'Tenant',
    permissions: [
      { value: TENANT_VIEW, label: 'View tenant' },
      { value: TENANT_UPDATE, label: 'Update tenant' },
    ],
  },
  {
    group: 'Team',
    permissions: [
      { value: TEAM_VIEW, label: 'View team' },
      { value: TEAM_INVITE, label: 'Invite members' },
      { value: TEAM_UPDATE_ROLE, label: 'Change member roles' },
      { value: TEAM_REVOKE, label: 'Revoke members' },
    ],
  },
  {
    group: 'Billing',
    permissions: [
      { value: BILLING_VIEW, label: 'View billing' },
      { value: BILLING_MANAGE, label: 'Manage billing' },
      { value: SUBSCRIPTION_UPGRADE, label: 'Upgrade plan' },
      { value: SUBSCRIPTION_DOWNGRADE, label: 'Downgrade plan' },
    ],
  },
  {
    group: 'Telephony',
    permissions: [
      { value: TELEPHONY_VIEW, label: 'View telephony' },
      { value: TELEPHONY_MANAGE, label: 'Manage telephony' },
    ],
  },
  {
    group: 'Integrations',
    permissions: [
      { value: INTEGRATIONS_VIEW, label: 'View integrations' },
      { value: INTEGRATIONS_MANAGE, label: 'Manage integrations' },
    ],
  },
  {
    group: 'AI Agent',
    permissions: [
      { value: AI_AGENT_VIEW, label: 'View agents' },
      { value: AI_AGENT_CREATE, label: 'Create agents' },
      { value: AI_AGENT_UPDATE, label: 'Update agents' },
      { value: AI_AGENT_DELETE, label: 'Delete agents' },
    ],
  },
  {
    group: 'AI Prompt',
    permissions: [
      { value: AI_PROMPT_VIEW, label: 'View prompts' },
      { value: AI_PROMPT_UPDATE, label: 'Update prompts' },
    ],
  },
  {
    group: 'AI Voice & KB',
    permissions: [
      { value: AI_VOICE_MANAGE, label: 'Manage voices' },
      { value: AI_KNOWLEDGE_MANAGE, label: 'Manage knowledge base' },
    ],
  },
  {
    group: 'Campaign',
    permissions: [
      { value: CAMPAIGN_VIEW, label: 'View campaigns' },
      { value: CAMPAIGN_CREATE, label: 'Create campaigns' },
      { value: CAMPAIGN_UPDATE, label: 'Update campaigns' },
      { value: CAMPAIGN_DELETE, label: 'Delete campaigns' },
      { value: CAMPAIGN_EXECUTE, label: 'Execute campaigns' },
      { value: CAMPAIGN_PAUSE, label: 'Pause campaigns' },
    ],
  },
  {
    group: 'Lead',
    permissions: [
      { value: LEAD_VIEW, label: 'View leads' },
      { value: LEAD_CREATE, label: 'Create leads' },
      { value: LEAD_UPDATE, label: 'Update leads' },
      { value: LEAD_DELETE, label: 'Delete leads' },
      { value: LEAD_IMPORT, label: 'Import leads' },
      { value: LEAD_ASSIGN, label: 'Assign leads' },
      { value: LEAD_EXPORT, label: 'Export leads' },
    ],
  },
  {
    group: 'Call',
    permissions: [
      { value: CALL_VIEW, label: 'View calls' },
      { value: CALL_INITIATE, label: 'Initiate calls' },
      { value: CALL_MONITOR, label: 'Monitor calls' },
      { value: CALL_INTERVENE, label: 'Intervene / barge' },
      { value: CALL_DISPOSITION, label: 'Disposition calls' },
    ],
  },
  {
    group: 'Recording',
    permissions: [
      { value: RECORDING_VIEW, label: 'View recordings' },
      { value: RECORDING_EXPORT, label: 'Export recordings' },
    ],
  },
  {
    group: 'Analytics',
    permissions: [
      { value: ANALYTICS_VIEW, label: 'View analytics' },
      { value: ANALYTICS_EXPORT, label: 'Export analytics' },
    ],
  },
  {
    group: 'Automation',
    permissions: [
      { value: AUTOMATION_VIEW, label: 'View automations' },
      { value: AUTOMATION_CREATE, label: 'Create automations' },
      { value: AUTOMATION_UPDATE, label: 'Update automations' },
      { value: AUTOMATION_EXECUTE, label: 'Execute automations' },
    ],
  },
  {
    group: 'Calendar',
    permissions: [
      { value: CALENDAR_VIEW, label: 'View calendar' },
      { value: CALENDAR_MANAGE, label: 'Manage calendar' },
    ],
  },
  {
    group: 'Security',
    permissions: [
      { value: SECURITY_VIEW, label: 'View security' },
      { value: SECURITY_MANAGE, label: 'Manage security' },
    ],
  },
  {
    group: 'Audit Log',
    permissions: [
      { value: AUDIT_LOG_VIEW, label: 'View audit logs' },
    ],
  },
  {
    group: 'Workspace',
    permissions: [
      { value: WORKSPACE_VIEW, label: 'View workspace' },
      { value: WORKSPACE_MANAGE, label: 'Manage workspace' },
    ],
  },
  {
    group: 'Notifications',
    permissions: [
      { value: NOTIFICATIONS_VIEW, label: 'View & manage notifications' },
    ],
  },
];

/** Flat list of all known permission values (for validation). */
export const ALL_PERMISSION_VALUES: string[] = GROUPED_PERMISSIONS.flatMap((g) =>
  g.permissions.map((p) => p.value),
);