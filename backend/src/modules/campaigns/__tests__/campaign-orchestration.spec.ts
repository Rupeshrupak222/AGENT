import { OutboundCallProcessor } from '../processors/outbound-call.processor';
import { CampaignQueueService } from '../services/campaign-queue.service';

describe('Campaign Orchestration & Outbound Worker', () => {
  let processor: OutboundCallProcessor;
  let queueService: CampaignQueueService;
  let mockPrisma: any;
  let mockTelephony: any;
  let mockEligibility: any;
  let mockBullQueue: any;

  beforeEach(() => {
    mockBullQueue = {
      add: jest.fn(),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getActiveCount: jest.fn().mockResolvedValue(0),
      client: { status: 'offline' },
    };

    queueService = new CampaignQueueService(mockBullQueue as any);

    mockPrisma = {
      isConnected: true,
      campaign: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      aIAgent: {
        findFirst: jest.fn(),
      },
      campaignLead: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'cl-1' }),
      },
      call: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'call-1' }),
        update: jest.fn().mockResolvedValue({ id: 'call-1' }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    mockTelephony = {
      dispatchOutboundCall: jest.fn().mockResolvedValue({
        callId: 'call-100',
        providerCallId: 'CA_TEST_SID_123',
        status: 'queued',
      }),
      registerCallStatusHook: jest.fn(),
    };

    mockEligibility = {
      isWithinCallingWindow: jest.fn().mockReturnValue({ inWindow: true }),
      checkDailyLimit: jest.fn().mockResolvedValue({ withinLimit: true, dispatchedToday: 10, limit: 100 }),
      validateLeadEligibility: jest.fn().mockResolvedValue({ isEligible: true, normalizedPhone: '+919876543210' }),
    };

    processor = new OutboundCallProcessor(mockPrisma, mockTelephony, mockEligibility, queueService);
  });

  describe('Idempotent Job Enqueueing', () => {
    it('should generate compound deterministic job ID to prevent duplicate calls', async () => {
      const res = await queueService.enqueueCallJob({
        campaignId: 'camp-1',
        campaignLeadId: 'cl-1',
        leadId: 'lead-1',
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        attemptNumber: 1,
        phoneNumber: '+919876543210',
        enqueuedAt: new Date().toISOString(),
      });

      expect(res.jobId).toBe('campaign:camp-1:lead:lead-1:attempt:1');
      expect(res.queued).toBe(true);

      // Attempt duplicate enqueue of identical attempt
      const dup = await queueService.enqueueCallJob({
        campaignId: 'camp-1',
        campaignLeadId: 'cl-1',
        leadId: 'lead-1',
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        attemptNumber: 1,
        phoneNumber: '+919876543210',
        enqueuedAt: new Date().toISOString(),
      });

      expect(dup.queued).toBe(false); // Rejected duplicate
    });
  });

  describe('Worker Re-Validation Safeguards', () => {
    const jobData = {
      campaignId: 'camp-1',
      campaignLeadId: 'cl-1',
      leadId: 'lead-1',
      agentId: 'agent-1',
      tenantId: 'tenant-1',
      attemptNumber: 1,
      phoneNumber: '+919876543210',
      enqueuedAt: new Date().toISOString(),
    };

    it('should abort dispatch if campaign is no longer running (e.g. paused/cancelled)', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        tenantId: 'tenant-1',
        status: 'paused', // Campaign was paused while job sat in queue
      });

      const res = await processor.executeCallJob(jobData);
      expect(res.dispatched).toBe(false);
      expect(res.reason).toContain('CAMPAIGN_NOT_RUNNING');
      expect(mockTelephony.dispatchOutboundCall).not.toHaveBeenCalled();
    });

    it('should defer job if campaign concurrency limit is reached', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        tenantId: 'tenant-1',
        status: 'running',
        maxConcurrentCalls: 3,
      });
      // 3 calls already active for this campaign
      mockPrisma.call.count.mockResolvedValue(3);

      const res = await processor.executeCallJob(jobData);
      expect(res.dispatched).toBe(false);
      expect(res.reason).toBe('CONCURRENCY_CAP_REACHED');
      expect(mockTelephony.dispatchOutboundCall).not.toHaveBeenCalled();
    });

    it('should abort dispatch if calling window is closed', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        tenantId: 'tenant-1',
        status: 'running',
      });
      mockEligibility.isWithinCallingWindow.mockReturnValue({
        inWindow: false,
        reason: 'outside window 09:00 - 18:00',
      });

      const res = await processor.executeCallJob(jobData);
      expect(res.dispatched).toBe(false);
      expect(res.reason).toBe('OUTSIDE_CALLING_WINDOW');
      expect(mockTelephony.dispatchOutboundCall).not.toHaveBeenCalled();
    });

    it('should abort dispatch if daily call limit is reached', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        tenantId: 'tenant-1',
        status: 'running',
      });
      mockEligibility.checkDailyLimit.mockResolvedValue({
        withinLimit: false,
        dispatchedToday: 100,
        limit: 100,
      });

      const res = await processor.executeCallJob(jobData);
      expect(res.dispatched).toBe(false);
      expect(res.reason).toBe('DAILY_LIMIT_EXCEEDED');
      expect(mockTelephony.dispatchOutboundCall).not.toHaveBeenCalled();
    });

    it('should abort dispatch if assigned agent is inactive', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        tenantId: 'tenant-1',
        status: 'running',
        agentId: 'agent-1',
      });
      mockPrisma.call.count.mockResolvedValue(0);
      mockPrisma.aIAgent.findFirst.mockResolvedValue(null); // Agent deleted or not active

      const res = await processor.executeCallJob(jobData);
      expect(res.dispatched).toBe(false);
      expect(res.reason).toBe('AGENT_INACTIVE_OR_INVALID');
      expect(mockTelephony.dispatchOutboundCall).not.toHaveBeenCalled();
    });
  });

  describe('Successful Outbound Call Dispatch Flow', () => {
    it('should transition CampaignLead to calling, create Call, and dispatch to TelephonyService', async () => {
      const jobData = {
        campaignId: 'camp-1',
        campaignLeadId: 'cl-1',
        leadId: 'lead-1',
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        attemptNumber: 1,
        phoneNumber: '+919876543210',
        enqueuedAt: new Date().toISOString(),
      };

      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        tenantId: 'tenant-1',
        status: 'running',
        agentId: 'agent-1',
        maxConcurrentCalls: 5,
        maxAttempts: 3,
      });
      mockPrisma.call.count.mockResolvedValue(0);
      mockPrisma.aIAgent.findFirst.mockResolvedValue({ id: 'agent-1', status: 'active' });
      mockPrisma.campaignLead.findFirst.mockResolvedValue({
        id: 'cl-1',
        campaignId: 'camp-1',
        leadId: 'lead-1',
        status: 'pending',
        attemptCount: 0,
        lead: { id: 'lead-1', phone: '+919876543210', deletedAt: null },
      });
      mockPrisma.campaignLead.update.mockResolvedValue({
        id: 'cl-1',
        status: 'calling',
        attemptCount: 1,
      });
      mockPrisma.call.create.mockResolvedValue({
        id: 'call-created-123',
        tenantId: 'tenant-1',
        campaignId: 'camp-1',
        status: 'queued',
      });

      const res = await processor.executeCallJob(jobData);
      expect(res.dispatched).toBe(true);
      expect(res.callId).toBe('call-created-123');

      // Verified atomic transition: CampaignLead marked calling
      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith({
        where: { id: 'cl-1' },
        data: expect.objectContaining({ status: 'calling' }),
      });

      // Verified Call creation
      expect(mockPrisma.call.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          campaignId: 'camp-1',
          agentId: 'agent-1',
          direction: 'outbound',
          status: 'queued',
          phone: '+919876543210',
        }),
      });

      // Verified TelephonyService dispatch
      expect(mockTelephony.dispatchOutboundCall).toHaveBeenCalledWith(
        'tenant-1',
        'call-created-123',
        '+919876543210',
      );
    });

    it('should safely handle TelephonyService network failure and update state without crashing', async () => {
      const jobData = {
        campaignId: 'camp-1',
        campaignLeadId: 'cl-1',
        leadId: 'lead-1',
        agentId: 'agent-1',
        tenantId: 'tenant-1',
        attemptNumber: 1,
        phoneNumber: '+919876543210',
        enqueuedAt: new Date().toISOString(),
      };

      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        tenantId: 'tenant-1',
        status: 'running',
        agentId: 'agent-1',
      });
      mockPrisma.call.count.mockResolvedValue(0);
      mockPrisma.aIAgent.findFirst.mockResolvedValue({ id: 'agent-1', status: 'active' });
      mockPrisma.campaignLead.findFirst.mockResolvedValue({
        id: 'cl-1',
        campaignId: 'camp-1',
        leadId: 'lead-1',
        status: 'pending',
        attemptCount: 0,
        lead: { id: 'lead-1', phone: '+919876543210', deletedAt: null },
      });
      mockPrisma.campaignLead.update.mockResolvedValue({ id: 'cl-1', status: 'calling', attemptCount: 1 });
      mockPrisma.call.create.mockResolvedValue({ id: 'call-fail-1', tenantId: 'tenant-1', campaignId: 'camp-1' });

      mockTelephony.dispatchOutboundCall.mockRejectedValue(new Error('Twilio carrier connection timed out'));

      const res = await processor.executeCallJob(jobData);
      expect(res.dispatched).toBe(false);
      expect(res.reason).toContain('Twilio carrier connection timed out');

      // Verified call updated to failed
      expect(mockPrisma.call.update).toHaveBeenCalledWith({
        where: { id: 'call-fail-1' },
        data: { status: 'failed', outcome: 'DISPATCH_ERROR' },
      });

      // Verified CampaignLead updated to failed
      expect(mockPrisma.campaignLead.update).toHaveBeenCalledWith({
        where: { id: 'cl-1' },
        data: expect.objectContaining({ status: 'failed', outcome: 'DISPATCH_ERROR' }),
      });
    });
  });
});
