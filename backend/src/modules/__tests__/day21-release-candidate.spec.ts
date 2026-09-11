import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { CampaignsController } from '../campaigns/campaigns.controller';
import { IntegrationsController } from '../integrations/integrations.controller';
import { CampaignsService } from '../campaigns/services/campaigns.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { CallsGateway } from '../calls/calls.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MetricsService } from '../../common/services/metrics.service';

describe('Day 21 Release Candidate & Production UI Hardening Suite', () => {
  /* ── 1. Controller Defense-in-Depth Wiring ───────────────────── */
  describe('TenantGuard Wired on High-Risk Controllers', () => {
    function registeredGuards(target: object): string[] {
      const guards = Reflect.getMetadata('__guards__', target) as any[] | undefined;
      return (guards || []).map((g) => g?.name || 'UnknownGuard');
    }

    it('campaigns controller carries JwtAuth, Roles, Permissions, AND TenantGuard', () => {
      const guards = registeredGuards(CampaignsController);
      expect(guards).toContain('TenantGuard');
      expect(guards).toContain('JwtAuthGuard');
      expect(guards).toContain('RolesGuard');
      expect(guards).toContain('PermissionsGuard');
    });

    it('integrations controller carries JwtAuth AND TenantGuard (credentials surface)', () => {
      const guards = registeredGuards(IntegrationsController);
      expect(guards).toContain('TenantGuard');
      expect(guards).toContain('JwtAuthGuard');
    });
  });

  /* ── 2. Integration Secrets Omission & Tenant Scoping ────────── */
  describe('Integration Credential Safety & Tenant Isolation', () => {
    let service: IntegrationsService;
    let mockPrisma: any;
    let mockCrmQueue: any;
    let mockCrmProcessor: any;

    beforeEach(() => {
      mockCrmQueue = { enqueueSyncJob: jest.fn() };
      mockCrmProcessor = {
        getProvider: jest.fn(),
        processPayload: jest.fn().mockResolvedValue({ success: true }),
      };
      mockPrisma = {
        isConnected: true,
        integration: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'int-1',
              tenantId: 'tenant-a-test-id',
              provider: 'calcom',
              isActive: true,
              settings: { apiUrl: 'https://app.cal.com' },
              lastSyncAt: new Date('2026-09-10T10:00:00Z'),
              createdAt: new Date('2026-09-01T10:00:00Z'),
              updatedAt: new Date('2026-09-10T10:00:00Z'),
              credentials: { apiKey: 'cal_live_TOP_SECRET_KEY_123' },
            },
          ]),
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest.fn().mockResolvedValue({
            id: 'int-2',
            provider: 'hubspot',
            isActive: true,
            settings: {},
            credentials: { apiKey: 'hs_secret_999' },
          }),
        },
        call: {},
      };

      service = new IntegrationsService(mockPrisma, mockCrmQueue, mockCrmProcessor);
    });

    it('listIntegrations NEVER exposes raw credentials; only a masked presence flag', async () => {
      const result = await service.listIntegrations('tenant-a-test-id');
      expect(result).toHaveLength(1);
      expect(result[0].isConfigured).toBe(true);
      expect(result[0].maskedKey).toBe('••••••••');
      const str = JSON.stringify(result);
      expect(str).not.toContain('cal_live_TOP_SECRET_KEY_123');
      expect(str).not.toContain('apiKey');
      expect(result[0]).not.toHaveProperty('credentials');
    });

    it('getIntegration omits raw credentials from the response payload', async () => {
      mockPrisma.integration.findUnique.mockResolvedValue({
        id: 'int-1',
        tenantId: 'tenant-a-test-id',
        provider: 'calcom',
        isActive: true,
        settings: {},
        credentials: { apiKey: 'cal_live_TOP_SECRET_KEY_123' },
      });

      const result = await service.getIntegration('tenant-a-test-id', 'calcom' as any);
      expect(result).not.toBeNull();
      expect(result!.isConfigured).toBe(true);
      const str = JSON.stringify(result);
      expect(str).not.toContain('cal_live_TOP_SECRET_KEY_123');
      expect(result).not.toHaveProperty('credentials');
    });

    it('upsertIntegration response never echoes back the stored api key', async () => {
      const result = await service.upsertIntegration('tenant-a-test-id', 'hubspot' as any, {
        credentials: { apiKey: 'hs_secret_999' },
        settings: {},
      });
      const str = JSON.stringify(result);
      expect(str).not.toContain('hs_secret_999');
      expect(result).not.toHaveProperty('credentials');
    });

    it('rejects manual CRM sync when the call belongs to another tenant', async () => {
      mockPrisma.call = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'call-b-001',
          tenantId: 'tenant-b-test-id',
          phone: '+919876543210',
          status: 'completed',
        }),
      };

      await expect(
        service.syncCallNow('tenant-a-test-id', 'call-b-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /* ── 3. Realtime Gateway: Cross-Tenant Rejection & Idempotency ─ */
  describe('Campaign Room Access Control (Realtime)', () => {
    let gateway: CallsGateway;
    let mockServer: any;
    let mockSocket: any;
    let mockAuditLog: jest.Mock;

    beforeEach(async () => {
      mockServer = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
      mockAuditLog = jest.fn().mockResolvedValue(true);

      mockSocket = {
        id: 'socket-day21-1',
        tenantId: 'tenant-a-test-id',
        userId: 'user-a-001',
        role: 'company_admin',
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        handshake: { auth: { token: 'jwt-token-xyz' }, query: {}, headers: {} },
      };

      const mockPrisma = {
        isConnected: true,
        campaign: {
          findFirst: jest.fn().mockImplementation(async ({ where }) => {
            // Campaign camp-a-001 belongs to tenant A; camp-b-001 belongs to tenant B
            const ownership: Record<string, string> = {
              'camp-a-001': 'tenant-a-test-id',
              'camp-b-001': 'tenant-b-test-id',
            };
            if (ownership[where.id] === where.tenantId) {
              return { id: where.id, status: 'running' };
            }
            return null;
          }),
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CallsGateway,
          {
            provide: JwtService,
            useValue: undefined,
          },
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('test-secret') },
          },
          {
            provide: PrismaService,
            useValue: mockPrisma,
          },
          {
            provide: AuditService,
            useValue: { log: mockAuditLog },
          },
          {
            provide: MetricsService,
            useValue: { increment: jest.fn(), observeLatency: jest.fn() },
          },
        ],
      }).compile();

      gateway = module.get<CallsGateway>(CallsGateway);
      gateway.server = mockServer;
    });

    it('rejects join when campaign belongs to another tenant and writes an audit trail', async () => {
      const res = await gateway.handleJoinCampaign(mockSocket, { campaignId: 'camp-b-001' });

      expect(res).toEqual({ event: 'error', message: 'Campaign not found' });
      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CROSS_TENANT_ACCESS_ATTEMPT',
          resource: 'campaign',
          resourceId: 'camp-b-001',
          tenantId: 'tenant-a-test-id',
        }),
      );
    });

    it('allows re-joining the same campaign room idempotently without error', async () => {
      mockSocket.join.mockClear();

      const first = await gateway.handleJoinCampaign(mockSocket, { campaignId: 'camp-a-001' });
      const second = await gateway.handleJoinCampaign(mockSocket, { campaignId: 'camp-a-001' });

      expect(first).toEqual({ event: 'joined:campaign', status: 'ok', campaignId: 'camp-a-001' });
      expect(second).toEqual({ event: 'joined:campaign', status: 'ok', campaignId: 'camp-a-001' });
      expect(mockSocket.join).toHaveBeenNthCalledWith(1, 'campaign:camp-a-001');
      expect(mockSocket.join).toHaveBeenNthCalledWith(2, 'campaign:camp-a-001');
      expect(mockAuditLog).not.toHaveBeenCalled();
    });
  });

  /* ── 4. Deterministic Release-Candidate Business Journey ─────── */
  describe('Real-Time Call Webhook → Campaign Lifecycle Journey', () => {
    let service: CampaignsService;
    let mockPrisma: any;
    let mockQueue: any;
    let mockTelephony: any;
    let mockGateway: any;
    let broadcastLead: jest.Mock;
    let broadcastProgress: jest.Mock;

    beforeEach(() => {
      broadcastLead = jest.fn();
      broadcastProgress = jest.fn();

      mockPrisma = {
        isConnected: true,
        call: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'call-a-001',
            tenantId: 'tenant-a-test-id',
            campaignId: 'camp-a-001',
            status: 'completed',
            leadId: 'lead-a-001',
            agentId: 'agent-a-001',
            phone: '+919876543210',
            metadata: { campaignLeadId: 'cl-a-001' },
            campaign: { maxAttempts: 3, status: 'running' },
          }),
        },
        campaignLead: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'cl-a-001',
            campaignId: 'camp-a-001',
            leadId: 'lead-a-001',
            status: 'calling',
            attemptCount: 0,
          }),
          update: jest.fn().mockResolvedValue({ id: 'cl-a-001' }),
          findMany: jest.fn().mockResolvedValue([
            { status: 'completed' },
            { status: 'failed' },
            { status: 'completed' },
          ]),
          count: jest.fn().mockResolvedValue(0),
        },
        callCount: undefined,
        campaign: {
          update: jest.fn().mockResolvedValue({ id: 'camp-a-001', status: 'completed' }),
        },
      };
      mockPrisma.call.count = jest.fn().mockResolvedValue(0);

      mockQueue = {
        enqueueCallJob: jest.fn().mockResolvedValue({ jobId: 'job-1', queued: true }),
      };
      mockTelephony = { registerCallStatusHook: jest.fn() };
      mockGateway = {
        broadcastCampaignLeadStatus: broadcastLead,
        broadcastCampaignProgress: broadcastProgress,
      };

      service = new CampaignsService(
        mockPrisma,
        { isWithinCallingWindow: jest.fn(), checkDailyLimit: jest.fn(), validateLeadEligibility: jest.fn() } as any,
        mockQueue,
        mockTelephony,
        mockGateway as any,
      );
    });

    it('completes a campaign lead on a successful call and recomputes progress metrics', async () => {
      await service.handleCallOutcome('call-a-001', 'completed', 'demo_booked');

      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith({
        where: { id: 'cl-a-001' },
        data: { status: 'completed', outcome: 'demo_booked', lastCallId: 'call-a-001' },
      });
      expect(broadcastLead).toHaveBeenCalledWith('camp-a-001', 'tenant-a-test-id', {
        leadId: 'lead-a-001',
        status: 'completed',
        outcome: 'demo_booked',
        lastCallId: 'call-a-001',
      });
      expect(broadcastProgress).toHaveBeenCalledWith(
        'camp-a-001',
        'tenant-a-test-id',
        expect.objectContaining({ completed: 2, failed: 1, total: 3 }),
      );
    });

    it('schedules a retry for a busy call configured for retries', async () => {
      mockPrisma.call.findUnique.mockResolvedValue({
        id: 'call-a-002',
        tenantId: 'tenant-a-test-id',
        campaignId: 'camp-a-001',
        status: 'busy',
        leadId: 'lead-a-001',
        agentId: 'agent-a-001',
        phone: '+919876543210',
        metadata: { campaignLeadId: 'cl-a-002' },
        campaign: { maxAttempts: 3, status: 'running' },
      });
      mockPrisma.campaignLead.findUnique.mockResolvedValue({
        id: 'cl-a-002',
        campaignId: 'camp-a-001',
        leadId: 'lead-a-001',
        status: 'calling',
        attemptCount: 1,
      });

      await service.handleCallOutcome('call-a-002', 'busy');

      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'retry_pending' }),
        }),
      );
      expect(mockQueue.enqueueCallJob).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId: 'camp-a-001',
          attemptNumber: 2,
          phoneNumber: '+919876543210',
        }),
        expect.objectContaining({ delayMs: expect.any(Number) }),
      );
      expect(broadcastLead).toHaveBeenCalledWith(
        'camp-a-001',
        'tenant-a-test-id',
        expect.objectContaining({ status: 'retry_pending', attemptCount: 1 }),
      );
    });

    it('marks a lead failed once max attempts are exhausted', async () => {
      mockPrisma.campaignLead.findUnique.mockResolvedValue({
        id: 'cl-a-003',
        campaignId: 'camp-a-001',
        leadId: 'lead-a-001',
        status: 'retry_pending',
        attemptCount: 3,
      });

      await service.handleCallOutcome('call-a-003', 'missed');

      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith({
        where: { id: 'cl-a-003' },
        data: {
          status: 'failed',
          outcome: 'MAX_ATTEMPTS_REACHED',
          errorMessage: expect.stringContaining('attempt 3/3'),
        },
      });
      expect(broadcastLead).toHaveBeenCalledWith(
        'camp-a-001',
        'tenant-a-test-id',
        expect.objectContaining({ status: 'failed', outcome: 'MAX_ATTEMPTS_REACHED' }),
      );
      expect(mockQueue.enqueueCallJob).not.toHaveBeenCalled();
    });
  });
});