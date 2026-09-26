import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as WebSocket from 'ws';
import { AudioSessionService } from '../services/audio-session.service';
import { AudioFrame } from '../interfaces/audio-frame.interface';
import { ConversationOrchestrator } from '../../ai/orchestrator/conversation.orchestrator';
import { PrismaService } from '../../prisma/prisma.service';
import { hasPermission } from '../../../common/rbac/role-permissions';
import { callScope, ScopedActor } from '../../../common/scope';
import {
  CALL_INTERVENE,
  CALL_MONITOR,
  CALL_VIEW,
  Permission,
} from '../../../common/rbac/permissions';
import { MEDIA_STREAM_TOKEN_TYPE } from '../interfaces/telephony-provider.interface';

type SocketAuthContext = {
  kind: 'user' | 'media';
  userId?: string;
  name: string;
  tenantId: string;
  role?: string;
  callId?: string;
  provider?: string;
};

type AuthenticatedMediaSocket = Socket & {
  data: {
    auth?: SocketAuthContext;
    callId?: string;
  };
};

type AuthorizedCall = {
  id: string;
  tenantId: string;
  direction: 'inbound' | 'outbound';
  status: string;
  agentId: string;
  leadId: string;
  metadata: unknown;
};

type AccessTokenPayload = {
  sub?: string;
  tenantId?: string;
  role?: string;
  name?: string;
  email?: string;
  type?: string;
  callId?: string;
  provider?: string;
};

const websocketOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const MAX_PENDING_CARRIER_FRAMES = 512;

