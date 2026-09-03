import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AUDIT_LOG_VIEW } from '../../common/rbac/permissions';

@ApiTags('audit')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('audit')
export class AuditController {
  constructor(private svc: AuditService) {}

  @Get('logs')
  @Permissions(AUDIT_LOG_VIEW)
  @ApiOperation({ summary: 'List audit logs for tenant' })
  findAll(@CurrentUser() u: any, @Query() q: any) {
    return this.svc.findAll(u.tenantId, q);
  }
}
