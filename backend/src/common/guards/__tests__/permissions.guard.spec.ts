import { ExecutionContext, ForbiddenException } from '@nestjs/common';
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

  return { guard: new PermissionsGuard(reflector as any, { isConnected: false } as any), context, request };
}

async function expectReject(guard: PermissionsGuard, context: any, errType: any) {
  try {
    await Promise.resolve(guard.canActivate(context));
  } catch (e) {
    expect(e).toBeInstanceOf(errType);
    return;
  }
  throw new Error(`Expected guard to reject with ${errType.name}`);
}

describe('PermissionsGuard', () => {
  describe('no permissions required', () => {
    it('should allow access when no @Permissions() decorator', async () => {
      const { guard, context } = createMockContext({ role: 'agent' });
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('super_admin', () => {
    it('should allow all permissions', async () => {
      const { guard, context } = createMockContext(
        { role: 'super_admin' },
        [LEAD_CREATE, BILLING_MANAGE, PLATFORM_TENANT_CREATE],
      );
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('company_admin', () => {
    it('should allow tenant-scoped permissions', async () => {
      const { guard, context } = createMockContext(
        { role: 'company_admin' },
        [LEAD_VIEW, LEAD_CREATE, BILLING_MANAGE],
      );
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should deny platform permissions', async () => {
      const { guard, context } = createMockContext(
        { role: 'company_admin' },
        [PLATFORM_TENANT_CREATE],
      );
      await expectReject(guard, context, ForbiddenException);
    });
  });

  describe('manager', () => {
    it('should allow operational permissions', async () => {
      const { guard, context } = createMockContext(
        { role: 'manager' },
        [LEAD_VIEW, LEAD_CREATE],
      );
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should deny billing management', async () => {
      const { guard, context } = createMockContext(
        { role: 'manager' },
        [BILLING_MANAGE],
      );
      await expectReject(guard, context, ForbiddenException);
    });
  });

  describe('deprecated roles (agent/viewer)', () => {
    it('should deny all permissions to the removed agent role', async () => {
      const { guard, context } = createMockContext(
        { role: 'agent' },
        [LEAD_VIEW],
      );
      await expectReject(guard, context, ForbiddenException);
    });

    it('should deny all permissions to the removed viewer role', async () => {
      const { guard, context } = createMockContext(
        { role: 'viewer' },
        [LEAD_VIEW],
      );
      await expectReject(guard, context, ForbiddenException);
    });
  });

  describe('unauthenticated', () => {
    it('should deny when no user', async () => {
      const { guard, context } = createMockContext(
        null,
        [LEAD_VIEW],
      );
      await expectReject(guard, context, ForbiddenException);
    });

    it('should deny when no role', async () => {
      const { guard, context } = createMockContext(
        { id: 'user1' },
        [LEAD_VIEW],
      );
      await expectReject(guard, context, ForbiddenException);
    });
  });
});