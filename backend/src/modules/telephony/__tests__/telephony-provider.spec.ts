import { ConfigService } from '@nestjs/config';
import { TwilioTelephonyProvider } from '../providers/twilio.provider';
import { ExotelTelephonyProvider } from '../providers/exotel.provider';
import { TelephonyProviderRegistry } from '../providers/provider-registry.service';

describe('Telephony Providers & Abstraction', () => {
  let configService: ConfigService;
  let twilioProvider: TwilioTelephonyProvider;
  let exotelProvider: ExotelTelephonyProvider;
  let registry: TelephonyProviderRegistry;

  beforeEach(() => {
    configService = new ConfigService();
    twilioProvider = new TwilioTelephonyProvider(configService);
    exotelProvider = new ExotelTelephonyProvider(configService);
    registry = new TelephonyProviderRegistry(configService, twilioProvider, exotelProvider);
  });

  describe('Provider Registry', () => {
    it('should register twilio and exotel providers', () => {
      const providers = registry.getAllProviders();
      expect(providers.map((p) => p.name)).toEqual(expect.arrayContaining(['twilio', 'exotel']));
    });

    it('should retrieve a provider by name (case-insensitive)', () => {
      const p1 = registry.get('Twilio');
      const p2 = registry.get('EXOTEL');
      expect(p1.name).toBe('twilio');
      expect(p2.name).toBe('exotel');
    });

    it('should throw NotFoundException for unsupported provider', () => {
      expect(() => registry.get('unknown_carrier')).toThrow(/not found/i);
    });

    it('should return default provider', () => {
      const def = registry.getDefaultProvider();
      expect(def).toBeDefined();
      expect(def.name).toBe('twilio');
    });
  });

  describe('Twilio Provider Unconfigured Fallback', () => {
    it('should report isConfigured false when credentials are empty', () => {
      expect(twilioProvider.isConfigured).toBe(false);
    });

    it('should cleanly defer outbound call without crashing or faking success', async () => {
      const result = await twilioProvider.createOutboundCall({
        tenantId: 'tenant-1',
        callId: 'call-101',
        fromNumber: '+1234567890',
        toNumber: '+1987654321',
        statusCallbackUrl: 'http://localhost/callback',
        mediaStreamUrl: 'wss://localhost/stream',
      });

      expect(result.status).toBe('queued');
      expect(result.provider).toBe('twilio');
      expect(result.rawResponse).toEqual(
        expect.objectContaining({ deferred: true, reason: 'TWILIO_CREDENTIALS_UNCONFIGURED' }),
      );
    });

    it('should generate valid TwiML with Stream URL and callId parameter', () => {
      const twiml = twilioProvider.generateMediaStreamResponse({
        streamUrl: 'wss://example.com/telephony/stream',
        callId: 'call-999',
      });

      expect(twiml).toContain('<Connect>');
      expect(twiml).toContain('<Stream url="wss://example.com/telephony/stream">');
      expect(twiml).toContain('<Parameter name="callId" value="call-999" />');
    });
  });

  describe('Exotel Provider', () => {
    it('should report isConfigured false when credentials are empty', () => {
      expect(exotelProvider.isConfigured).toBe(false);
    });

    it('should cleanly defer outbound call when unconfigured', async () => {
      const result = await exotelProvider.createOutboundCall({
        tenantId: 'tenant-1',
        callId: 'call-102',
        fromNumber: '+919999999999',
        toNumber: '+918888888888',
        statusCallbackUrl: 'http://localhost/callback',
        mediaStreamUrl: 'wss://localhost/stream',
      });

      expect(result.status).toBe('queued');
      expect(result.provider).toBe('exotel');
      expect(result.rawResponse).toEqual(
        expect.objectContaining({ deferred: true, reason: 'EXOTEL_CREDENTIALS_UNCONFIGURED' }),
      );
    });
  });
});
