import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TENANT_VIEW, TENANT_UPDATE } from '../../common/rbac/permissions';

@ApiTags('tenants')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private svc: TenantsService) {}

  @Get('me')
  @Permissions(TENANT_VIEW)
  me(@CurrentUser() u: any) {
    return this.svc.findOne(u.tenantId);
  }

  @Get('me/usage')
  @Permissions(TENANT_VIEW)
  usage(@CurrentUser() u: any) {
    return this.svc.getUsage(u.tenantId);
  }

  @Patch('me')
  @Permissions(TENANT_UPDATE)
  update(@CurrentUser() u: any, @Body() data: any) {
    return this.svc.update(u.tenantId, data);
  }
}
