import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  TEAM_VIEW, TEAM_INVITE, TEAM_UPDATE_ROLE, TEAM_REVOKE,
} from '../../common/rbac/permissions';

@ApiTags('users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
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

  @Patch('me')
  @ApiBody({ type: UpdateProfileDto })
  updateMe(@CurrentUser() u: any, @Body() dto: UpdateProfileDto) {
    return this.svc.updateProfile(u.id, u.tenantId, dto);
  }

  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  updateAvatar(@CurrentUser() u: any, @UploadedFile() file: Express.Multer.File) {
    return this.svc.updateAvatar(u.id, u.tenantId, file);
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
