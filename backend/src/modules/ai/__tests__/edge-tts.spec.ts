import { ConfigService } from '@nestjs/config';
import { EdgeTTSProvider } from '../tts/edge-tts.provider';
import { MsEdgeTTS } from 'msedge-tts';
import { Readable } from 'stream';

jest.mock('msedge-tts');

describe('EdgeTTSProvider', () => {
  let provider: EdgeTTSProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    (MsEdgeTTS as unknown as jest.Mock).mockImplementation(() => ({
      setMetadata: jest.fn().mockResolvedValue(undefined),
      toStream: jest.fn().mockReturnValue({
        audioStream: Readable.from([Buffer.from('mock-mp3-audio-chunk')]),
      }),
    }));

    provider = new EdgeTTSProvider(new ConfigService());
  });

  it('should be configured by default (zero API key required)', () => {
    expect(provider.name).toBe('edge-tts');
    expect(provider.isConfigured).toBe(true);
  });

  it('should synthesize short text into an audio buffer with correct encoding metadata', async () => {
    const result = await provider.synthesize('Hello from Edge TTS', {
      voiceId: 'en-US-JennyNeural',
    });

    expect(result.audioBuffer).toBeDefined();
    expect(result.audioBuffer.length).toBeGreaterThan(0);
    expect(result.encoding).toBe('audio/mpeg');
    expect(result.sampleRate).toBe(24000);
  });
});

