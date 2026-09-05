import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  TEAM_VIEW, TEAM_INVITE, TEAM_UPDATE_ROLE, TEAM_REVOKE,
} from '../../common/rbac/permissions';

@ApiTags('users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  @Permissions(TEAM_VIEW)
  findAll(@CurrentUser() u: any) {
    return this.svc.findAll(u.tenantId);
  }

  @Get(':id')
  @Permissions(TEAM_VIEW)
  findOne(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.findOne(u.tenantId, id);
  }

  @Post('invite')
  @Permissions(TEAM_INVITE)
  invite(@CurrentUser() u: any, @Body() d: { name: string; email: string; role: string }) {
    return this.svc.invite(u.tenantId, u.role, d);
  }

  @Patch(':id/role')
  @Permissions(TEAM_UPDATE_ROLE)
  updateRole(@CurrentUser() u: any, @Param('id') id: string, @Body('role') role: string) {
    return this.svc.updateRole(u.tenantId, id, role, u.id, u.role);
  }

  @Delete(':id')
  @Permissions(TEAM_REVOKE)
  deactivate(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deactivate(u.tenantId, id, u.id, u.role);
  }
}
