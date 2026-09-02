import { Controller, Get, Post, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation }  from '@nestjs/swagger';
import { CallsService, InitiateCallDto } from './calls.service';
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard';
import { CurrentUser }   from '../../common/decorators/current-user.decorator';
import { Public }        from '../../common/decorators/public.decorator';
import { Response }      from 'express';

@ApiTags('calls')
@Controller('calls')
export class CallsController {
  constructor(private calls: CallsService) {}

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Post()
  initiate(@CurrentUser() u: any, @Body() dto: InitiateCallDto) {
    return this.calls.initiateCall(u.tenantId, dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Get('metrics')
  metrics(@CurrentUser() u: any, @Query('range') range: any) {
    return this.calls.getMetrics(u.tenantId, range);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentUser() u: any, @Query() q: any) {
    return this.calls.findAll(u.tenantId, q);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@CurrentUser() u: any, @Param('id') id: string) {
    return this.calls.findOne(u.tenantId, id);
  }

  // ── Telephony Webhooks (Twilio & Exotel) ──────────────────────────────────

  @Public()
  @Post('twilio/inbound')
  handleTwilioInbound(@Body() body: any, @Res() res: Response) {
    // Generate TwiML to connect call to WebSocket audio media stream
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
  handleTwilioStatus(@Body() body: any) {
    return { status: 'acknowledged', callSid: body.CallSid, callStatus: body.CallStatus };
  }

  @Public()
  @Post('exotel/callback')
  handleExotelCallback(@Body() body: any) {
    return { status: 'acknowledged', callId: body.CallSid || body.Sid };
  }
}
