import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../guards/permissions.guard';
import { TenantGuard } from '../guards/tenant.guard';

/**
 * RbacModule exports guards for use by other modules.
 * Guards are applied per-controller via @UseGuards() decorators.
 */
@Module({
  providers: [PermissionsGuard, TenantGuard],
  exports: [PermissionsGuard, TenantGuard],
})
export class RbacModule {}
