import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AudioSessionService } from '../services/audio-session.service';
import { AudioFrame } from '../interfaces/audio-frame.interface';

import { ConversationOrchestrator } from '../../ai/orchestrator/conversation.orchestrator';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/telephony/stream',
})
export class TelephonyMediaGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelephonyMediaGateway.name);
  private readonly socketToSessionMap = new Map<string, string>();
  private readonly sequenceCounters = new Map<string, number>();

  constructor(
    private audioSessionService: AudioSessionService,
    private conversationOrchestrator: ConversationOrchestrator,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Telephony media transport connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const sessionId = this.socketToSessionMap.get(client.id);
    if (sessionId) {
      this.logger.log(`Media stream disconnected for session [${sessionId}]. Releasing resources.`);
      this.conversationOrchestrator.endSession(sessionId);
      this.socketToSessionMap.delete(client.id);
      this.sequenceCounters.delete(sessionId);
    }
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
   * Sends synthesized audio frame back to telephony provider for caller playback.
   */
  sendAudioChunkToCaller(socketId: string, streamSid: string, mulawBuffer: Buffer): void {
    const base64Audio = mulawBuffer.toString('base64');
    this.server.to(socketId).emit('media', {
      event: 'media',
      streamSid,
      media: {
        payload: base64Audio,
      },
    });

    const sessionId = this.socketToSessionMap.get(socketId);
    if (sessionId) {
      this.audioSessionService.recordOutboundFrame(sessionId, mulawBuffer.length);
    }
  }

  /**
   * Sends clear buffer instruction for barge-in / speech interruption.
   */
  sendBargeInClear(socketId: string, streamSid: string): void {
    this.server.to(socketId).emit('clear', {
      event: 'clear',
      streamSid,
    });
    this.logger.log(`Sent barge-in clear instruction to stream ${streamSid}`);
  }
}
