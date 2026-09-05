import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CampaignsService } from '../services/campaigns.service';
import { CampaignStatus } from '../dto/campaign.dto';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let mockPrisma: any;
  let mockEligibility: any;
  let mockQueue: any;
  let mockTelephony: any;

  beforeEach(() => {
    mockPrisma = {
      isConnected: true,
      campaign: {
        create: jest.fn().mockResolvedValue({ id: 'camp-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({ id: 'camp-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'camp-1' }),
      },
      aIAgent: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      lead: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      campaignLead: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({ id: 'cl-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      call: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _avg: { duration: 0 }, _count: { id: 0 } }),
        update: jest.fn().mockResolvedValue({ id: 'call-1' }),
      },
    };

    mockEligibility = {
      normalizePhoneNumber: jest.fn().mockReturnValue({ isValid: true, normalized: '+919876543210' }),
      isWithinCallingWindow: jest.fn().mockReturnValue({ inWindow: true }),
      checkDailyLimit: jest.fn().mockResolvedValue({ withinLimit: true, dispatchedToday: 0, limit: 100 }),
      validateLeadEligibility: jest.fn().mockResolvedValue({ isEligible: true, normalizedPhone: '+919876543210' }),
    };

    mockQueue = {
      enqueueCallJob: jest.fn().mockResolvedValue({ jobId: 'job-1', queued: true }),
      clearCampaignInMemoryJobs: jest.fn().mockReturnValue(0),
    };

    mockTelephony = {
      registerCallStatusHook: jest.fn(),
    };

    service = new CampaignsService(mockPrisma, mockEligibility, mockQueue, mockTelephony);
  });

  describe('Campaign Creation & Agent Validation', () => {
    it('should successfully create a campaign when agent is active in tenant', async () => {
      mockPrisma.aIAgent.findFirst.mockResolvedValue({
        id: 'agent-1',
        name: 'Sarah',
        status: 'active',
        tenantId: 'tenant-acme',
      });
      mockPrisma.campaign.create.mockResolvedValue({
        id: 'camp-1',
        name: 'SaaS Outreach',
        tenantId: 'tenant-acme',
        agentId: 'agent-1',
        status: CampaignStatus.DRAFT,
      });

      const result = await service.create('tenant-acme', 'user-1', {
        name: 'SaaS Outreach',
        agentId: 'agent-1',
        maxConcurrentCalls: 5,
        maxAttempts: 3,
      });

      expect(result.id).toBe('camp-1');
      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-acme',
            name: 'SaaS Outreach',
            agentId: 'agent-1',
            status: CampaignStatus.DRAFT,
          }),
        }),
      );
    });

    it('should reject creation if agent does not belong to tenant', async () => {
      mockPrisma.aIAgent.findFirst.mockResolvedValue(null);

      await expect(
        service.create('tenant-acme', 'user-1', {
          name: 'Hacker Campaign',
          agentId: 'agent-alien',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject creation if agent is not in active status', async () => {
      mockPrisma.aIAgent.findFirst.mockResolvedValue({
        id: 'agent-2',
        name: 'Draft Agent',
        status: 'draft',
        tenantId: 'tenant-acme',
      });

      await expect(
        service.create('tenant-acme', 'user-1', {
          name: 'Test Campaign',
          agentId: 'agent-2',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow Tenant A to view Tenant B campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('tenant-A', 'camp-belonging-to-tenant-B'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith({
        where: { id: 'camp-belonging-to-tenant-B', tenantId: 'tenant-A' },
        include: expect.anything(),
      });
    });

    it('should not allow Tenant A to delete Tenant B campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.delete('tenant-A', 'camp-B'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Lead Enrollment', () => {
    it('should enroll only leads belonging to the tenant and skip existing ones', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'camp-1', tenantId: 'tenant-1' });
      mockPrisma.lead.findMany.mockResolvedValue([
        { id: 'lead-1', phone: '+919876543210' },
        { id: 'lead-2', phone: '+919876543211' },
      ]);
      mockPrisma.campaignLead.findMany.mockResolvedValue([{ leadId: 'lead-1' }]);
      mockPrisma.campaignLead.count.mockResolvedValue(2);

      const res = await service.addLeads('tenant-1', 'camp-1', ['lead-1', 'lead-2']);
      expect(res.added).toBe(1); // Only lead-2 was new
      expect(res.total).toBe(2);
      expect(mockPrisma.campaignLead.createMany).toHaveBeenCalledWith({
        data: [{ campaignId: 'camp-1', leadId: 'lead-2', status: 'pending', attemptCount: 0 }],
        skipDuplicates: true,
      });
    });
  });

  describe('Lifecycle State Transitions (Start, Pause, Resume, Cancel)', () => {
    it('should start a draft campaign, transition to running, and enqueue eligible leads', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        status: CampaignStatus.DRAFT,
        maxAttempts: 3,
      });
      mockPrisma.aIAgent.findFirst.mockResolvedValue({ id: 'agent-1', status: 'active' });
      mockPrisma.campaignLead.findMany.mockResolvedValue([
        { id: 'cl-1', leadId: 'lead-1', attemptCount: 0, lead: { phone: '+919876543210' } },
        { id: 'cl-2', leadId: 'lead-2', attemptCount: 0, lead: { phone: '+919876543211' } },
      ]);

      const res = await service.startCampaign('tenant-1', 'camp-1');
      expect(res.status).toBe(CampaignStatus.RUNNING);
      expect(res.enqueued).toBe(2);
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
        data: { status: CampaignStatus.RUNNING },
      });
      expect(mockQueue.enqueueCallJob).toHaveBeenCalledTimes(2);
    });

    it('should pause a running campaign and prevent new dispatches', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        tenantId: 'tenant-1',
        status: CampaignStatus.RUNNING,
      });

      const res = await service.pauseCampaign('tenant-1', 'camp-1');
      expect(res.status).toBe(CampaignStatus.PAUSED);
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
        data: { status: CampaignStatus.PAUSED },
      });
    });

    it('should cancel a campaign, clear queued jobs, and mark pending leads as skipped', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        tenantId: 'tenant-1',
        status: CampaignStatus.RUNNING,
      });

      const res = await service.cancelCampaign('tenant-1', 'camp-1');
      expect(res.status).toBe(CampaignStatus.CANCELLED);
      expect(mockQueue.clearCampaignInMemoryJobs).toHaveBeenCalledWith('camp-1');
      expect(mockPrisma.campaignLead.updateMany).toHaveBeenCalledWith({
        where: { campaignId: 'camp-1', status: { in: ['pending', 'queued', 'retry_pending'] } },
        data: { status: 'skipped', errorMessage: 'Campaign cancelled by user' },
      });
    });
  });

  describe('Campaign Auto-Completion Detection', () => {
    it('should mark campaign completed when 0 unfinished leads and 0 active calls remain', async () => {
      mockPrisma.campaignLead.count.mockResolvedValue(0);
      mockPrisma.call.count.mockResolvedValue(0);

      const completed = await service.checkCampaignCompletion('camp-1');
      expect(completed).toBe(true);
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
        data: { status: CampaignStatus.COMPLETED },
      });
    });

    it('should not complete campaign if active calls remain', async () => {
      mockPrisma.campaignLead.count.mockResolvedValue(0);
      mockPrisma.call.count.mockResolvedValue(2); // 2 calls still in progress

      const completed = await service.checkCampaignCompletion('camp-1');
      expect(completed).toBe(false);
    });
  });
});
