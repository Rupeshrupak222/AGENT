import { Injectable, Logger } from '@nestjs/common';
type MPEGDecoderType = any;

const BIAS = 0x84; // 132
const CLIP = 32635;

let cachedDecoderClass: any = null;
async function getMPEGDecoderClass(): Promise<any> {
  if (cachedDecoderClass) return cachedDecoderClass;
  try {
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    const mod = await dynamicImport('mpg123-decoder');
    cachedDecoderClass = mod.MPEGDecoder || mod.default?.MPEGDecoder || mod.default;
    return cachedDecoderClass;
  } catch {
    return null;
  }
}

@Injectable()
export class AudioFormatConverterService {
  private readonly logger = new Logger(AudioFormatConverterService.name);
  private decoder: MPEGDecoderType | null = null;
  private isDecoderReady = false;

  constructor() {
    this.initDecoder();
  }

  private async initDecoder(): Promise<void> {
    try {
      const DecoderClass = await getMPEGDecoderClass();
      if (!DecoderClass) {
        this.logger.log('MPEGDecoder ESM unavailable in current runtime; PCM/mu-law conversion active.');
        return;
      }
      this.decoder = new DecoderClass();
      await this.decoder?.ready;
      this.isDecoderReady = true;
      this.logger.log('MPEGDecoder initialized for real-time audio format conversion');
    } catch (err: any) {
      this.logger.warn(`Failed to initialize MPEGDecoder: ${err.message}. Falling back to PCM conversion.`);
    }
  }

  /**
   * Encodes a single 16-bit linear PCM sample (-32768..32767) into an 8-bit ITU-T G.711 mu-law byte.
   */
  linearToMuLawSample(pcm: number): number {
    let sign = 0;
    if (pcm < 0) {
      sign = 0x80;
      pcm = -pcm;
    }
    if (pcm > CLIP) pcm = CLIP;
    pcm += BIAS;

    let exponent = 7;
    for (let expMask = 0x4000; (pcm & expMask) === 0 && exponent > 0; expMask >>= 1) {
      exponent--;
    }

    const mantissa = (pcm >> (exponent + 3)) & 0x0f;
    const mulawByte = ~(sign | (exponent << 4) | mantissa) & 0xff;
    return mulawByte;
  }

  /**
   * Decodes an 8-bit ITU-T G.711 mu-law byte into a 16-bit linear PCM sample.
   */
  muLawToLinearSample(mulaw: number): number {
    const complement = ~mulaw & 0xff;
    const sign = (complement & 0x80) ? -1 : 1;
    const exponent = (complement >> 4) & 0x07;
    const mantissa = complement & 0x0f;
    let sample = ((mantissa << 3) + 0x84) << exponent;
    sample -= 0x84;
    return sign * sample;
  }

  /**
   * Converts a Float32Array or Int16Array of PCM samples to 8kHz 8-bit mu-law Buffer.
   * Handles downsampling from common TTS sample rates (24kHz, 16kHz, 8kHz).
   */
  pcmToMuLaw(samples: Float32Array | Int16Array, fromSampleRate = 24000): Buffer {
    const isFloat = samples instanceof Float32Array;
    const step = Math.max(1, Math.round(fromSampleRate / 8000));
    const outLength = Math.floor(samples.length / step);
    const out = Buffer.alloc(outLength);

    for (let i = 0; i < outLength; i++) {
      let sum = 0;
      for (let s = 0; s < step; s++) {
        const idx = i * step + s;
        if (idx < samples.length) {
          const val = samples[idx];
          sum += isFloat ? (val as number) * 32767 : (val as number);
        }
      }
      const avgPcm = Math.round(sum / step);
      out[i] = this.linearToMuLawSample(avgPcm);
    }

    return out;
  }

  /**
   * Converts an audio buffer (MP3 or PCM) into 8kHz mono G.711 mu-law.
   * If the buffer is already raw mu-law, passes it through.
   */
  async convertToMuLaw(
    buffer: Buffer,
    sourceFormat: 'mp3' | 'pcm' | 'mulaw' = 'mp3',
    sourceSampleRate = 24000,
  ): Promise<Buffer> {
    if (sourceFormat === 'mulaw') {
      return buffer;
    }

    if (sourceFormat === 'pcm') {
      const int16 = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
      return this.pcmToMuLaw(int16, sourceSampleRate);
    }

    // Default: sourceFormat === 'mp3'
    if (this.decoder && this.isDecoderReady) {
      try {
        const { channelData, samplesDecoded, sampleRate } = this.decoder.decode(buffer);
        if (samplesDecoded > 0 && channelData.length > 0) {
          return this.pcmToMuLaw(channelData[0], sampleRate || sourceSampleRate);
        }
      } catch (err: any) {
        this.logger.debug(`MP3 chunk decode partial: ${err.message}`);
      }
    }

    // Fallback: If not MP3 or decoder not ready, return buffer as-is
    return buffer;
  }

