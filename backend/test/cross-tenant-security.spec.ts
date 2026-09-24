import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { TenantGuard } from '../src/common/guards/tenant.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { PERMISSIONS_KEY } from '../src/common/decorators/permissions.decorator';
import {
  USERS, TENANT_A, TENANT_B, RESOURCES,
} from './test-utils';

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

function makePermissionsGuard(request: any, handlerPermissions?: string[]) {
  const { context, reflector } = createExecutionContext(request, handlerPermissions);
  const guard = new PermissionsGuard(reflector as any, { isConnected: false } as any);
  return { guard, context };
}

// Normalize sync-throwing (TenantGuard) and async-rejecting (PermissionsGuard) behavior.
async function expectGuardReject(guard: any, context: any, errType: any) {
  try {
    await Promise.resolve(guard.canActivate(context));
  } catch (e) {
    expect(e).toBeInstanceOf(errType);
    return;
  }
  throw new Error(`Expected guard to reject with ${errType.name}`);
}

async function expectGuardAllow(guard: any, context: any) {
  await expect(Promise.resolve(guard.canActivate(context))).resolves.toBe(true);
}

// ══════════════════════════════════════════════════════════════════
// CROSS-TENANT IDOR TESTS
// ══════════════════════════════════════════════════════════════════

