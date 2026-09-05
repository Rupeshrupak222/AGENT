import { Controller, Get, Post, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CallsService, InitiateCallDto } from './calls.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Response } from 'express';
import { CALL_VIEW, CALL_INITIATE } from '../../common/rbac/permissions';

@ApiTags('calls')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Controller('calls')
export class CallsController {
  constructor(private calls: CallsService) {}

  @Post()
  @ApiBearerAuth('JWT')
  @Permissions(CALL_INITIATE)
  @ApiOperation({ summary: 'Initiate a call' })
  initiate(@CurrentUser() u: any, @Body() dto: InitiateCallDto) {
    return this.calls.initiateCall(u.tenantId, dto);
  }

  @Get('metrics')
  @ApiBearerAuth('JWT')
  @Permissions(CALL_VIEW)
  @ApiOperation({ summary: 'Get call metrics' })
  metrics(@CurrentUser() u: any, @Query('range') range: any) {
    return this.calls.getMetrics(u.tenantId, range);
  }

  @Get()
  @ApiBearerAuth('JWT')
  @Permissions(CALL_VIEW)
  @ApiOperation({ summary: 'List calls' })
  findAll(@CurrentUser() u: any, @Query() q: any) {
    return this.calls.findAll(u.tenantId, q);
  }

  @Get(':id')
  @ApiBearerAuth('JWT')
  @Permissions(CALL_VIEW)
  @ApiOperation({ summary: 'Get call by ID' })
  findOne(@CurrentUser() u: any, @Param('id') id: string) {
    return this.calls.findOne(u.tenantId, id);
  }

  // ── Telephony Webhooks (Twilio & Exotel) ──────────────────────────────────

  @Public()
  @Post('twilio/inbound')
  @ApiOperation({ summary: 'Twilio inbound call webhook' })
  handleTwilioInbound(@Body() body: any, @Res() res: Response) {
    res.type('text/xml');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi">Connecting you to your AI Voice Employee.</Say>
    <Connect>
        <Stream url="wss://${body.Host || 'localhost:3001'}/calls/twilio/stream" />
    </Connect>
</Response>`);
  }

  @Public()
  @Post('twilio/status')
  @ApiOperation({ summary: 'Twilio status callback' })
  handleTwilioStatus(@Body() body: any) {
    return { status: 'acknowledged', callSid: body.CallSid, callStatus: body.CallStatus };
  }

  @Public()
  @Post('exotel/callback')
  @ApiOperation({ summary: 'Exotel callback webhook' })
  handleExotelCallback(@Body() body: any) {
    return { status: 'acknowledged', callId: body.CallSid || body.Sid };
  }
}
