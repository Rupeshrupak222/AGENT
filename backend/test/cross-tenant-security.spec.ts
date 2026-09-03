import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from '../../../src/common/guards/tenant.guard';
import { PermissionsGuard } from '../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../src/common/decorators/permissions.decorator';
import { PERMISSIONS_KEY } from '../../../src/common/decorators/permissions.decorator';
import {
  USERS, TENANT_A, TENANT_B, RESOURCES,
} from '../../test-utils';

// ── Test helpers ────────────────────────────────────────────────
function createRequest(user: any, params: Record<string, string> = {}) {
  return { user, params, tenantContext: undefined as any };
}

function createExecutionContext(request: any, handlerPermissions?: string[]) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === PERMISSIONS_KEY) return handlerPermissions ?? null;
      return null;
    }),
  };

  return {
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext,
    reflector,
  };
}

// ══════════════════════════════════════════════════════════════════
// CROSS-TENANT IDOR TESTS
// ══════════════════════════════════════════════════════════════════

describe('Cross-Tenant IDOR Prevention', () => {
  describe('Tenant A user accessing Tenant B resources via route param', () => {
    it('should DENY company_admin A accessing /tenants/tenant-B-id', () => {
      const request = createRequest(USERS.companyAdminA, { tenantId: TENANT_B });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY manager A accessing /leads/lead-b-001 (if route has tenantId)', () => {
      const request = createRequest(USERS.managerA, { tenantId: TENANT_B, id: RESOURCES.leadB1 });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY agent A accessing tenant B lead', () => {
      const request = createRequest(USERS.agentA, { tenantId: TENANT_B });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY viewer A accessing tenant B resources', () => {
      const request = createRequest(USERS.viewerA, { tenantId: TENANT_B });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Tenant B user accessing Tenant A resources', () => {
    it('should DENY company_admin B accessing /tenants/tenant-A-id', () => {
      const request = createRequest(USERS.companyAdminB, { tenantId: TENANT_A });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY agent B accessing tenant A resources', () => {
      const request = createRequest(USERS.agentB, { tenantId: TENANT_A });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Super Admin cross-tenant access', () => {
    it('should ALLOW super_admin to access any tenant via route param', () => {
      const request = createRequest(USERS.superAdmin, { tenantId: TENANT_B });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      expect(guard.canActivate(context)).toBe(true);
      expect(request.tenantContext.tenantId).toBe(TENANT_B);
      expect(request.tenantContext.isSuperAdmin).toBe(true);
    });

    it('should ALLOW super_admin to access Tenant A', () => {
      const request = createRequest(USERS.superAdmin, { tenantId: TENANT_A });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      expect(guard.canActivate(context)).toBe(true);
      expect(request.tenantContext.tenantId).toBe(TENANT_A);
    });
  });

  describe('Same-tenant access (should be allowed)', () => {
    it('should ALLOW company_admin A accessing own tenant', () => {
      const request = createRequest(USERS.companyAdminA, { tenantId: TENANT_A });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should ALLOW agent A with no route param (uses own tenant)', () => {
      const request = createRequest(USERS.agentA, {});
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      expect(guard.canActivate(context)).toBe(true);
      expect(request.tenantContext.tenantId).toBe(TENANT_A);
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// ROLE ESCALATION TESTS
// ══════════════════════════════════════════════════════════════════

describe('Role Escalation Prevention', () => {
  describe('Viewer cannot perform write operations', () => {
    it('should DENY viewer creating leads (LEAD_CREATE)', () => {
      const request = createRequest(USERS.viewerA);
      const { context } = createExecutionContext(request, ['lead:create']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY viewer creating AI agents (AI_AGENT_CREATE)', () => {
      const request = createRequest(USERS.viewerA);
      const { context } = createExecutionContext(request, ['ai_agent:create']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY viewer managing billing (BILLING_MANAGE)', () => {
      const request = createRequest(USERS.viewerA);
      const { context } = createExecutionContext(request, ['billing:manage']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY viewer inviting users (TEAM_INVITE)', () => {
      const request = createRequest(USERS.viewerA);
      const { context } = createExecutionContext(request, ['team:invite']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Agent cannot escalate to Manager permissions', () => {
    it('should DENY agent creating campaigns (CAMPAIGN_CREATE)', () => {
      const request = createRequest(USERS.agentA);
      const { context } = createExecutionContext(request, ['campaign:create']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY agent importing leads (LEAD_IMPORT)', () => {
      const request = createRequest(USERS.agentA);
      const { context } = createExecutionContext(request, ['lead:import']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY agent initiating calls (CALL_INITIATE)', () => {
      const request = createRequest(USERS.agentA);
      const { context } = createExecutionContext(request, ['call:initiate']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY agent monitoring calls (CALL_MONITOR)', () => {
      const request = createRequest(USERS.agentA);
      const { context } = createExecutionContext(request, ['call:monitor']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY agent managing AI prompts (AI_PROMPT_UPDATE)', () => {
      const request = createRequest(USERS.agentA);
      const { context } = createExecutionContext(request, ['ai_prompt:update']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Manager cannot escalate to Company Admin permissions', () => {
    it('should DENY manager managing billing (BILLING_MANAGE)', () => {
      const request = createRequest(USERS.managerA);
      const { context } = createExecutionContext(request, ['billing:manage']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY manager revoking users (TEAM_REVOKE)', () => {
      const request = createRequest(USERS.managerA);
      const { context } = createExecutionContext(request, ['team:revoke']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY manager changing roles (TEAM_UPDATE_ROLE)', () => {
      const request = createRequest(USERS.managerA);
      const { context } = createExecutionContext(request, ['team:update_role']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY manager managing security settings (SECURITY_MANAGE)', () => {
      const request = createRequest(USERS.managerA);
      const { context } = createExecutionContext(request, ['security:manage']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY manager deleting AI agents (AI_AGENT_DELETE)', () => {
      const request = createRequest(USERS.managerA);
      const { context } = createExecutionContext(request, ['ai_agent:delete']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY manager exporting leads (LEAD_EXPORT)', () => {
      const request = createRequest(USERS.managerA);
      const { context } = createExecutionContext(request, ['lead:export']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Company Admin cannot access Platform Admin permissions', () => {
    it('should DENY company_admin creating tenants (PLATFORM_TENANT_CREATE)', () => {
      const request = createRequest(USERS.companyAdminA);
      const { context } = createExecutionContext(request, ['platform:tenant_create']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY company_admin managing platform telephony (PLATFORM_TELEPHONY)', () => {
      const request = createRequest(USERS.companyAdminA);
      const { context } = createExecutionContext(request, ['platform:telephony']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY company_admin managing AI providers (PLATFORM_AI_PROVIDERS)', () => {
      const request = createRequest(USERS.companyAdminA);
      const { context } = createExecutionContext(request, ['platform:ai_providers']);
      const guard = new PermissionsGuard({} as any);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Super Admin should have all permissions', () => {
    it('should ALLOW super_admin platform:tenant_create', () => {
      const request = createRequest(USERS.superAdmin);
      const { context } = createExecutionContext(request, ['platform:tenant_create']);
      const guard = new PermissionsGuard({} as any);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should ALLOW super_admin billing:manage', () => {
      const request = createRequest(USERS.superAdmin);
      const { context } = createExecutionContext(request, ['billing:manage']);
      const guard = new PermissionsGuard({} as any);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should ALLOW super_admin security:manage', () => {
      const request = createRequest(USERS.superAdmin);
      const { context } = createExecutionContext(request, ['security:manage']);
      const guard = new PermissionsGuard({} as any);

      expect(guard.canActivate(context)).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// UNAUTHENTICATED ACCESS TESTS
// ══════════════════════════════════════════════════════════════════

describe('Unauthenticated Access Prevention', () => {
  it('should DENY when no user on request', () => {
    const request = createRequest(null);
    const { context } = createExecutionContext(request, ['lead:view']);
    const guard = new PermissionsGuard({} as any);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should DENY when user has no role', () => {
    const request = createRequest({ id: 'user1', tenantId: 't1' });
    const { context } = createExecutionContext(request, ['lead:view']);
    const guard = new PermissionsGuard({} as any);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should DENY TenantGuard when no user', () => {
    const request = createRequest(null);
    const { context } = createExecutionContext(request);
    const guard = new TenantGuard({} as any);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should DENY TenantGuard when no tenantId', () => {
    const request = createRequest({ id: 'user1', role: 'agent' });
    const { context } = createExecutionContext(request);
    const guard = new TenantGuard({} as any);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

// ══════════════════════════════════════════════════════════════════
// SUSPENDED TENANT TESTS
// ══════════════════════════════════════════════════════════════════

describe('Suspended Tenant Prevention', () => {
  it('should DENY non-super_admin from suspended tenant', () => {
    const request = createRequest({
      ...USERS.companyAdminA,
      tenant: { isActive: false },
    });
    const { context } = createExecutionContext(request);
    const guard = new TenantGuard({} as any);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should ALLOW super_admin even with suspended tenant', () => {
    const request = createRequest({
      ...USERS.superAdmin,
      tenant: { isActive: false },
    });
    const { context } = createExecutionContext(request);
    const guard = new TenantGuard({} as any);

    // super_admin bypasses tenant status check
    expect(guard.canActivate(context)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════
// MULTI-PERMISSION TESTS
// ══════════════════════════════════════════════════════════════════

describe('Multi-Permission Requirements', () => {
  it('should DENY manager when missing ANY of multiple required permissions', () => {
    const request = createRequest(USERS.managerA);
    const { context } = createExecutionContext(request, [
      'lead:view',    // manager HAS this
      'lead:export',  // manager does NOT have this
    ]);
    const guard = new PermissionsGuard({} as any);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should ALLOW company_admin when having ALL required permissions', () => {
    const request = createRequest(USERS.companyAdminA);
    const { context } = createExecutionContext(request, [
      'lead:view',
      'lead:create',
      'lead:import',
    ]);
    const guard = new PermissionsGuard({} as any);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should ALLOW when no permissions required', () => {
    const request = createRequest(USERS.viewerA);
    const { context } = createExecutionContext(request, undefined);
    const guard = new PermissionsGuard({} as any);

    expect(guard.canActivate(context)).toBe(true);
  });
});
