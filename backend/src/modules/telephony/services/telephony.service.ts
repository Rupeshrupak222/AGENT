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

  private readonly callStatusHooks: Array<(callId: string, status: string, duration?: number, outcome?: string) => Promise<void>> = [];

  public registerCallStatusHook(hook: (callId: string, status: string, duration?: number, outcome?: string) => Promise<void>) {
    this.callStatusHooks.push(hook);
  }

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private registry: TelephonyProviderRegistry,
    private audioSessionService: AudioSessionService,
  ) {}

  /**
   * Dispatches an outbound call through the chosen or default telephony provider.
   */
  async dispatchOutboundCall(
    tenantId: string,
    callId: string,
    toNumber: string,
    providerName?: string,
  ) {
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

    // Update Call record with provider details
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
  /**
   * Processes call status callbacks with signature verification, replay protection, and idempotency.
   */
  async handleStatusCallbackWebhook(
    providerName: string,
    payload: Record<string, unknown>,
    validationReq: WebhookValidationRequest,
  ): Promise<{ status: string; processed: boolean; reason?: string }> {
    const provider = this.registry.get(providerName);

    // 1. Signature Verification & Malformed Payload Rejection
    const validation = provider.validateWebhookSignature(validationReq);
    if (!validation.isValid) {
      this.logger.warn(`Rejected webhook from [${providerName}]: ${validation.reason}`);
      throw new BadRequestException(`Webhook signature validation failed: ${validation.reason}`);
    }

    // 2. Normalization
    const normalizedEvent = await provider.handleStatusCallback(payload);

    // 3. Distributed Idempotency Key (Compound Key: provider:callSid:status:sequence)
    const idempotencyKey = `${providerName}:${normalizedEvent.providerCallId}:${normalizedEvent.status}:${normalizedEvent.eventId}`;
    if (this.processedEvents.has(idempotencyKey)) {
      this.logger.log(`Skipping duplicate webhook event [${idempotencyKey}] for call ${normalizedEvent.providerCallId}`);
      return { status: 'acknowledged', processed: false, reason: 'DUPLICATE_EVENT' };
    }
    this.recordEventProcessed(idempotencyKey);

    this.logger.log(`Processing status callback for providerCallId [${normalizedEvent.providerCallId}] -> status: ${normalizedEvent.status}`);

    // 4. Update Call record in DB with State Machine Validation
    try {
      const call = await this.prisma.call.findFirst({
        where: { providerCallId: normalizedEvent.providerCallId },
      });

      if (call) {
        const targetStatus = this.toPrismaCallStatus(normalizedEvent.status);

        // State Machine Rule: Prevent illegal state regressions (e.g. completed -> ringing)
        if (!this.isValidCallStateTransition(call.status, targetStatus)) {
          this.logger.warn(
            `Illegal state transition rejected for call [${call.id}]: ${call.status} -> ${targetStatus}`,
          );
          return { status: 'acknowledged', processed: false, reason: 'ILLEGAL_STATE_REGRESSION' };
        }

        const isTerminal = ['completed', 'failed', 'missed', 'transferred'].includes(targetStatus);
        const endedAt = isTerminal ? new Date() : undefined;

        // Bounded non-negative duration calculation
        let duration = normalizedEvent.duration;
        if (duration == null && isTerminal && call.startedAt) {
          duration = Math.max(0, Math.floor((Date.now() - new Date(call.startedAt).getTime()) / 1000));
        } else if (duration != null) {
          duration = Math.max(0, duration);
        }

        await this.prisma.call.update({
          where: { id: call.id },
          data: {
            status: targetStatus,
            ...(duration != null && { duration }),
            ...(normalizedEvent.recordingUrl && { recordingUrl: normalizedEvent.recordingUrl }),
            ...(endedAt && { endedAt }),
          },
        });

        this.logger.log(
          `[CALL_STATE_TRANSITION] callId=${call.id} providerCallId=${normalizedEvent.providerCallId} tenantId=${call.tenantId} from=${call.status} to=${targetStatus}`,
        );

        // Close audio session on terminal statuses
        if (isTerminal) {
          this.logger.log(
            `[CALL_${targetStatus.toUpperCase()}] callId=${call.id} duration=${duration ?? 0}s providerCallId=${normalizedEvent.providerCallId}`,
          );
          const session = this.audioSessionService.getSessionByCallId(call.id, call.tenantId);
          if (session) {
            this.audioSessionService.closeSession(session.sessionId, call.tenantId);
          }
        }

        // Notify registered lifecycle hooks (e.g. Campaign engine, analytics)
        for (const hook of this.callStatusHooks) {
          try {
            await hook(call.id, targetStatus, duration, call.outcome || undefined);
          } catch (hookErr: any) {
            this.logger.warn(`Call status hook error for call ${call.id}: ${hookErr.message}`);
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

  /**
   * Deterministic call state machine validator.
   * Prevents illegal regressions (e.g., completed -> ringing, failed -> in_progress).
   */
  isValidCallStateTransition(current: CallStatus, target: CallStatus): boolean {
    if (current === target) return true; // Idempotent same-status transitions allowed

    const terminalStates = new Set<CallStatus>(['completed', 'failed', 'missed', 'transferred']);
    if (terminalStates.has(current)) {
      return false; // Terminal states are immutable
    }

    if (current === 'in_progress') {
      return terminalStates.has(target);
    }

    if (current === 'ringing') {
      return target !== 'queued'; // Cannot regress from ringing back to queued
    }

    return true; // queued can transition forward
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

  toPrismaCallStatus(status: NormalizedCallStatus): CallStatus {
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
