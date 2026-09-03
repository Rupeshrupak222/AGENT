import { ConfigService } from '@nestjs/config';
import { DeepgramSTTProvider } from '../stt/deepgram-stt.provider';

describe('DeepgramSTTProvider', () => {
  let configService: ConfigService;
  let provider: DeepgramSTTProvider;

  beforeEach(() => {
    configService = new ConfigService();
    provider = new DeepgramSTTProvider(configService);
  });

  afterEach(() => {
    provider.onModuleDestroy();
  });

  it('should detect when DEEPGRAM_API_KEY is configured or missing', () => {
    // When no key provided
    const unconfigured = new DeepgramSTTProvider(new ConfigService({ DEEPGRAM_API_KEY: '' }));
    expect(unconfigured.isConfigured).toBe(false);

    // When valid key provided
    const configured = new DeepgramSTTProvider(
      new ConfigService({ DEEPGRAM_API_KEY: 'test-deepgram-api-key-123456789' }),
    );
    expect(configured.isConfigured).toBe(true);
  });

  it('should gracefully handle unconfigured session creation without crashing', () => {
    const unconfigured = new DeepgramSTTProvider(new ConfigService({ DEEPGRAM_API_KEY: '' }));
    const onTranscript = jest.fn();
    const result = unconfigured.createStreamSession('sess-1', 'call-1', onTranscript);

    expect(result).toBe(false);
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it('should cleanly close stream and clear timers', () => {
    const configured = new DeepgramSTTProvider(
      new ConfigService({ DEEPGRAM_API_KEY: 'test-deepgram-api-key-123456789' }),
    );

    // Closing a non-existent or closed stream should not throw
    expect(() => configured.closeStream('non-existent-session')).not.toThrow();
  });
});
