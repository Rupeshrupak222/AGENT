import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_KEY } from '../decorators/current-tenant.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * TenantGuard ensures:
 * 1. The authenticated user has a valid tenant context
 * 2. If a route parameter :tenantId exists, it matches the user's tenant (prevents cross-tenant access)
 * 3. The tenant is active (not suspended)
 * 4. super_admin users bypass tenant matching for platform-level routes
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = (this.reflector as any)?.getAllAndOverride?.(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.tenantId) {
      throw new ForbiddenException('No tenant context');
    }

    // super_admin can access any tenant (platform-level routes)
    if (user.role === 'super_admin') {
      // For super_admin, inject tenantId from route param if present, otherwise use their own
      const routeTenantId = request.params?.tenantId;
      if (routeTenantId) {
        request.tenantContext = { tenantId: routeTenantId, isSuperAdmin: true };
      } else {
        request.tenantContext = { tenantId: user.tenantId, isSuperAdmin: true };
      }
      return true;
    }

    // For tenant roles, check if the route has a :tenantId param
    const routeTenantId = request.params?.tenantId;
    if (routeTenantId && routeTenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied: cross-tenant access prohibited');
    }

    // For non-super_admin, tenant must be active
    if (user.tenant && !user.tenant.isActive) {
      throw new ForbiddenException('Tenant account is suspended');
    }

    // Set tenant context on request for downstream use
    request.tenantContext = { tenantId: user.tenantId, isSuperAdmin: false };

    return true;
  }
}
