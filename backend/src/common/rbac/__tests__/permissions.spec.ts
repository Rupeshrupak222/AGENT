import { hasPermission, hasAllPermissions, hasAnyPermission, ROLE_PERMISSIONS } from '../role-permissions';
import {
  TENANT_VIEW, TENANT_UPDATE,
  TEAM_VIEW, TEAM_INVITE, TEAM_UPDATE_ROLE, TEAM_REVOKE,
  BILLING_VIEW, BILLING_MANAGE,
  AI_AGENT_VIEW, AI_AGENT_CREATE, AI_AGENT_UPDATE, AI_AGENT_DELETE,
  AI_PROMPT_VIEW, AI_PROMPT_UPDATE,
  CAMPAIGN_VIEW, CAMPAIGN_CREATE, CAMPAIGN_EXECUTE,
  LEAD_VIEW, LEAD_CREATE, LEAD_UPDATE, LEAD_DELETE, LEAD_IMPORT, LEAD_ASSIGN, LEAD_EXPORT,
  CALL_VIEW, CALL_INITIATE, CALL_MONITOR, CALL_INTERVENE, CALL_DISPOSITION,
  RECORDING_VIEW, RECORDING_EXPORT,
  ANALYTICS_VIEW, ANALYTICS_EXPORT,
  AUTOMATION_VIEW, AUTOMATION_CREATE,
  SECURITY_VIEW, SECURITY_MANAGE,
  AUDIT_LOG_VIEW,
  PLATFORM_TENANT_CREATE, PLATFORM_TELEPHONY,
  WORKSPACE_VIEW, WORKSPACE_MANAGE,
  TELEPHONY_MANAGE, INTEGRATIONS_MANAGE,
  SUBSCRIPTION_UPGRADE, AI_VOICE_MANAGE, AI_KNOWLEDGE_MANAGE,
  CALENDAR_VIEW, CALENDAR_MANAGE,
} from '../permissions';

