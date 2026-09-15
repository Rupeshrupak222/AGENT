import { callScope, campaignScope, leadScope, agentScope, isManager } from '../scope';

describe('Scope Helper Suite', () => {
  describe('isManager', () => {
    it('returns true for manager role', () => {
      expect(isManager({ id: 'u1', role: 'manager' })).toBe(true);
    });

    it('returns false for non-manager roles or undefined actor', () => {
      expect(isManager({ id: 'u1', role: 'agent' })).toBe(false);
      expect(isManager({ id: 'u1', role: 'company_admin' })).toBe(false);
      expect(isManager(null)).toBe(false);
      expect(isManager(undefined)).toBe(false);
    });
  });

  describe('callScope', () => {
    it('scopes by managerId for manager actor', () => {
      expect(callScope({ id: 'mgr-1', role: 'manager' })).toEqual({
        agent: { managerId: 'mgr-1' },
      });
    });

    it('scopes by operatorUser for agent actor', () => {
      expect(callScope({ id: 'agent-1', role: 'agent' })).toEqual({
        agent: { operatorUser: { id: 'agent-1' } },
      });
    });

    it('returns empty object for unscoped roles (company_admin, super_admin, viewer)', () => {
      expect(callScope({ id: 'admin-1', role: 'company_admin' })).toEqual({});
      expect(callScope({ id: 'sa-1', role: 'super_admin' })).toEqual({});
      expect(callScope({ id: 'v-1', role: 'viewer' })).toEqual({});
      expect(callScope(null)).toEqual({});
    });
  });

  describe('campaignScope', () => {
    it('scopes by managerId for manager actor', () => {
      expect(campaignScope({ id: 'mgr-1', role: 'manager' })).toEqual({
        agent: { managerId: 'mgr-1' },
      });
    });

    it('scopes by operatorUser for agent actor', () => {
      expect(campaignScope({ id: 'agent-1', role: 'agent' })).toEqual({
        agent: { operatorUser: { id: 'agent-1' } },
      });
    });

    it('returns empty object for unscoped roles', () => {
      expect(campaignScope({ id: 'admin-1', role: 'company_admin' })).toEqual({});
      expect(campaignScope(null)).toEqual({});
    });
  });

  describe('leadScope', () => {
    it('scopes by assignedAgent managerId for manager actor', () => {
      expect(leadScope({ id: 'mgr-1', role: 'manager' })).toEqual({
        assignedAgent: { managerId: 'mgr-1' },
      });
    });

    it('scopes by assignedAgent operatorUser for agent actor', () => {
      expect(leadScope({ id: 'agent-1', role: 'agent' })).toEqual({
        assignedAgent: { operatorUser: { id: 'agent-1' } },
      });
    });

    it('returns empty object for unscoped roles', () => {
      expect(leadScope({ id: 'admin-1', role: 'company_admin' })).toEqual({});
      expect(leadScope(null)).toEqual({});
    });
  });

  describe('agentScope', () => {
    it('scopes by manager relation for manager actor', () => {
      expect(agentScope({ id: 'mgr-1', role: 'manager' })).toEqual({
        manager: { id: 'mgr-1' },
      });
    });

    it('scopes by operatorUser relation for agent actor', () => {
      expect(agentScope({ id: 'agent-1', role: 'agent' })).toEqual({
        operatorUser: { id: 'agent-1' },
      });
    });

    it('returns empty object for unscoped roles', () => {
      expect(agentScope({ id: 'admin-1', role: 'company_admin' })).toEqual({});
      expect(agentScope(null)).toEqual({});
    });
  });
});
