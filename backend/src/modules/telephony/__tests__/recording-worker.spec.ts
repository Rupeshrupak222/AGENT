import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RecordingProcessor } from '../processors/recording.processor';
import { RecordingQueueService } from '../services/recording-queue.service';
import { CloudflareR2StorageProvider } from '../../storage/providers/r2-storage.provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Recording Worker Processing & SSRF Protection', () => {
  let processor: RecordingProcessor;
  let mockPrisma: any;
  let mockStorage: any;
  let mockQueue: any;
  let configService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return 'AC_REC_WORKER';
        if (key === 'TWILIO_AUTH_TOKEN') return 'token_rec_worker';
        return defaultVal;
      }),
    } as any;

    mockPrisma = {
      isConnected: true,
      callRecording: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'rec-1',
          callId: 'call-1',
          tenantId: 'tenant-1',
          status: 'available',
        }),
        update: jest.fn().mockResolvedValue({ id: 'rec-1' }),
      },
      call: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'call-1',
          tenantId: 'tenant-1',
          status: 'completed',
        }),
        update: jest.fn().mockResolvedValue({ id: 'call-1' }),
      },
    };

    mockStorage = {
      upload: jest.fn().mockResolvedValue({
        key: 'tenants/tenant-1/calls/call-1/recordings/RE12345.mp3',
        storageUrl: 'https://r2.agentcall.ai/tenants/tenant-1/calls/call-1/recordings/RE12345.mp3',
        size: 1024,
        mimeType: 'audio/mpeg',
      }),
    };

    mockQueue = {
      setInMemoryProcessor: jest.fn(),
    };

    const mockMetrics = {
      increment: jest.fn(),
      recordLatency: jest.fn(),
      gauge: jest.fn(),
      getCounter: jest.fn(),
      getCounterValue: jest.fn().mockReturnValue(0),
      getHistogramStats: jest.fn(),
      getAllMetrics: jest.fn(),
      reset: jest.fn(),
    };

    processor = new RecordingProcessor(
      mockPrisma as any,
      configService,
      mockStorage as any,
      mockQueue as any,
      mockMetrics as any,
    );
  });

  describe('SSRF Protection', () => {
    it('should reject non-HTTPS URLs', () => {
      const check = processor.validateProviderUrl('http://api.twilio.com/audio.mp3', 'twilio');
      expect(check.isValid).toBe(false);
      expect(check.reason).toBe('HTTPS_REQUIRED');
    });

    it('should reject non-Twilio hostnames for twilio provider', () => {
      const check = processor.validateProviderUrl('https://evil-attacker.com/audio.mp3', 'twilio');
      expect(check.isValid).toBe(false);
      expect(check.reason).toBe('INVALID_TWILIO_HOSTNAME');
    });

    it('should reject internal IP addresses (SSRF defense)', () => {
      const check = processor.validateProviderUrl('https://169.254.169.254/latest/meta-data', 'twilio');
      expect(check.isValid).toBe(false);
    });

    it('should accept legitimate Twilio API recording URLs', () => {
      const check = processor.validateProviderUrl('https://api.twilio.com/2010-04-01/Accounts/ACxxx/Recordings/RExxx.mp3', 'twilio');
      expect(check.isValid).toBe(true);
    });
  });

  describe('Worker Execution & Call State Preservation', () => {
    it('should download from Twilio, upload to R2, and update Call.recordingUrl', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('MOCK_AUDIO_PAYLOAD'),
        headers: { 'content-type': 'audio/mpeg' },
      });

      const res = await processor.processRecording({
        recordingId: 'rec-1',
        providerRecordingId: 'RE12345',
        callId: 'call-1',
        tenantId: 'tenant-1',
        sourceUrl: 'https://api.twilio.com/2010-04-01/Recordings/RE12345.mp3',
        duration: 30,
        provider: 'twilio',
        enqueuedAt: new Date().toISOString(),
      });

      expect(res.success).toBe(true);
      expect(mockStorage.upload).toHaveBeenCalledTimes(1);
      expect(mockPrisma.callRecording.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-1' },
          data: expect.objectContaining({ status: 'uploaded' }),
        }),
      );
      expect(mockPrisma.call.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'call-1' },
          data: expect.objectContaining({
            recordingUrl: expect.stringContaining('RE12345.mp3'),
          }),
        }),
      );
    });

    it('should preserve Call status when R2 upload fails (never regress call to failed)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('MOCK_AUDIO_PAYLOAD'),
        headers: { 'content-type': 'audio/mpeg' },
      });

      mockStorage.upload.mockRejectedValueOnce(new Error('Cloudflare R2 503 Service Unavailable'));

      const res = await processor.processRecording({
        recordingId: 'rec-1',
        providerRecordingId: 'RE12345',
        callId: 'call-1',
        tenantId: 'tenant-1',
        sourceUrl: 'https://api.twilio.com/2010-04-01/Recordings/RE12345.mp3',
        provider: 'twilio',
        enqueuedAt: new Date().toISOString(),
      });

      expect(res.success).toBe(false);

      // CallRecording status marked as failed with metadata
      expect(mockPrisma.callRecording.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-1' },
          data: expect.objectContaining({ status: 'failed' }),
        }),
      );

      // Crucial: Call model status is NEVER updated to failed
      expect(mockPrisma.call.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'failed' }),
        }),
      );
    });

    it('should skip duplicate processing if recording is already uploaded', async () => {
      mockPrisma.callRecording.findFirst.mockResolvedValueOnce({
        id: 'rec-1',
        status: 'uploaded',
        objectKey: 'tenants/tenant-1/calls/call-1/recordings/RE12345.mp3',
      });

      const res = await processor.processRecording({
        recordingId: 'rec-1',
        providerRecordingId: 'RE12345',
        callId: 'call-1',
        tenantId: 'tenant-1',
        sourceUrl: 'https://api.twilio.com/2010-04-01/Recordings/RE12345.mp3',
        provider: 'twilio',
        enqueuedAt: new Date().toISOString(),
      });

      expect(res.success).toBe(true);
      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(mockStorage.upload).not.toHaveBeenCalled();
    });
  });
});
