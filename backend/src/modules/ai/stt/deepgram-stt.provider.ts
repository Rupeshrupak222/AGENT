import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { TranscriptEvent } from '../../telephony/interfaces/transcript-event.interface';

export type TranscriptCallback = (event: TranscriptEvent) => void;

interface DeepgramStreamSession {
  ws: WebSocket;
  sessionId: string;
  callId: string;
  sequenceCounter: number;
  isOpen: boolean;
  onTranscript: TranscriptCallback;
  pingInterval?: NodeJS.Timeout;
}

@Injectable()
export class DeepgramSTTProvider implements OnModuleDestroy {
  private readonly logger = new Logger(DeepgramSTTProvider.name);
  private readonly apiKey: string;
  private readonly activeStreams = new Map<string, DeepgramStreamSession>();

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPGRAM_API_KEY', '');
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  onModuleDestroy() {
    for (const sessionId of this.activeStreams.keys()) {
      this.closeStream(sessionId);
    }
  }

  /**
   * Initializes a dedicated, persistent Deepgram streaming WebSocket for the given audio session.
   */
  createStreamSession(
    sessionId: string,
    callId: string,
    onTranscript: TranscriptCallback,
    onError?: (err: Error) => void,
  ): boolean {
    if (!this.isConfigured) {
      this.logger.warn(`Deepgram API key not configured. STT streaming disabled for session [${sessionId}].`);
      return false;
    }

    if (this.activeStreams.has(sessionId)) {
      this.logger.log(`Session [${sessionId}] already has an active Deepgram stream.`);
      return true;
    }

    try {
      // 8kHz mu-law mono (telephony standard) with interim results and smart formatting
      const url =
        'wss://api.deepgram.com/v1/listen?encoding=mulaw&sample_rate=8000&channels=1&interim_results=true&smart_format=true&endpointing=300';

      const ws = new WebSocket(url, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
        },
      });

      const session: DeepgramStreamSession = {
        ws,
        sessionId,
        callId,
        sequenceCounter: 0,
        isOpen: false,
        onTranscript,
      };

      ws.on('open', () => {
        session.isOpen = true;
        this.logger.log(`Deepgram STT streaming connected for session [${sessionId}]`);

        // Send keep-alive ping every 10 seconds
        session.pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
          }
        }, 10000);
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const raw = data.toString();
          const parsed = JSON.parse(raw);

          // Extract alternative transcripts
          const channel = parsed.channel;
          const alt = channel?.alternatives?.[0];
          const text = alt?.transcript?.trim();

          if (!text || text.length === 0) return;

          const isFinal = Boolean(parsed.is_final || parsed.speech_final);
          const confidence = alt?.confidence || 0.9;
          session.sequenceCounter += 1;

          const event: TranscriptEvent = {
            sessionId,
            callId,
            speaker: 'user',
            text,
            isFinal,
            confidence,
            timestamp: Date.now(),
            sequenceNumber: session.sequenceCounter,
          };

          onTranscript(event);
        } catch (err: any) {
          this.logger.error(`Error parsing Deepgram message for session [${sessionId}]: ${err.message}`);
        }
      });

      ws.on('error', (err: Error) => {
        this.logger.error(`Deepgram STT error for session [${sessionId}]: ${err.message}`);
        if (onError) onError(err);
      });

      ws.on('close', (code, reason) => {
        session.isOpen = false;
        if (session.pingInterval) clearInterval(session.pingInterval);
        this.logger.log(`Deepgram STT closed for session [${sessionId}] (code: ${code}, reason: ${reason?.toString()})`);
        this.activeStreams.delete(sessionId);
      });

      this.activeStreams.set(sessionId, session);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to initialize Deepgram stream for session [${sessionId}]: ${err.message}`);
      if (onError) onError(err);
      return false;
    }
  }

  /**
   * Forwards a raw 8kHz mu-law audio frame to Deepgram's live streaming WebSocket.
   */
  sendAudio(sessionId: string, payload: Buffer): void {
    const session = this.activeStreams.get(sessionId);
    if (!session || !session.isOpen || session.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      session.ws.send(payload);
    } catch (err: any) {
      this.logger.error(`Failed to send audio buffer to Deepgram [${sessionId}]: ${err.message}`);
    }
  }

  /**
   * Closes the Deepgram streaming connection and releases all timers.
   */
  closeStream(sessionId: string): void {
    const session = this.activeStreams.get(sessionId);
    if (!session) return;

    if (session.pingInterval) {
      clearInterval(session.pingInterval);
    }

    try {
      if (session.ws.readyState === WebSocket.OPEN) {
        // Send Deepgram close stream frame
        session.ws.send(JSON.stringify({ type: 'CloseStream' }));
        session.ws.close();
      }
    } catch (err: any) {
      this.logger.warn(`Error during Deepgram stream closure: ${err.message}`);
    }

    this.activeStreams.delete(sessionId);
    this.logger.log(`Teardown Deepgram stream for session [${sessionId}]`);
  }
}
