import { ConversationOrchestrator } from '../orchestrator/conversation.orchestrator';
import { DeepgramSTTProvider } from '../stt/deepgram-stt.provider';
import { GroqAgentBrainService } from '../brain/groq-agent-brain.service';
import { EdgeTTSProvider } from '../tts/edge-tts.provider';
import { TranscriptEvent } from '../../telephony/interfaces/transcript-event.interface';
import { AudioFormatConverterService } from '../../telephony/services/audio-format-converter.service';

describe('ConversationOrchestrator', () => {
  let orchestrator: ConversationOrchestrator;
  let mockSTT: Partial<DeepgramSTTProvider>;
  let mockBrain: Partial<GroqAgentBrainService>;
  let mockTTS: Partial<EdgeTTSProvider>;
  let mockPrisma: any;

  beforeEach(() => {
    mockSTT = {
      createStreamSession: jest.fn().mockReturnValue(true),
      sendAudio: jest.fn(),
      closeStream: jest.fn(),
    };

    mockBrain = {
      generateResponse: jest.fn().mockResolvedValue({
        responseText: 'Thank you for reaching out. How can I help?',
        latencyMs: 120,
      }),
    };

    mockTTS = {
      synthesizeStream: jest.fn().mockImplementation(async function* () {
        yield Buffer.from([0x01, 0x02]);
        yield Buffer.from([0x03, 0x04]);
      }),
    };

    mockPrisma = {
      aIAgent: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'agent-1',
          businessGoal: 'Schedule consultations',
          openingScript: 'Hello, thank you for calling.',
        }),
      },
      callTranscript: {
        upsert: jest.fn().mockResolvedValue({ id: 'transcript-1' }),
      },
    };

    const mockConverter = new AudioFormatConverterService();

    orchestrator = new ConversationOrchestrator(
      mockSTT as DeepgramSTTProvider,
      mockBrain as GroqAgentBrainService,
      mockTTS as EdgeTTSProvider,
      mockPrisma as any,
      mockConverter,
    );
  });

  afterEach(() => {
    orchestrator.onModuleDestroy();
  });

  it('should initialize conversation session and register STT stream', async () => {
    const onAudioChunk = jest.fn();
    const onBargeInClear = jest.fn();

    const success = await orchestrator.startSession({
      sessionId: 'sess-alpha',
      callId: 'call-alpha',
      tenantId: 'tenant-1',
      agentId: 'agent-1',
      socketId: 'sock-1',
      streamSid: 'stream-1',
      onAudioChunk,
      onBargeInClear,
    });

    expect(success).toBe(true);
    expect(mockSTT.createStreamSession).toHaveBeenCalledWith(
      'sess-alpha',
      'call-alpha',
      expect.any(Function),
      expect.any(Function),
    );

    const session = orchestrator.getSession('sess-alpha');
    expect(session).toBeDefined();
    expect(session?.callId).toBe('call-alpha');
  });

  it('should broadcast interim transcript without invoking Agent Brain', async () => {
    const onAudioChunk = jest.fn();
    const onBargeInClear = jest.fn();
    const onTranscriptBroadcast = jest.fn();

    await orchestrator.startSession({
      sessionId: 'sess-interim',
      callId: 'call-interim',
      tenantId: 'tenant-1',
      socketId: 'sock-1',
      streamSid: 'stream-1',
      onAudioChunk,
      onBargeInClear,
      onTranscriptBroadcast,
    });

    const interimEvent: TranscriptEvent = {
      sessionId: 'sess-interim',
      callId: 'call-interim',
      speaker: 'user',
      text: 'I want to schedule',
      isFinal: false,
      timestamp: Date.now(),
      sequenceNumber: 1,
    };

    await orchestrator.handleTranscriptEvent('sess-interim', interimEvent);

    expect(onTranscriptBroadcast).toHaveBeenCalledWith(interimEvent);
    expect(mockBrain.generateResponse).not.toHaveBeenCalled();
    expect(onAudioChunk).not.toHaveBeenCalled();
  });

  it('should process final utterance by invoking Agent Brain and streaming TTS chunks', async () => {
    const onAudioChunk = jest.fn();
    const onBargeInClear = jest.fn();
    const onTranscriptBroadcast = jest.fn();

    await orchestrator.startSession({
      sessionId: 'sess-final',
      callId: 'call-final',
      tenantId: 'tenant-1',
      socketId: 'sock-1',
      streamSid: 'stream-1',
      onAudioChunk,
      onBargeInClear,
      onTranscriptBroadcast,
    });

    const finalEvent: TranscriptEvent = {
      sessionId: 'sess-final',
      callId: 'call-final',
      speaker: 'user',
      text: 'Hello I need an appointment please',
      isFinal: true,
      timestamp: Date.now(),
      sequenceNumber: 2,
    };

    await orchestrator.handleTranscriptEvent('sess-final', finalEvent);

    expect(mockBrain.generateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: 'Hello I need an appointment please',
        sessionId: 'sess-final',
      }),
    );

    expect(mockTTS.synthesizeStream).toHaveBeenCalledWith(
      'Thank you for reaching out. How can I help?',
    );

    // Audio chunks should be forwarded to onAudioChunk
    expect(onAudioChunk).toHaveBeenCalledTimes(2);
  });

  it('should handle barge-in interruption by triggering clear and invalidating active turn', async () => {
    const onAudioChunk = jest.fn();
    const onBargeInClear = jest.fn();

    await orchestrator.startSession({
      sessionId: 'sess-barge',
      callId: 'call-barge',
      tenantId: 'tenant-1',
      socketId: 'sock-1',
      streamSid: 'stream-1',
      onAudioChunk,
      onBargeInClear,
    });

    const session = orchestrator.getSession('sess-barge')!;
    session.isAISpeaking = true;

    // Caller interrupts while AI is speaking
    const interruptEvent: TranscriptEvent = {
      sessionId: 'sess-barge',
      callId: 'call-barge',
      speaker: 'user',
      text: 'Wait hold on',
      isFinal: false,
      timestamp: Date.now(),
      sequenceNumber: 3,
    };

    await orchestrator.handleTranscriptEvent('sess-barge', interruptEvent);

    expect(onBargeInClear).toHaveBeenCalled();
    expect(session.isAISpeaking).toBe(false);
  });

  it('should enforce strict cross-session isolation', async () => {
    await orchestrator.startSession({
      sessionId: 'sess-A',
      callId: 'call-A',
      tenantId: 'tenant-A',
      socketId: 'sock-A',
      streamSid: 'stream-A',
      onAudioChunk: jest.fn(),
      onBargeInClear: jest.fn(),
    });

    await orchestrator.startSession({
      sessionId: 'sess-B',
      callId: 'call-B',
      tenantId: 'tenant-B',
      socketId: 'sock-B',
      streamSid: 'stream-B',
      onAudioChunk: jest.fn(),
      onBargeInClear: jest.fn(),
    });

    const sessionA = orchestrator.getSession('sess-A');
    const sessionB = orchestrator.getSession('sess-B');

    expect(sessionA?.tenantId).toBe('tenant-A');
    expect(sessionB?.tenantId).toBe('tenant-B');
    expect(sessionA?.callId).not.toBe(sessionB?.callId);

    // Ending session A must not affect session B
    await orchestrator.endSession('sess-A');
    expect(orchestrator.getSession('sess-A')).toBeUndefined();
    expect(orchestrator.getSession('sess-B')).toBeDefined();
  });
});
