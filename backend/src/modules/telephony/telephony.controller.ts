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
import { RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CALL_INITIATE } from '../../common/rbac/permissions';
import { TelephonyService } from './services/telephony.service';
import { DispatchOutboundCallDto } from './dto/outbound-call.dto';
import {
  WebhookAcknowledgementDto,
  TelephonySystemStatusDto,
} from './dto/webhook-event.dto';

type TelephonyWebhookRequest = RawBodyRequest<Request>;

@ApiTags('Telephony')
@Controller('telephony')
export class TelephonyController {
  constructor(private readonly telephonyService: TelephonyService) {}

  private static rawBodyOf(req: TelephonyWebhookRequest, body: any): string {
    if (typeof req.rawBody === 'string') return req.rawBody;
    if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf-8');
    if (typeof body === 'string') return body;
    return JSON.stringify(body ?? {});
  }

  private static requestUrlOf(req: Request): string {
    return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  }

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Get telephony engine readiness, active sessions, and provider configuration status' })
  @ApiResponse({ status: 200, type: TelephonySystemStatusDto })
  getStatus(): Record<string, unknown> {
    return this.telephonyService.getSystemReadiness();
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
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
  @ApiParam({ name: 'provider', enum: ['twilio', 'exotel', 'frejun'] })
  async handleIncoming(
    @Param('provider') provider: string,
    @Body() body: any,
    @Req() req: TelephonyWebhookRequest,
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
        rawBody: TelephonyController.rawBodyOf(req, body),
        requestUrl: TelephonyController.requestUrlOf(req),
        method: req.method,
      },
    );

    res.type(response.contentType);
    return res.send(response.instruction);
  }

  @Public()
  @Post('webhooks/status/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider call status callback webhook (signature verified and idempotent)' })
  @ApiParam({ name: 'provider', enum: ['twilio', 'exotel', 'frejun'] })
  @ApiResponse({ status: 200, type: WebhookAcknowledgementDto })
  async handleStatusCallback(
    @Param('provider') provider: string,
    @Body() body: any,
    @Req() req: TelephonyWebhookRequest,
    @Headers() headers: Record<string, string>,
  ): Promise<WebhookAcknowledgementDto> {
    return this.telephonyService.handleStatusCallbackWebhook(
      provider,
      body,
      {
        payload: body,
        headers,
        rawBody: TelephonyController.rawBodyOf(req, body),
        requestUrl: TelephonyController.requestUrlOf(req),
        method: req.method,
      },
    );
  }

  @Public()
  @Post('webhooks/media/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider media stream webhook acknowledgment' })
  @ApiParam({ name: 'provider', enum: ['twilio', 'exotel', 'frejun'] })
  handleMediaWebhook(
    @Param('provider') provider: string,
    @Body() body: any,
  ) {
    return { status: 'acknowledged', provider };
  }

  @Public()
  @Post('webhooks/recording/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider recording callback webhook (signature verified and non-blocking async queueing)' })
  @ApiParam({ name: 'provider', enum: ['twilio', 'exotel', 'frejun'] })
  async handleRecordingWebhook(
    @Param('provider') provider: string,
    @Body() body: any,
    @Req() req: TelephonyWebhookRequest,
    @Headers() headers: Record<string, string>,
  ) {
    return this.telephonyService.handleRecordingWebhook(
      provider,
      body,
      {
        payload: body,
        headers,
        rawBody: TelephonyController.rawBodyOf(req, body),
        requestUrl: TelephonyController.requestUrlOf(req),
        method: req.method,
      },
    );
  }
}
