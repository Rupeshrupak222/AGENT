import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DeepgramSTTProvider } from '../stt/deepgram-stt.provider';
import { GroqAgentBrainService } from '../brain/groq-agent-brain.service';
import { EdgeTTSProvider } from '../tts/edge-tts.provider';
import { PrismaService } from '../../prisma/prisma.service';
import { TranscriptEvent } from '../../telephony/interfaces/transcript-event.interface';
import {
  AgentContext,
  ConversationTurn,
} from '../../telephony/interfaces/agent-brain.interface';

import { AudioFormatConverterService } from '../../telephony/services/audio-format-converter.service';

export interface ActiveCallStream {
  sessionId: string;
  callId: string;
  tenantId: string;
  agentId: string;
  socketId: string;
  streamSid: string;
  history: ConversationTurn[];
  currentTurnId: number;
  isAISpeaking: boolean;
  agentContext: AgentContext;
  converter: ReturnType<AudioFormatConverterService['createSessionConverter']>;
  onAudioChunk: (chunk: Buffer) => void;
  onBargeInClear: () => void;
  onTranscriptBroadcast?: (event: TranscriptEvent) => void;
}

@Injectable()
export class ConversationOrchestrator implements OnModuleDestroy {
  private readonly logger = new Logger(ConversationOrchestrator.name);
  private readonly sessions = new Map<string, ActiveCallStream>();

  constructor(
    private readonly sttProvider: DeepgramSTTProvider,
    private readonly agentBrain: GroqAgentBrainService,
    private readonly ttsProvider: EdgeTTSProvider,
    private readonly prisma: PrismaService,
    private readonly audioFormatConverter: AudioFormatConverterService,
  ) {}

  onModuleDestroy() {
    for (const sessionId of this.sessions.keys()) {
      this.endSession(sessionId);
    }
  }

  /**
   * Initializes real-time conversational AI loop for an active telephony audio stream.
   */
  async startSession(params: {
    sessionId: string;
    callId: string;
    tenantId: string;
    agentId?: string;
    socketId: string;
    streamSid: string;
    onAudioChunk: (chunk: Buffer) => void;
    onBargeInClear: () => void;
    onTranscriptBroadcast?: (event: TranscriptEvent) => void;
  }): Promise<boolean> {
    const { sessionId, callId, tenantId, agentId, socketId, streamSid, onAudioChunk, onBargeInClear, onTranscriptBroadcast } = params;

    if (this.sessions.has(sessionId)) {
      this.logger.warn(`Session [${sessionId}] already active in ConversationOrchestrator.`);
      return true;
    }

    // Load agent configuration from database for contextual system prompt
    const context = await this.loadAgentContext(tenantId, agentId);

    const callStream: ActiveCallStream = {
      sessionId,
      callId,
      tenantId,
      agentId: agentId || 'default-agent',
      socketId,
      streamSid,
      history: [],
      currentTurnId: 0,
      isAISpeaking: false,
      agentContext: context,
      converter: this.audioFormatConverter.createSessionConverter(),
      onAudioChunk,
      onBargeInClear,
      onTranscriptBroadcast,
    };

    this.sessions.set(sessionId, callStream);

    // Initialize Deepgram STT stream
    const sttReady = this.sttProvider.createStreamSession(
      sessionId,
      callId,
      (event: TranscriptEvent) => this.handleTranscriptEvent(sessionId, event),
      (err) => this.logger.error(`STT error on session [${sessionId}]: ${err.message}`),
    );

    this.logger.log(
      `ConversationOrchestrator initialized session [${sessionId}] (call: ${callId}, STT: ${sttReady ? 'active' : 'deferred'})`,
    );

    return true;
  }

