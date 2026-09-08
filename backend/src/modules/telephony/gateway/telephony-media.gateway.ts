import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as WebSocket from 'ws';
import { AudioSessionService } from '../services/audio-session.service';
import { AudioFrame } from '../interfaces/audio-frame.interface';
import { ConversationOrchestrator } from '../../ai/orchestrator/conversation.orchestrator';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/telephony/stream',
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

  // Supervisor monitoring state
  private readonly supervisorSessions = new Map<
    string,
    { callId: string; mode: 'listen' | 'whisper' | 'barge_in'; supervisorName: string }
  >();
  private readonly callBargeState = new Map<string, { barged: boolean; supervisorSocketId?: string }>();
  private readonly sessionToCallerMap = new Map<string, { socketId: string; streamSid: string }>();

  constructor(
    private audioSessionService: AudioSessionService,
    private conversationOrchestrator: ConversationOrchestrator,
  ) {}

  afterInit(server: Server) {
    // Attach raw WebSocket server to underlying HTTP server for Twilio Media Streams
    const httpServer = (server as any)?.httpServer || (server as any)?.server;
    if (!httpServer) {
      this.logger.warn('Underlying HTTP server not found on Socket.IO server; raw WS support deferred.');
      return;
    }

    try {
      this.rawWsServer = new WebSocket.Server({ noServer: true });
      this.logger.log('Raw WebSocket server initialized for Twilio Media Streams on /telephony/stream');

      httpServer.on('upgrade', (request: any, socket: any, head: any) => {
        const urlStr = request.url || '';
        if (urlStr.startsWith('/telephony/stream')) {
          this.rawWsServer?.handleUpgrade(request, socket, head, (ws: WebSocket) => {
            this.handleRawWsConnection(ws, request);
          });
        }
      });
    } catch (err: any) {
      this.logger.error(`Failed to bind raw WebSocket upgrade listener: ${err.message}`);
    }
  }

  /**
   * Handles raw WebSocket connection from real telephony carrier (Twilio / Exotel).
   */
  private handleRawWsConnection(ws: WebSocket, req: any) {
    const rawId = `raw-ws-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.rawWsClients.set(rawId, ws);
    this.logger.log(`Raw telephony carrier WebSocket connected: ${rawId}`);

    ws.on('message', (message: WebSocket.Data) => {
      try {
        const str = message.toString('utf-8');
        const data = JSON.parse(str);
        const event = data.event;

        if (event === 'connected') {
          this.logger.log(`Twilio protocol handshake connected on [${rawId}]: protocol=${data.protocol}`);
        } else if (event === 'start') {
          this.handleStreamStart({ id: rawId } as any, data);
        } else if (event === 'media') {
          this.handleMediaChunk({ id: rawId } as any, data);
        } else if (event === 'stop') {
          this.handleStreamStop({ id: rawId } as any, data);
        }
      } catch (err: any) {
        this.logger.error(`Error parsing raw telephony frame on [${rawId}]: ${err.message}`);
      }
    });

    ws.on('close', () => {
      this.logger.log(`Raw telephony carrier WebSocket closed: ${rawId}`);
      this.handleDisconnect({ id: rawId } as any);
      this.rawWsClients.delete(rawId);
    });

    ws.on('error', (err) => {
      this.logger.error(`Raw telephony WebSocket error on [${rawId}]: ${err.message}`);
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Telephony media transport connected: ${client.id}`);
  }

  handleDisconnect(client: Socket | { id: string }) {
    const sessionId = this.socketToSessionMap.get(client.id);
    if (sessionId) {
      this.logger.log(`Media stream disconnected for session [${sessionId}]. Releasing resources.`);
      this.conversationOrchestrator.endSession(sessionId);
      this.socketToSessionMap.delete(client.id);
      this.sequenceCounters.delete(sessionId);
      this.sessionToCallerMap.delete(sessionId);
    }
    this.supervisorSessions.delete(client.id);
    this.logger.log(`Telephony media transport disconnected: ${client.id}`);
  }

  /**
   * Handles stream initialization handshake from telephony provider (e.g. Twilio 'start' event)
   */
  @SubscribeMessage('start')
  handleStreamStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const startData = data?.start || data || {};
    const streamSid = startData.streamSid || data.streamSid;
    const callSid = startData.callSid || data.callSid;
    const customParameters = startData.customParameters || {};
    const callId = customParameters.callId || callSid;

    this.logger.log(`Media stream started: streamSid=${streamSid}, callSid=${callSid}, callId=${callId}`);

    let session = this.audioSessionService.getSessionByCallId(callId);
    if (!session) {
      // Create session on the fly if not initialized earlier
      session = this.audioSessionService.createSession({
        callId: callId || streamSid,
        tenantId: customParameters.tenantId || 'default-tenant',
        provider: 'twilio',
        direction: 'inbound',
        streamSid,
      });
    }

    this.socketToSessionMap.set(client.id, session.sessionId);
    this.sequenceCounters.set(session.sessionId, 0);
    this.sessionToCallerMap.set(session.sessionId, { socketId: client.id, streamSid: streamSid || '' });

    // Join room for this call so supervisor listeners can receive broadcast events
    if ((client as any).join) {
      (client as any).join(`call_${session.callId}`);
    }

    // Initialize ConversationOrchestrator for this audio session
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

  /**
   * Handles incoming audio frames from the caller/telephony provider.
   * Audio is delivered as base64-encoded mu-law (8kHz, 1 channel).
   */
  @SubscribeMessage('media')
  handleMediaChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const sessionId = this.socketToSessionMap.get(client.id);
    if (!sessionId) {
      return;
    }

    const media = data?.media || data;
    const base64Payload = media?.payload;
    if (!base64Payload) {
      return;
    }

    try {
      const payloadBuffer = Buffer.from(base64Payload, 'base64');
      const seq = (this.sequenceCounters.get(sessionId) || 0) + 1;
      this.sequenceCounters.set(sessionId, seq);

      // Construct normalized AudioFrame for the downstream STT pipeline
      const frame: AudioFrame = {
        sessionId,
        sequenceNumber: seq,
        timestamp: media.timestamp ? parseInt(media.timestamp, 10) : Date.now(),
        payload: payloadBuffer,
        encoding: 'audio/x-mulaw',
        sampleRate: 8000,
        channels: 1,
      };

      // Record telemetry in AudioSession
      this.audioSessionService.recordInboundFrame(sessionId, payloadBuffer.length);

      // Broadcast caller audio to supervisor monitoring room
      const session = this.audioSessionService.getSession(sessionId);
      if (session?.callId && this.server) {
        this.server.to(`call_${session.callId}`).emit('supervisor:caller_audio', {
          callId: session.callId,
          payload: base64Payload,
        });
      }

      // Pipe frame into ConversationOrchestrator (Deepgram STT)
      this.conversationOrchestrator.handleAudioFrame(sessionId, payloadBuffer);
    } catch (err: any) {
      this.audioSessionService.recordDroppedFrame(sessionId);
      this.logger.error(`Failed to parse media frame for session [${sessionId}]: ${err.message}`);
    }
  }

  /**
   * Handles call stream completion event from telephony provider.
   */
  @SubscribeMessage('stop')
  handleStreamStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const sessionId = this.socketToSessionMap.get(client.id);
    this.logger.log(`Media stream stop event received for session [${sessionId || client.id}]`);
    if (sessionId) {
      this.conversationOrchestrator.endSession(sessionId);
      this.audioSessionService.closeSession(sessionId);
      this.socketToSessionMap.delete(client.id);
      this.sequenceCounters.delete(sessionId);
    }
  }

  /**
   * Handles direct text messages from the browser sandbox (e.g. text simulation of caller).
   */
  @SubscribeMessage('user_text')
  handleUserText(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string },
  ) {
    const sessionId = this.socketToSessionMap.get(client.id);
    if (sessionId && data?.text) {
      this.conversationOrchestrator.handleUserTextMessage(sessionId, data.text);
    }
  }

  /**
   * Sends synthesized audio frame back to telephony provider for caller playback.
   */
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

      // Broadcast agent audio chunk to supervisors in call room
      const session = this.audioSessionService.getSession(sessionId);
      if (session?.callId && this.server) {
        this.server.to(`call_${session.callId}`).emit('supervisor:agent_audio', {
          callId: session.callId,
          payload: base64Audio,
        });
      }
    }
  }

  /**
   * Sends clear buffer instruction for barge-in / speech interruption.
   */
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

  /**
   * Sends real-time speech-to-text and AI response transcripts to connected client and supervisor room.
   */
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

  // ── Supervisor Live Monitoring & Coaching Controls ──────────────────────────

  @SubscribeMessage('supervisor:join')
  handleSupervisorJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; mode?: 'listen' | 'whisper' | 'barge_in'; name?: string },
  ) {
    const { callId, mode = 'listen', name = 'Supervisor' } = data || {};
    if (!callId) return { success: false, error: 'callId is required' };

    if ((client as any).join) {
      (client as any).join(`call_${callId}`);
    }
    this.supervisorSessions.set(client.id, {
      callId,
      mode,
      supervisorName: name,
    });

    this.logger.log(`[SUPERVISOR_JOINED] socket=${client.id} callId=${callId} mode=${mode} name=${name}`);

    this.server?.to(`call_${callId}`).emit('supervisor:status', {
      callId,
      mode,
      supervisorName: name,
      active: true,
      barged: this.callBargeState.get(callId)?.barged || false,
    });

    return { success: true, callId, mode, status: 'monitoring' };
  }

  @SubscribeMessage('supervisor:set_mode')
  handleSupervisorSetMode(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; mode: 'listen' | 'whisper' | 'barge_in' },
  ) {
    const { callId, mode } = data || {};
    if (!callId || !mode) return { success: false, error: 'callId and mode required' };

    const sup = this.supervisorSessions.get(client.id);
    if (sup) {
      sup.mode = mode;
    }

    if (mode === 'barge_in') {
      // Supervisor takeover: interrupt and clear ongoing AI speech immediately
      this.callBargeState.set(callId, { barged: true, supervisorSocketId: client.id });
      const session = this.audioSessionService.getSessionByCallId(callId);
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
      supervisorName: sup?.supervisorName || 'Supervisor',
      active: true,
      barged: mode === 'barge_in',
    });

    return { success: true, callId, mode };
  }

  @SubscribeMessage('supervisor:audio')
  handleSupervisorAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string; payload: string }, // base64 mu-law
  ) {
    const sup = this.supervisorSessions.get(client.id);
    const mode = sup?.mode || 'barge_in';
    const { callId, payload } = data || {};
    if (!callId || !payload) return;

    if (mode === 'barge_in') {
      // Send supervisor human speech directly to caller playback
      const session = this.audioSessionService.getSessionByCallId(callId);
      if (session) {
        const callerInfo = this.sessionToCallerMap.get(session.sessionId);
        if (callerInfo) {
          const buf = Buffer.from(payload, 'base64');
          this.sendAudioChunkToCaller(callerInfo.socketId, callerInfo.streamSid, buf);
        }
      }
    } else if (mode === 'whisper') {
      // Whisper mode: coaching audio is emitted only to supervisor coaching channel
      this.server?.to(`call_${callId}`).emit('supervisor:whisper_audio', {
        callId,
        payload,
      });
    }
  }

  @SubscribeMessage('supervisor:release')
  handleSupervisorRelease(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string },
  ) {
    const { callId } = data || {};
    if (!callId) return { success: false };

    this.callBargeState.set(callId, { barged: false });
    const sup = this.supervisorSessions.get(client.id);
    if (sup) sup.mode = 'listen';

    this.server?.to(`call_${callId}`).emit('supervisor:released', {
      callId,
      message: 'Supervisor returned call control to autonomous AI Employee',
    });
    this.logger.log(`[SUPERVISOR_RELEASED] Call ${callId} returned to autonomous AI`);

    return { success: true, callId, mode: 'listen' };
  }
}
