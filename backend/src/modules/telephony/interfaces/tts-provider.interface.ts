export interface TTSOptions {
  voiceId?: string;
  language?: string;
  speed?: number;
  sampleRate?: number;
}

export interface SynthesizeResult {
  audioBuffer: Buffer;
  encoding: string;
  sampleRate: number;
}

export interface TextToSpeechProvider {
  readonly name: string;
  synthesizeStream(text: string, options?: TTSOptions): AsyncIterable<Buffer>;
  synthesize(text: string, options?: TTSOptions): Promise<SynthesizeResult>;
}
