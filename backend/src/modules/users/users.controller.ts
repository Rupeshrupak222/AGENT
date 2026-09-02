import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService }   from './users.service';
import { JwtAuthGuard }   from '../../common/guards/jwt-auth.guard';
import { RolesGuard }     from '../../common/guards/roles.guard';
import { Roles }          from '../../common/decorators/roles.decorator';
import { CurrentUser }    from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()              findAll(@CurrentUser() u: any)                                          { return this.svc.findAll(u.tenantId); }
  @Get(':id')         findOne(@CurrentUser() u: any, @Param('id') id: string)                { return this.svc.findOne(u.tenantId, id); }
  @Post('invite')     @Roles('company_admin','manager') invite(@CurrentUser() u: any, @Body() d: any) { return this.svc.invite(u.tenantId, d); }
  @Patch(':id/role')  @Roles('company_admin') updateRole(@CurrentUser() u: any, @Param('id') id: string, @Body('role') role: string) { return this.svc.updateRole(u.tenantId, id, role); }
  @Delete(':id')      @Roles('company_admin') deactivate(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deactivate(u.tenantId, id); }
}