describe('Cross-Tenant IDOR Prevention', () => {
  describe('Tenant A user accessing Tenant B resources via route param', () => {
    it('should DENY company_admin A accessing /tenants/tenant-B-id', async () => {
      const request = createRequest(USERS.companyAdminA, { tenantId: TENANT_B });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY manager A accessing /leads/lead-b-001 (if route has tenantId)', async () => {
      const request = createRequest(USERS.managerA, { tenantId: TENANT_B, id: RESOURCES.leadB1 });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY agent A accessing tenant B lead', async () => {
      const request = createRequest(USERS.agentA, { tenantId: TENANT_B });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY viewer A accessing tenant B resources', async () => {
      const request = createRequest(USERS.viewerA, { tenantId: TENANT_B });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      await expectGuardReject(guard, context, ForbiddenException);
    });
  });

  describe('Tenant B user accessing Tenant A resources', () => {
    it('should DENY company_admin B accessing /tenants/tenant-A-id', async () => {
      const request = createRequest(USERS.companyAdminB, { tenantId: TENANT_A });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY agent B accessing tenant A resources', async () => {
      const request = createRequest(USERS.agentB, { tenantId: TENANT_A });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      await expectGuardReject(guard, context, ForbiddenException);
    });
  });

  describe('Super Admin cross-tenant access', () => {
    it('should ALLOW super_admin to access any tenant via route param', async () => {
      const request = createRequest(USERS.superAdmin, { tenantId: TENANT_B });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      await expectGuardAllow(guard, context);
      expect(request.tenantContext.tenantId).toBe(TENANT_B);
      expect(request.tenantContext.isSuperAdmin).toBe(true);
    });

    it('should ALLOW super_admin to access Tenant A', async () => {
      const request = createRequest(USERS.superAdmin, { tenantId: TENANT_A });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      await expectGuardAllow(guard, context);
      expect(request.tenantContext.tenantId).toBe(TENANT_A);
    });
  });

  describe('Same-tenant access (should be allowed)', () => {
    it('should ALLOW company_admin A accessing own tenant', async () => {
      const request = createRequest(USERS.companyAdminA, { tenantId: TENANT_A });
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      await expectGuardAllow(guard, context);
    });

    it('should ALLOW agent A with no route param (uses own tenant)', async () => {
      const request = createRequest(USERS.agentA, {});
      const { context } = createExecutionContext(request);
      const guard = new TenantGuard({} as any);

      await expectGuardAllow(guard, context);
      expect(request.tenantContext.tenantId).toBe(TENANT_A);
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// ROLE ESCALATION TESTS
// ══════════════════════════════════════════════════════════════════

describe('Role Escalation Prevention', () => {
  describe('Viewer cannot perform write operations', () => {
    it('should DENY viewer creating leads (LEAD_CREATE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.viewerA), ['lead:create']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY viewer creating AI agents (AI_AGENT_CREATE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.viewerA), ['ai_agent:create']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY viewer managing billing (BILLING_MANAGE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.viewerA), ['billing:manage']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY viewer inviting users (TEAM_INVITE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.viewerA), ['team:invite']);
      await expectGuardReject(guard, context, ForbiddenException);
    });
  });

  describe('Agent cannot escalate to Manager permissions', () => {
    it('should DENY agent creating campaigns (CAMPAIGN_CREATE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.agentA), ['campaign:create']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY agent importing leads (LEAD_IMPORT)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.agentA), ['lead:import']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should ALLOW agent initiating calls (CALL_INITIATE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.agentA), ['call:initiate']);
      await expectGuardAllow(guard, context);
    });

    it('should DENY agent monitoring calls (CALL_MONITOR)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.agentA), ['call:monitor']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY agent managing AI prompts (AI_PROMPT_UPDATE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.agentA), ['ai_prompt:update']);
      await expectGuardReject(guard, context, ForbiddenException);
    });
  });

  describe('Manager cannot escalate to Company Admin permissions', () => {
    it('should DENY manager managing billing (BILLING_MANAGE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.managerA), ['billing:manage']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY manager revoking users (TEAM_REVOKE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.managerA), ['team:revoke']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY manager changing roles (TEAM_UPDATE_ROLE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.managerA), ['team:update_role']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY manager managing security settings (SECURITY_MANAGE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.managerA), ['security:manage']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY manager deleting AI agents (AI_AGENT_DELETE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.managerA), ['ai_agent:delete']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY manager exporting leads (LEAD_EXPORT)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.managerA), ['lead:export']);
      await expectGuardReject(guard, context, ForbiddenException);
    });
  });

  describe('Company Admin cannot access Platform Admin permissions', () => {
    it('should DENY company_admin creating tenants (PLATFORM_TENANT_CREATE)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.companyAdminA), ['platform:tenant_create']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY company_admin managing platform telephony (PLATFORM_TELEPHONY)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.companyAdminA), ['platform:telephony']);
      await expectGuardReject(guard, context, ForbiddenException);
    });

    it('should DENY company_admin managing AI providers (PLATFORM_AI_PROVIDERS)', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.companyAdminA), ['platform:ai_providers']);
      await expectGuardReject(guard, context, ForbiddenException);
    });
  });

  describe('Super Admin should have all permissions', () => {
    it('should ALLOW super_admin platform:tenant_create', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.superAdmin), ['platform:tenant_create']);
      await expectGuardAllow(guard, context);
    });

    it('should ALLOW super_admin billing:manage', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.superAdmin), ['billing:manage']);
      await expectGuardAllow(guard, context);
    });

    it('should ALLOW super_admin security:manage', async () => {
      const { guard, context } = makePermissionsGuard(createRequest(USERS.superAdmin), ['security:manage']);
      await expectGuardAllow(guard, context);
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// UNAUTHENTICATED ACCESS TESTS
// ══════════════════════════════════════════════════════════════════

describe('Unauthenticated Access Prevention', () => {
  it('should DENY when no user on request', async () => {
    const { guard, context } = makePermissionsGuard(createRequest(null), ['lead:view']);
    await expectGuardReject(guard, context, ForbiddenException);
  });

  it('should DENY when user has no role', async () => {
    const { guard, context } = makePermissionsGuard(createRequest({ id: 'user1', tenantId: 't1' }), ['lead:view']);
    await expectGuardReject(guard, context, ForbiddenException);
  });

  it('should DENY TenantGuard when no user', async () => {
    const request = createRequest(null);
    const { context } = createExecutionContext(request);
    const guard = new TenantGuard({} as any);

    await expectGuardReject(guard, context, UnauthorizedException);
  });

  it('should DENY TenantGuard when no tenantId', async () => {
    const request = createRequest({ id: 'user1', role: 'agent' });
    const { context } = createExecutionContext(request);
    const guard = new TenantGuard({} as any);

    await expectGuardReject(guard, context, ForbiddenException);
  });
});

// ══════════════════════════════════════════════════════════════════
// SUSPENDED TENANT TESTS
// ══════════════════════════════════════════════════════════════════

describe('Suspended Tenant Prevention', () => {
  it('should DENY non-super_admin from suspended tenant', async () => {
    const request = createRequest({
      ...USERS.companyAdminA,
      tenant: { isActive: false },
    });
    const { context } = createExecutionContext(request);
    const guard = new TenantGuard({} as any);

    await expectGuardReject(guard, context, ForbiddenException);
  });

  it('should ALLOW super_admin even with suspended tenant', async () => {
    const request = createRequest({
      ...USERS.superAdmin,
      tenant: { isActive: false },
    });
    const { context } = createExecutionContext(request);
    const guard = new TenantGuard({} as any);

    // super_admin bypasses tenant status check
    await expectGuardAllow(guard, context);
  });
});

// ══════════════════════════════════════════════════════════════════
// MULTI-PERMISSION TESTS
// ══════════════════════════════════════════════════════════════════

describe('Multi-Permission Requirements', () => {
  it('should DENY manager when missing ANY of multiple required permissions', async () => {
    const { guard, context } = makePermissionsGuard(createRequest(USERS.managerA), [
      'lead:view',    // manager HAS this
      'lead:export',  // manager does NOT have this
    ]);
    await expectGuardReject(guard, context, ForbiddenException);
  });

  it('should ALLOW company_admin when having ALL required permissions', async () => {
    const { guard, context } = makePermissionsGuard(createRequest(USERS.companyAdminA), [
      'lead:view',
      'lead:create',
      'lead:import',
    ]);
    await expectGuardAllow(guard, context);
  });

  it('should ALLOW when no permissions required', async () => {
    const { guard, context } = makePermissionsGuard(createRequest(USERS.viewerA), undefined);
    await expectGuardAllow(guard, context);
  });
});