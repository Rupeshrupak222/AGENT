import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AutomationsService, SendMessageDto } from './automations.service';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/automation-rule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AUTOMATION_VIEW, AUTOMATION_CREATE, AUTOMATION_UPDATE, AUTOMATION_EXECUTE,
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

  // ── Automation Rules CRUD ───────────────────────────────────

  @Post('rules')
  @Permissions(AUTOMATION_CREATE)
  @ApiOperation({ summary: 'Create an automation rule' })
  createRule(@CurrentUser() u: any, @Body() dto: CreateAutomationRuleDto) {
    return this.svc.createRule(u.tenantId, dto);
  }

  @Get('rules')
  @Permissions(AUTOMATION_VIEW)
  @ApiOperation({ summary: 'List automation rules' })
  listRules(@CurrentUser() u: any) {
    return this.svc.listRules(u.tenantId);
  }

  @Patch('rules/:id')
  @Permissions(AUTOMATION_UPDATE)
  @ApiOperation({ summary: 'Update an automation rule' })
  updateRule(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateAutomationRuleDto) {
    return this.svc.updateRule(u.tenantId, id, dto);
  }

  @Patch('rules/:id/status')
  @Permissions(AUTOMATION_UPDATE)
  @ApiOperation({ summary: 'Toggle an automation rule status' })
  toggleRule(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { status: 'active' | 'paused' }) {
    return this.svc.toggleRule(u.tenantId, id, body.status);
  }

  @Delete('rules/:id')
  @Permissions(AUTOMATION_UPDATE)
  @ApiOperation({ summary: 'Delete an automation rule' })
  deleteRule(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deleteRule(u.tenantId, id);
  }
}
