import { Test, TestingModule } from '@nestjs/testing';
import { CallsGateway } from '../../calls/calls.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

describe('CallsGateway - Realtime Campaign & CRM Sync Operations', () => {
  let gateway: CallsGateway;
  let mockServer: any;
  let mockSocket: any;

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockSocket = {
      id: 'socket-test-123',
      tenantId: 'tenant-alpha',
      userId: 'user-001',
      role: 'company_admin',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      handshake: {
        auth: { token: 'jwt-token-xyz' },
        query: {},
        headers: {},
      },
    };

    const mockPrisma = {
      isConnected: false,
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-001',
          tenantId: 'tenant-alpha',
          role: 'company_admin',
          isActive: true,
        }),
      },
      campaign: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'camp-123',
          tenantId: 'tenant-alpha',
        }),
      },
      call: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'call-123',
          tenantId: 'tenant-alpha',
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallsGateway,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn().mockResolvedValue({
              sub: 'user-001',
              tenantId: 'tenant-alpha',
              role: 'company_admin',
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    gateway = module.get<CallsGateway>(CallsGateway);
    gateway.server = mockServer;
  });

  describe('Campaign Rooms Subscription', () => {
    it('allows authenticated client to join their tenant campaign room', async () => {
      const res = await gateway.handleJoinCampaign(mockSocket, { campaignId: 'camp-123' });

      expect(res).toEqual({ event: 'joined:campaign', status: 'ok', campaignId: 'camp-123' });
      expect(mockSocket.join).toHaveBeenCalledWith('campaign:camp-123');
    });

    it('allows client to leave campaign room', () => {
      const res = gateway.handleLeaveCampaign(mockSocket, { campaignId: 'camp-123' });

      expect(res).toEqual({ event: 'left:campaign', status: 'ok', campaignId: 'camp-123' });
      expect(mockSocket.leave).toHaveBeenCalledWith('campaign:camp-123');
    });
  });

  describe('Real-Time Gateway Broadcasting', () => {
    it('broadcasts campaign:status to campaign and tenant rooms', () => {
      gateway.broadcastCampaignStatus('camp-123', 'tenant-alpha', { status: 'running' });

      expect(mockServer.to).toHaveBeenCalledWith('campaign:camp-123');
      expect(mockServer.to).toHaveBeenCalledWith('tenant:tenant-alpha');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'campaign:status',
        expect.objectContaining({
          campaignId: 'camp-123',
          status: 'running',
        }),
      );
    });

    it('broadcasts campaign:progress metrics to room', () => {
      gateway.broadcastCampaignProgress('camp-123', 'tenant-alpha', {
        processed: 25,
        total: 100,
        completed: 20,
        failed: 5,
        connectRate: 80.0,
      });

      expect(mockServer.to).toHaveBeenCalledWith('campaign:camp-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'campaign:progress',
        expect.objectContaining({
          campaignId: 'camp-123',
          processed: 25,
          total: 100,
        }),
      );
    });

    it('broadcasts call:analysis to call and campaign rooms', () => {
      gateway.broadcastCallAnalysis('call-456', 'tenant-alpha', 'camp-123', {
        analysisStatus: 'completed',
        leadScore: 85,
        intent: 'demo_request',
        sentiment: 'positive',
      });

      expect(mockServer.to).toHaveBeenCalledWith('call:call-456');
      expect(mockServer.to).toHaveBeenCalledWith('campaign:camp-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'call:analysis',
        expect.objectContaining({
          callId: 'call-456',
          leadScore: 85,
          intent: 'demo_request',
        }),
      );
    });

    it('broadcasts crm:sync:status to tenant room', () => {
      gateway.broadcastCrmSyncStatus('tenant-alpha', {
        callId: 'call-456',
        provider: 'hubspot',
        status: 'synced',
        externalRecordId: 'hs-contact-999',
      });

      expect(mockServer.to).toHaveBeenCalledWith('tenant:tenant-alpha');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'crm:sync:status',
        expect.objectContaining({
          callId: 'call-456',
          provider: 'hubspot',
          status: 'synced',
          externalRecordId: 'hs-contact-999',
        }),
      );
    });
  });
});
