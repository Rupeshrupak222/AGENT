import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { TenantGuard } from '../tenant.guard';
import { TENANT_KEY } from '../../decorators/current-tenant.decorator';

function createMockContext(user: any, params: Record<string, string> = {}) {
  const request = { user, params, tenantContext: undefined as any };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    getReflector: () => ({
      getAllAndOverride: () => null,
    }),
  } as unknown as ExecutionContext;

  return { guard: new TenantGuard({} as any), context, request };
}

describe('TenantGuard', () => {
  describe('authenticated user with valid tenant', () => {
    it('should allow access and set tenant context', () => {
      const { guard, context, request } = createMockContext({
        id: 'user1',
        tenantId: 'tenant-1',
        role: 'company_admin',
        tenant: { isActive: true },
      });

      expect(guard.canActivate(context)).toBe(true);
      expect(request.tenantContext).toEqual({ tenantId: 'tenant-1', isSuperAdmin: false });
    });
  });

  describe('unauthenticated', () => {
    it('should deny when no user', () => {
      const { guard, context } = createMockContext(null);
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should deny when no tenantId', () => {
      const { guard, context } = createMockContext({
        id: 'user1',
        role: 'agent',
      });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('suspended tenant', () => {
    it('should deny access for non-super_admin', () => {
      const { guard, context } = createMockContext({
        id: 'user1',
        tenantId: 'tenant-1',
        role: 'company_admin',
        tenant: { isActive: false },
      });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('cross-tenant access prevention', () => {
    it('should deny when route tenantId differs from user tenantId', () => {
      const { guard, context } = createMockContext(
        {
          id: 'user1',
          tenantId: 'tenant-1',
          role: 'company_admin',
          tenant: { isActive: true },
        },
        { tenantId: 'tenant-2' },
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow when route tenantId matches user tenantId', () => {
      const { guard, context, request } = createMockContext(
        {
          id: 'user1',
          tenantId: 'tenant-1',
          role: 'company_admin',
          tenant: { isActive: true },
        },
        { tenantId: 'tenant-1' },
      );
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('super_admin bypass', () => {
    it('should allow super_admin to access any tenant via route param', () => {
      const { guard, context, request } = createMockContext(
        {
          id: 'admin1',
          tenantId: 'tenant-1',
          role: 'super_admin',
          tenant: { isActive: true },
        },
        { tenantId: 'tenant-2' },
      );
      expect(guard.canActivate(context)).toBe(true);
      expect(request.tenantContext).toEqual({ tenantId: 'tenant-2', isSuperAdmin: true });
    });

    it('should use super_admin own tenantId when no route param', () => {
      const { guard, context, request } = createMockContext({
        id: 'admin1',
        tenantId: 'tenant-1',
        role: 'super_admin',
        tenant: { isActive: true },
      });
      expect(guard.canActivate(context)).toBe(true);
      expect(request.tenantContext).toEqual({ tenantId: 'tenant-1', isSuperAdmin: true });
    });
  });

  describe('no route params', () => {
    it('should set tenant context from user for tenant roles', () => {
      const { guard, context, request } = createMockContext({
        id: 'user1',
        tenantId: 'tenant-1',
        role: 'manager',
        tenant: { isActive: true },
      });
      expect(guard.canActivate(context)).toBe(true);
      expect(request.tenantContext).toEqual({ tenantId: 'tenant-1', isSuperAdmin: false });
    });
  });
});
