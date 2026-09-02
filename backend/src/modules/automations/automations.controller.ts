import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AutomationsService, SendMessageDto } from './automations.service';
import { JwtAuthGuard }   from '../../common/guards/jwt-auth.guard';
import { CurrentUser }    from '../../common/decorators/current-user.decorator';

@ApiTags('automations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('automations')
export class AutomationsController {
  constructor(private svc: AutomationsService) {}

  @Post('send')
  send(@CurrentUser() u: any, @Body() dto: SendMessageDto) { return this.svc.sendMessage(u.tenantId, dto); }

  @Post('post-call/:callId')
  postCall(@CurrentUser() u: any, @Param('callId') callId: string) { return this.svc.sendPostCallAutomation(u.tenantId, callId); }

  @Get('logs')
  logs(@CurrentUser() u: any, @Query() q: any) { return this.svc.getAutomationLogs(u.tenantId, q); }
}
