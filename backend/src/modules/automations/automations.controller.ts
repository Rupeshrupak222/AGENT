import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AutomationsService, SendMessageDto } from './automations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AUTOMATION_VIEW, AUTOMATION_CREATE, AUTOMATION_EXECUTE,
} from '../../common/rbac/permissions';

@ApiTags('automations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('automations')
export class AutomationsController {
  constructor(private svc: AutomationsService) {}

  @Post('send')
  @Permissions(AUTOMATION_CREATE)
  send(@CurrentUser() u: any, @Body() dto: SendMessageDto) {
    return this.svc.sendMessage(u.tenantId, dto);
  }

  @Post('post-call/:callId')
  @Permissions(AUTOMATION_EXECUTE)
  postCall(@CurrentUser() u: any, @Param('callId') callId: string) {
    return this.svc.sendPostCallAutomation(u.tenantId, callId);
  }

  @Get('logs')
  @Permissions(AUTOMATION_VIEW)
  logs(@CurrentUser() u: any, @Query() q: any) {
    return this.svc.getAutomationLogs(u.tenantId, q);
  }
}
