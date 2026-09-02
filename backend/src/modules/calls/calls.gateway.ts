import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/calls',
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:call')
  handleJoinCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string },
  ) {
    client.join(`call:${data.callId}`);
    this.logger.log(`Client ${client.id} joined call room: call:${data.callId}`);
    return { event: 'joined:call', status: 'ok', callId: data.callId };
  }

  @SubscribeMessage('leave:call')
  handleLeaveCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callId: string },
  ) {
    client.leave(`call:${data.callId}`);
    this.logger.log(`Client ${client.id} left call room: call:${data.callId}`);
    return { event: 'left:call', status: 'ok', callId: data.callId };
  }

  // ── Broadcasters for Telephony / Voice Stream ─────────────────────────

  broadcastCallStatus(callId: string, status: string, details?: any) {
    this.server.to(`call:${callId}`).emit('call:status', { callId, status, details });
    this.server.emit('calls:overview_status', { callId, status, details });
  }

  broadcastWaveform(callId: string, bars: number[]) {
    this.server.to(`call:${callId}`).emit('call:waveform', { callId, bars });
  }

  broadcastTranscript(callId: string, speaker: 'agent' | 'user', text: string, timestamp?: number) {
    this.server.to(`call:${callId}`).emit('call:transcript', {
      callId,
      speaker,
      text,
      timestamp: timestamp || Date.now(),
    });
  }
}
