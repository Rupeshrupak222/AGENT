import { ConfigService } from '@nestjs/config';
import { TwilioTelephonyProvider } from '../providers/twilio.provider';
import { ExotelTelephonyProvider } from '../providers/exotel.provider';
import { TelephonyService } from '../services/telephony.service';
import { TelephonyProviderRegistry } from '../providers/provider-registry.service';
import { AudioSessionService } from '../services/audio-session.service';

describe('Webhook Processing & Idempotency', () => {
  let twilioProvider: TwilioTelephonyProvider;
  let exotelProvider: ExotelTelephonyProvider;
  let registry: TelephonyProviderRegistry;
  let audioSessionService: AudioSessionService;
  let telephonyService: TelephonyService;
  let mockPrisma: any;

  beforeEach(() => {
    const configService = new ConfigService();
    twilioProvider = new TwilioTelephonyProvider(configService);
    exotelProvider = new ExotelTelephonyProvider(configService);
    registry = new TelephonyProviderRegistry(configService, twilioProvider, exotelProvider);
    audioSessionService = new AudioSessionService();

    mockPrisma = {
      call: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'call-100',
          tenantId: 'tenant-1',
          providerCallId: 'CA1234567890',
        }),
        update: jest.fn().mockResolvedValue({ id: 'call-100' }),
      },
    };

    telephonyService = new TelephonyService(
      mockPrisma as any,
      configService,
      registry,
      audioSessionService,
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

  describe('Idempotency & Duplicate Prevention', () => {
    it('should process first event and reject second duplicate event', async () => {
      const payload = {
        CallSid: 'CA_IDEMPOTENT_1',
        CallStatus: 'completed',
        SequenceNumber: 'evt-unique-001',
      };

      const validationReq = {
        payload,
        headers: {},
        requestUrl: 'http://localhost/status/twilio',
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
});
