import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CallStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TelephonyProviderRegistry } from '../providers/provider-registry.service';
import { AudioSessionService } from './audio-session.service';
import {
  IncomingCallRequest,
  IncomingCallResponse,
  WebhookValidationRequest,
} from '../interfaces/telephony-provider.interface';
import { NormalizedCallEvent, NormalizedCallStatus } from '../interfaces/call-lifecycle.interface';

@Injectable()
export class TelephonyService {
  private readonly logger = new Logger(TelephonyService.name);

  // In-memory idempotency cache for recently processed event IDs (max 10,000 entries)
  private readonly processedEvents = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private registry: TelephonyProviderRegistry,
    private audioSessionService: AudioSessionService,
  ) {}

  /**
   * Dispatches an outbound call through the chosen or default telephony provider.
   * The target Call record is verified to belong to the acting tenant.
   */
  async dispatchOutboundCall(
    tenantId: string,
    callId: string,
    toNumber: string,
    providerName?: string,
  ) {
    if (!/^\+[1-9]\d{6,14}$/.test(toNumber || '')) {
      throw new BadRequestException('phoneNumber must be a valid E.164 number (e.g. +919876543210)');
    }

    const call = await this.prisma.call.findFirst({
      where: { id: callId, tenantId },
      select: { id: true },
    });
    if (!call) throw new NotFoundException('Call record not found for this tenant');

    const provider = providerName
      ? this.registry.get(providerName)
      : this.registry.getDefaultProvider();

    const host = this.configService.get<string>('API_HOST', 'localhost:3001');
    const statusCallbackUrl = `https://${host}/api/v1/telephony/webhooks/status/${provider.name}`;
    const mediaStreamUrl = `wss://${host}/telephony/stream`;

    this.logger.log(`Dispatching outbound call ${callId} via provider [${provider.name}] to ${toNumber}`);

    const result = await provider.createOutboundCall({
      tenantId,
      callId,
      fromNumber: this.configService.get<string>('TWILIO_PHONE_NUMBER', ''),
      toNumber,
      statusCallbackUrl,
      mediaStreamUrl,
    });

    // Update Call record with provider details (ownership already validated above)
    try {
      await this.prisma.call.update({
        where: { id: callId },
        data: {
          providerCallId: result.providerCallId,
          status: this.toPrismaCallStatus(result.status),
          metadata: {
            provider: result.provider,
            rawResponse: result.rawResponse as any,
          },
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to update Call ${callId} with providerCallId: ${err.message}`);
    }

    return result;
  }

  /**
   * Processes inbound call webhooks from any telephony provider.
   */
  async handleIncomingCallWebhook(
    providerName: string,
    req: IncomingCallRequest,
  ): Promise<IncomingCallResponse> {
    const provider = this.registry.get(providerName);

    this.logger.log(`Received incoming call webhook from [${providerName}] for caller ${req.fromNumber}`);

    // Try to identify tenant by caller or assign to default tenant
    let tenantId = 'default-tenant';
    let agentId = 'default-agent';
    let leadId = 'inbound-lead';

    try {
      const tenant = await this.prisma.tenant.findFirst();
      if (tenant) tenantId = tenant.id;

      const agent = await this.prisma.aIAgent.findFirst({
        where: { tenantId, status: 'active' },
      });
      if (agent) agentId = agent.id;

      // Find or create lead
      let lead = await this.prisma.lead.findFirst({
        where: { tenantId, phone: req.fromNumber },
      });

      if (!lead) {
        lead = await this.prisma.lead.create({
          data: {
            tenantId,
            phone: req.fromNumber,
            name: `Inbound Caller ${req.fromNumber.slice(-4)}`,
            status: 'new',
            source: 'inbound_call',
          },
        });
      }
      leadId = lead.id;

      // Create inbound call record
      const call = await this.prisma.call.create({
        data: {
          tenantId,
          leadId,
          agentId,
          direction: 'inbound',
          status: 'ringing',
          phone: req.fromNumber,
          providerCallId: req.providerCallId,
          metadata: {
            provider: providerName,
            dialedNumber: req.toNumber,
          },
        },
      });

      // Prepare AudioSession
      this.audioSessionService.createSession({
        callId: call.id,
        tenantId,
        agentId,
        leadId,
        provider: providerName,
        direction: 'inbound',
      });
    } catch (err: any) {
      this.logger.warn(`Database offline or error creating inbound call record: ${err.message}`);
    }

    return provider.handleIncomingCall(req);
  }

  /**
   * Processes call status callbacks with signature verification, replay protection, and idempotency.
   */
  async handleStatusCallbackWebhook(
    providerName: string,
    payload: Record<string, unknown>,
    validationReq: WebhookValidationRequest,
  ): Promise<{ status: string; processed: boolean; reason?: string }> {
    const provider = this.registry.get(providerName);

    // 1. Signature Verification
    const validation = provider.validateWebhookSignature(validationReq);
    if (!validation.isValid) {
      this.logger.warn(`Rejected webhook from [${providerName}]: ${validation.reason}`);
      throw new BadRequestException(`Webhook signature validation failed: ${validation.reason}`);
    }

    // 2. Normalization
    const normalizedEvent = await provider.handleStatusCallback(payload);

    // 3. Idempotency Check
    if (this.processedEvents.has(normalizedEvent.eventId)) {
      this.logger.log(`Skipping duplicate webhook event [${normalizedEvent.eventId}] for call ${normalizedEvent.providerCallId}`);
      return { status: 'acknowledged', processed: false, reason: 'DUPLICATE_EVENT' };
    }
    this.recordEventProcessed(normalizedEvent.eventId);

    this.logger.log(`Processing status callback for providerCallId [${normalizedEvent.providerCallId}] -> status: ${normalizedEvent.status}`);

    // 4. Update Call record in DB
    try {
      const call = await this.prisma.call.findFirst({
        where: { providerCallId: normalizedEvent.providerCallId },
      });

      if (call) {
        await this.prisma.call.update({
          where: { id: call.id },
          data: {
            status: this.toPrismaCallStatus(normalizedEvent.status),
            ...(normalizedEvent.duration != null && { duration: normalizedEvent.duration }),
            ...(normalizedEvent.recordingUrl && { recordingUrl: normalizedEvent.recordingUrl }),
            ...(normalizedEvent.status === 'completed' || normalizedEvent.status === 'failed'
              ? { endedAt: new Date() }
              : {}),
          },
        });

        // Close audio session on final statuses
        if (
          normalizedEvent.status === 'completed' ||
          normalizedEvent.status === 'failed' ||
          normalizedEvent.status === 'missed'
        ) {
          const session = this.audioSessionService.getSessionByCallId(call.id, call.tenantId);
          if (session) {
            this.audioSessionService.closeSession(session.sessionId, call.tenantId);
          }
        }
      } else {
        this.logger.warn(`No call record found matching providerCallId [${normalizedEvent.providerCallId}]`);
      }
    } catch (err: any) {
      this.logger.warn(`Error updating call record during status callback: ${err.message}`);
    }

    return { status: 'acknowledged', processed: true };
  }

  getSystemReadiness() {
    const providers = this.registry.getAllProviders();
    const activeSessions = this.audioSessionService.getActiveSessionsCount();

    return {
      status: 'ready',
      architecture: 'telephony_foundation_v1',
      mediaStreaming: 'ready_for_provider',
      providers,
      activeSessions,
      redisQueues: 'deferred_day7',
      speechPipeline: 'day8_ready',
    };
  }

  private toPrismaCallStatus(status: NormalizedCallStatus): CallStatus {
    switch (status) {
      case 'queued':
        return 'queued';
      case 'initiated':
      case 'ringing':
        return 'ringing';
      case 'in_progress':
        return 'in_progress';
      case 'completed':
        return 'completed';
      case 'missed':
      case 'busy':
      case 'no_answer':
        return 'missed';
      case 'failed':
      case 'cancelled':
        return 'failed';
      case 'transferred':
        return 'transferred';
      default:
        return 'queued';
    }
  }

  private recordEventProcessed(eventId: string) {
    if (this.processedEvents.size > 10000) {
      // Clear half the cache to prevent unbounded growth
      const it = this.processedEvents.values();
      for (let i = 0; i < 5000; i++) {
        this.processedEvents.delete(it.next().value);
      }
    }
    this.processedEvents.add(eventId);
  }
}
