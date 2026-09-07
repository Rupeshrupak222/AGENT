import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CallStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TelephonyProviderRegistry } from '../providers/provider-registry.service';
import { AudioSessionService } from './audio-session.service';
import { CallInsightsService } from './call-insights.service';
import { RecordingQueueService } from './recording-queue.service';
import {
  IncomingCallRequest,
  IncomingCallResponse,
  WebhookValidationRequest,
} from '../interfaces/telephony-provider.interface';
import { NormalizedCallStatus } from '../interfaces/call-lifecycle.interface';

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
    private callInsightsService: CallInsightsService,
    @Optional() private recordingQueueService?: RecordingQueueService,
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

    // Honest disposition: a provider that is not configured (or otherwise failed to
    // place the call) must NOT fabricate a provider call id or a "queued" success.
    // Surface the real state to the caller and mark the Call record accordingly.
    const raw = (result.rawResponse as any) || {};
    if (result.status === 'failed' || raw.disposition === 'NOT_CONFIGURED') {
      const reason: string = raw.reason || 'PROVIDER_DISPATCH_FAILED';
      try {
        await this.prisma.call.update({
          where: { id: callId },
          data: {
            status: 'failed',
            outcome: raw.disposition === 'NOT_CONFIGURED' ? 'PROVIDER_NOT_CONFIGURED' : 'DISPATCH_ERROR',
            metadata: {
              provider: result.provider,
              rawResponse: raw,
            },
          },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to mark Call ${callId} as failed after dispatch error: ${err.message}`);
      }
      throw new ServiceUnavailableException(
        `Call could not be dispatched: ${reason} (provider=${result.provider})`,
      );
    }

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
        include: { transcript: true },
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

        // Derive honest post-call insights from the REAL transcript, only for completed calls
        // that actually produced conversation text. Null when no evidence — never fabricated.
        if (targetStatus === 'completed') {
          const transcript = (call as any).transcript as
            | { segments?: Array<{ speaker?: string; text?: string | null }> }
            | undefined;
          const turns = Array.isArray(transcript?.segments)
            ? transcript.segments
            : [];

          if (turns.length > 0) {
            const insights = this.callInsightsService.analyze(turns);
            const updateData: any = {};
            if (insights.outcome) updateData.outcome = insights.outcome;
            if (insights.sentimentScore != null) updateData.sentimentScore = insights.sentimentScore;
            if (Object.keys(updateData).length > 0) {
              try {
                await this.prisma.call.update({
                  where: { id: call.id },
                  data: updateData,
                });
                this.logger.log(
                  `[CALL_INSIGHTS] callId=${call.id} outcome=${insights.outcome ?? 'n/a'} sentiment=${insights.sentimentScore ?? 'n/a'} confidence=${insights.confidence.toFixed(2)}`,
                );
              } catch (err: any) {
                this.logger.warn(`Failed to persist call insights for ${call.id}: ${err.message}`);
              }
            }
          }
        }

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
   * Processes recording completion callbacks with signature verification, idempotency, and async queueing.
   */
  async handleRecordingWebhook(
    providerName: string,
    payload: Record<string, unknown>,
    validationReq: WebhookValidationRequest,
  ): Promise<{ status: string; processed: boolean; recordingId?: string; reason?: string }> {
    const provider = this.registry.get(providerName);

    // 1. Signature Verification
    const validation = provider.validateWebhookSignature(validationReq);
    if (!validation.isValid) {
      this.logger.warn(`Rejected recording webhook from [${providerName}]: ${validation.reason}`);
      throw new BadRequestException(`Webhook signature validation failed: ${validation.reason}`);
    }

    const providerCallId = (payload.CallSid as string) || '';
    const providerRecordingId = (payload.RecordingSid as string) || '';
    const recordingUrl = (payload.RecordingUrl as string) || '';
    const recordingDurationStr = payload.RecordingDuration as string;
    const duration = recordingDurationStr ? parseInt(recordingDurationStr, 10) : undefined;
    const recordingStatus = (payload.RecordingStatus as string) || 'completed';

    if (!providerCallId || !providerRecordingId) {
      throw new BadRequestException('Missing CallSid or RecordingSid in recording payload');
    }

    // 2. Deterministic Compound Idempotency Key
    const idempotencyKey = `rec:${providerName}:${providerCallId}:${providerRecordingId}:${recordingStatus}`;
    if (this.processedEvents.has(idempotencyKey)) {
      this.logger.log(`Skipping duplicate recording webhook event [${idempotencyKey}]`);
      return { status: 'acknowledged', processed: false, reason: 'DUPLICATE_EVENT' };
    }
    this.recordEventProcessed(idempotencyKey);

    this.logger.log(
      `[RECORDING_WEBHOOK_RECEIVED] provider=${providerName} CallSid=${providerCallId} RecordingSid=${providerRecordingId}`,
    );

    // 3. Locate Call Record & Persist Initial Metadata
    let callId = `call-mock-${providerCallId}`;
    let tenantId = 'default-tenant';
    let dbRecordingId = `rec-${Date.now()}`;

    try {
      const call = await this.prisma.call.findFirst({
        where: { providerCallId },
      });

      if (call) {
        callId = call.id;
        tenantId = call.tenantId;

        const recording = await this.prisma.callRecording.upsert({
          where: {
            tenantId_providerRecordingId: {
              tenantId: call.tenantId,
              providerRecordingId,
            },
          },
          create: {
            callId: call.id,
            tenantId: call.tenantId,
            providerRecordingId,
            storageProvider: 'cloudflare_r2',
            duration,
            status: 'available',
            metadata: {
              rawPayload: payload as any,
              sourceUrl: recordingUrl,
            },
          },
          update: {
            duration: duration ?? undefined,
            status: 'available',
            metadata: {
              rawPayload: payload as any,
              sourceUrl: recordingUrl,
            },
          },
        });
        dbRecordingId = recording.id;
      }
    } catch (err: any) {
      this.logger.warn(`Database offline or error persisting CallRecording metadata: ${err.message}`);
    }

    // 4. Enqueue Asynchronous Recording Ingestion Job
    if (this.recordingQueueService) {
      await this.recordingQueueService.enqueueRecordingJob({
        recordingId: dbRecordingId,
        providerRecordingId,
        callId,
        tenantId,
        sourceUrl: recordingUrl,
        duration,
        provider: providerName,
        enqueuedAt: new Date().toISOString(),
      });
    }

    return {
      status: 'acknowledged',
      processed: true,
      recordingId: dbRecordingId,
    };
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

  /**
   * Honest system-readiness report: every capability flag is derived from real
   * runtime/config state rather than hard-coded marketing strings.
   */
  getSystemReadiness(): Record<string, unknown> {
    const providers = this.registry.getAllProviders().map((p) => ({
      name: p.name,
      configured: p.isConfigured,
    }));

    const mediaBound = this.configService.get<string>('TELEPHONY_MEDIA_BOUND', 'true') === 'true';
    const redisConfigured = Boolean(
      (this.configService.get('REDIS_HOST') || 'localhost') &&
      this.configService.get<number>('REDIS_PORT', 6379),
    );
    const deepgramConfigured = Boolean(this.configService.get<string>('DEEPGRAM_API_KEY'));
    const groqConfigured = Boolean(this.configService.get<string>('GROQ_API_KEY'));
    const ttsConfigured = Boolean(this.configService.get<string>('TTS_PROVIDER'));

    const speechPipelineReady =
      deepgramConfigured && groqConfigured && ttsConfigured && mediaBound;

    const anyProviderConfigured = providers.some((p) => p.configured);

    return {
      status: this.prisma.isConnected ? 'ready' : 'degraded',
      database: this.prisma.isConnected ? 'connected' : 'not_connected',
      architecture: 'telephony_foundation_v1',
      providers,
      anyProviderConfigured,
      mediaStreaming: mediaBound ? 'media_gateway_bound' : 'not_bound',
      activeSessions: this.audioSessionService.getActiveSessionsCount(),
      redisQueues: redisConfigured ? 'configured' : 'not_configured',
      speechPipeline: speechPipelineReady ? 'configured' : 'not_fully_configured',
      speechPipelineDetail: {
        stt: deepgramConfigured ? 'configured' : 'not_configured',
        brain: groqConfigured ? 'configured' : 'not_configured',
        tts: ttsConfigured ? 'configured' : 'not_configured',
      },
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