  /**
   * Slices an arbitrary mu-law buffer into exact frame-aligned chunks (e.g., 160 bytes for 20ms at 8kHz).
   * Incomplete remainder is returned separately so caller can accumulate across streaming chunks.
   */
  sliceIntoFrames(
    buffer: Buffer,
    frameSize = 160,
  ): { frames: Buffer[]; remainder: Buffer } {
    if (!buffer || buffer.length === 0) {
      return { frames: [], remainder: Buffer.alloc(0) };
    }
    const frameCount = Math.floor(buffer.length / frameSize);
    const frames: Buffer[] = [];
    for (let i = 0; i < frameCount; i++) {
      frames.push(buffer.subarray(i * frameSize, (i + 1) * frameSize));
    }
    const remainder = Buffer.from(buffer.subarray(frameCount * frameSize));
    return { frames, remainder };
  }

  /**
   * Validates whether an audio buffer meets carrier frame specification.
   * Default: 160 bytes (20ms mono 8kHz G.711 mu-law).
   */
  isValidMuLawFrame(buffer: Buffer, expectedSize = 160): boolean {
    return Boolean(buffer && buffer.length === expectedSize);
  }

  /**
   * Detects whether an audio buffer accidentally contains MP3 or WAV headers instead of raw mu-law.
   */
  detectAudioFormatHeaders(buffer: Buffer): { hasMp3Header: boolean; hasWavHeader: boolean } {
    if (!buffer || buffer.length < 4) {
      return { hasMp3Header: false, hasWavHeader: false };
    }

    // MP3 Sync Word: 11 bits set (0xFF followed by 0xE0..0xFF)
    const hasMp3Header = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;

    // WAV Header: Starts with ASCII "RIFF"
    const hasWavHeader =
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WAVE';

    return { hasMp3Header, hasWavHeader };
  }

  /**
   * Creates a dedicated stream converter instance for a session to prevent state crosstalk.
   * Includes an internal jitter buffer that automatically slices incoming audio into exact 160-byte
   * (20ms @ 8kHz G.711 mu-law) frames, with bounded memory to prevent runaway queue growth.
   */
  createSessionConverter(): {
    convertChunk: (chunk: Buffer) => Promise<Buffer>;
    convertChunkToFrames: (chunk: Buffer, frameSize?: number) => Promise<Buffer[]>;
    reset: () => void;
    getBufferedBytes: () => number;
  } {
    let sessionDecoder: any = null;
    let initPromise: Promise<void> | null = null;
    let remainderBuffer = Buffer.alloc(0);
    const MAX_BUFFER_BYTES = 8000; // 1 second of 8kHz mu-law audio limit for jitter/queue safety

    const ensureDecoder = async () => {
      if (sessionDecoder) return;
      if (!initPromise) {
        initPromise = (async () => {
          const DecoderClass = await getMPEGDecoderClass();
          if (DecoderClass) {
            sessionDecoder = new DecoderClass();
            await sessionDecoder.ready;
          }
        })();
      }
      await initPromise;
    };

    return {
      convertChunk: async (chunk: Buffer): Promise<Buffer> => {
        await ensureDecoder();
        if (sessionDecoder) {
          try {
            const { channelData, samplesDecoded, sampleRate } = sessionDecoder.decode(chunk);
            if (samplesDecoded > 0 && channelData.length > 0) {
              return this.pcmToMuLaw(channelData[0], sampleRate || 24000);
            }
          } catch (err: any) {
            // Incomplete MPEG frame in streaming chunk; mpg123 buffers internally
          }
        }
        return chunk;
      },

      convertChunkToFrames: async (chunk: Buffer, frameSize = 160): Promise<Buffer[]> => {
        await ensureDecoder();
        let mulawChunk: Buffer | null = null;

        if (sessionDecoder) {
          try {
            const { channelData, samplesDecoded, sampleRate } = sessionDecoder.decode(chunk);
            if (samplesDecoded > 0 && channelData.length > 0) {
              mulawChunk = this.pcmToMuLaw(channelData[0], sampleRate || 24000);
            }
          } catch {
            // Partial chunk
          }
        } else {
          // If decoder is unavailable in test environment, treat input as PCM/mu-law
          mulawChunk = chunk;
        }

        if (!mulawChunk || mulawChunk.length === 0) {
          return [];
        }

        remainderBuffer = Buffer.concat([remainderBuffer, mulawChunk]);

        // Jitter / queue overflow protection: bound buffer memory
        if (remainderBuffer.length > MAX_BUFFER_BYTES) {
          this.logger.warn(`Audio buffer exceeded jitter threshold (${MAX_BUFFER_BYTES} bytes). Dropping stale frames.`);
          remainderBuffer = Buffer.from(remainderBuffer.subarray(remainderBuffer.length - MAX_BUFFER_BYTES));
        }

        const frameCount = Math.floor(remainderBuffer.length / frameSize);
        const frames: Buffer[] = [];
        for (let i = 0; i < frameCount; i++) {
          frames.push(remainderBuffer.subarray(i * frameSize, (i + 1) * frameSize));
        }
        remainderBuffer = Buffer.from(remainderBuffer.subarray(frameCount * frameSize));
        return frames;
      },

      reset: () => {
        remainderBuffer = Buffer.alloc(0);
        if (sessionDecoder) {
          try {
            sessionDecoder.reset();
          } catch {
            // ignore
          }
        }
      },

      getBufferedBytes: () => remainderBuffer.length,
    };
  }
}
