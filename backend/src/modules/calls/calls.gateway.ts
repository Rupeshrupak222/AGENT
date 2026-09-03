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
import { Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  role?: string;
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/calls',
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallsGateway.name);

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: no token provided (${client.id})`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });

      // Validate user exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, tenantId: true, role: true, isActive: true, name: true, email: true },
      });

      if (!user || !user.isActive) {
        this.logger.warn(`Connection rejected: user not found or inactive (${client.id})`);
        client.emit('error', { message: 'User not found or inactive' });
        client.disconnect();
        return;
      }

      // Validate tenant is active
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { id: true, isActive: true },
      });

      if (!tenant || !tenant.isActive) {
        this.logger.warn(`Connection rejected: tenant suspended (${client.id})`);
        client.emit('error', { message: 'Tenant account is suspended' });
        client.disconnect();
        return;
      }

      // Attach auth context to socket
      client.userId = user.id;
      client.tenantId = user.tenantId;
      client.role = user.role;
      client.user = user;

      // Join tenant room for scoped broadcasts
      client.join(`tenant:${user.tenantId}`);

      this.logger.log(
        `Client connected: ${client.id} (user: ${user.id}, tenant: ${user.tenantId}, role: ${user.role})`,
      );
    } catch (err: any) {
      this.logger.warn(`Connection rejected: invalid token (${client.id}): ${err.message}`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(
      `Client disconnected: ${client.id}` +
        (client.userId ? ` (user: ${client.userId}, tenant: ${client.tenantId})` : ''),
    );
  }

  @SubscribeMessage('join:call')
  async handleJoinCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    if (!client.tenantId) {
      return { event: 'error', message: 'Not authenticated' };
    }

    // Validate call belongs to this tenant
    const call = await this.prisma.call.findFirst({
      where: { id: data.callId, tenantId: client.tenantId },
      select: { id: true, status: true },
    });

    if (!call) {
      this.logger.warn(
        `Cross-tenant call join attempt: user ${client.userId} tried to join call ${data.callId} (tenant: ${client.tenantId})`,
      );
      await this.auditService.log({
        action: 'CROSS_TENANT_ACCESS_ATTEMPT',
        resource: 'call',
        resourceId: data.callId,
        details: { reason: 'join:call rejected - cross-tenant' },
        tenantId: client.tenantId,
        userId: client.userId,
      });
      return { event: 'error', message: 'Call not found' };
    }

    // Role-based access: viewer cannot join call rooms
    if (client.role === 'viewer') {
      return { event: 'error', message: 'Viewers cannot join call rooms' };
    }

    client.join(`call:${data.callId}`);
    this.logger.log(
      `Client ${client.id} joined call room: call:${data.callId} (tenant: ${client.tenantId})`,
    );
    return { event: 'joined:call', status: 'ok', callId: data.callId };
  }

  @SubscribeMessage('leave:call')
  handleLeaveCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    client.leave(`call:${data.callId}`);
    this.logger.log(`Client ${client.id} left call room: call:${data.callId}`);
    return { event: 'left:call', status: 'ok', callId: data.callId };
  }

  // ── Broadcasters (tenant-scoped) ─────────────────────────────────

  broadcastCallStatus(callId: string, tenantId: string, status: string, details?: any) {
    this.server.to(`call:${callId}`).emit('call:status', { callId, status, details });
    this.server.to(`tenant:${tenantId}`).emit('calls:overview_status', { callId, status, details });
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
