import { AnalyticsService } from '../analytics.service';

jest.mock('../../automations/providers/email/resend.adapter', () => ({
  ResendEmailAdapter: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true, status: 'sent', error: null }),
  })),
}));

describe('AnalyticsService — Company Email Digest', () => {
  let service: AnalyticsService;
  let mockPrisma: any;
  let mockConfig: any;

  const existingReport = {
    id: 'sr-1',
    tenantId: 'tenant-1',
    type: 'company-digest',
    enabled: true,
    frequency: 'weekly',
    format: 'html',
    recipients: ['ceo@acme.io'],
    lastStatus: 'sent',
    lastRunAt: new Date('2026-09-20T12:00:00.000Z'),
    nextRunAt: new Date('2026-09-29T12:00:00.000Z'),
    createdAt: new Date('2026-09-13T12:00:00.000Z'),
  };

  beforeEach(() => {
    mockConfig = {
      get: jest.fn((key: string, fallback?: any) => (key === 'RESEND_API_KEY' ? '' : fallback)),
    };
    mockPrisma = {
      isConnected: true,
      scheduledReport: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sr-new', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sr-1', ...data })),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1', name: 'Acme Corp' }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { email: 'admin@acme.io', role: 'company_admin' },
          { email: '', role: 'company_admin' },
          { email: 'worker@acme.io', role: 'viewer' },
          { email: 'owner@acme.io', role: 'super_admin' },
        ]),
      },
    };
    service = new AnalyticsService(mockPrisma, mockConfig);
  });

  describe('getCompanyDigest', () => {
    it('returns default-off settings when the database is offline', async () => {
      mockPrisma.isConnected = false;
      const result = await service.getCompanyDigest('tenant-1');
      expect(result).toEqual({
        enabled: false,
        frequency: 'weekly',
        recipients: [],
        lastStatus: null,
        nextRunAt: null,
        lastRunAt: null,
      });
      expect(mockPrisma.scheduledReport.findFirst).not.toHaveBeenCalled();
    });

    it('returns defaults when no digest report exists', async () => {
      const result = await service.getCompanyDigest('tenant-1');
      expect(result.enabled).toBe(false);
      expect(result.frequency).toBe('weekly');
      expect(result.recipients).toEqual([]);
      expect(result.id).toBeNull();
    });

    it('maps an existing report to the settings shape', async () => {
      mockPrisma.scheduledReport.findFirst.mockResolvedValue(existingReport);
      const result = await service.getCompanyDigest('tenant-1');
      expect(result).toEqual({
        id: 'sr-1',
        enabled: true,
        frequency: 'weekly',
        recipients: ['ceo@acme.io'],
        lastStatus: 'sent',
        lastRunAt: existingReport.lastRunAt.toISOString(),
        nextRunAt: existingReport.nextRunAt.toISOString(),
      });
      expect(mockPrisma.scheduledReport.findFirst).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', type: 'company-digest' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('setCompanyDigest', () => {
    it('throws when the database is offline', async () => {
      mockPrisma.isConnected = false;
      await expect(service.setCompanyDigest('tenant-1', { id: 'user-1' } as any, {})).rejects.toThrow('Database offline');
    });

    it('creates a report with normalized frequency and recipients', async () => {
      const result = await service.setCompanyDigest(
        'tenant-1',
        { id: 'user-1' } as any,
        { enabled: true, frequency: 'bogus', recipients: ['a@acme.io', '', ' ', 'b@acme.io'] as any },
      );
      expect(mockPrisma.scheduledReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Company executive digest',
          type: 'company-digest',
          frequency: 'weekly',
          format: 'html',
          enabled: true,
          recipients: ['a@acme.io', 'b@acme.io'],
          tenantId: 'tenant-1',
          companyName: 'Acme Corp',
          createdById: 'user-1',
        }),
      });
      expect(result.id).toBe('sr-new');
      expect(result.frequency).toBe('weekly');
      expect(typeof result.nextRunAt).toBe('string');
    });

    it('accepts an explicitly valid frequency', async () => {
      await service.setCompanyDigest('tenant-1', { id: 'user-1' } as any, { enabled: true, frequency: 'monthly', recipients: [] });
      const callData = mockPrisma.scheduledReport.create.mock.calls[0][0].data;
      expect(callData.frequency).toBe('monthly');
    });

    it('updates the existing report when one is present', async () => {
      mockPrisma.scheduledReport.findFirst.mockResolvedValue(existingReport);
      const result = await service.setCompanyDigest('tenant-1', { id: 'user-1' } as any, { enabled: false, frequency: 'daily', recipients: ['new@acme.io'] });
      expect(mockPrisma.scheduledReport.update).toHaveBeenCalledWith({
        where: { id: 'sr-1' },
        data: expect.objectContaining({ enabled: false, frequency: 'daily', recipients: ['new@acme.io'] }),
      });
      expect(result.enabled).toBe(false);
      expect(result.frequency).toBe('daily');
    });
  });

  describe('computeDigestNextRun', () => {
    const at = (f: string): Date => (service as any).computeDigestNextRun(f);

    it('schedules daily for tomorrow at 12:00', () => {
      const next = at('daily');
      const now = new Date();
      const expected = new Date(now);
      expected.setDate(expected.getDate() + 1);
      expected.setHours(12, 0, 0, 0);
      expect(next.getFullYear()).toBe(expected.getFullYear());
      expect(next.getMonth()).toBe(expected.getMonth());
      expect(next.getDate()).toBe(expected.getDate());
      expect(next.getHours()).toBe(12);
      expect(next.getMinutes()).toBe(0);
    });

    it('schedules weekly (default) 7 days ahead', () => {
      const next = at('weekly');
      const expected = new Date();
      expected.setDate(expected.getDate() + 7);
      expected.setHours(12, 0, 0, 0);
      expect(next.getDate()).toBe(expected.getDate());
    });

    it('schedules monthly one month ahead', () => {
      const next = at('monthly');
      const expected = new Date();
      expected.setMonth(expected.getMonth() + 1);
      expected.setHours(12, 0, 0, 0);
      expect(next.getMonth()).toBe(expected.getMonth());
      expect(next.getHours()).toBe(12);
    });

    it('falls back to weekly for unknown frequencies', () => {
      const next = at('yearly');
      const expected = new Date();
      expected.setDate(expected.getDate() + 7);
      expect(next.getDate()).toBe(expected.getDate());
    });
  });

  describe('deliverCompanyDigests', () => {
    it('skips when the database is offline', async () => {
      mockPrisma.isConnected = false;
      await service.deliverCompanyDigests();
      expect(mockPrisma.scheduledReport.findMany).not.toHaveBeenCalled();
    });

    it('queries only due enabled digests for tenants', async () => {
      jest.spyOn(service as any, 'deliverSingleDigest').mockResolvedValue(undefined);
      await service.deliverCompanyDigests();
      expect(mockPrisma.scheduledReport.findMany).toHaveBeenCalledWith({
        where: { tenantId: { not: null }, type: 'company-digest', enabled: true, nextRunAt: { lte: expect.any(Date) } },
        take: 50,
      });
    });

    it('delivers each due report and records next run', async () => {
      const now = new Date();
      const due = [
        { ...existingReport, nextRunAt: new Date(now.getTime() - 1000) },
        { ...existingReport, id: 'sr-2', nextRunAt: new Date(now.getTime() - 5000) },
      ];
      mockPrisma.scheduledReport.findMany.mockResolvedValue(due);
      const deliver = jest.spyOn(service as any, 'deliverSingleDigest').mockResolvedValue(undefined);
      await service.deliverCompanyDigests();
      expect(deliver).toHaveBeenCalledTimes(2);
      expect(deliver).toHaveBeenCalledWith(due[0]);
    });

    it('marks a report failed when delivery throws', async () => {
      mockPrisma.scheduledReport.findMany.mockResolvedValue([existingReport]);
      jest.spyOn(service as any, 'deliverSingleDigest').mockRejectedValue(new Error('boom'));
      await service.deliverCompanyDigests();
      expect(mockPrisma.scheduledReport.update).toHaveBeenCalledWith({
        where: { id: 'sr-1' },
        data: expect.objectContaining({ lastStatus: 'failed' }),
      });
    });
  });

  describe('deliverSingleDigest', () => {
    const report = {
      ...existingReport,
      tenantId: 'tenant-1',
      frequency: 'weekly',
      createdAt: new Date(),
      recipients: ['ceo@acme.io'],
    };

    beforeEach(() => {
      jest
        .spyOn(service as any, 'buildCompanyDigestPayload')
        .mockResolvedValue({ subject: '[AgentCall] Acme Corp Weekly Ops Digest', html: '<p>digest</p>' });
    });

    it('falls back to company admin emails when no recipients are set', async () => {
      const emails = jest.spyOn(service as any, 'companyAdminEmails').mockResolvedValue(['admin@acme.io']);
      await (service as any).deliverSingleDigest({ ...report, recipients: [] });
      expect(emails).toHaveBeenCalledWith('tenant-1');
      expect(mockPrisma.scheduledReport.update).toHaveBeenCalledWith({
        where: { id: 'sr-1' },
        data: expect.objectContaining({ lastStatus: 'generated' }),
      });
    });

    it('records "generated" when Resend is not configured', async () => {
      await (service as any).deliverSingleDigest(report);
      expect(mockPrisma.scheduledReport.update).toHaveBeenCalledWith({
        where: { id: 'sr-1' },
        data: expect.objectContaining({ lastStatus: 'generated', lastRunAt: expect.any(Date), nextRunAt: expect.any(Date) }),
      });
    });

    it('records "sent" when Resend is configured and delivery succeeds', async () => {
      mockConfig.get.mockImplementation((key: string, fallback?: any) =>
        key === 'RESEND_API_KEY' ? 're_live_key' : fallback,
      );
      await (service as any).deliverSingleDigest(report);
      expect(mockPrisma.scheduledReport.update).toHaveBeenCalledWith({
        where: { id: 'sr-1' },
        data: expect.objectContaining({ lastStatus: 'sent' }),
      });
    });

    it('records "failed" when one recipient errors', async () => {
      mockConfig.get.mockImplementation((key: string, fallback?: any) =>
        key === 'RESEND_API_KEY' ? 're_live_key' : fallback,
      );
      const adapterModule = require('../../automations/providers/email/resend.adapter');
      adapterModule.ResendEmailAdapter.mockImplementation(() => ({
        sendEmail: jest.fn().mockResolvedValue({ success: false, status: 'failed', error: 'provider 421', isRetryable: true }),
      }));
      await (service as any).deliverSingleDigest(report);
      expect(mockPrisma.scheduledReport.update).toHaveBeenCalledWith({
        where: { id: 'sr-1' },
        data: expect.objectContaining({ lastStatus: 'failed' }),
      });
    });
  });
});