import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService }  from './tenants.service';
import { JwtAuthGuard }    from '../../common/guards/jwt-auth.guard';
import { RolesGuard }      from '../../common/guards/roles.guard';
import { Roles }           from '../../common/decorators/roles.decorator';
import { CurrentUser }     from '../../common/decorators/current-user.decorator';

@ApiTags('tenants')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private svc: TenantsService) {}

  @Get('me')       me(@CurrentUser()    u: any)                               { return this.svc.findOne(u.tenantId); }
  @Get('me/usage') usage(@CurrentUser() u: any)                               { return this.svc.getUsage(u.tenantId); }
  @Patch('me')
  @Roles('company_admin')
  update(@CurrentUser() u: any, @Body() data: any) { return this.svc.update(u.tenantId, data); }
}
