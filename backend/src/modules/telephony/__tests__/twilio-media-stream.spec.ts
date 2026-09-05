import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TwilioTelephonyProvider } from '../providers/twilio.provider';
import { TelephonyMediaGateway } from '../gateway/telephony-media.gateway';
import { AudioSessionService } from '../services/audio-session.service';
import { ConversationOrchestrator } from '../../ai/orchestrator/conversation.orchestrator';

describe('Twilio Media Stream & Protocol Validation', () => {
  let twilioProvider: TwilioTelephonyProvider;
  let mediaGateway: TelephonyMediaGateway;
  let audioSessionService: AudioSessionService;
  let orchestrator: ConversationOrchestrator;

  const mockConfig = {
    TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    TWILIO_AUTH_TOKEN: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    TWILIO_PHONE_NUMBER: '+17372212163',
    PUBLIC_URL: 'https://call-agent-tunnel.test.domain',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwilioTelephonyProvider,
        TelephonyMediaGateway,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => (mockConfig as Record<string, string>)[key] ?? defaultVal),
          },
        },
        {
          provide: AudioSessionService,
          useValue: {
            createSession: jest.fn().mockReturnValue({
              sessionId: 'sess-tw-101',
              callId: 'CA_TEST_STREAM_1',
              tenantId: 'tenant-1',
              agentId: 'agent-1',
            }),
            getSessionByCallId: jest.fn().mockReturnValue(null),
            recordInboundFrame: jest.fn(),
            recordOutboundFrame: jest.fn(),
            recordDroppedFrame: jest.fn(),
            closeSession: jest.fn(),
          },
        },
        {
          provide: ConversationOrchestrator,
          useValue: {
            startSession: jest.fn().mockResolvedValue(true),
            handleAudioFrame: jest.fn(),
            endSession: jest.fn(),
          },
        },
      ],
    }).compile();

    twilioProvider = module.get<TwilioTelephonyProvider>(TwilioTelephonyProvider);
    mediaGateway = module.get<TelephonyMediaGateway>(TelephonyMediaGateway);
    audioSessionService = module.get<AudioSessionService>(AudioSessionService);
    orchestrator = module.get<ConversationOrchestrator>(ConversationOrchestrator);
  });

  describe('TwiML Media Stream Generation', () => {
    it('should generate valid TwiML pointing to public WSS endpoint', async () => {
      const resp = await twilioProvider.handleIncomingCall({
        providerCallId: 'CA_INBOUND_999',
        fromNumber: '+15551234567',
        toNumber: '+17372212163',
        provider: 'twilio',
        rawPayload: {},
      });

      expect(resp.contentType).toBe('text/xml');
      expect(resp.instruction).toContain('<Response>');
      expect(resp.instruction).toContain('<Connect>');
      expect(resp.instruction).toContain('<Stream url="wss://call-agent-tunnel.test.domain/telephony/stream">');
      expect(resp.instruction).toContain('<Parameter name="callId" value="CA_INBOUND_999" />');
    });

    it('should fallback to request headers host when PUBLIC_URL is unset', async () => {
      const tempProvider = new TwilioTelephonyProvider({
        get: jest.fn((key: string) => {
          if (key === 'TWILIO_ACCOUNT_SID') return 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
          if (key === 'TWILIO_AUTH_TOKEN') return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
          if (key === 'TWILIO_PHONE_NUMBER') return '+17372212163';
          return '';
        }),
      } as any);

      const resp = await tempProvider.handleIncomingCall({
        providerCallId: 'CA_FALLBACK_123',
        fromNumber: '+15551234567',
        toNumber: '+17372212163',
        provider: 'twilio',
        headers: { host: 'custom-tunnel.ngrok.app' },
        rawPayload: {},
      });

      expect(resp.instruction).toContain('<Stream url="wss://custom-tunnel.ngrok.app/telephony/stream">');
    });
  });

  describe('Twilio Media Stream Frame Ingestion', () => {
    it('should process Twilio "start" event and initialize ConversationOrchestrator', () => {
      const mockClient = { id: 'mock-socket-1' };
      const startPayload = {
        event: 'start',
        sequenceNumber: '1',
        start: {
          streamSid: 'MZ_STREAM_001',
          accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          callSid: 'CA_TEST_001',
          customParameters: {
            callId: 'call-custom-1',
            tenantId: 'tenant-abc',
          },
        },
        streamSid: 'MZ_STREAM_001',
      };

      const ack = mediaGateway.handleStreamStart(mockClient as any, startPayload);
      expect(ack).toEqual({ event: 'start:ack', streamSid: 'MZ_STREAM_001', status: 'ready' });
      expect(audioSessionService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          callId: 'call-custom-1',
          tenantId: 'tenant-abc',
          provider: 'twilio',
          streamSid: 'MZ_STREAM_001',
        }),
      );
      expect(orchestrator.startSession).toHaveBeenCalled();
    });

    it('should decode base64 audio frames and pass 8kHz mu-law Buffer to orchestrator', () => {
      const mockClient = { id: 'mock-socket-1' };
      mediaGateway.handleStreamStart(mockClient as any, {
        event: 'start',
        start: { streamSid: 'MZ_STREAM_001', callSid: 'CA_TEST_001' },
      });

      // 160 bytes of mu-law audio = 20ms frame
      const fakeMulaw = Buffer.alloc(160, 0x7e);
      const base64Audio = fakeMulaw.toString('base64');

      const mediaPayload = {
        event: 'media',
        sequenceNumber: '2',
        media: {
          track: 'inbound',
          chunk: '1',
          timestamp: '1234567',
          payload: base64Audio,
        },
        streamSid: 'MZ_STREAM_001',
      };

      mediaGateway.handleMediaChunk(mockClient as any, mediaPayload);

      expect(audioSessionService.recordInboundFrame).toHaveBeenCalledWith('sess-tw-101', 160);
      expect(orchestrator.handleAudioFrame).toHaveBeenCalledWith('sess-tw-101', fakeMulaw);
    });

    it('should terminate orchestrator session on "stop" event', () => {
      const mockClient = { id: 'mock-socket-1' };
      mediaGateway.handleStreamStart(mockClient as any, {
        event: 'start',
        start: { streamSid: 'MZ_STREAM_001', callSid: 'CA_TEST_001' },
      });

      const stopPayload = {
        event: 'stop',
        sequenceNumber: '3',
        streamSid: 'MZ_STREAM_001',
        stop: {
          accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          callSid: 'CA_TEST_001',
        },
      };

      mediaGateway.handleStreamStop(mockClient as any, stopPayload);
      expect(orchestrator.endSession).toHaveBeenCalledWith('sess-tw-101');
      expect(audioSessionService.closeSession).toHaveBeenCalledWith('sess-tw-101');
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should validate genuine Twilio signature and reject forged signature', () => {
      const crypto = require('crypto');
      const url = 'https://call-agent-tunnel.test.domain/api/v1/telephony/webhooks/status/twilio';
      const payload = {
        CallSid: 'CA_TEST_SIG',
        CallStatus: 'completed',
        Duration: '45',
      };

      // Compute correct signature
      const keys = Object.keys(payload).sort();
      let data = url;
      for (const k of keys) data += `${k}${(payload as Record<string, string>)[k]}`;
      const validSig = crypto
        .createHmac('sha1', mockConfig.TWILIO_AUTH_TOKEN)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64');

      const validResult = twilioProvider.validateWebhookSignature({
        payload,
        headers: { 'x-twilio-signature': validSig },
        requestUrl: url,
        method: 'POST',
      });
      expect(validResult.isValid).toBe(true);

      // Tampered signature
      const invalidResult = twilioProvider.validateWebhookSignature({
        payload,
        headers: { 'x-twilio-signature': 'forged-signature-value' },
        requestUrl: url,
        method: 'POST',
      });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.reason).toBe('SIGNATURE_MISMATCH');
    });
  });
});
