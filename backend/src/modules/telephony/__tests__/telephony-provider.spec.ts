import { ConfigService } from '@nestjs/config';
import { TwilioTelephonyProvider } from '../providers/twilio.provider';
import { ExotelTelephonyProvider } from '../providers/exotel.provider';
import { FrejunTelephonyProvider } from '../providers/frejun.provider';
import { SandboxTelephonyProvider } from '../providers/sandbox.provider';
import { TelephonyProviderRegistry } from '../providers/provider-registry.service';

describe('Telephony Providers & Abstraction', () => {
  let configService: ConfigService;
  let twilioProvider: TwilioTelephonyProvider;
  let exotelProvider: ExotelTelephonyProvider;
  let frejunProvider: FrejunTelephonyProvider;
  let sandboxProvider: SandboxTelephonyProvider;
  let registry: TelephonyProviderRegistry;

  beforeEach(() => {
    configService = new ConfigService();
    twilioProvider = new TwilioTelephonyProvider(configService);
    exotelProvider = new ExotelTelephonyProvider(configService);
    frejunProvider = new FrejunTelephonyProvider(configService);
    sandboxProvider = new SandboxTelephonyProvider();
    registry = new TelephonyProviderRegistry(configService, twilioProvider, exotelProvider, frejunProvider, sandboxProvider);
  });

  describe('Provider Registry', () => {
    it('should register twilio, exotel, and frejun providers', () => {
      const providers = registry.getAllProviders();
      expect(providers.map((p) => p.name)).toEqual(expect.arrayContaining(['twilio', 'exotel', 'frejun']));
    });

    it('should retrieve a provider by name (case-insensitive)', () => {
      const p1 = registry.get('Twilio');
      const p2 = registry.get('EXOTEL');
      const p3 = registry.get('Frejun');
      expect(p1.name).toBe('twilio');
      expect(p2.name).toBe('exotel');
      expect(p3.name).toBe('frejun');
    });

    it('should throw NotFoundException for unsupported provider', () => {
      expect(() => registry.get('unknown_carrier')).toThrow(/not found/i);
    });

    it('should return default provider', () => {
      const def = registry.getDefaultProvider();
      expect(def).toBeDefined();
      expect(def.name).toBe('sandbox');
    });
  });

  describe('Twilio Provider Unconfigured Fallback', () => {
    it('should report isConfigured false when credentials are empty', () => {
      expect(twilioProvider.isConfigured).toBe(false);
    });

    it('should honestly fail unconfigured outbound call instead of faking success', async () => {
      const result = await twilioProvider.createOutboundCall({
        tenantId: 'tenant-1',
        callId: 'call-101',
        fromNumber: '+1234567890',
        toNumber: '+1987654321',
        statusCallbackUrl: 'http://localhost/callback',
        mediaStreamUrl: 'wss://localhost/stream',
      });

      expect(result.status).toBe('failed');
      expect(result.provider).toBe('twilio');
      expect(result.providerCallId).toBe('');
      expect(result.rawResponse).toEqual(
        expect.objectContaining({ disposition: 'NOT_CONFIGURED', reason: 'TWILIO_CREDENTIALS_UNCONFIGURED' }),
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

    it('should escape XML-sensitive characters in stream parameters', () => {
      const twiml = twilioProvider.generateMediaStreamResponse({
        streamUrl: 'wss://example.com/telephony/stream',
        callId: 'call-999',
        mediaStreamToken: 'a+b/c="d"&e',
      });

      expect(twiml).toContain(
        '<Parameter name="mediaStreamToken" value="a+b/c=&quot;d&quot;&amp;e" />',
      );
      expect(twiml).not.toContain('token=a+b');
    });
  });

  describe('Exotel Provider', () => {
    it('should report isConfigured false when credentials are empty', () => {
      expect(exotelProvider.isConfigured).toBe(false);
    });

    it('should honestly fail outbound call when unconfigured', async () => {
      const result = await exotelProvider.createOutboundCall({
        tenantId: 'tenant-1',
        callId: 'call-102',
        fromNumber: '+919999999999',
        toNumber: '+918888888888',
        statusCallbackUrl: 'http://localhost/callback',
        mediaStreamUrl: 'wss://localhost/stream',
      });

      expect(result.status).toBe('failed');
      expect(result.provider).toBe('exotel');
      expect(result.providerCallId).toBe('');
      expect(result.rawResponse).toEqual(
        expect.objectContaining({ disposition: 'NOT_CONFIGURED', reason: 'EXOTEL_CREDENTIALS_UNCONFIGURED' }),
      );
    });
  });

  describe('Exotel Webhook Signature Verification', () => {
    const rawBody = 'CallSid=EX1&Status=completed';
    const requestUrl = 'https://call-agent-tunnel.test.domain/api/v1/telephony/webhooks/status/exotel';
    let provider: ExotelTelephonyProvider;

    const sign = (secret: string, payload: string, encoding: 'base64' | 'hex' = 'base64') => {
      const crypto = require('crypto');
      return crypto.createHmac('sha256', secret).update(payload).digest(encoding);
    };

    const validate = (headers: Record<string, string>, body: string | undefined = rawBody) =>
      provider.validateWebhookSignature({
        headers,
        rawBody: body,
        payload: {},
        requestUrl,
        method: 'POST',
      });

    beforeEach(() => {
      provider = new ExotelTelephonyProvider(
        new ConfigService({
          EXOTEL_API_KEY: 'api-key',
          EXOTEL_API_TOKEN: 'api-secret',
          EXOTEL_SID: 'AC123',
        }),
      );
    });

    it('should accept a base64 HMAC signature that carries base64 padding', () => {
      const signature = sign('api-secret', rawBody);
      expect(signature).toContain('=');

      expect(validate({ 'x-exotel-signature': signature })).toEqual({ isValid: true });
    });

    it('should accept a prefixed algorithm signature', () => {
      const signature = sign('api-secret', rawBody, 'hex');

      expect(validate({ 'x-cqa-signature': `sha256=${signature}` })).toEqual({ isValid: true });
    });

    it('should reject a forged signature and a tampered raw body', () => {
      const signature = sign('api-secret', rawBody);

      expect(validate({ 'x-exotel-signature': 'A'.repeat(signature.length) })).toEqual({
        isValid: false,
        reason: 'SIGNATURE_MISMATCH',
      });
      expect(validate({ 'x-exotel-signature': signature }, `${rawBody}&Status=hacked`)).toEqual({
        isValid: false,
        reason: 'SIGNATURE_MISMATCH',
      });
      expect(validate({ 'x-exotel-signature': sign('wrong-secret', rawBody) })).toEqual({
        isValid: false,
        reason: 'SIGNATURE_MISMATCH',
      });
    });

    it('should require the raw body when a signature header is present', () => {
      expect(
        provider.validateWebhookSignature({
          headers: { 'x-exotel-signature': sign('api-secret', rawBody) },
          payload: {},
          requestUrl,
          method: 'POST',
        }),
      ).toEqual({
        isValid: false,
        reason: 'MISSING_RAW_BODY',
      });
    });

    it('should fail closed when the provider is unconfigured', () => {
      const unconfigured = new ExotelTelephonyProvider(new ConfigService({}));

      expect(
        unconfigured.validateWebhookSignature({
          headers: {},
          rawBody,
          payload: {},
          requestUrl,
          method: 'POST',
        }),
      ).toEqual({ isValid: false, reason: 'PROVIDER_NOT_CONFIGURED' });
    });

    it('should require the exact account credentials when no signature is present', () => {
      const basic = Buffer.from('api-key:api-secret').toString('base64');

      expect(validate({ authorization: `Basic ${basic}` })).toEqual({ isValid: true });
      expect(
        validate({ authorization: `Basic ${Buffer.from('api-key:wrong').toString('base64')}` }),
      ).toEqual({ isValid: false, reason: 'CREDENTIAL_MISMATCH' });
      expect(validate({ authorization: 'Bearer api-secret' })).toEqual({ isValid: true });
      expect(validate({ authorization: 'Bearer wrong' })).toEqual({
        isValid: false,
        reason: 'TOKEN_MISMATCH',
      });
      expect(validate({})).toEqual({ isValid: false, reason: 'MISSING_EXOTEL_SIGNATURE' });
    });
  });

  describe('Frejun Provider', () => {
    it('should report isConfigured false when credentials are empty', () => {
      expect(frejunProvider.isConfigured).toBe(false);
    });

    it('should honestly fail outbound call when unconfigured', async () => {
      const result = await frejunProvider.createOutboundCall({
        tenantId: 'tenant-1',
        callId: 'call-103',
        fromNumber: '+919876543210',
        toNumber: '+919123456789',
        statusCallbackUrl: 'http://localhost/callback',
        mediaStreamUrl: 'wss://localhost/stream',
      });

      expect(result.status).toBe('failed');
      expect(result.provider).toBe('frejun');
      expect(result.providerCallId).toBe('');
      expect(result.rawResponse).toEqual(
        expect.objectContaining({ disposition: 'NOT_CONFIGURED', reason: 'FREJUN_CREDENTIALS_UNCONFIGURED' }),
      );
    });

    it('should correctly normalize Frejun status callbacks', async () => {
      const event = await frejunProvider.handleStatusCallback({
        call_id: 'fj-call-999',
        status: 'answered',
        from: '+919876543210',
        to: '+919123456789',
        duration: 45,
        recording_url: 'https://storage.frejun.com/recordings/fj-call-999.mp3',
      });

      expect(event.provider).toBe('frejun');
      expect(event.providerCallId).toBe('fj-call-999');
      expect(event.status).toBe('in_progress');
      expect(event.duration).toBe(45);
      expect(event.recordingUrl).toBe('https://storage.frejun.com/recordings/fj-call-999.mp3');
    });
  });

  describe('Frejun Webhook Signature Verification', () => {
    const requestUrl = 'https://call-agent-tunnel.test.domain/api/v1/telephony/webhooks/status/frejun';
    const rawBody = '{"call_id":"fj-1","status":"completed"}';
    let provider: FrejunTelephonyProvider;

    beforeEach(() => {
      provider = new FrejunTelephonyProvider(
        new ConfigService({
          FREJUN_API_KEY: 'api-key',
          FREJUN_CLIENT_SECRET: 'client-secret',
        }),
      );
    });

    function sign(secret: string, payload: string) {
      const crypto = require('crypto');
      return crypto.createHmac('sha256', secret).update(payload).digest('base64');
    }

    it('should accept a signature over METHOD + requestUri + rawBody', () => {
      const result = provider.validateWebhookSignature({
        headers: { 'x-frejun-signature': sign('client-secret', `POST${requestUrl}${rawBody}`) },
        method: 'POST',
        requestUrl,
        rawBody,
        payload: {},
      });

      expect(result).toEqual({ isValid: true });
    });

    it('should reject a signature computed over a legacy secret', () => {
      const result = provider.validateWebhookSignature({
        headers: { 'x-frejun-signature': sign('legacy-secret', `POST${requestUrl}${rawBody}`) },
        method: 'POST',
        requestUrl,
        rawBody,
        payload: {},
      });

      expect(result).toEqual({ isValid: false, reason: 'SIGNATURE_MISMATCH' });
    });

    it('should reject a signature for a different request URL or method', () => {
      const signature = sign('client-secret', `POST${requestUrl}${rawBody}`);

      expect(
        provider.validateWebhookSignature({
          headers: { 'x-frejun-signature': signature },
          method: 'POST',
          requestUrl: `${requestUrl}?tampered=1`,
          rawBody,
          payload: {},
        }),
      ).toEqual({ isValid: false, reason: 'SIGNATURE_MISMATCH' });

      expect(
        provider.validateWebhookSignature({
          headers: { 'x-frejun-signature': signature },
          method: 'GET',
          requestUrl,
          rawBody,
          payload: {},
        }),
      ).toEqual({ isValid: false, reason: 'SIGNATURE_MISMATCH' });
    });

    it('should fail closed without a signature or without a raw body', () => {
      expect(
        provider.validateWebhookSignature({
          headers: {},
          method: 'POST',
          requestUrl,
          rawBody,
          payload: {},
        }),
      ).toEqual({ isValid: false, reason: 'MISSING_FREJUN_SIGNATURE' });

      expect(
        provider.validateWebhookSignature({
          headers: { 'x-frejun-signature': sign('client-secret', `POST${requestUrl}${rawBody}`) },
          method: 'POST',
          requestUrl,
          payload: {},
        }),
      ).toEqual({ isValid: false, reason: 'MISSING_RAW_BODY' });
    });
  });
});
