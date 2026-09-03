import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleDestroy,
} from '@nestjs/common';
import { IAudioSession, AudioSessionState } from '../interfaces/audio-session.interface';

export interface CreateSessionParams {
  sessionId?: string;
  callId: string;
  tenantId: string;
  agentId?: string;
  leadId?: string;
  provider: string;
  direction: 'inbound' | 'outbound';
  streamSid?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AudioSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(AudioSessionService.name);
  private readonly sessions = new Map<string, IAudioSession>();
  private readonly callIdToSessionId = new Map<string, string>();
  private readonly cleanupInterval: NodeJS.Timeout;

  // Maximum active sessions in memory to prevent heap exhaustion
  private readonly MAX_ACTIVE_SESSIONS = 5000;
  // Maximum idle duration in ms before reaping (15 minutes)
  private readonly IDLE_TIMEOUT_MS = 15 * 60 * 1000;

  constructor() {
    this.cleanupInterval = setInterval(() => this.reapIdleSessions(), 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  createSession(params: CreateSessionParams): IAudioSession {
    if (this.sessions.size >= this.MAX_ACTIVE_SESSIONS) {
      this.logger.error('AudioSessionService reached max concurrent session limit. Dropping new session request.');
      throw new Error('Maximum concurrent audio sessions reached');
    }

    // Check if call already has active session
    const existingSessionId = this.callIdToSessionId.get(params.callId);
    if (existingSessionId && this.sessions.has(existingSessionId)) {
      const existing = this.sessions.get(existingSessionId)!;
      if (existing.tenantId !== params.tenantId) {
        throw new ForbiddenException('Cross-tenant call session collision detected');
      }
      this.logger.warn(`Call ${params.callId} already has active session ${existingSessionId}. Returning existing session.`);
      return existing;
    }

    const sessionId = params.sessionId || `sess-${params.callId}-${Date.now()}`;
    const now = Date.now();

    const session: IAudioSession = {
      sessionId,
      callId: params.callId,
      tenantId: params.tenantId,
      agentId: params.agentId,
      leadId: params.leadId,
      provider: params.provider,
      direction: params.direction,
      streamSid: params.streamSid,
      state: 'initializing',
      startedAt: now,
      lastActivityAt: now,
      metadata: params.metadata || {},
      metrics: {
        inboundFramesCount: 0,
        outboundFramesCount: 0,
        inboundBytes: 0,
        outboundBytes: 0,
        droppedFrames: 0,
      },
    };

    this.sessions.set(sessionId, session);
    this.callIdToSessionId.set(params.callId, sessionId);

    this.logger.log(`Created AudioSession [${sessionId}] for call ${params.callId} (tenant: ${params.tenantId})`);
    return session;
  }

  getSession(sessionId: string, tenantId?: string): IAudioSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Audio session "${sessionId}" not found`);
    }

    if (tenantId && session.tenantId !== tenantId) {
      this.logger.warn(`Tenant isolation breach attempt: tenant ${tenantId} requested session ${sessionId} belonging to ${session.tenantId}`);
      throw new ForbiddenException('Access to audio session denied (cross-tenant violation)');
    }

    return session;
  }

  getSessionByCallId(callId: string, tenantId?: string): IAudioSession | null {
    const sessionId = this.callIdToSessionId.get(callId);
    if (!sessionId) return null;
    return this.getSession(sessionId, tenantId);
  }

  updateSessionState(sessionId: string, tenantId: string, state: AudioSessionState): IAudioSession {
    const session = this.getSession(sessionId, tenantId);
    session.state = state;
    session.lastActivityAt = Date.now();
    if (state === 'closed' || state === 'error') {
      session.endedAt = Date.now();
    }
    return session;
  }

  recordInboundFrame(sessionId: string, byteLength: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.metrics.inboundFramesCount += 1;
    session.metrics.inboundBytes += byteLength;
    session.lastActivityAt = Date.now();
    if (session.state === 'initializing') {
      session.state = 'active';
    }
  }

  recordOutboundFrame(sessionId: string, byteLength: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.metrics.outboundFramesCount += 1;
    session.metrics.outboundBytes += byteLength;
    session.lastActivityAt = Date.now();
  }

  recordDroppedFrame(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.metrics.droppedFrames += 1;
  }

  closeSession(sessionId: string, tenantId?: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (tenantId && session.tenantId !== tenantId) {
      throw new ForbiddenException('Cannot close audio session of another tenant');
    }

    session.state = 'closed';
    session.endedAt = Date.now();

    this.callIdToSessionId.delete(session.callId);
    this.sessions.delete(sessionId);

    this.logger.log(`Closed AudioSession [${sessionId}] for call ${session.callId}. Inbound frames: ${session.metrics.inboundFramesCount}, Outbound frames: ${session.metrics.outboundFramesCount}`);
    return true;
  }

  getActiveSessionsCount(tenantId?: string): number {
    if (!tenantId) return this.sessions.size;
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.tenantId === tenantId && session.state === 'active') {
        count += 1;
      }
    }
    return count;
  }

  private reapIdleSessions(): void {
    const now = Date.now();
    let reapedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivityAt > this.IDLE_TIMEOUT_MS) {
        this.closeSession(sessionId);
        reapedCount += 1;
      }
    }

    if (reapedCount > 0) {
      this.logger.log(`Reaped ${reapedCount} idle audio sessions`);
    }
  }
}
