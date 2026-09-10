import * as crypto from 'crypto';
import { TelephonyService } from '../services/telephony.service';
import { TwilioTelephonyProvider } from '../providers/twilio.provider';
import { ExotelTelephonyProvider } from '../providers/exotel.provider';
import { SandboxTelephonyProvider } from '../providers/sandbox.provider';
import { TelephonyProviderRegistry } from '../providers/provider-registry.service';
import { AudioSessionService } from '../services/audio-session.service';
import { RecordingQueueService } from '../services/recording-queue.service';

describe('Recording Webhook Architecture & Idempotency', () => {
  let twilioProvider: TwilioTelephonyProvider;
  let exotelProvider: ExotelTelephonyProvider;
  let registry: TelephonyProviderRegistry;
  let audioSessionService: AudioSessionService;
  let telephonyService: TelephonyService;
  let mockQueueService: any;
  let mockPrisma: any;

  const testAuthToken = 'test-token-recording-secret-12345';

  function generateTwilioSignature(url: string, params: Record<string, any>, token: string): string {
    const keys = Object.keys(params).sort();
    let data = url;
    for (const key of keys) {
      data += `${key}${params[key]}`;
    }
    return crypto.createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64');
  }

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return 'AC_RECORDING_TEST';
        if (key === 'TWILIO_AUTH_TOKEN') return testAuthToken;
        if (key === 'TWILIO_PHONE_NUMBER') return '+15551234567';
        return defaultVal;
      }),
    } as any;

    twilioProvider = new TwilioTelephonyProvider(configService);
    exotelProvider = new ExotelTelephonyProvider(configService);
    registry = new TelephonyProviderRegistry(configService, twilioProvider, exotelProvider, new SandboxTelephonyProvider());
    audioSessionService = new AudioSessionService();

    mockQueueService = {
      enqueueRecordingJob: jest.fn().mockResolvedValue({
        jobId: 'recording:tenant-1:call-100:RE123456',
        queued: true,
        mode: 'in_memory',
      }),
    };

    mockPrisma = {
      call: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'call-100',
          tenantId: 'tenant-1',
          providerCallId: 'CA_REC_123',
          status: 'completed',
        }),
      },
      callRecording: {
        upsert: jest.fn().mockResolvedValue({
          id: 'rec-db-123',
          callId: 'call-100',
          tenantId: 'tenant-1',
          providerRecordingId: 'RE123456',
          status: 'available',
        }),
      },
    };

    telephonyService = new TelephonyService(
      mockPrisma as any,
      configService,
      registry,
      audioSessionService,
      {} as any, // CallInsightsService (not exercised by recording webhooks)
      mockQueueService as any,
    );
  });

  it('should accept valid Twilio recording webhook with verified signature and enqueue async processing', async () => {
    const url = 'https://api.agentcall.ai/api/v1/telephony/webhooks/recording/twilio';
    const payload = {
      CallSid: 'CA_REC_123',
      RecordingSid: 'RE123456',
      RecordingUrl: 'https://api.twilio.com/2010-04-01/Accounts/ACxxx/Recordings/RE123456.mp3',
      RecordingStatus: 'completed',
      RecordingDuration: '45',
    };

    const signature = generateTwilioSignature(url, payload, testAuthToken);

    const result = await telephonyService.handleRecordingWebhook('twilio', payload, {
      payload,
      headers: { 'x-twilio-signature': signature },
      requestUrl: url,
    });

    expect(result.status).toBe('acknowledged');
    expect(result.processed).toBe(true);
    expect(result.recordingId).toBe('rec-db-123');
    expect(mockQueueService.enqueueRecordingJob).toHaveBeenCalledWith(
      expect.objectContaining({
        callId: 'call-100',
        tenantId: 'tenant-1',
        providerRecordingId: 'RE123456',
        duration: 45,
      }),
    );
  });

  it('should reject recording webhook with forged or invalid Twilio signature', async () => {
    const url = 'https://api.agentcall.ai/api/v1/telephony/webhooks/recording/twilio';
    const payload = {
      CallSid: 'CA_REC_123',
      RecordingSid: 'RE_FORGED_123',
      RecordingUrl: 'https://api.twilio.com/recordings/RE_FORGED_123.mp3',
    };

    await expect(
      telephonyService.handleRecordingWebhook('twilio', payload, {
        payload,
        headers: { 'x-twilio-signature': 'forged_invalid_signature' },
        requestUrl: url,
      }),
    ).rejects.toThrow('Webhook signature validation failed: SIGNATURE_MISMATCH');

    expect(mockQueueService.enqueueRecordingJob).not.toHaveBeenCalled();
  });

  it('should reject malformed recording payload missing CallSid or RecordingSid', async () => {
    const url = 'https://api.agentcall.ai/api/v1/telephony/webhooks/recording/twilio';
    const payload = {
      // Missing CallSid and RecordingSid
      SomeOtherField: 'value',
    };

    const signature = generateTwilioSignature(url, payload, testAuthToken);

    await expect(
      telephonyService.handleRecordingWebhook('twilio', payload, {
        payload,
        headers: { 'x-twilio-signature': signature },
        requestUrl: url,
      }),
    ).rejects.toThrow('Missing CallSid or RecordingSid in recording payload');
  });

  it('should idempotently acknowledge duplicate recording callbacks without re-queueing', async () => {
    const url = 'https://api.agentcall.ai/api/v1/telephony/webhooks/recording/twilio';
    const payload = {
      CallSid: 'CA_REC_123',
      RecordingSid: 'RE_DUP_123',
      RecordingUrl: 'https://api.twilio.com/recordings/RE_DUP_123.mp3',
      RecordingStatus: 'completed',
    };

    const signature = generateTwilioSignature(url, payload, testAuthToken);
    const req = {
      payload,
      headers: { 'x-twilio-signature': signature },
      requestUrl: url,
    };

    // First delivery
    const firstRes = await telephonyService.handleRecordingWebhook('twilio', payload, req);
    expect(firstRes.processed).toBe(true);
    expect(mockQueueService.enqueueRecordingJob).toHaveBeenCalledTimes(1);

    // Second duplicate delivery
    const secondRes = await telephonyService.handleRecordingWebhook('twilio', payload, req);
    expect(secondRes.status).toBe('acknowledged');
    expect(secondRes.processed).toBe(false);
    expect(secondRes.reason).toBe('DUPLICATE_EVENT');
    expect(mockQueueService.enqueueRecordingJob).toHaveBeenCalledTimes(1);
  });
});