@WebSocketGateway({
  cors: {
    origin: websocketOrigins,
    credentials: true,
  },
  namespace: '/telephony/stream',
  pingInterval: 25000,
  pingTimeout: 10000,
})
export class TelephonyMediaGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelephonyMediaGateway.name);
  private readonly socketToSessionMap = new Map<string, string>();
  private readonly sequenceCounters = new Map<string, number>();
  private rawWsServer: WebSocket.Server | null = null;
  private readonly rawWsClients = new Map<string, WebSocket>();
  private readonly rawWsFramesBeforeAuth = new Map<string, any[]>();
  private readonly rawWsAuthSettled = new Set<string>();

  private readonly supervisorSessions = new Map<
    string,
    { callId: string; mode: 'listen' | 'whisper' | 'barge_in'; supervisorName: string }
  >();
  private readonly callBargeState = new Map<string, { barged: boolean; supervisorSocketId?: string }>();
  private readonly sessionToCallerMap = new Map<
    string,
    { socketId: string; streamSid: string; callId?: string; kind?: 'user' | 'media' }
  >();
  private readonly callToCarrierSocket = new Map<string, { socketId: string; kind: 'user' | 'media' }>();

  constructor(
    private audioSessionService: AudioSessionService,
    private conversationOrchestrator: ConversationOrchestrator,
    private configService: ConfigService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    const namespace = server as any;
    const ioServer: any = namespace?.server || namespace;
    const httpServer = ioServer?.httpServer;

    if (typeof namespace?.use === 'function') {
      namespace.use((socket: Socket, next: (err?: any) => void) => {
        this.authenticateNamespaceSocket(socket)
          .then(() => next())
          .catch((err: any) => next(new Error(err?.message || 'Unauthorized')));
      });
    }

    if (!httpServer) {
      this.logger.warn('Underlying HTTP server not found on Socket.IO server; raw WS support deferred.');
      return;
    }

    try {
      this.rawWsServer = new WebSocket.Server({ noServer: true });
      this.logger.log('Raw WebSocket server initialized for telephony media streams');

      httpServer.on('upgrade', (request: any, socket: any, head: any) => {
        let requestUrl: URL;
        try {
          requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
        } catch {
          return;
        }

        if (requestUrl.pathname !== '/telephony/stream' || requestUrl.searchParams.has('EIO')) {
          return;
        }

        this.rawWsServer?.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          this.handleRawWsConnection(ws, requestUrl);
        });
      });
    } catch (err: any) {
      this.logger.error(`Failed to bind raw WebSocket upgrade listener: ${err.message}`);
    }
  }

  private handleRawWsConnection(ws: WebSocket, requestUrl: URL) {
    const rawId = `raw-ws-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const client = {
      id: rawId,
      data: {} as { auth?: SocketAuthContext; callId?: string },
    } as unknown as AuthenticatedMediaSocket;

    this.rawWsClients.set(rawId, ws);
    this.rawWsFramesBeforeAuth.set(rawId, []);
    this.logger.log(`Raw telephony carrier WebSocket connected: ${rawId}`);

    ws.on('message', (message: WebSocket.Data) => {
      let data: any;
      try {
        data = JSON.parse(message.toString('utf-8'));
      } catch (err: any) {
        this.logger.error(`Error parsing raw telephony frame on [${rawId}]: ${err.message}`);
        return;
      }

      if (data?.event === 'connected') {
        this.logger.log(`Telephony protocol handshake connected on [${rawId}]: protocol=${data.protocol}`);
        return;
      }

      const authenticated = Boolean(client.data?.auth);
      if (!authenticated && data?.event !== 'start') {
        this.queueCarrierFrame(rawId, data);
        return;
      }

      if (!authenticated) {
        void this.authenticateCarrierFirstFrame(client, data, requestUrl)
          .then(() => this.drainCarrierFrames(client))
          .catch((err: any) => {
            this.logger.warn(`Rejected carrier media stream on [${rawId}]: ${err.message}`);
            this.closeCarrierStream(ws, 'Unauthorized media stream');
          });
        return;
      }

      this.handleCarrierFrame(client, data);
    });

    ws.on('close', () => {
      this.logger.log(`Raw telephony carrier WebSocket closed: ${rawId}`);
      this.handleDisconnect(client);
      this.rawWsClients.delete(rawId);
      this.rawWsFramesBeforeAuth.delete(rawId);
      this.rawWsAuthSettled.delete(rawId);
    });

    ws.on('error', (err) => {
      this.logger.error(`Raw telephony WebSocket error on [${rawId}]: ${err.message}`);
    });
  }

  private queueCarrierFrame(rawId: string, data: any): void {
    if (this.rawWsAuthSettled.has(rawId)) {
      this.closeCarrierStream(this.rawWsClients.get(rawId) as WebSocket, 'Unauthorized media stream');
      return;
    }

    const queue = this.rawWsFramesBeforeAuth.get(rawId) || [];
    if (queue.length >= MAX_PENDING_CARRIER_FRAMES) {
      this.logger.warn(`Carrier [${rawId}] exceeded the pre-authentication frame budget; dropping connection.`);
      this.rawWsAuthSettled.add(rawId);
      this.rawWsFramesBeforeAuth.set(rawId, []);
      this.closeCarrierStream(this.rawWsClients.get(rawId) as WebSocket, 'Unauthorized media stream');
      return;
    }
    queue.push(data);
    this.rawWsFramesBeforeAuth.set(rawId, queue);
  }

  private async authenticateCarrierFirstFrame(
    client: AuthenticatedMediaSocket,
    data: any,
    requestUrl: URL,
  ): Promise<void> {
    const rawId = client.id;
    if (this.rawWsAuthSettled.has(rawId)) {
      throw new Error('Carrier authentication already settled');
    }
    this.rawWsAuthSettled.add(rawId);

    const startData = data?.start || {};
    const token =
      startData.customParameters?.mediaStreamToken ||
      startData.customParameters?.token ||
      data?.customParameters?.mediaStreamToken ||
      requestUrl.searchParams.get('token') ||
      undefined;

    if (!token) {
      throw new Error('Carrier media token missing');
    }

    const auth = await this.authenticateMediaToken(token);
    client.data.auth = auth;
    await this.handleStreamStart(client, data);
  }

  private async drainCarrierFrames(client: AuthenticatedMediaSocket): Promise<void> {
    const queued = this.rawWsFramesBeforeAuth.get(client.id) || [];
    this.rawWsFramesBeforeAuth.delete(client.id);
    for (const frame of queued) {
      this.handleCarrierFrame(client, frame);
    }
  }

  private handleCarrierFrame(client: AuthenticatedMediaSocket, data: any): void {
    if (data?.event === 'start') {
      void this.handleStreamStart(client, data).catch((err: any) => {
        this.logger.warn(`Rejected carrier stream start on [${client.id}]: ${err.message}`);
        this.closeCarrierStream(this.rawWsClients.get(client.id) as WebSocket, 'Unauthorized media stream');
      });
    } else if (data?.event === 'media') {
      this.handleMediaChunk(client, data);
    } else if (data?.event === 'stop') {
      this.handleStreamStop(client, data);
    }
  }

  private closeCarrierStream(ws: WebSocket | undefined, reason: string): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.close(4003, reason);
  }

  async handleConnection(client: AuthenticatedMediaSocket) {
    if (client.data?.auth) {
      const auth = client.data.auth;
      this.logger.log(
        `Telephony media transport connected: ${client.id} (user: ${auth.userId}, tenant: ${auth.tenantId})`,
      );
      return;
    }
    try {
      await this.authenticateNamespaceSocket(client);
    } catch {
      return;
    }
  }

  private async authenticateNamespaceSocket(client: AuthenticatedMediaSocket): Promise<void> {
    try {
      const origin = client.handshake.headers?.origin;
      if (origin && !this.allowedOrigins().includes(origin)) {
        throw new Error('Origin is not allowed');
      }

      const token = this.extractAccessToken(client);
      if (!token) {
        throw new Error('Authentication required');
      }

      const auth = await this.authenticateUserAccessToken(token);
      client.data.auth = auth;
      this.logger.log(
        `Telephony media transport authenticated: ${client.id} (user: ${auth.userId}, tenant: ${auth.tenantId})`,
      );
    } catch (err: any) {
      this.logger.warn(`Telephony media connection rejected (${client.id}): ${err.message}`);
      client.emit('error', { message: 'Invalid or expired authentication' });
      client.disconnect();
      throw err;
    }
  }

  handleDisconnect(client: AuthenticatedMediaSocket | { id: string; data?: { auth?: SocketAuthContext } }) {
    const sessionId = this.socketToSessionMap.get(client.id);
    const auth = client.data?.auth;
    if (sessionId) {
      this.logger.log(`Media stream disconnected for session [${sessionId}]. Releasing resources.`);
      this.conversationOrchestrator.endSession(sessionId);
      this.audioSessionService.closeSession(sessionId, auth?.tenantId);
      this.socketToSessionMap.delete(client.id);
      this.sequenceCounters.delete(sessionId);
      const callerInfo = this.sessionToCallerMap.get(sessionId);
      this.sessionToCallerMap.delete(sessionId);
      if (callerInfo?.socketId === client.id && callerInfo.callId) {
        this.callToCarrierSocket.delete(callerInfo.callId);
      }
    }

    const supervisorSession = this.supervisorSessions.get(client.id);
    if (supervisorSession) {
      const bargeState = this.callBargeState.get(supervisorSession.callId);
      if (bargeState?.supervisorSocketId === client.id) {
        this.callBargeState.set(supervisorSession.callId, { barged: false });
      }
    }

    this.supervisorSessions.delete(client.id);
    this.logger.log(`Telephony media transport disconnected: ${client.id}`);
  }

  @SubscribeMessage('start')
  async handleStreamStart(
    @ConnectedSocket() client: AuthenticatedMediaSocket,
    @MessageBody() data: any,
  ) {
    const auth = this.requireSocketAuth(client);
    const startData = data?.start || data || {};
    const streamSid = startData.streamSid || data.streamSid;
    const requestedCallId = auth.kind === 'media'
      ? auth.callId
      : startData.customParameters?.callId || startData.callSid || data.callId;
    const call = await this.authorizeCall(client, requestedCallId);
    this.assertCallerOwnership(call.id, client, auth);

    this.logger.log(`Media stream started: streamSid=${streamSid}, callId=${call.id}`);

    let session = this.audioSessionService.getSessionByCallId(call.id, auth.tenantId);
    if (!session) {
      const provider = auth.provider || ((call.metadata as any)?.provider as string) || 'telephony';
      session = this.audioSessionService.createSession({
        callId: call.id,
        tenantId: auth.tenantId,
        agentId: call.agentId,
        leadId: call.leadId,
        provider,
        direction: call.direction,
        streamSid,
      });
    }

    this.socketToSessionMap.set(client.id, session.sessionId);
    this.sequenceCounters.set(session.sessionId, 0);
    this.sessionToCallerMap.set(session.sessionId, {
      socketId: client.id,
      streamSid: streamSid || '',
      callId: call.id,
      kind: auth.kind,
    });
    this.callToCarrierSocket.set(call.id, { socketId: client.id, kind: auth.kind });

    if ((client as any).join) {
      (client as any).join(`call_${session.callId}`);
    }

    this.conversationOrchestrator.startSession({
      sessionId: session.sessionId,
      callId: session.callId,
      tenantId: session.tenantId,
      agentId: session.agentId,
      socketId: client.id,
      streamSid: streamSid || '',
      onAudioChunk: (chunk: Buffer) => this.sendAudioChunkToCaller(client.id, streamSid || '', chunk),
      onBargeInClear: () => this.sendBargeInClear(client.id, streamSid || ''),
      onTranscriptBroadcast: (event: any) => this.sendTranscript(client.id, streamSid || '', event),
    });

    return { event: 'start:ack', streamSid, status: 'ready' };
  }

  @SubscribeMessage('media')
  handleMediaChunk(
    @ConnectedSocket() client: AuthenticatedMediaSocket,
    @MessageBody() data: any,
  ) {
    const sessionId = this.socketToSessionMap.get(client.id);
    if (!sessionId) return;

    const media = data?.media || data;
    const base64Payload = media?.payload;
    if (!base64Payload) return;

    try {
      const payloadBuffer = Buffer.from(base64Payload, 'base64');
      const seq = (this.sequenceCounters.get(sessionId) || 0) + 1;
      this.sequenceCounters.set(sessionId, seq);

      const frame: AudioFrame = {
        sessionId,
        sequenceNumber: seq,
        timestamp: media.timestamp ? parseInt(media.timestamp, 10) : Date.now(),
        payload: payloadBuffer,
        encoding: 'audio/x-mulaw',
        sampleRate: 8000,
        channels: 1,
      };

      this.audioSessionService.recordInboundFrame(sessionId, payloadBuffer.length);

      const session = this.audioSessionService.getSession(sessionId);
      if (session?.callId && this.server) {
        this.server.to(`call_${session.callId}`).emit('supervisor:caller_audio', {
          callId: session.callId,
          payload: base64Payload,
        });
      }

      this.conversationOrchestrator.handleAudioFrame(sessionId, payloadBuffer);
    } catch (err: any) {
      this.audioSessionService.recordDroppedFrame(sessionId);
      this.logger.error(`Failed to parse media frame for session [${sessionId}]: ${err.message}`);
    }
  }

  @SubscribeMessage('stop')
  handleStreamStop(
    @ConnectedSocket() client: AuthenticatedMediaSocket,
    @MessageBody() data: any,
  ) {
    const auth = this.requireSocketAuth(client);
    const sessionId = this.socketToSessionMap.get(client.id);
    this.logger.log(`Media stream stop event received for session [${sessionId || client.id}]`);
    if (!sessionId) {
      return;
    }

    const callerInfo = this.sessionToCallerMap.get(sessionId);
    if (auth.kind === 'user' && callerInfo?.kind === 'media') {
      throw new WsException('Only the telephony carrier transport may stop this media stream');
    }

    this.conversationOrchestrator.endSession(sessionId);
    this.audioSessionService.closeSession(sessionId, auth.tenantId);
    this.socketToSessionMap.delete(client.id);
    this.sequenceCounters.delete(sessionId);
    this.sessionToCallerMap.delete(sessionId);
    if (callerInfo?.callId) {
      this.callToCarrierSocket.delete(callerInfo.callId);
    }
  }

  @SubscribeMessage('user_text')
  handleUserText(
    @ConnectedSocket() client: AuthenticatedMediaSocket,
    @MessageBody() data: { text: string },
  ) {
    this.requireSocketAuth(client);
    const sessionId = this.socketToSessionMap.get(client.id);
    if (sessionId && data?.text) {
      this.conversationOrchestrator.handleUserTextMessage(sessionId, data.text);
    }
  }

  sendAudioChunkToCaller(socketId: string, streamSid: string, mulawBuffer: Buffer): void {
    const base64Audio = mulawBuffer.toString('base64');
    const mediaPayload = {
      event: 'media',
      streamSid,
      media: {
        payload: base64Audio,
      },
    };

    const rawWs = this.rawWsClients.get(socketId);
    if (rawWs && rawWs.readyState === WebSocket.OPEN) {
      rawWs.send(JSON.stringify(mediaPayload));
    } else if (this.server) {
      this.server.to(socketId).emit('media', mediaPayload);
    }

    const sessionId = this.socketToSessionMap.get(socketId);
    if (sessionId) {
      this.audioSessionService.recordOutboundFrame(sessionId, mulawBuffer.length);

      const session = this.audioSessionService.getSession(sessionId);
      if (session?.callId && this.server) {
        this.server.to(`call_${session.callId}`).emit('supervisor:agent_audio', {
          callId: session.callId,
          payload: base64Audio,
        });
      }
    }
  }

  sendBargeInClear(socketId: string, streamSid: string): void {
    const clearPayload = {
      event: 'clear',
      streamSid,
    };

    const rawWs = this.rawWsClients.get(socketId);
    if (rawWs && rawWs.readyState === WebSocket.OPEN) {
      rawWs.send(JSON.stringify(clearPayload));
    } else if (this.server) {
      this.server.to(socketId).emit('clear', clearPayload);
    }
    this.logger.log(`Sent barge-in clear instruction to stream ${streamSid}`);
  }

  sendTranscript(socketId: string, streamSid: string, transcript: any): void {
    const transcriptPayload = {
      event: 'transcript',
      streamSid,
      transcript,
    };

    const rawWs = this.rawWsClients.get(socketId);
    if (rawWs && rawWs.readyState === WebSocket.OPEN) {
      rawWs.send(JSON.stringify(transcriptPayload));
    } else if (this.server) {
      this.server.to(socketId).emit('transcript', transcriptPayload);
    }

    const sessionId = this.socketToSessionMap.get(socketId);
    if (sessionId) {
      const session = this.audioSessionService.getSession(sessionId);
      if (session?.callId && this.server) {
        this.server.to(`call_${session.callId}`).emit('transcript', transcriptPayload);
      }
    }
  }

  @SubscribeMessage('supervisor:join')
  async handleSupervisorJoin(
    @ConnectedSocket() client: AuthenticatedMediaSocket,
    @MessageBody() data: { callId: string; mode?: 'listen' | 'whisper' | 'barge_in' },
  ) {
    const auth = this.requireUserSocket(client);
    const { callId, mode = 'listen' } = data || {};
    if (!callId) return { success: false, error: 'callId is required' };
    if (!['listen', 'whisper', 'barge_in'].includes(mode)) {
      throw new WsException('Invalid supervisor mode');
    }
    const requiredPermission = mode === 'barge_in' ? CALL_INTERVENE : CALL_MONITOR;
    if (!hasPermission(auth.role || '', requiredPermission)) {
      throw new WsException(
        mode === 'barge_in'
          ? 'Call intervention permission required for barge-in'
          : 'Call monitoring permission required',
      );
    }

    const call = await this.findAuthorizedCall(callId, auth);
    if (!call) {
      throw new WsException('Call not found');
    }
    if (client.data.callId && client.data.callId !== call.id) {
      throw new WsException('Socket is already bound to another call');
    }
    client.data.callId = call.id;

    if ((client as any).join) {
      (client as any).join(`call_${call.id}`);
    }
    this.supervisorSessions.set(client.id, {
      callId: call.id,
      mode,
      supervisorName: auth.name,
    });

    this.logger.log(`[SUPERVISOR_JOINED] socket=${client.id} callId=${call.id} mode=${mode} name=${auth.name}`);

    this.server?.to(`call_${call.id}`).emit('supervisor:status', {
      callId: call.id,
      mode,
      supervisorName: auth.name,
      active: true,
      barged: this.callBargeState.get(call.id)?.barged || false,
    });

    return { success: true, callId: call.id, mode, status: 'monitoring' };
  }

  @SubscribeMessage('supervisor:set_mode')
  async handleSupervisorSetMode(
    @ConnectedSocket() client: AuthenticatedMediaSocket,
    @MessageBody() data: { callId: string; mode: 'listen' | 'whisper' | 'barge_in' },
  ) {
    const { callId, mode } = data || {};
    if (!callId || !['listen', 'whisper', 'barge_in'].includes(mode)) {
      throw new WsException('callId and a valid mode are required');
    }

    const auth = await this.authorizeSupervisorCall(
      client,
      callId,
      mode === 'barge_in' ? CALL_INTERVENE : CALL_MONITOR,
    );
    const supervisorSession = this.supervisorSessions.get(client.id);
    if (!supervisorSession) {
      throw new WsException('Supervisor session not found');
    }
    supervisorSession.mode = mode;

    if (mode === 'barge_in') {
      this.callBargeState.set(callId, { barged: true, supervisorSocketId: client.id });
      const session = this.audioSessionService.getSessionByCallId(callId, auth.tenantId);
      if (session) {
        const callerInfo = this.sessionToCallerMap.get(session.sessionId);
        if (callerInfo) {
          this.sendBargeInClear(callerInfo.socketId, callerInfo.streamSid);
        }
      }
      this.logger.log(`[SUPERVISOR_BARGE_IN] Supervisor ${client.id} took over live call ${callId}`);
    } else {
      this.callBargeState.set(callId, { barged: false });
    }

    this.server?.to(`call_${callId}`).emit('supervisor:status', {
      callId,
      mode,
      supervisorName: supervisorSession.supervisorName,
      active: true,
      barged: mode === 'barge_in',
    });

    return { success: true, callId, mode };
  }

  @SubscribeMessage('supervisor:audio')
  async handleSupervisorAudio(
    @ConnectedSocket() client: AuthenticatedMediaSocket,
    @MessageBody() data: { callId: string; payload: string },
  ) {
    const { callId, payload } = data || {};
    if (!callId || !payload) return;

    const supervisorSession = this.supervisorSessions.get(client.id);
    if (!supervisorSession || supervisorSession.callId !== callId) {
      throw new WsException('Supervisor session not found');
    }

    await this.authorizeSupervisorCall(
      client,
      callId,
      supervisorSession.mode === 'barge_in' ? CALL_INTERVENE : CALL_MONITOR,
    );

    if (supervisorSession.mode === 'barge_in') {
      const session = this.audioSessionService.getSessionByCallId(callId, this.requireUserSocket(client).tenantId);
      if (session) {
        const callerInfo = this.sessionToCallerMap.get(session.sessionId);
        if (callerInfo) {
          const buffer = Buffer.from(payload, 'base64');
          this.sendAudioChunkToCaller(callerInfo.socketId, callerInfo.streamSid, buffer);
        }
      }
    } else if (supervisorSession.mode === 'whisper') {
      this.server?.to(`call_${callId}`).emit('supervisor:whisper_audio', {
        callId,
        payload,
      });
    }
  }

  @SubscribeMessage('supervisor:release')
  async handleSupervisorRelease(
    @ConnectedSocket() client: AuthenticatedMediaSocket,
    @MessageBody() data: { callId: string },
  ) {
    const { callId } = data || {};
    if (!callId) return { success: false };

    await this.authorizeSupervisorCall(client, callId, CALL_INTERVENE);
    this.callBargeState.set(callId, { barged: false });
    const supervisorSession = this.supervisorSessions.get(client.id);
    if (supervisorSession) supervisorSession.mode = 'listen';

    this.server?.to(`call_${callId}`).emit('supervisor:released', {
      callId,
      message: 'Supervisor returned call control to autonomous AI Employee',
    });
    this.logger.log(`[SUPERVISOR_RELEASED] Call ${callId} returned to autonomous AI`);

    return { success: true, callId, mode: 'listen' };
  }

  private extractAccessToken(client: AuthenticatedMediaSocket): string | undefined {
    const authToken = client.handshake.auth?.token;
    const queryToken = client.handshake.query?.token;
    const authorization = client.handshake.headers?.authorization;
    const bearer = typeof authorization === 'string' && authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;

    const token = authToken || queryToken || bearer;
    return typeof token === 'string' && token.length > 0 ? token : undefined;
  }

  private async authenticateUserAccessToken(token: string): Promise<SocketAuthContext> {
    const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: this.jwtSecret(),
    });
    if (!payload.sub) {
      throw new Error('Token subject missing');
    }

    let user: {
      id: string;
      tenantId: string;
      role: string;
      isActive: boolean;
      name: string;
      email?: string;
      tenant?: { isActive: boolean };
    };

    if (this.prisma.isConnected) {
      user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          tenantId: true,
          role: true,
          isActive: true,
          name: true,
          email: true,
          tenant: { select: { isActive: true } },
        },
      }) as any;
    } else {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new Error('Database unavailable');
      }
      if (!payload.tenantId || !payload.role) {
        throw new Error('Development token context missing');
      }
      user = {
        id: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        isActive: true,
        name: payload.name || payload.email || 'Developer User',
        tenant: { isActive: true },
      };
    }

    if (!user?.isActive || !user.tenant?.isActive) {
      throw new Error('User or tenant inactive');
    }
    if (!hasPermission(user.role, CALL_VIEW)) {
      throw new Error('Telephony media access denied');
    }

    return {
      kind: 'user',
      userId: user.id,
      name: user.name,
      tenantId: user.tenantId,
      role: user.role,
    };
  }

  private async authenticateMediaToken(token: string): Promise<SocketAuthContext> {
    const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: this.jwtSecret(),
    });
    if (
      payload.type !== MEDIA_STREAM_TOKEN_TYPE ||
      !payload.sub ||
      !payload.tenantId ||
      !payload.callId ||
      payload.sub !== payload.callId
    ) {
      throw new Error('Invalid media token');
    }
    if (!this.prisma.isConnected) {
      throw new Error('Database unavailable');
    }

    const call = await this.prisma.call.findFirst({
      where: { id: payload.callId, tenantId: payload.tenantId },
      select: { id: true, status: true },
    });
    if (!call || this.isTerminalCallStatus(call.status)) {
      throw new Error('Call not available');
    }

    return {
      kind: 'media',
      name: 'Telephony provider',
      tenantId: payload.tenantId,
      callId: payload.callId,
      provider: payload.provider,
    };
  }

  private async authorizeCall(
    client: AuthenticatedMediaSocket,
    requestedCallId?: string,
  ): Promise<AuthorizedCall> {
    const auth = this.requireSocketAuth(client);
    const callId = auth.kind === 'media' ? auth.callId : requestedCallId;
    if (!callId) {
      throw new WsException('Call not found');
    }
    if (client.data.callId && client.data.callId !== callId) {
      throw new WsException('Socket is already bound to another call');
    }

    if (!this.prisma.isConnected) {
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new WsException('Call authorization unavailable');
      }
      client.data.callId = callId;
      auth.callId = callId;
      return {
        id: callId,
        tenantId: auth.tenantId,
        direction: 'outbound',
        status: 'in_progress',
        agentId: 'development-agent',
        leadId: 'development-lead',
        metadata: {},
      };
    }

    const call = await this.findAuthorizedCall(callId, auth);
    if (!call || this.isTerminalCallStatus(call.status)) {
      throw new WsException('Call not found');
    }

    client.data.callId = call.id;
    auth.callId = call.id;
    return call;
  }

  private assertCallerOwnership(
    callId: string,
    client: AuthenticatedMediaSocket,
    auth: SocketAuthContext,
  ): void {
    const owner = this.callToCarrierSocket.get(callId);
    if (!owner || owner.socketId === client.id) {
      return;
    }
    if (auth.kind === 'user' && owner.kind === 'media') {
      throw new WsException('Call media stream is already bound to the telephony carrier');
    }
    throw new WsException('Call media stream is already bound to another transport');
  }

  private async findAuthorizedCall(
    callId: string,
    auth: SocketAuthContext,
  ): Promise<AuthorizedCall | null> {
    if (!this.prisma.isConnected) {
      if (this.configService.get<string>('NODE_ENV') === 'production') return null;
      return {
        id: callId,
        tenantId: auth.tenantId,
        direction: 'outbound',
        status: 'in_progress',
        agentId: 'development-agent',
        leadId: 'development-lead',
        metadata: {},
      };
    }

    const where: Record<string, unknown> = { id: callId, tenantId: auth.tenantId };
    if (auth.kind === 'user' && auth.userId) {
      const actor: ScopedActor = { id: auth.userId, role: auth.role || '', tenantId: auth.tenantId };
      Object.assign(where, callScope(actor));
    }

    return this.prisma.call.findFirst({
      where,
      select: {
        id: true,
        tenantId: true,
        direction: true,
        status: true,
        agentId: true,
        leadId: true,
        metadata: true,
      },
    }) as Promise<AuthorizedCall | null>;
  }

  private async authorizeSupervisorCall(
    client: AuthenticatedMediaSocket,
    callId: string,
    permission: Permission,
  ): Promise<SocketAuthContext> {
    const auth = this.requireUserSocket(client);
    const supervisorSession = this.supervisorSessions.get(client.id);
    if (!supervisorSession || supervisorSession.callId !== callId) {
      throw new WsException('Supervisor session not found');
    }
    if (!hasPermission(auth.role || '', permission)) {
      throw new WsException('Supervisor permission denied');
    }
    const call = await this.findAuthorizedCall(callId, auth);
    if (!call) {
      throw new WsException('Call not found');
    }
    return auth;
  }

  private requireSocketAuth(client: AuthenticatedMediaSocket): SocketAuthContext {
    const auth = client.data?.auth;
    if (!auth?.tenantId) {
      throw new WsException('Authentication required');
    }
    return auth;
  }

  private requireUserSocket(client: AuthenticatedMediaSocket): SocketAuthContext {
    const auth = this.requireSocketAuth(client);
    if (auth.kind !== 'user' || !auth.userId) {
      throw new WsException('User authentication required');
    }
    return auth;
  }

  private isTerminalCallStatus(status: string): boolean {
    return ['completed', 'failed', 'missed', 'transferred'].includes(status);
  }

  private allowedOrigins(): string[] {
    return this.configService
      .get<string>('CORS_ORIGIN', 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  private jwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (secret) return secret;
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    return 'adyapan-dev-jwt-secret-key-change-in-production-2026';
  }
}
