import { PostCallProcessor } from '../processors/post-call.processor';
import { GeminiPostCallProvider } from '../providers/gemini-post-call.provider';
import { PostCallQueueService } from '../services/post-call-queue.service';

describe('Post-Call Analysis Worker & CRM/Campaign Integration', () => {
  let processor: PostCallProcessor;
  let mockPrisma: any;
  let mockProvider: any;
  let mockQueue: any;

  beforeEach(() => {
    mockPrisma = {
      isConnected: true,
      callAnalysis: {
        findFirst: jest.fn().mockResolvedValue(null), // no previous analysis
        upsert: jest.fn().mockResolvedValue({ id: 'analysis-1', processingStatus: 'completed' }),
        update: jest.fn().mockResolvedValue({ id: 'analysis-1' }),
      },
      call: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'call-100',
          tenantId: 'tenant-1',
          status: 'completed',
          campaignId: 'camp-1',
          leadId: 'lead-1',
          duration: 120,
          agent: {
            name: 'Inbound SDR',
            businessGoal: 'Qualify prospects',
            qualificationRules: 'Must have budget and timeline',
          },
          lead: {
            id: 'lead-1',
            name: 'Sarah Connor',
            company: 'Cyberdyne Systems',
            score: 20,
            status: 'new',
          },
          campaign: {
            id: 'camp-1',
            name: 'Q3 Enterprise Outreach',
          },
          transcript: {
            segments: [
              { speaker: 'agent', text: 'Hello, how can I help you today?' },
              { speaker: 'user', text: 'We are ready to proceed with the enterprise subscription. Can we schedule demo tomorrow?' },
            ],
          },
        }),
        update: jest.fn().mockResolvedValue({ id: 'call-100' }),
      },
      campaignLead: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      lead: {
        update: jest.fn().mockResolvedValue({ id: 'lead-1' }),
      },
    };

    mockProvider = {
      name: 'gemini',
      modelName: 'gemini-1.5-flash',
      analyze: jest.fn().mockResolvedValue({
        summary: 'Lead confirmed readiness to purchase enterprise subscription.',
        leadScore: 92,
        intent: 'appointment',
        sentiment: 'positive',
        outcome: 'demo_scheduled',
        nextAction: 'schedule_demo',
        qualification: {
          qualified: true,
          reasons: ['Budget and timeline validated'],
          metCriteria: ['Budget', 'Authority'],
          unmetCriteria: [],
        },
        appointment: {
          detected: true,
          details: { topic: 'Enterprise Demo', date: 'Tomorrow', duration: 30 },
        },
      }),
    };

    mockQueue = {
      setInMemoryProcessor: jest.fn(),
    };

    processor = new PostCallProcessor(
      mockPrisma as any,
      mockProvider as any,
      mockQueue as any,
    );
  });

  it('should successfully analyze call, persist CallAnalysis, and update Call, CampaignLead, and Lead', async () => {
    const res = await processor.executeAnalysis({
      callId: 'call-100',
      tenantId: 'tenant-1',
      triggerSource: 'call_completed',
      enqueuedAt: new Date().toISOString(),
    });

    expect(res.success).toBe(true);

    // CallAnalysis persisted
    expect(mockPrisma.callAnalysis.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { callId: 'call-100' },
        create: expect.objectContaining({
          callId: 'call-100',
          leadScore: 92,
          intent: 'appointment',
          sentiment: 'positive',
          processingStatus: 'completed',
        }),
      }),
    );

    // Call updated with scores
    expect(mockPrisma.call.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'call-100' },
        data: expect.objectContaining({
          outcome: 'demo_scheduled',
          qualityScore: 92,
        }),
      }),
    );

    // CampaignLead updated with outcome and score metadata
    expect(mockPrisma.campaignLead.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId: 'camp-1', leadId: 'lead-1' },
        data: expect.objectContaining({
          outcome: 'demo_scheduled',
        }),
      }),
    );

    // Lead upgraded in CRM
    expect(mockPrisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-1' },
        data: expect.objectContaining({
          score: 92,
          status: 'appointment',
        }),
      }),
    );
  });

  it('should mark analysis as skipped when transcript is empty without calling Gemini', async () => {
    mockPrisma.call.findFirst.mockResolvedValueOnce({
      id: 'call-empty',
      tenantId: 'tenant-1',
      status: 'completed',
      transcript: null, // No transcript
    });

    const res = await processor.executeAnalysis({
      callId: 'call-empty',
      tenantId: 'tenant-1',
      triggerSource: 'call_completed',
      enqueuedAt: new Date().toISOString(),
    });

    expect(res.success).toBe(false);
    expect(res.reason).toBe('NO_TRANSCRIPT');
    expect(mockProvider.analyze).not.toHaveBeenCalled();
    expect(mockPrisma.callAnalysis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { callId: 'call-empty' },
        data: expect.objectContaining({
          processingStatus: 'skipped',
          errorMessage: 'NO_TRANSCRIPT',
        }),
      }),
    );
  });

  it('should skip duplicate analysis when call analysis is already completed', async () => {
    mockPrisma.callAnalysis.findFirst.mockResolvedValueOnce({
      id: 'analysis-existing',
      callId: 'call-100',
      processingStatus: 'completed',
    });

    const res = await processor.executeAnalysis({
      callId: 'call-100',
      tenantId: 'tenant-1',
      triggerSource: 'call_completed',
      enqueuedAt: new Date().toISOString(),
    });

    expect(res.success).toBe(true);
    expect(res.analysisId).toBe('analysis-existing');
    expect(mockProvider.analyze).not.toHaveBeenCalled();
  });

  it('should preserve Call status when Gemini analysis fails (Call remains completed)', async () => {
    mockProvider.analyze.mockRejectedValueOnce(new Error('Gemini 500 Internal Server Error'));

    const res = await processor.executeAnalysis({
      callId: 'call-100',
      tenantId: 'tenant-1',
      triggerSource: 'call_completed',
      enqueuedAt: new Date().toISOString(),
    });

    expect(res.success).toBe(false);

    // CallAnalysis status marked as failed
    expect(mockPrisma.callAnalysis.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { callId: 'call-100' },
        create: expect.objectContaining({
          processingStatus: 'failed',
          errorMessage: 'Gemini 500 Internal Server Error',
        }),
      }),
    );

    // Call status is NEVER altered to failed
    expect(mockPrisma.call.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });
});
