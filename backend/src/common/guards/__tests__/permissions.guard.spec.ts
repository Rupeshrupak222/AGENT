import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../permissions.guard';
import { PERMISSIONS_KEY } from '../../decorators/permissions.decorator';
import { LEAD_VIEW, LEAD_CREATE, BILLING_MANAGE, PLATFORM_TENANT_CREATE } from '../../rbac/permissions';

function createMockContext(user: any, handlerPermissions?: string[]) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === PERMISSIONS_KEY) return handlerPermissions ?? null;
      return null;
    }),
  };

  const request = { user };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;

  return { guard: new PermissionsGuard(reflector as any), context, request };
}

describe('PermissionsGuard', () => {
  describe('no permissions required', () => {
    it('should allow access when no @Permissions() decorator', () => {
      const { guard, context } = createMockContext({ role: 'agent' });
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('super_admin', () => {
    it('should allow all permissions', () => {
      const { guard, context } = createMockContext(
        { role: 'super_admin' },
        [LEAD_CREATE, BILLING_MANAGE, PLATFORM_TENANT_CREATE],
      );
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('company_admin', () => {
    it('should allow tenant-scoped permissions', () => {
      const { guard, context } = createMockContext(
        { role: 'company_admin' },
        [LEAD_VIEW, LEAD_CREATE, BILLING_MANAGE],
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny platform permissions', () => {
      const { guard, context } = createMockContext(
        { role: 'company_admin' },
        [PLATFORM_TENANT_CREATE],
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('manager', () => {
    it('should allow operational permissions', () => {
      const { guard, context } = createMockContext(
        { role: 'manager' },
        [LEAD_VIEW, LEAD_CREATE],
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny billing management', () => {
      const { guard, context } = createMockContext(
        { role: 'manager' },
        [BILLING_MANAGE],
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('agent', () => {
    it('should allow view and limited update permissions', () => {
      const { guard, context } = createMockContext(
        { role: 'agent' },
        [LEAD_VIEW],
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny create permissions', () => {
      const { guard, context } = createMockContext(
        { role: 'agent' },
        [LEAD_CREATE],
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('viewer', () => {
    it('should allow view permissions', () => {
      const { guard, context } = createMockContext(
        { role: 'viewer' },
        [LEAD_VIEW],
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny create permissions', () => {
      const { guard, context } = createMockContext(
        { role: 'viewer' },
        [LEAD_CREATE],
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('unauthenticated', () => {
    it('should deny when no user', () => {
      const { guard, context } = createMockContext(
        null,
        [LEAD_VIEW],
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny when no role', () => {
      const { guard, context } = createMockContext(
        { id: 'user1' },
        [LEAD_VIEW],
      );
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
