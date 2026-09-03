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

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(text);

    // Yield chunks as they arrive from Edge WebSocket
    for await (const chunk of audioStream) {
      if (Buffer.isBuffer(chunk) && chunk.length > 0) {
        yield chunk;
      }
    }
  }

  /**
   * Synthesizes complete text into an in-memory buffer.
   */
  async synthesize(text: string, options?: TTSOptions): Promise<SynthesizeResult> {
    const chunks: Buffer[] = [];
    for await (const chunk of this.synthesizeStream(text, options)) {
      chunks.push(chunk);
    }

    const fullBuffer = Buffer.concat(chunks);
    return {
      audioBuffer: fullBuffer,
      encoding: 'audio/mpeg',
      sampleRate: 24000,
    };
  }
}
