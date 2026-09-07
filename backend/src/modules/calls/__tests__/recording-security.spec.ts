import { NotFoundException } from '@nestjs/common';
import { CallsService } from '../calls.service';

describe('Call Recording & Intelligence Multi-Tenant Security', () => {
  let callsService: CallsService;
  let mockPrisma: any;
  let mockStorage: any;
  let mockQueue: any;

  beforeEach(() => {
    mockPrisma = {
      call: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          // Simulate tenant isolation: call-100 belongs only to tenant-alpha
          if (where.id === 'call-100' && where.tenantId === 'tenant-alpha') {
            return Promise.resolve({
              id: 'call-100',
              tenantId: 'tenant-alpha',
              recordings: [
                {
                  id: 'rec-alpha',
                  objectKey: 'tenants/tenant-alpha/calls/call-100/recordings/RE123.mp3',
                  duration: 60,
                  mimeType: 'audio/mpeg',
                },
              ],
              analysis: {
                id: 'analysis-alpha',
                callId: 'call-100',
                tenantId: 'tenant-alpha',
                leadScore: 85,
                intent: 'demo_request',
                summary: 'Alpha tenant call summary',
                processingStatus: 'completed',
              },
            });
          }
          return Promise.resolve(null);
        }),
      },
    };

    mockStorage = {
      getSignedUrl: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve(`https://r2.signed.url/${key}?sig=valid_token`);
      }),
    };

    mockQueue = {
      enqueueAnalysisJob: jest.fn().mockResolvedValue({ jobId: 'job-1', queued: true }),
    };

    callsService = new CallsService(
      mockPrisma as any,
      { registerCallStatusHook: jest.fn() } as any,
      mockStorage as any,
      mockQueue as any,
    );
  });

  describe('Cross-Tenant Recording Isolation', () => {
    it('should permit authorized tenant to retrieve signed recording URL', async () => {
      const res = await callsService.getRecording('tenant-alpha', 'call-100');

      expect(res).toBeDefined();
      expect(res.callId).toBe('call-100');
      expect(res.recordingId).toBe('rec-alpha');
      expect(res.url).toContain('tenants/tenant-alpha/calls/call-100');
      expect(mockStorage.getSignedUrl).toHaveBeenCalledWith(
        'tenants/tenant-alpha/calls/call-100/recordings/RE123.mp3',
        900,
      );
    });

    it('should reject unauthorized tenant attempt to access another tenants recording', async () => {
      // Attacker from tenant-beta tries to access call-100
      await expect(callsService.getRecording('tenant-beta', 'call-100')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockStorage.getSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Tenant Analysis Isolation', () => {
    it('should permit authorized tenant to retrieve call analysis', async () => {
      const res = await callsService.getAnalysis('tenant-alpha', 'call-100');

      expect(res).toBeDefined();
      expect(res.callId).toBe('call-100');
      expect(res.leadScore).toBe(85);
      expect(res.summary).toBe('Alpha tenant call summary');
    });

    it('should reject unauthorized tenant attempt to access another tenants post-call analysis', async () => {
      // Attacker from tenant-beta tries to access call-100 analysis
      await expect(callsService.getAnalysis('tenant-beta', 'call-100')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject retry attempt from unauthorized tenant', async () => {
      await expect(callsService.retryAnalysis('tenant-beta', 'call-100')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockQueue.enqueueAnalysisJob).not.toHaveBeenCalled();
    });
  });

  describe('Provider Credentials Confidentiality', () => {
    it('should never expose storage or Gemini credentials in recording responses', async () => {
      const res = await callsService.getRecording('tenant-alpha', 'call-100');

      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain('R2_SECRET_ACCESS_KEY');
      expect(serialized).not.toContain('GEMINI_API_KEY');
      expect(serialized).not.toContain('TWILIO_AUTH_TOKEN');
    });
  });
});
