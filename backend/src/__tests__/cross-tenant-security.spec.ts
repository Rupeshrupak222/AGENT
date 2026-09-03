import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { USERS, TENANT_A, TENANT_B } from './test-utils';

// ── Test helpers ────────────────────────────────────────────────
function createRequest(user: any, params: Record<string, string> = {}) {
  return { user, params, tenantContext: undefined as any };
}

function mockReflector(handlerPermissions?: string[]) {
  return {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === PERMISSIONS_KEY) return handlerPermissions ?? null;
      return null;
    }),
  };
}

function mockContext(request: any) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

function createPermissionsGuard(request: any, handlerPermissions?: string[]) {
  const guard = new PermissionsGuard(mockReflector(handlerPermissions) as any);
  const context = mockContext(request);
  return { guard, context };
}

function createTenantGuard(request: any) {
  const guard = new TenantGuard({} as any);
  const context = mockContext(request);
  return { guard, context };
}

// ══════════════════════════════════════════════════════════════════
// CROSS-TENANT IDOR TESTS
// ══════════════════════════════════════════════════════════════════

describe('Cross-Tenant IDOR Prevention', () => {
  describe('Tenant A user accessing Tenant B resources via route param', () => {
    it('should DENY company_admin A accessing /tenants/tenant-B-id', () => {
      const req = createRequest(USERS.companyAdminA, { tenantId: TENANT_B });
      const { guard, context } = createTenantGuard(req);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY manager A accessing tenant B lead', () => {
      const req = createRequest(USERS.managerA, { tenantId: TENANT_B, id: 'lead-b-001' });
      const { guard, context } = createTenantGuard(req);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY agent A accessing tenant B lead', () => {
      const req = createRequest(USERS.agentA, { tenantId: TENANT_B });
      const { guard, context } = createTenantGuard(req);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY viewer A accessing tenant B resources', () => {
      const req = createRequest(USERS.viewerA, { tenantId: TENANT_B });
      const { guard, context } = createTenantGuard(req);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Tenant B user accessing Tenant A resources', () => {
    it('should DENY company_admin B accessing /tenants/tenant-A-id', () => {
      const req = createRequest(USERS.companyAdminB, { tenantId: TENANT_A });
      const { guard, context } = createTenantGuard(req);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY agent B accessing tenant A resources', () => {
      const req = createRequest(USERS.agentB, { tenantId: TENANT_A });
      const { guard, context } = createTenantGuard(req);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Super Admin cross-tenant access', () => {
    it('should ALLOW super_admin to access any tenant via route param', () => {
      const req = createRequest(USERS.superAdmin, { tenantId: TENANT_B });
      const { guard, context } = createTenantGuard(req);
      expect(guard.canActivate(context)).toBe(true);
      expect(req.tenantContext.tenantId).toBe(TENANT_B);
      expect(req.tenantContext.isSuperAdmin).toBe(true);
    });

    it('should ALLOW super_admin to access Tenant A', () => {
      const req = createRequest(USERS.superAdmin, { tenantId: TENANT_A });
      const { guard, context } = createTenantGuard(req);
      expect(guard.canActivate(context)).toBe(true);
      expect(req.tenantContext.tenantId).toBe(TENANT_A);
    });
  });

  describe('Same-tenant access (should be allowed)', () => {
    it('should ALLOW company_admin A accessing own tenant', () => {
      const req = createRequest(USERS.companyAdminA, { tenantId: TENANT_A });
      const { guard, context } = createTenantGuard(req);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should ALLOW agent A with no route param (uses own tenant)', () => {
      const req = createRequest(USERS.agentA, {});
      const { guard, context } = createTenantGuard(req);
      expect(guard.canActivate(context)).toBe(true);
      expect(req.tenantContext.tenantId).toBe(TENANT_A);
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// ROLE ESCALATION TESTS
// ══════════════════════════════════════════════════════════════════

describe('Role Escalation Prevention', () => {
  describe('Viewer cannot perform write operations', () => {
    it('should DENY viewer creating leads', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.viewerA), ['lead:create']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY viewer creating AI agents', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.viewerA), ['ai_agent:create']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY viewer managing billing', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.viewerA), ['billing:manage']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY viewer inviting users', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.viewerA), ['team:invite']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Agent cannot escalate to Manager permissions', () => {
    it('should DENY agent creating campaigns', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.agentA), ['campaign:create']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY agent importing leads', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.agentA), ['lead:import']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY agent initiating calls', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.agentA), ['call:initiate']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY agent monitoring calls', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.agentA), ['call:monitor']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY agent managing AI prompts', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.agentA), ['ai_prompt:update']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Manager cannot escalate to Company Admin permissions', () => {
    it('should DENY manager managing billing', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.managerA), ['billing:manage']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY manager revoking users', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.managerA), ['team:revoke']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY manager changing roles', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.managerA), ['team:update_role']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY manager managing security settings', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.managerA), ['security:manage']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY manager deleting AI agents', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.managerA), ['ai_agent:delete']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY manager exporting leads', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.managerA), ['lead:export']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Company Admin cannot access Platform Admin permissions', () => {
    it('should DENY company_admin creating tenants', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.companyAdminA), ['platform:tenant_create']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY company_admin managing platform telephony', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.companyAdminA), ['platform:telephony']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should DENY company_admin managing AI providers', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.companyAdminA), ['platform:ai_providers']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Super Admin should have all permissions', () => {
    it('should ALLOW super_admin platform:tenant_create', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.superAdmin), ['platform:tenant_create']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should ALLOW super_admin billing:manage', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.superAdmin), ['billing:manage']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should ALLOW super_admin security:manage', () => {
      const { guard, context } = createPermissionsGuard(createRequest(USERS.superAdmin), ['security:manage']);
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// UNAUTHENTICATED ACCESS TESTS
// ══════════════════════════════════════════════════════════════════

describe('Unauthenticated Access Prevention', () => {
  it('should DENY when no user on request', () => {
    const { guard, context } = createPermissionsGuard(createRequest(null), ['lead:view']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should DENY when user has no role', () => {
    const { guard, context } = createPermissionsGuard(
      createRequest({ id: 'user1', tenantId: 't1' }),
      ['lead:view'],
    );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should DENY TenantGuard when no user', () => {
    const { guard, context } = createTenantGuard(createRequest(null));
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should DENY TenantGuard when no tenantId', () => {
    const { guard, context } = createTenantGuard(createRequest({ id: 'user1', role: 'agent' }));
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

// ══════════════════════════════════════════════════════════════════
// SUSPENDED TENANT TESTS
// ══════════════════════════════════════════════════════════════════

describe('Suspended Tenant Prevention', () => {
  it('should DENY non-super_admin from suspended tenant', () => {
    const req = createRequest({ ...USERS.companyAdminA, tenant: { isActive: false } });
    const { guard, context } = createTenantGuard(req);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should ALLOW super_admin even with suspended tenant', () => {
    const req = createRequest({ ...USERS.superAdmin, tenant: { isActive: false } });
    const { guard, context } = createTenantGuard(req);
    expect(guard.canActivate(context)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════
// MULTI-PERMISSION TESTS
// ══════════════════════════════════════════════════════════════════

describe('Multi-Permission Requirements', () => {
  it('should DENY manager when missing ANY of multiple required permissions', () => {
    const { guard, context } = createPermissionsGuard(
      createRequest(USERS.managerA),
      ['lead:view', 'lead:export'],
    );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should ALLOW company_admin when having ALL required permissions', () => {
    const { guard, context } = createPermissionsGuard(
      createRequest(USERS.companyAdminA),
      ['lead:view', 'lead:create', 'lead:import'],
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should ALLOW when no permissions required', () => {
    const { guard, context } = createPermissionsGuard(
      createRequest(USERS.viewerA),
      undefined,
    );
    expect(guard.canActivate(context)).toBe(true);
  });
});
