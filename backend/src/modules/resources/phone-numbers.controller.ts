import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PhoneNumbersService } from './phone-numbers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TELEPHONY_VIEW, TELEPHONY_MANAGE } from '../../common/rbac/permissions';

@ApiTags('phone-numbers')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Controller('phone-numbers')
export class PhoneNumbersController {
  constructor(private svc: PhoneNumbersService) {}

  @Get()
  @Permissions(TELEPHONY_VIEW)
  @ApiOperation({ summary: 'List company phone numbers' })
  list(@CurrentUser() u: any, @Query() q: any) {
    return this.svc.list(u.tenantId, q);
  }

  @Post()
  @Permissions(TELEPHONY_MANAGE)
  @ApiOperation({ summary: 'Add a phone number to the company inventory' })
  create(@CurrentUser() u: any, @Body() dto: any) {
    return this.svc.create(u.tenantId, u.id, dto);
  }

  @Patch(':id')
  @Permissions(TELEPHONY_MANAGE)
  @ApiOperation({ summary: 'Update a phone number (label, status, directions, agent assignment)' })
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.update(u.tenantId, id, u.id, dto);
  }

  @Delete(':id')
  @Permissions(TELEPHONY_MANAGE)
  @ApiOperation({ summary: 'Remove a phone number from the company inventory' })
  remove(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.remove(u.tenantId, id, u.id);
  }
}