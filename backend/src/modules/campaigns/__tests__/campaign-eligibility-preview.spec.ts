import { CampaignsService } from '../services/campaigns.service';
import { CampaignStatus } from '../dto/campaign.dto';

describe('CampaignsService - Eligibility Preview', () => {
  let service: CampaignsService;
  let mockPrisma: any;
  let mockEligibility: any;
  let mockQueue: any;
  let mockTelephony: any;

  beforeEach(() => {
    mockPrisma = {
      isConnected: true,
      campaign: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'camp-1',
          tenantId: 'tenant-1',
          name: 'Summer Outreach',
          status: CampaignStatus.DRAFT,
          maxAttempts: 3,
          callsPerDay: 50,
          startTime: '09:00',
          endTime: '18:00',
          daysOfWeek: [1, 2, 3, 4, 5],
        }),
      },
      campaignLead: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cl-1',
            leadId: 'lead-1',
            status: 'pending',
            attemptCount: 0,
            lead: { id: 'lead-1', name: 'Alice Cooper', phone: '+12025550101', status: 'new' },
          },
          {
            id: 'cl-2',
            leadId: 'lead-2',
            status: 'completed',
            attemptCount: 1,
            lead: { id: 'lead-2', name: 'Bob Marley', phone: '+12025550102', status: 'converted' },
          },
          {
            id: 'cl-3',
            leadId: 'lead-3',
            status: 'pending',
            attemptCount: 3,
            lead: { id: 'lead-3', name: 'Charlie Day', phone: '+12025550103', status: 'new' },
          },
          {
            id: 'cl-4',
            leadId: 'lead-4',
            status: 'pending',
            attemptCount: 0,
            lead: { id: 'lead-4', name: 'Diana Ross', phone: 'invalid-number', status: 'new' },
          },
          {
            id: 'cl-5',
            leadId: 'lead-5',
            status: 'pending',
            attemptCount: 0,
            lead: { id: 'lead-5', name: 'Frank Sinatra', phone: '+12025550105', status: 'do_not_call' },
          },
        ]),
      },
      lead: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'lead-1', name: 'Alice Cooper', phone: '+12025550101', status: 'new' },
          { id: 'lead-4', name: 'Diana Ross', phone: 'invalid-number', status: 'new' },
          { id: 'lead-5', name: 'Frank Sinatra', phone: '+12025550105', status: 'do_not_call' },
        ]),
      },
    };

    mockEligibility = {
      normalizePhoneNumber: jest.fn((phone: string) => {
        if (phone === 'invalid-number') return { isValid: false, normalized: null, reason: 'Invalid phone' };
        return { isValid: true, normalized: phone };
      }),
      isWithinCallingWindow: jest.fn().mockReturnValue({ inWindow: true }),
      checkDailyLimit: jest.fn().mockResolvedValue({ withinLimit: true, dispatchedToday: 10, limit: 50 }),
      validateLeadEligibility: jest.fn(),
    };

    mockQueue = {
      enqueueCallJob: jest.fn(),
      clearCampaignInMemoryJobs: jest.fn(),
    };

    mockTelephony = {
      registerCallStatusHook: jest.fn(),
    };

    service = new CampaignsService(
      mockPrisma as any,
      mockEligibility as any,
      mockQueue as any,
      mockTelephony as any,
    );
  });

  describe('getEligibilityPreview', () => {
    it('should correctly classify enrolled leads into authoritative categories', async () => {
      const result = await service.getEligibilityPreview('tenant-1', 'camp-1');

      expect(result.campaignId).toBe('camp-1');
      expect(result.totalEnrolled).toBe(5);
      expect(result.eligibleCount).toBe(1);
      expect(result.ineligibleCount).toBe(4);

      expect(result.categories['Eligible']).toBe(1);
      expect(result.categories['Already Completed']).toBe(1);
      expect(result.categories['Maximum Attempts Reached']).toBe(1);
      expect(result.categories['Invalid Phone']).toBe(1);
      expect(result.categories['Lead Not Callable']).toBe(1);

      expect(result.callingWindow.inWindow).toBe(true);
      expect(result.dailyLimit.withinLimit).toBe(true);
    });

    it('should return dev mock data gracefully when database is disconnected', async () => {
      mockPrisma.isConnected = false;
      const result = await service.getEligibilityPreview('tenant-1', 'camp-1');

      expect(result.campaignId).toBe('camp-1');
      expect(result.totalEnrolled).toBe(12);
      expect(result.eligibleCount).toBe(10);
      expect(result.ineligibleCount).toBe(2);
      expect(result.leads.length).toBeGreaterThan(0);
    });
  });

  describe('previewLeadsEligibility', () => {
    it('should evaluate candidate CRM leads before campaign enrollment', async () => {
      const result = await service.previewLeadsEligibility('tenant-1', ['lead-1', 'lead-4', 'lead-5']);

      expect(result.total).toBe(3);
      expect(result.eligibleCount).toBe(1);
      expect(result.ineligibleCount).toBe(2);
      expect(result.categories['Eligible']).toBe(1);
      expect(result.categories['Invalid Phone']).toBe(1);
      expect(result.categories['Lead Not Callable']).toBe(1);
    });

    it('should handle empty lead ID list safely', async () => {
      const result = await service.previewLeadsEligibility('tenant-1', []);
      expect(result.total).toBe(0);
      expect(result.eligibleCount).toBe(0);
    });
  });
});