describe('RBAC Permission System', () => {
  describe('hasPermission', () => {
    describe('super_admin', () => {
      it('should have all platform permissions', () => {
        expect(hasPermission('super_admin', PLATFORM_TENANT_CREATE)).toBe(true);
        expect(hasPermission('super_admin', PLATFORM_TELEPHONY)).toBe(true);
      });

      it('should have all tenant permissions', () => {
        expect(hasPermission('super_admin', TENANT_VIEW)).toBe(true);
        expect(hasPermission('super_admin', BILLING_MANAGE)).toBe(true);
        expect(hasPermission('super_admin', AI_AGENT_CREATE)).toBe(true);
        expect(hasPermission('super_admin', CALL_INITIATE)).toBe(true);
        expect(hasPermission('super_admin', RECORDING_EXPORT)).toBe(true);
        expect(hasPermission('super_admin', SECURITY_MANAGE)).toBe(true);
      });
    });

    describe('company_admin', () => {
      it('should have full tenant management', () => {
        expect(hasPermission('company_admin', TENANT_VIEW)).toBe(true);
        expect(hasPermission('company_admin', TENANT_UPDATE)).toBe(true);
        expect(hasPermission('company_admin', TEAM_INVITE)).toBe(true);
        expect(hasPermission('company_admin', TEAM_REVOKE)).toBe(true);
        expect(hasPermission('company_admin', BILLING_MANAGE)).toBe(true);
        expect(hasPermission('company_admin', SECURITY_MANAGE)).toBe(true);
      });

      it('should have AI and campaign management', () => {
        expect(hasPermission('company_admin', AI_AGENT_CREATE)).toBe(true);
        expect(hasPermission('company_admin', AI_AGENT_DELETE)).toBe(true);
        expect(hasPermission('company_admin', CAMPAIGN_CREATE)).toBe(true);
        expect(hasPermission('company_admin', CAMPAIGN_EXECUTE)).toBe(true);
      });

      it('should have lead management', () => {
        expect(hasPermission('company_admin', LEAD_IMPORT)).toBe(true);
        expect(hasPermission('company_admin', LEAD_EXPORT)).toBe(true);
        expect(hasPermission('company_admin', LEAD_DELETE)).toBe(true);
      });

      it('should NOT have platform permissions', () => {
        expect(hasPermission('company_admin', PLATFORM_TENANT_CREATE)).toBe(false);
        expect(hasPermission('company_admin', PLATFORM_TELEPHONY)).toBe(false);
      });
    });

    describe('manager', () => {
      it('should have operational permissions', () => {
        expect(hasPermission('manager', AI_AGENT_CREATE)).toBe(true);
        expect(hasPermission('manager', AI_AGENT_UPDATE)).toBe(true);
        expect(hasPermission('manager', CAMPAIGN_CREATE)).toBe(true);
        expect(hasPermission('manager', LEAD_IMPORT)).toBe(true);
        expect(hasPermission('manager', LEAD_ASSIGN)).toBe(true);
        expect(hasPermission('manager', CALL_INITIATE)).toBe(true);
        expect(hasPermission('manager', CALL_INTERVENE)).toBe(true);
      });

      it('should NOT have governance permissions', () => {
        expect(hasPermission('manager', BILLING_MANAGE)).toBe(false);
        expect(hasPermission('manager', TEAM_INVITE)).toBe(false);
        expect(hasPermission('manager', TEAM_REVOKE)).toBe(false);
        expect(hasPermission('manager', SECURITY_MANAGE)).toBe(false);
        expect(hasPermission('manager', TENANT_UPDATE)).toBe(false);
      });

      it('should NOT have delete permissions', () => {
        expect(hasPermission('manager', AI_AGENT_DELETE)).toBe(false);
        expect(hasPermission('manager', LEAD_DELETE)).toBe(false);
      });

      it('should NOT have export permissions', () => {
        expect(hasPermission('manager', LEAD_EXPORT)).toBe(false);
        expect(hasPermission('manager', RECORDING_EXPORT)).toBe(false);
      });
    });

    describe('agent', () => {
      it('should have limited operational permissions', () => {
        expect(hasPermission('agent', LEAD_VIEW)).toBe(true);
        expect(hasPermission('agent', LEAD_UPDATE)).toBe(true);
        expect(hasPermission('agent', CALL_VIEW)).toBe(true);
        expect(hasPermission('agent', CALL_INITIATE)).toBe(true);
        expect(hasPermission('agent', CALL_DISPOSITION)).toBe(true);
        expect(hasPermission('agent', RECORDING_VIEW)).toBe(true);
      });

      it('should NOT have creation permissions', () => {
        expect(hasPermission('agent', LEAD_CREATE)).toBe(false);
        expect(hasPermission('agent', AI_AGENT_CREATE)).toBe(false);
        expect(hasPermission('agent', CAMPAIGN_CREATE)).toBe(false);
      });

      it('should NOT have management permissions', () => {
        expect(hasPermission('agent', BILLING_VIEW)).toBe(false);
        expect(hasPermission('agent', TEAM_INVITE)).toBe(false);
        expect(hasPermission('agent', SECURITY_VIEW)).toBe(false);
        expect(hasPermission('agent', AI_PROMPT_UPDATE)).toBe(false);
      });

      it('should NOT have monitoring/intervention permissions', () => {
        expect(hasPermission('agent', CALL_MONITOR)).toBe(false);
        expect(hasPermission('agent', CALL_INTERVENE)).toBe(false);
      });
    });

    describe('viewer', () => {
      it('should have read-only permissions', () => {
        expect(hasPermission('viewer', TENANT_VIEW)).toBe(true);
        expect(hasPermission('viewer', TEAM_VIEW)).toBe(true);
        expect(hasPermission('viewer', AI_AGENT_VIEW)).toBe(true);
        expect(hasPermission('viewer', LEAD_VIEW)).toBe(true);
        expect(hasPermission('viewer', CALL_VIEW)).toBe(true);
        expect(hasPermission('viewer', RECORDING_VIEW)).toBe(true);
        expect(hasPermission('viewer', ANALYTICS_VIEW)).toBe(true);
        expect(hasPermission('viewer', AUTOMATION_VIEW)).toBe(true);
        expect(hasPermission('viewer', CALENDAR_VIEW)).toBe(true);
        expect(hasPermission('viewer', AUDIT_LOG_VIEW)).toBe(true);
      });

      it('should NOT have any write permissions', () => {
        expect(hasPermission('viewer', LEAD_CREATE)).toBe(false);
        expect(hasPermission('viewer', LEAD_UPDATE)).toBe(false);
        expect(hasPermission('viewer', LEAD_DELETE)).toBe(false);
        expect(hasPermission('viewer', AI_AGENT_CREATE)).toBe(false);
        expect(hasPermission('viewer', AI_AGENT_UPDATE)).toBe(false);
        expect(hasPermission('viewer', CAMPAIGN_CREATE)).toBe(false);
        expect(hasPermission('viewer', CALL_INITIATE)).toBe(false);
        expect(hasPermission('viewer', CALL_DISPOSITION)).toBe(false);
        expect(hasPermission('viewer', BILLING_MANAGE)).toBe(false);
        expect(hasPermission('viewer', TEAM_INVITE)).toBe(false);
        expect(hasPermission('viewer', TEAM_REVOKE)).toBe(false);
        expect(hasPermission('viewer', SECURITY_MANAGE)).toBe(false);
        expect(hasPermission('viewer', RECORDING_EXPORT)).toBe(false);
        expect(hasPermission('viewer', LEAD_EXPORT)).toBe(false);
        expect(hasPermission('viewer', ANALYTICS_EXPORT)).toBe(false);
      });

      it('should NOT have monitoring permissions', () => {
        expect(hasPermission('viewer', CALL_MONITOR)).toBe(false);
        expect(hasPermission('viewer', CALL_INTERVENE)).toBe(false);
      });
    });

    describe('unknown role', () => {
      it('should deny all permissions', () => {
        expect(hasPermission('unknown_role', LEAD_VIEW)).toBe(false);
        expect(hasPermission('', TEAM_VIEW)).toBe(false);
      });
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all required permissions', () => {
      expect(hasAllPermissions('company_admin', [TENANT_VIEW, TEAM_INVITE, BILLING_MANAGE])).toBe(true);
    });

    it('should return false when user is missing any required permission', () => {
      expect(hasAllPermissions('manager', [BILLING_MANAGE, AI_AGENT_CREATE])).toBe(false);
      expect(hasAllPermissions('agent', [LEAD_VIEW, LEAD_CREATE])).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', () => {
      expect(hasAnyPermission('agent', [BILLING_MANAGE, LEAD_VIEW])).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      expect(hasAnyPermission('viewer', [LEAD_CREATE, BILLING_MANAGE])).toBe(false);
    });
  });

  describe('role-permission map completeness', () => {
    it('should have entries for all 5 roles', () => {
      expect(ROLE_PERMISSIONS).toHaveProperty('super_admin');
      expect(ROLE_PERMISSIONS).toHaveProperty('company_admin');
      expect(ROLE_PERMISSIONS).toHaveProperty('manager');
      expect(ROLE_PERMISSIONS).toHaveProperty('agent');
      expect(ROLE_PERMISSIONS).toHaveProperty('viewer');
    });

    it('viewer should have strictly fewer permissions than company_admin', () => {
      const viewerPerms = ROLE_PERMISSIONS.viewer.length;
      const adminPerms = ROLE_PERMISSIONS.company_admin.length;
      expect(viewerPerms).toBeLessThan(adminPerms);
    });

    it('agent should have strictly fewer permissions than manager', () => {
      const agentPerms = ROLE_PERMISSIONS.agent.length;
      const managerPerms = ROLE_PERMISSIONS.manager.length;
      expect(agentPerms).toBeLessThan(managerPerms);
    });
  });
});
