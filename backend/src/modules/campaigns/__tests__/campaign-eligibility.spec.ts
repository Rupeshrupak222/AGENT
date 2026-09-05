import { CampaignEligibilityService } from '../services/campaign-eligibility.service';

describe('CampaignEligibilityService', () => {
  let service: CampaignEligibilityService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      isConnected: true,
      call: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    service = new CampaignEligibilityService(mockPrisma);
  });

  describe('Phone Normalization (E.164)', () => {
    it('should normalize Indian 10-digit mobile numbers to +91', () => {
      const res = service.normalizePhoneNumber('9876543210');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
    });

    it('should normalize Indian numbers with leading 0', () => {
      const res = service.normalizePhoneNumber('09876543210');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
    });

    it('should normalize Indian numbers starting with 91 without +', () => {
      const res = service.normalizePhoneNumber('919876543210');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
    });

    it('should strip spaces, hyphens, and parentheses', () => {
      const res = service.normalizePhoneNumber('+91 (98765) 43-210');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
    });

    it('should normalize North American 10-digit numbers to +1', () => {
      const res = service.normalizePhoneNumber('4155552671');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+14155552671');
    });

    it('should keep already normalized E.164 numbers', () => {
      const res = service.normalizePhoneNumber('+447911123456');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+447911123456');
    });

    it('should reject invalid or too short phone numbers', () => {
      const res = service.normalizePhoneNumber('12345');
      expect(res.isValid).toBe(false);
      expect(res.normalized).toBeNull();
    });

    it('should reject non-numeric string values', () => {
      const res = service.normalizePhoneNumber('abcdefghij');
      expect(res.isValid).toBe(false);
      expect(res.normalized).toBeNull();
    });
  });

  describe('Calling Hours Window Validation', () => {
    it('should permit calls when within time window and active days', () => {
      // 14:30 on a Wednesday (day 3)
      const date = new Date(2026, 8, 9, 14, 30); // Sep 9, 2026 is Wed
      const res = service.isWithinCallingWindow('09:00', '18:00', [1, 2, 3, 4, 5], date);
      expect(res.inWindow).toBe(true);
    });

    it('should reject calls outside the active days of week', () => {
      // Sunday (day 0)
      const sunday = new Date(2026, 8, 6, 12, 0); // Sep 6, 2026 is Sun
      const res = service.isWithinCallingWindow('09:00', '18:00', [1, 2, 3, 4, 5], sunday);
      expect(res.inWindow).toBe(false);
      expect(res.reason).toContain('not within campaign active days');
    });

    it('should reject calls before window start time', () => {
      const earlyMorning = new Date(2026, 8, 9, 7, 30); // 07:30
      const res = service.isWithinCallingWindow('09:00', '18:00', [1, 2, 3, 4, 5], earlyMorning);
      expect(res.inWindow).toBe(false);
      expect(res.reason).toContain('outside window');
    });

    it('should reject calls after window end time', () => {
      const lateEvening = new Date(2026, 8, 9, 20, 0); // 20:00
      const res = service.isWithinCallingWindow('09:00', '18:00', [1, 2, 3, 4, 5], lateEvening);
      expect(res.inWindow).toBe(false);
      expect(res.reason).toContain('outside window');
    });
  });

  describe('Daily Call Limit Check', () => {
    it('should allow call when calls today are below callsPerDay limit', async () => {
      mockPrisma.call.count.mockResolvedValue(45);
      const res = await service.checkDailyLimit('tenant-1', 'camp-1', 100);
      expect(res.withinLimit).toBe(true);
      expect(res.dispatchedToday).toBe(45);
      expect(res.limit).toBe(100);
    });

    it('should block calls when calls today reached or exceeded limit', async () => {
      mockPrisma.call.count.mockResolvedValue(100);
      const res = await service.checkDailyLimit('tenant-1', 'camp-1', 100);
      expect(res.withinLimit).toBe(false);
      expect(res.dispatchedToday).toBe(100);
    });
  });

  describe('Lead Eligibility Validation', () => {
    it('should approve valid pending lead with valid phone', async () => {
      const res = await service.validateLeadEligibility('tenant-1', {
        id: 'cl-1',
        leadId: 'lead-1',
        status: 'pending',
        attemptCount: 0,
        lead: { id: 'lead-1', phone: '+919876543210', deletedAt: null },
      });
      expect(res.isEligible).toBe(true);
      expect(res.normalizedPhone).toBe('+919876543210');
    });

    it('should reject lead if deleted', async () => {
      const res = await service.validateLeadEligibility('tenant-1', {
        id: 'cl-2',
        leadId: 'lead-2',
        status: 'pending',
        attemptCount: 0,
        lead: { id: 'lead-2', phone: '+919876543210', deletedAt: new Date() },
      });
      expect(res.isEligible).toBe(false);
      expect(res.reason).toContain('Lead has been deleted');
    });

    it('should reject lead if attempt count reached maxAttempts', async () => {
      const res = await service.validateLeadEligibility('tenant-1', {
        id: 'cl-3',
        leadId: 'lead-3',
        status: 'pending',
        attemptCount: 3,
        lead: { id: 'lead-3', phone: '+919876543210', deletedAt: null },
      }, 3);
      expect(res.isEligible).toBe(false);
      expect(res.reason).toContain('reached maxAttempts limit');
    });

    it('should reject lead if lead already has active call in progress', async () => {
      mockPrisma.call.findFirst.mockResolvedValue({ id: 'active-call-99', status: 'in_progress' });
      const res = await service.validateLeadEligibility('tenant-1', {
        id: 'cl-4',
        leadId: 'lead-4',
        status: 'pending',
        attemptCount: 0,
        lead: { id: 'lead-4', phone: '+919876543210', deletedAt: null },
      });
      expect(res.isEligible).toBe(false);
      expect(res.reason).toContain('already has active call');
    });
  });
});
