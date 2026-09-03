import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TENANT_KEY = 'tenantContext';

export interface TenantContext {
  tenantId: string;
  isSuperAdmin: boolean;
}

/**
 * Extract the tenant context from the request.
 * The TenantGuard must run before this decorator.
 *
 * Usage: @CurrentTenant() tenant: TenantContext
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantContext;
  },
);
