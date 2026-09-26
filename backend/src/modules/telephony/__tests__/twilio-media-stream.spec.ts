import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TwilioTelephonyProvider } from '../providers/twilio.provider';
import { TelephonyMediaGateway } from '../gateway/telephony-media.gateway';
import { AudioSessionService } from '../services/audio-session.service';
import { ConversationOrchestrator } from '../../ai/orchestrator/conversation.orchestrator';
import { PrismaService } from '../../prisma/prisma.service';
import { MEDIA_STREAM_TOKEN_TYPE } from '../interfaces/telephony-provider.interface';

describe('Twilio Media Stream & Protocol Validation', () => {
  let twilioProvider: TwilioTelephonyProvider;
  let mediaGateway: TelephonyMediaGateway;
  let audioSessionService: AudioSessionService;
  let orchestrator: ConversationOrchestrator;
  let jwtService: { verifyAsync: jest.Mock };
  let prisma: {
    isConnected: boolean;
    user: { findUnique: jest.Mock };
    call: { findFirst: jest.Mock };
  };

  const mockConfig = {
    TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    TWILIO_AUTH_TOKEN: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    TWILIO_PHONE_NUMBER: '+17372212163',
    PUBLIC_URL: 'https://call-agent-tunnel.test.domain',
    JWT_SECRET: 'test-jwt-secret',
    CORS_ORIGIN: 'http://localhost:3000',
  };

  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'user-1',
        tenantId: 'tenant-1',
        role: 'manager',
      }),
    };
    prisma = {
      isConnected: true,
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          tenantId: 'tenant-1',
          role: 'manager',
          isActive: true,
          name: 'Manager User',
          email: 'manager@example.com',
          tenant: { isActive: true },
        }),
      },
      call: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'call-custom-1',
          tenantId: 'tenant-1',
          direction: 'outbound',
          status: 'in_progress',
          agentId: 'agent-1',
          leadId: 'lead-1',
          metadata: { provider: 'twilio' },
        }),
      },
    };

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
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: PrismaService,
          useValue: prisma,
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
            getSession: jest.fn().mockReturnValue({
              sessionId: 'sess-tw-101',
              callId: 'CA_TEST_STREAM_1',
              tenantId: 'tenant-1',
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

  function authenticatedClient(id = 'mock-socket-1') {
    return {
      id,
      data: {
        auth: {
          kind: 'user',
          userId: 'user-1',
          name: 'Manager User',
          tenantId: 'tenant-1',
          role: 'manager',
        },
      },
      handshake: { auth: {} as { token?: string }, query: {}, headers: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
    };
  }

  function carrierClient(id = 'raw-ws-1') {
    return {
      id,
      data: {} as { auth?: any; callId?: string },
      handshake: { auth: {}, query: {}, headers: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
  }

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

    it('should bind the stream URL to a signed media token and database call id', async () => {
      const response = await twilioProvider.handleIncomingCall({
        providerCallId: 'CA_INBOUND_999',
        callId: 'call-db-999',
        fromNumber: '+15551234567',
        toNumber: '+17372212163',
        provider: 'twilio',
        rawPayload: {},
        mediaStreamToken: 'signed+media/token',
      });

      expect(response.instruction).toContain(
        '<Stream url="wss://call-agent-tunnel.test.domain/telephony/stream">',
      );
      expect(response.instruction).not.toContain('token=');
      expect(response.instruction).toContain('<Parameter name="callId" value="call-db-999" />');
      expect(response.instruction).toContain(
        '<Parameter name="mediaStreamToken" value="signed+media/token" />',
      );
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
    it('should process Twilio "start" event and initialize ConversationOrchestrator', async () => {
      const mockClient = authenticatedClient();
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

      const ack = await mediaGateway.handleStreamStart(mockClient as any, startPayload);
      expect(ack).toEqual({ event: 'start:ack', streamSid: 'MZ_STREAM_001', status: 'ready' });
      expect(audioSessionService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          callId: 'call-custom-1',
          tenantId: 'tenant-1',
          provider: 'twilio',
          streamSid: 'MZ_STREAM_001',
        }),
      );
      expect(orchestrator.startSession).toHaveBeenCalled();
    });

    it('should decode base64 audio frames and pass 8kHz mu-law Buffer to orchestrator', async () => {
      const mockClient = authenticatedClient();
      await mediaGateway.handleStreamStart(mockClient as any, {
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

    it('should terminate orchestrator session on "stop" event', async () => {
      const mockClient = authenticatedClient();
      await mediaGateway.handleStreamStart(mockClient as any, {
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
      expect(audioSessionService.closeSession).toHaveBeenCalledWith('sess-tw-101', 'tenant-1');
    });
  });

  describe('Media Gateway Authentication and Tenant Isolation', () => {
    it('should reject a Socket.IO connection without an access token', async () => {
      const client = {
        id: 'mock-socket-unauth',
        data: {},
        handshake: { auth: {} as { token?: string }, query: {}, headers: {} },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
      };

      await mediaGateway.handleConnection(client as any);

      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should trust the auth context attached by namespace middleware', async () => {
      const client = authenticatedClient();

      await mediaGateway.handleConnection(client as any);

      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should reject a Socket.IO connection from a disallowed origin', async () => {
      const client = {
        id: 'mock-socket-origin',
        data: {},
        handshake: {
          auth: { token: 'valid-access-token' } as { token?: string },
          query: {},
          headers: { origin: 'https://evil.example' },
        },
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
      };

      await mediaGateway.handleConnection(client as any);

      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should authenticate an active user and attach the database tenant context', async () => {
      const client = authenticatedClient();
      client.handshake.auth.token = 'valid-access-token';

      await mediaGateway.handleConnection(client as any);

      expect(client.data.auth).toEqual(
        expect.objectContaining({
          kind: 'user',
          userId: 'user-1',
          tenantId: 'tenant-1',
          role: 'manager',
        }),
      );
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should reject a start event for a call outside the authenticated tenant', async () => {
      const client = authenticatedClient();
      prisma.call.findFirst.mockResolvedValueOnce(null);

      await expect(
        mediaGateway.handleStreamStart(client as any, {
          start: { streamSid: 'MZ_CROSS_TENANT', customParameters: { callId: 'foreign-call' } },
        }),
      ).rejects.toThrow('Call not found');
      expect(audioSessionService.createSession).not.toHaveBeenCalled();
    });

    it('should reject supervisor access to a call outside the authenticated tenant', async () => {
      const client = authenticatedClient();
      prisma.call.findFirst.mockResolvedValueOnce(null);

      await expect(
        mediaGateway.handleSupervisorJoin(client as any, {
          callId: 'foreign-call',
          mode: 'listen',
        }),
      ).rejects.toThrow('Call not found');
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should authenticate a purpose-bound carrier token against the tenant call', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({
        type: MEDIA_STREAM_TOKEN_TYPE,
        sub: 'call-custom-1',
        callId: 'call-custom-1',
        tenantId: 'tenant-1',
        provider: 'twilio',
      });

      const auth = await (mediaGateway as any).authenticateMediaToken('carrier-token');

      expect(auth).toEqual(
        expect.objectContaining({
          kind: 'media',
          callId: 'call-custom-1',
          tenantId: 'tenant-1',
          provider: 'twilio',
        }),
      );
      expect(prisma.call.findFirst).toHaveBeenCalledWith({
        where: { id: 'call-custom-1', tenantId: 'tenant-1' },
        select: { id: true, status: true },
      });
    });

    it('should reject a user access token on the raw carrier transport', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-1',
        tenantId: 'tenant-1',
        role: 'manager',
      });

      await expect(
        (mediaGateway as any).authenticateMediaToken('user-access-token'),
      ).rejects.toThrow('Invalid media token');
    });
  });

  describe('Carrier First-Frame Authentication', () => {
    const requestUrl = new URL('wss://call-agent-tunnel.test.domain/telephony/stream');

    function startFrame(token?: string) {
      return {
        event: 'start',
        sequenceNumber: '1',
        start: {
          streamSid: 'MZ_STREAM_001',
          callSid: 'CA_TEST_001',
          ...(token ? { customParameters: { mediaStreamToken: token } } : {}),
        },
        streamSid: 'MZ_STREAM_001',
      };
    }

    beforeEach(() => {
      (mediaGateway as any).rawWsFramesBeforeAuth = new Map();
      (mediaGateway as any).rawWsAuthSettled = new Set();
    });

    it('should authenticate the carrier from the first start frame Parameter and start the stream', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({
        type: MEDIA_STREAM_TOKEN_TYPE,
        sub: 'call-custom-1',
        callId: 'call-custom-1',
        tenantId: 'tenant-1',
        provider: 'twilio',
      });
      const client = carrierClient();

      await (mediaGateway as any).authenticateCarrierFirstFrame(
        client,
        startFrame('carrier-media-token'),
        requestUrl,
      );

      expect(client.data.auth).toEqual(
        expect.objectContaining({ kind: 'media', callId: 'call-custom-1', tenantId: 'tenant-1' }),
      );
      expect(orchestrator.startSession).toHaveBeenCalledWith(
        expect.objectContaining({ callId: 'CA_TEST_STREAM_1', socketId: 'raw-ws-1' }),
      );
    });

    it('should reject a first start frame without a media token', async () => {
      const client = carrierClient();

      await expect(
        (mediaGateway as any).authenticateCarrierFirstFrame(client, startFrame(), requestUrl),
      ).rejects.toThrow('Carrier media token missing');
      expect(orchestrator.startSession).not.toHaveBeenCalled();
    });

    it('should reject a first start frame that carries a user access token', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-1',
        tenantId: 'tenant-1',
        role: 'manager',
      });
      const client = carrierClient();

      await expect(
        (mediaGateway as any).authenticateCarrierFirstFrame(
          client,
          startFrame('user-access-token'),
          requestUrl,
        ),
      ).rejects.toThrow('Invalid media token');
      expect(orchestrator.startSession).not.toHaveBeenCalled();
    });

    it('should ignore a repeated start frame after authentication is settled', async () => {
      const client = carrierClient();
      (mediaGateway as any).rawWsAuthSettled.add('raw-ws-1');

      await expect(
        (mediaGateway as any).authenticateCarrierFirstFrame(
          client,
          startFrame('carrier-media-token'),
          requestUrl,
        ),
      ).rejects.toThrow('Carrier authentication already settled');
    });

    it('should queue pre-authentication media frames and drop the connection past the frame budget', () => {
      (mediaGateway as any).rawWsClients.set('raw-ws-1', { readyState: 1, close: jest.fn() });

      for (let i = 0; i < 512; i += 1) {
        (mediaGateway as any).queueCarrierFrame('raw-ws-1', { event: 'media', media: { payload: 'AA==' } });
      }
      expect((mediaGateway as any).rawWsFramesBeforeAuth.get('raw-ws-1')).toHaveLength(512);

      (mediaGateway as any).queueCarrierFrame('raw-ws-1', { event: 'media', media: { payload: 'AA==' } });
      expect((mediaGateway as any).rawWsFramesBeforeAuth.get('raw-ws-1')).toHaveLength(0);
      expect((mediaGateway as any).rawWsClients.get('raw-ws-1').close).toHaveBeenCalledWith(
        4003,
        'Unauthorized media stream',
      );
    });
  });

  describe('Carrier Ownership and Supervisor RBAC', () => {
    async function startCarrierStream(client: any) {
      client.data.auth = {
        kind: 'media',
        name: 'Telephony provider',
        tenantId: 'tenant-1',
        callId: 'call-custom-1',
        provider: 'twilio',
      };
      return mediaGateway.handleStreamStart(client, {
        event: 'start',
        start: { streamSid: 'MZ_CARRIER_1', callSid: 'CA_TEST_001' },
      });
    }

    it('should scope user call lookups to the agents the user may access', async () => {
      const client = authenticatedClient();
      prisma.call.findFirst.mockClear();

      await mediaGateway.handleStreamStart(client as any, {
        start: { streamSid: 'MZ_SCOPED', customParameters: { callId: 'call-custom-1' } },
      });

      expect(prisma.call.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'call-custom-1',
            tenantId: 'tenant-1',
            agent: { managerId: 'user-1' },
          },
        }),
      );
    });

    it('should not apply user scoping to purpose-bound carrier lookups', async () => {
      const client = carrierClient();
      prisma.call.findFirst.mockClear();

      await startCarrierStream(client);

      expect(prisma.call.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'call-custom-1', tenantId: 'tenant-1' },
        }),
      );
    });

    it('should prevent a browser user from seizing a carrier-owned media stream', async () => {
      await startCarrierStream(carrierClient());
      const browserClient = authenticatedClient('mock-socket-browser');

      await expect(
        mediaGateway.handleStreamStart(browserClient as any, {
          start: { streamSid: 'MZ_BROWSER', customParameters: { callId: 'call-custom-1' } },
        }),
      ).rejects.toThrow('Call media stream is already bound to the telephony carrier');
    });

    it('should prevent a browser user from terminating a carrier-owned media stream', async () => {
      await startCarrierStream(carrierClient());
      const browserClient = authenticatedClient('mock-socket-browser');
      (mediaGateway as any).socketToSessionMap.set('mock-socket-browser', 'sess-tw-101');

      expect(() => mediaGateway.handleStreamStop(browserClient as any, { event: 'stop' })).toThrow(
        'Only the telephony carrier transport may stop this media stream',
      );
      expect(orchestrator.endSession).not.toHaveBeenCalled();
    });

    it('should prevent a carrier transport from replacing a browser-owned stream', async () => {
      const browserClient = authenticatedClient('mock-socket-browser');
      await mediaGateway.handleStreamStart(browserClient as any, {
        start: { streamSid: 'MZ_BROWSER', customParameters: { callId: 'call-custom-1' } },
      });

      await expect(startCarrierStream(carrierClient())).rejects.toThrow(
        'Call media stream is already bound to another transport',
      );
    });

    it('should require the intervention permission for barge-in supervisor access', async () => {
      const rbac = require('../../../common/rbac/role-permissions');
      const spy = jest
        .spyOn(rbac, 'hasPermission')
        .mockImplementation((_role: string, permission: string) => permission !== 'call:intervene');
      const client = authenticatedClient();

      await expect(
        mediaGateway.handleSupervisorJoin(client as any, { callId: 'call-custom-1', mode: 'barge_in' }),
      ).rejects.toThrow('Call intervention permission required for barge-in');

      const listenJoin = await mediaGateway.handleSupervisorJoin(client as any, {
        callId: 'call-custom-1',
        mode: 'listen',
      });
      expect(listenJoin).toEqual(
        expect.objectContaining({ success: true, callId: 'call-custom-1', mode: 'listen' }),
      );

      spy.mockRestore();
    });

    it('should reject supervisor access without call monitoring permission', async () => {
      const client = authenticatedClient();
      client.data.auth = { ...client.data.auth, role: 'auditor' };

      await expect(
        mediaGateway.handleSupervisorJoin(client as any, { callId: 'call-custom-1', mode: 'listen' }),
      ).rejects.toThrow('Call monitoring permission required');
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should scope supervisor joins to the agents the user may access', async () => {
      const client = authenticatedClient();
      prisma.call.findFirst.mockClear();

      await mediaGateway.handleSupervisorJoin(client as any, {
        callId: 'call-custom-1',
        mode: 'listen',
      });

      expect(prisma.call.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'call-custom-1',
            tenantId: 'tenant-1',
            agent: { managerId: 'user-1' },
          },
        }),
      );
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
