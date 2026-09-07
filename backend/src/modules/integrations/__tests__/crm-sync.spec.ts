import { Test, TestingModule } from '@nestjs/testing';
import { CrmSyncProcessor } from '../processors/crm-sync.processor';
import { MockCrmAdapter } from '../adapters/mock-crm.adapter';
import { HubSpotAdapter } from '../adapters/hubspot.adapter';
import { SalesforceAdapter } from '../adapters/salesforce.adapter';
import { ZohoAdapter } from '../adapters/zoho.adapter';
import { CrmQueueService } from '../services/crm-queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CallsGateway } from '../../calls/calls.gateway';
import { CrmSyncPayload } from '../interfaces/crm-provider.interface';

describe('Two-Way CRM Synchronization Pipeline', () => {
  let processor: CrmSyncProcessor;
  let mockAdapter: MockCrmAdapter;
  let mockPrisma: any;
  let mockCallsGateway: any;
  let mockQueueService: any;

  beforeEach(async () => {
    mockAdapter = new MockCrmAdapter();
    mockAdapter.clearStore();

    mockPrisma = {
      isConnected: true,
      integration: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'integ-1',
            tenantId: 'tenant-test',
            provider: 'mock',
            isActive: true,
            credentials: { apiKey: 'valid-test-key' },
            settings: {},
          },
        ]),
        update: jest.fn().mockResolvedValue({ id: 'integ-1' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    mockCallsGateway = {
      broadcastCrmSyncStatus: jest.fn(),
    };

    mockQueueService = {
      setInMemoryProcessor: jest.fn(),
      enqueueSyncJob: jest.fn().mockResolvedValue({ jobId: 'job-1', queued: true, mode: 'in_memory' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmSyncProcessor,
        { provide: MockCrmAdapter, useValue: mockAdapter },
        { provide: HubSpotAdapter, useValue: { providerName: 'hubspot', syncCallAnalysis: jest.fn() } },
        { provide: SalesforceAdapter, useValue: { providerName: 'salesforce', syncCallAnalysis: jest.fn() } },
        { provide: ZohoAdapter, useValue: { providerName: 'zoho', syncCallAnalysis: jest.fn() } },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CallsGateway, useValue: mockCallsGateway },
        { provide: CrmQueueService, useValue: mockQueueService },
      ],
    }).compile();

    processor = module.get<CrmSyncProcessor>(CrmSyncProcessor);
  });

  describe('MockCrmAdapter Health & Synchronization', () => {
    it('verifies valid connection successfully', async () => {
      const res = await mockAdapter.testConnection({ apiKey: 'valid-test-key' });
      expect(res.success).toBe(true);
      expect(res.provider).toBe('mock');
      expect(res.accountInfo?.organization).toBe('Mock Enterprise Dev Workspace');
    });

    it('rejects invalid credentials', async () => {
      const res = await mockAdapter.testConnection({ apiKey: 'invalid_key' });
      expect(res.success).toBe(false);
      expect(res.message).toContain('Invalid API Key');
    });

    it('synchronizes post-call analysis and updates contact in-memory', async () => {
      const payload: CrmSyncPayload = {
        tenantId: 'tenant-test',
        callId: 'call-xyz-101',
        leadId: 'lead-001',
        phone: '+14155552671',
        direction: 'outbound',
        duration: 180,
        callStatus: 'completed',
        analysis: {
          qualificationScore: 92,
          sentiment: 'positive',
          summary: 'Prospect interested in Enterprise tier demo.',
          nextAction: 'Schedule calendar invite with Account Executive',
          qualification: { qualified: true },
        },
        timestamp: new Date(),
      };

      const syncResult = await mockAdapter.syncCallAnalysis({}, payload);

      expect(syncResult.success).toBe(true);
      expect(syncResult.provider).toBe('mock');
      expect(syncResult.actionTaken).toBe('created');
      expect(syncResult.syncedFields.score).toBe(92);
      expect(syncResult.syncedFields.sentiment).toBe('positive');

      const storedContact = mockAdapter.getContact('+14155552671');
      expect(storedContact).toBeDefined();
      expect(storedContact?.status).toBe('qualified');
      expect(storedContact?.customFields?.lastCallScore).toBe(92);
    });
  });

  describe('CrmSyncProcessor Orchestration', () => {
    it('processes payload across active integrations, updates lastSyncAt, and broadcasts status', async () => {
      const payload: CrmSyncPayload = {
        tenantId: 'tenant-test',
        callId: 'call-abc-500',
        phone: '+15550001111',
        direction: 'outbound',
        callStatus: 'completed',
        analysis: {
          qualificationScore: 88,
          sentiment: 'positive',
          summary: 'Demo requested.',
          qualification: { qualified: true },
        },
        timestamp: new Date(),
      };

      const results = await processor.processPayload(payload);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].provider).toBe('mock');

      // Verifies DB lastSyncAt update
      expect(mockPrisma.integration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'integ-1' },
          data: expect.objectContaining({ lastSyncAt: expect.any(Date) }),
        }),
      );

      // Verifies Gateway real-time broadcast
      expect(mockCallsGateway.broadcastCrmSyncStatus).toHaveBeenCalledWith(
        'tenant-test',
        expect.objectContaining({
          callId: 'call-abc-500',
          provider: 'mock',
          status: 'synced',
        }),
      );
    });

    it('gracefully skips processing if no active CRM integrations exist for tenant', async () => {
      mockPrisma.integration.findMany.mockResolvedValueOnce([]);

      const payload: CrmSyncPayload = {
        tenantId: 'tenant-no-crm',
        callId: 'call-noop',
        phone: '+15550002222',
        direction: 'inbound',
        callStatus: 'completed',
        timestamp: new Date(),
      };

      const results = await processor.processPayload(payload);
      expect(results).toEqual([]);
      expect(mockCallsGateway.broadcastCrmSyncStatus).not.toHaveBeenCalled();
    });
  });
});
