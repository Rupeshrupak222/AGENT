import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TwilioTelephonyProvider } from '../providers/twilio.provider';
import { ExotelTelephonyProvider } from '../providers/exotel.provider';
import { FrejunTelephonyProvider } from '../providers/frejun.provider';
import { SandboxTelephonyProvider } from '../providers/sandbox.provider';
import { TelephonyService } from '../services/telephony.service';
import { TelephonyProviderRegistry } from '../providers/provider-registry.service';
import { AudioSessionService } from '../services/audio-session.service';
import { CallInsightsService } from '../services/call-insights.service';
import { MEDIA_STREAM_TOKEN_TYPE } from '../interfaces/telephony-provider.interface';

describe('Webhook Processing, State Machine & Idempotency', () => {
  let twilioProvider: TwilioTelephonyProvider;
  let exotelProvider: ExotelTelephonyProvider;
  let frejunProvider: FrejunTelephonyProvider;
  let sandboxProvider: SandboxTelephonyProvider;
  let registry: TelephonyProviderRegistry;
  let audioSessionService: AudioSessionService;
  let telephonyService: TelephonyService;
  let mockPrisma: any;

  const testAuthToken = 'test-token-1234567890abcdef';

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
        if (key === 'TWILIO_ACCOUNT_SID') return 'AC_TEST_123';
        if (key === 'TWILIO_AUTH_TOKEN') return testAuthToken;
        if (key === 'TWILIO_PHONE_NUMBER') return '+15551234567';
        if (key === 'JWT_SECRET') return testAuthToken;
        return defaultVal;
      }),
    } as any;

    twilioProvider = new TwilioTelephonyProvider(configService);
    exotelProvider = new ExotelTelephonyProvider(configService);
    frejunProvider = new FrejunTelephonyProvider(configService);
    sandboxProvider = new SandboxTelephonyProvider();
    registry = new TelephonyProviderRegistry(
      configService,
      twilioProvider,
      exotelProvider,
      frejunProvider,
      sandboxProvider,
    );
    audioSessionService = new AudioSessionService();

    mockPrisma = {
      call: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'call-100',
          tenantId: 'tenant-1',
          providerCallId: 'CA1234567890',
          status: 'ringing',
          startedAt: new Date(Date.now() - 60000),
        }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'call-100' }),
      },
    };

    telephonyService = new TelephonyService(
      mockPrisma as any,
      configService,
      registry,
      audioSessionService,
      new CallInsightsService(),
      new JwtService({ secret: testAuthToken }),
    );
  });

  afterEach(() => {
    audioSessionService.onModuleDestroy();
  });

  describe('Twilio Status Callback Normalization', () => {
    it('should normalize Twilio completed payload into NormalizedCallEvent', async () => {
      const payload = {
        CallSid: 'CA1234567890',
        CallStatus: 'completed',
        From: '+15550001111',
        To: '+15550002222',
        CallDuration: '52',
        RecordingUrl: 'https://api.twilio.com/recordings/RE123',
        SequenceNumber: '1',
      };

      const event = await twilioProvider.handleStatusCallback(payload);

      expect(event.provider).toBe('twilio');
      expect(event.providerCallId).toBe('CA1234567890');
      expect(event.status).toBe('completed');
      expect(event.eventType).toBe('call.completed');
      expect(event.duration).toBe(52);
      expect(event.recordingUrl).toBe('https://api.twilio.com/recordings/RE123');
    });

    it('should normalize Twilio ringing and in-progress statuses', async () => {
      const eRinging = await twilioProvider.handleStatusCallback({
        CallSid: 'CA-ring',
        CallStatus: 'ringing',
      });
      expect(eRinging.status).toBe('ringing');
      expect(eRinging.eventType).toBe('call.ringing');

      const eProg = await twilioProvider.handleStatusCallback({
        CallSid: 'CA-prog',
        CallStatus: 'in-progress',
      });
      expect(eProg.status).toBe('in_progress');
      expect(eProg.eventType).toBe('call.in_progress');
    });
  });

  describe('Exotel Status Callback Normalization', () => {
    it('should normalize Exotel completed status into NormalizedCallEvent', async () => {
      const payload = {
        Sid: 'EX987654321',
        Status: 'completed',
        From: '+919876543210',
        To: '+919988776655',
        Duration: '75',
      };

      const event = await exotelProvider.handleStatusCallback(payload);

      expect(event.provider).toBe('exotel');
      expect(event.providerCallId).toBe('EX987654321');
      expect(event.status).toBe('completed');
      expect(event.duration).toBe(75);
    });
  });

  describe('Webhook Security & Signature Verification', () => {
    it('should reject an unsigned incoming call webhook before creating media access', async () => {
      const payload = {
        CallSid: 'CA_UNSIGNED_INBOUND',
        From: '+15550001111',
        To: '+15550002222',
      };

      await expect(
        telephonyService.handleIncomingCallWebhook('twilio', {
          providerCallId: payload.CallSid,
          fromNumber: payload.From,
          toNumber: payload.To,
          provider: 'twilio',
          rawPayload: payload,
          headers: { host: 'example.com' },
          requestUrl: 'https://example.com/api/v1/telephony/webhooks/incoming/twilio',
          method: 'POST',
        }),
      ).rejects.toThrow('Incoming webhook signature validation failed: MISSING_TWILIO_SIGNATURE');
      expect(mockPrisma.call.create).not.toHaveBeenCalled();
    });

    it('should issue a short-lived purpose-bound stream token for a verified inbound call', async () => {
      const payload = {
        CallSid: 'CA_VERIFIED_INBOUND',
        From: '+15550001111',
        To: '+15550002222',
      };
      const requestUrl = 'https://example.com/api/v1/telephony/webhooks/incoming/twilio';
      const signature = generateTwilioSignature(requestUrl, payload, testAuthToken);
      mockPrisma.tenant = {
        findFirst: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
      };
      mockPrisma.aIAgent = {
        findFirst: jest.fn().mockResolvedValue({ id: 'agent-1' }),
      };
      mockPrisma.lead = {
        findFirst: jest.fn().mockResolvedValue({ id: 'lead-1' }),
        create: jest.fn(),
      };
      mockPrisma.call.create = jest.fn().mockResolvedValue({
        id: 'call-db-inbound',
        tenantId: 'tenant-1',
      });

      const response = await telephonyService.handleIncomingCallWebhook('twilio', {
        providerCallId: payload.CallSid,
        fromNumber: payload.From,
        toNumber: payload.To,
        provider: 'twilio',
        rawPayload: payload,
        headers: {
          host: 'example.com',
          'x-twilio-signature': signature,
        },
        rawBody: JSON.stringify(payload),
        requestUrl,
        method: 'POST',
      });
      const encodedToken = response.instruction.match(
        /name="mediaStreamToken" value="([^"]+)"/,
      )?.[1];
      const tokenPayload = new JwtService({ secret: testAuthToken }).verify(
        decodeURIComponent(encodedToken || ''),
      );

      expect(tokenPayload).toEqual(
        expect.objectContaining({
          type: MEDIA_STREAM_TOKEN_TYPE,
          tenantId: 'tenant-1',
          callId: 'call-db-inbound',
          provider: 'twilio',
        }),
      );
      expect(response.instruction).toContain('<Parameter name="callId" value="call-db-inbound" />');
    });

    it('should reject callback with missing signature', async () => {
      const payload = { CallSid: 'CA_TEST', CallStatus: 'ringing' };
      const validationReq = {
        payload,
        headers: {},
        requestUrl: 'https://example.com/status',
      };

      await expect(
        telephonyService.handleStatusCallbackWebhook('twilio', payload, validationReq),
      ).rejects.toThrow('Webhook signature validation failed: MISSING_TWILIO_SIGNATURE');
    });

    it('should reject callback with invalid signature', async () => {
      const payload = { CallSid: 'CA_TEST', CallStatus: 'ringing' };
      const validationReq = {
        payload,
        headers: { 'x-twilio-signature': 'invalid-sig-base64' },
        requestUrl: 'https://example.com/status',
      };

      await expect(
        telephonyService.handleStatusCallbackWebhook('twilio', payload, validationReq),
      ).rejects.toThrow('Webhook signature validation failed: SIGNATURE_MISMATCH');
    });

    it('should accept callback with valid HMAC-SHA1 signature', async () => {
      const payload = { CallSid: 'CA_TEST_OK', CallStatus: 'ringing' };
      const requestUrl = 'https://example.com/status';
      const sig = generateTwilioSignature(requestUrl, payload, testAuthToken);

      const validationReq = {
        payload,
        headers: { 'x-twilio-signature': sig },
        requestUrl,
      };

      const result = await telephonyService.handleStatusCallbackWebhook('twilio', payload, validationReq);
      expect(result.status).toBe('acknowledged');
      expect(result.processed).toBe(true);
    });
  });

  describe('Idempotency & Duplicate Prevention', () => {
    it('should process first event and reject second duplicate event', async () => {
      const payload = {
        CallSid: 'CA_IDEMPOTENT_1',
        CallStatus: 'completed',
        SequenceNumber: 'evt-unique-001',
      };
      const requestUrl = 'https://example.com/status/twilio';
      const sig = generateTwilioSignature(requestUrl, payload, testAuthToken);

      const validationReq = {
        payload,
        headers: { 'x-twilio-signature': sig },
        requestUrl,
      };

      const first = await telephonyService.handleStatusCallbackWebhook('twilio', payload, validationReq);
      expect(first.status).toBe('acknowledged');
      expect(first.processed).toBe(true);

      const second = await telephonyService.handleStatusCallbackWebhook('twilio', payload, validationReq);
      expect(second.status).toBe('acknowledged');
      expect(second.processed).toBe(false);
      expect(second.reason).toBe('DUPLICATE_EVENT');
    });
  });

  describe('Call State Machine & Illegal Regression Prevention', () => {
    it('should prevent completed call from regressing back to ringing', async () => {
      mockPrisma.call.findFirst.mockResolvedValueOnce({
        id: 'call-completed-1',
        tenantId: 'tenant-1',
        providerCallId: 'CA_COMPLETED_1',
        status: 'completed',
      });

      const payload = {
        CallSid: 'CA_COMPLETED_1',
        CallStatus: 'ringing',
        SequenceNumber: 'seq-late-ringing',
      };
      const requestUrl = 'https://example.com/status/twilio';
      const sig = generateTwilioSignature(requestUrl, payload, testAuthToken);

      const res = await telephonyService.handleStatusCallbackWebhook('twilio', payload, {
        payload,
        headers: { 'x-twilio-signature': sig },
        requestUrl,
      });

      expect(res.status).toBe('acknowledged');
      expect(res.processed).toBe(false);
      expect(res.reason).toBe('ILLEGAL_STATE_REGRESSION');
      expect(mockPrisma.call.update).not.toHaveBeenCalled();
    });

    it('should correctly allow forward transition from ringing to in_progress to completed', () => {
      expect(telephonyService.isValidCallStateTransition('queued', 'ringing')).toBe(true);
      expect(telephonyService.isValidCallStateTransition('ringing', 'in_progress')).toBe(true);
      expect(telephonyService.isValidCallStateTransition('in_progress', 'completed')).toBe(true);
      expect(telephonyService.isValidCallStateTransition('ringing', 'completed')).toBe(true);
      expect(telephonyService.isValidCallStateTransition('ringing', 'missed')).toBe(true);
      expect(telephonyService.isValidCallStateTransition('in_progress', 'failed')).toBe(true);

      // Regressions must fail
      expect(telephonyService.isValidCallStateTransition('completed', 'ringing')).toBe(false);
      expect(telephonyService.isValidCallStateTransition('completed', 'in_progress')).toBe(false);
      expect(telephonyService.isValidCallStateTransition('failed', 'in_progress')).toBe(false);
      expect(telephonyService.isValidCallStateTransition('missed', 'ringing')).toBe(false);
      expect(telephonyService.isValidCallStateTransition('in_progress', 'ringing')).toBe(false);
    });
  });
});