  /**
   * Forwards inbound audio frame from telephony caller to Deepgram STT.
   */
  handleAudioFrame(sessionId: string, payload: Buffer): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.sttProvider.sendAudio(sessionId, payload);
  }

  /**
   * Processes transcript events emitted by Deepgram STT.
   */
  async handleTranscriptEvent(sessionId: string, event: TranscriptEvent): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 1. Broadcast transcript to UI dashboard
    if (session.onTranscriptBroadcast) {
      session.onTranscriptBroadcast(event);
    }

    // 2. Handle barge-in if caller interrupts during AI speech
    if (session.isAISpeaking && event.text.length > 0) {
      this.logger.log(`Barge-in detected on session [${sessionId}]. Cancelling ongoing AI speech turn.`);
      session.currentTurnId += 1; // Invalidate current turn generation
      session.isAISpeaking = false;
      session.converter.reset();
      session.onBargeInClear();
    }

    // 3. Process utterance boundary only when transcript is marked FINAL
    if (event.isFinal && event.text.trim().length > 0) {
      await this.processTurn(session, event.text.trim());
    }
  }

  /**
   * Orchestrates LLM prompt execution and speech synthesis streaming.
   */
  private async processTurn(session: ActiveCallStream, userMessage: string): Promise<void> {
    const turnId = ++session.currentTurnId;
    const { sessionId, callId } = session;

    // Record caller turn in conversational history
    session.history.push({
      speaker: 'user',
      content: userMessage,
      timestamp: Date.now(),
    });

    this.logger.log(`Executing AgentBrain turn #${turnId} for session [${sessionId}]: "${userMessage}"`);

    // Generate response from Groq
    const brainOutput = await this.agentBrain.generateResponse({
      sessionId,
      callId,
      context: session.agentContext,
      userMessage,
      history: session.history,
    });

    // Check if turn was invalidated (e.g. caller interrupted while Groq was computing)
    if (session.currentTurnId !== turnId) {
      this.logger.log(`Turn #${turnId} invalidated by interruption. Discarding response.`);
      return;
    }

    const responseText = brainOutput.responseText;

    // Record agent turn in history
    session.history.push({
      speaker: 'agent',
      content: responseText,
      timestamp: Date.now(),
    });

    // Broadcast final agent text to dashboard
    if (session.onTranscriptBroadcast) {
      session.onTranscriptBroadcast({
        sessionId,
        callId,
        speaker: 'agent',
        text: responseText,
        isFinal: true,
        timestamp: Date.now(),
        sequenceNumber: session.history.length,
      });
    }

    // Stream synthesized speech back to caller via Edge-TTS
    try {
      session.isAISpeaking = true;
      const audioStream = this.ttsProvider.synthesizeStream(responseText);

      for await (const audioChunk of audioStream) {
        // Interruption check: discard future chunks if user interrupted
        if (session.currentTurnId !== turnId) {
          this.logger.log(`Speech output #${turnId} aborted by caller interruption.`);
          break;
        }

        const mulawChunk = await session.converter.convertChunk(audioChunk);
        session.onAudioChunk(mulawChunk);
      }
    } catch (err: any) {
      this.logger.error(`Error streaming TTS audio chunks for session [${sessionId}]: ${err.message}`);
    } finally {
      if (session.currentTurnId === turnId) {
        session.isAISpeaking = false;
      }
    }
  }

  /**
   * Cleanly terminates active session and persists transcript to database.
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.logger.log(`Ending conversation orchestration for session [${sessionId}]`);
    this.sttProvider.closeStream(sessionId);

    // Asynchronously persist conversation transcript
    if (session.history.length > 0) {
      this.persistTranscript(session.callId, session.history).catch((err) =>
        this.logger.warn(`Failed to persist transcript for call [${session.callId}]: ${err.message}`),
      );
    }

    this.sessions.delete(sessionId);
  }

  /**
   * Retrieves active session details.
   */
  getSession(sessionId: string): ActiveCallStream | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Loads agent configuration for prompt grounding.
   */
  private async loadAgentContext(tenantId: string, agentId?: string): Promise<AgentContext> {
    const fallback: AgentContext = {
      tenantId,
      agentId: agentId || 'default-agent',
      businessGoal: 'Assist callers and schedule appointments professionally.',
    };

    if (!agentId) return fallback;

    try {
      const agent = await this.prisma.aIAgent.findFirst({
        where: { id: agentId, tenantId },
      });

      if (!agent) return fallback;

      return {
        tenantId,
        agentId: agent.id,
        businessGoal: agent.businessGoal || 'Provide excellent customer service.',
        openingScript: agent.openingScript || undefined,
        qualificationRules: agent.qualificationRules || undefined,
        knowledgeBase: agent.knowledgeBase || undefined,
      };
    } catch {
      return fallback;
    }
  }

  /**
   * Persists normalized turns to Prisma CallTranscript.
   */
  private async persistTranscript(callId: string, history: ConversationTurn[]): Promise<void> {
    try {
      const segments = history.map((turn) => ({
        speaker: turn.speaker,
        text: turn.content,
        timestamp: turn.timestamp,
      }));

      await this.prisma.callTranscript.upsert({
        where: { callId },
        create: {
          callId,
          segments: segments as any,
          summary: `Call contained ${history.length} turns.`,
        },
        update: {
          segments: segments as any,
        },
      });

      this.logger.log(`Persisted ${history.length} transcript turns for call [${callId}]`);
    } catch (err: any) {
      this.logger.warn(`Could not persist transcript to database: ${err.message}`);
    }
  }
}
