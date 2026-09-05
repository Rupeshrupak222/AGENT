import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Res,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CALL_INITIATE } from '../../common/rbac/permissions';
import { TelephonyService } from './services/telephony.service';
import { DispatchOutboundCallDto } from './dto/outbound-call.dto';
import {
  WebhookAcknowledgementDto,
  TelephonySystemStatusDto,
} from './dto/webhook-event.dto';

@ApiTags('Telephony')
@Controller('telephony')
export class TelephonyController {
  constructor(private readonly telephonyService: TelephonyService) {}

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Get telephony engine readiness, active sessions, and provider configuration status' })
  @ApiResponse({ status: 200, type: TelephonySystemStatusDto })
  getStatus(): TelephonySystemStatusDto {
    return this.telephonyService.getSystemReadiness();
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Permissions(CALL_INITIATE)
  @Post('dispatch')
  @ApiOperation({ summary: 'Trigger outbound call dispatch via telephony abstraction' })
  @ApiResponse({ status: 200, description: 'Call dispatched or deferred to provider' })
  async dispatchOutbound(
    @CurrentUser() u: any,
    @Body() dto: DispatchOutboundCallDto,
  ) {
    return this.telephonyService.dispatchOutboundCall(
      u.tenantId,
      dto.callId,
      dto.phoneNumber,
      dto.provider,
    );
  }

  @Public()
  @Post('webhooks/incoming/:provider')
  @ApiOperation({ summary: 'Provider inbound call webhook (TwiML / XML / JSON)' })
  @ApiParam({ name: 'provider', enum: ['twilio', 'exotel'] })
  async handleIncoming(
    @Param('provider') provider: string,
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const fromNumber = body.From || body.CallFrom || body.caller || '';
    const toNumber = body.To || body.CallTo || body.called || '';
    const providerCallId = body.CallSid || body.Sid || `inbound-${Date.now()}`;

    const response = await this.telephonyService.handleIncomingCallWebhook(
      provider,
      {
        providerCallId,
        fromNumber,
        toNumber,
        provider,
        rawPayload: body,
        headers: req.headers as Record<string, string>,
      },
    );

    res.type(response.contentType);
    return res.send(response.instruction);
  }

  @Public()
  @Post('webhooks/status/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider call status callback webhook (signature verified and idempotent)' })
  @ApiParam({ name: 'provider', enum: ['twilio', 'exotel'] })
  @ApiResponse({ status: 200, type: WebhookAcknowledgementDto })
  async handleStatusCallback(
    @Param('provider') provider: string,
    @Body() body: any,
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ): Promise<WebhookAcknowledgementDto> {
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    return this.telephonyService.handleStatusCallbackWebhook(
      provider,
      body,
      {
        payload: body,
        headers,
        requestUrl: fullUrl,
        method: req.method,
      },
    );
  }

  @Public()
  @Post('webhooks/media/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider media stream webhook acknowledgment' })
  @ApiParam({ name: 'provider', enum: ['twilio', 'exotel'] })
  handleMediaWebhook(
    @Param('provider') provider: string,
    @Body() body: any,
  ) {
    return { status: 'acknowledged', provider };
  }
}
