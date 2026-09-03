import { ConfigService } from '@nestjs/config';
import { EdgeTTSProvider } from '../tts/edge-tts.provider';

describe('EdgeTTSProvider', () => {
  let provider: EdgeTTSProvider;

  beforeEach(() => {
    provider = new EdgeTTSProvider(new ConfigService());
  });

  it('should be configured by default (zero API key required)', () => {
    expect(provider.name).toBe('edge-tts');
    expect(provider.isConfigured).toBe(true);
  });

  it('should synthesize short text into an audio buffer with correct encoding metadata', async () => {
    // Note: Test synthesis of a minimal text utterance
    const result = await provider.synthesize('Hello from Edge TTS', {
      voiceId: 'en-US-JennyNeural',
    });

    expect(result.audioBuffer).toBeDefined();
    expect(result.audioBuffer.length).toBeGreaterThan(0);
    expect(result.encoding).toBe('audio/mpeg');
    expect(result.sampleRate).toBe(24000);
  }, 15000);
});
