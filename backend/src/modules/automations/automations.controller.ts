import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Headers,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AutomationsService, SendMessageDto } from './automations.service';
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  DryRunDto,
  TestActionDto,
} from './dto/automation-rule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  AUTOMATION_VIEW,
  AUTOMATION_CREATE,
  AUTOMATION_UPDATE,
  AUTOMATION_EXECUTE,
  INTEGRATIONS_VIEW,
  INTEGRATIONS_MANAGE,
} from '../../common/rbac/permissions';

@ApiTags('automations')
@Controller('automations')
export class AutomationsController {
  constructor(private readonly svc: AutomationsService) {}

  // ── Public Webhook Handlers for Meta WhatsApp Cloud API ──────

  @Public()
  @Get('webhooks/whatsapp')
  @ApiOperation({ summary: 'Meta WhatsApp webhook verification challenge' })
  verifyWhatsAppWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'agentcall_verify_token_2026';
    if (mode === 'subscribe' && token === expectedToken) {
      return res.status(HttpStatus.OK).send(challenge);
    }
    return res.status(HttpStatus.FORBIDDEN).send('Verification failed');
  }

  @Public()
  @Post('webhooks/whatsapp')
  @ApiOperation({ summary: 'Meta WhatsApp status and message webhook receiver' })
  async receiveWhatsAppWebhook(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: any,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(body);
    return this.svc.handleWhatsAppWebhook(rawBody, signature, body);
  }

  // ── Protected Automation Execution & Triggers ────────────────

  @Post('send')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(AUTOMATION_CREATE)
  @ApiOperation({ summary: 'Directly dispatch a communication message' })
  send(@CurrentUser() u: any, @Body() dto: SendMessageDto) {
    return this.svc.sendMessage(u.tenantId, dto);
  }

  @Post('trigger')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(AUTOMATION_EXECUTE)
  @ApiOperation({ summary: 'Trigger an automation event' })
  trigger(@CurrentUser() u: any, @Body() event: any) {
    return this.svc.triggerAutomation(u.tenantId, {
      ...event,
      tenantId: u.tenantId,
    });
  }

  @Post('dry-run')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(AUTOMATION_VIEW)
  @ApiOperation({ summary: 'Simulate/preview an automation execution without sending' })
  dryRun(@CurrentUser() u: any, @Body() dto: DryRunDto) {
    return this.svc.dryRun(u.tenantId, dto);
  }

  @Post('test-action')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(AUTOMATION_CREATE)
  @ApiOperation({ summary: 'Send a test action to an explicit recipient' })
  testAction(@CurrentUser() u: any, @Body() dto: TestActionDto) {
    return this.svc.testAction(u.tenantId, dto);
  }

  @Post('post-call/:callId')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(AUTOMATION_EXECUTE)
  @ApiOperation({ summary: 'Trigger post-call automations' })
  postCall(@CurrentUser() u: any, @Param('callId') callId: string) {
    return this.svc.sendPostCallAutomation(u.tenantId, callId);
  }

  @Get('logs')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(AUTOMATION_VIEW)
  @ApiOperation({ summary: 'List execution logs with pagination and filters' })
  logs(@CurrentUser() u: any, @Query() q: any) {
    return this.svc.getAutomationLogs(u.tenantId, q);
  }

  // ── Provider Status & Connection Tests ───────────────────────

  @Get('providers/status')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'Get WhatsApp and Resend configuration status' })
  getProviderStatuses(@CurrentUser() u: any) {
    return this.svc.getProviderStatuses(u.tenantId);
  }

  @Post('providers/test')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Test WhatsApp or Resend provider connection safely' })
  testProvider(@CurrentUser() u: any, @Body() body: { provider: 'whatsapp' | 'resend' }) {
    if (!body.provider || !['whatsapp', 'resend'].includes(body.provider)) {
      throw new BadRequestException('Valid provider (whatsapp or resend) required');
    }
    return this.svc.testProvider(u.tenantId, body.provider);
  }

  // ── Automation Rules CRUD ───────────────────────────────────

  @Post('rules')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(AUTOMATION_CREATE)
  @ApiOperation({ summary: 'Create an automation rule' })
  createRule(@CurrentUser() u: any, @Body() dto: CreateAutomationRuleDto) {
    return this.svc.createRule(u.tenantId, dto);
  }

  @Get('rules')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(AUTOMATION_VIEW)
  @ApiOperation({ summary: 'List automation rules' })
  listRules(@CurrentUser() u: any) {
    return this.svc.listRules(u.tenantId);
  }

  @Patch('rules/:id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(AUTOMATION_UPDATE)
  @ApiOperation({ summary: 'Update an automation rule' })
  updateRule(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateAutomationRuleDto) {
    return this.svc.updateRule(u.tenantId, id, dto);
  }

  @Patch('rules/:id/status')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(AUTOMATION_UPDATE)
  @ApiOperation({ summary: 'Toggle an automation rule status' })
  toggleRule(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { status: 'active' | 'paused' }) {
    return this.svc.toggleRule(u.tenantId, id, body.status);
  }

  @Delete('rules/:id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
  @Permissions(AUTOMATION_UPDATE)
  @ApiOperation({ summary: 'Delete an automation rule' })
  deleteRule(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deleteRule(u.tenantId, id);
  }
}
