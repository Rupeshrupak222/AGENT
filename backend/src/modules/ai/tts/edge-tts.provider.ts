import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import {
  TextToSpeechProvider,
  TTSOptions,
  SynthesizeResult,
} from '../../telephony/interfaces/tts-provider.interface';

@Injectable()
export class EdgeTTSProvider implements TextToSpeechProvider {
  readonly name = 'edge-tts';
  private readonly logger = new Logger(EdgeTTSProvider.name);
  private readonly defaultVoice: string;

  constructor(private configService: ConfigService) {
    this.defaultVoice = this.configService.get<string>('EDGE_TTS_VOICE', 'en-US-JennyNeural');
  }

  get isConfigured(): boolean {
    // Edge-TTS connects directly to Microsoft Speech readaloud websocket without requiring an API key
    return true;
  }

  /**
   * Synthesizes text into a real-time stream of audio chunks.
   */
  async *synthesizeStream(text: string, options?: TTSOptions): AsyncIterable<Buffer> {
    const voice = options?.voiceId || this.defaultVoice;
    this.logger.log(`Beginning Edge-TTS streaming synthesis for text: "${text.slice(0, 40)}..." (voice: ${voice})`);

    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const { audioStream } = tts.toStream(text);

      // Prevent unhandled error event from bubbling up to process
      audioStream.on('error', (streamErr: any) => {
        this.logger.warn(`Edge-TTS audioStream error: ${streamErr?.message || streamErr}`);
      });

      // Yield chunks as they arrive from Edge WebSocket
      for await (const chunk of audioStream) {
        if (Buffer.isBuffer(chunk) && chunk.length > 0) {
          yield chunk;
        }
      }
    } catch (err: any) {
      this.logger.warn(`Edge-TTS stream error: ${err?.message || err}`);
    }
  }

  /**
   * Synthesizes complete text into an in-memory buffer.
   */
  async synthesize(text: string, options?: TTSOptions): Promise<SynthesizeResult> {
    const chunks: Buffer[] = [];
    let timeoutHandle: NodeJS.Timeout | undefined;
    try {
      const synthesisPromise = (async () => {
        for await (const chunk of this.synthesizeStream(text, options)) {
          chunks.push(chunk);
        }
      })();

      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Edge-TTS synthesis timeout (2500ms)')), 2500);
      });

      await Promise.race([synthesisPromise, timeoutPromise]);
    } catch (err: any) {
      this.logger.warn(`EdgeTTS synthesize warning: ${err.message}`);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }

    const fullBuffer = chunks.length > 0 ? Buffer.concat(chunks) : Buffer.alloc(0);
    return {
      audioBuffer: fullBuffer,
      encoding: 'audio/mpeg',
      sampleRate: 24000,
    };
  }
}
