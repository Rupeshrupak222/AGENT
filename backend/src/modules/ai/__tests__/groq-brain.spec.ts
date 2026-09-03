import { ConfigService } from '@nestjs/config';
import { GroqAgentBrainService } from '../brain/groq-agent-brain.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GroqAgentBrainService', () => {
  let configService: ConfigService;
  let service: GroqAgentBrainService;

  beforeEach(() => {
    configService = new ConfigService({
      GROQ_API_KEY: 'test-groq-key-1234567890',
      GROQ_MODEL: 'openai/gpt-oss-120b',
    });
    service = new GroqAgentBrainService(configService);
    jest.clearAllMocks();
  });

  it('should detect when GROQ_API_KEY is configured', () => {
    expect(service.isConfigured).toBe(true);

    const empty = new GroqAgentBrainService(new ConfigService({ GROQ_API_KEY: '' }));
    expect(empty.isConfigured).toBe(false);
  });

  it('should return fallback turn when API key is unconfigured', async () => {
    const unconfigured = new GroqAgentBrainService(new ConfigService({ GROQ_API_KEY: '' }));
    const result = await unconfigured.generateResponse({
      sessionId: 'sess-1',
      callId: 'call-1',
      context: { tenantId: 't1', agentId: 'a1' },
      userMessage: 'Hello',
      history: [],
    });

    expect(result.responseText).toContain('AI assistant');
    expect(result.metadata?.configured).toBe(false);
  });

  it('should format prompt and return sanitized response from Groq API', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content: '<think>User said hello</think> **Hello!** How can I assist you today?',
            },
          },
        ],
        usage: { total_tokens: 35 },
      },
    });

    const result = await service.generateResponse({
      sessionId: 'sess-100',
      callId: 'call-100',
      context: {
        tenantId: 'tenant-acme',
        agentId: 'agent-sales',
        businessGoal: 'Book dental consultation',
      },
      userMessage: 'Hi there',
      history: [],
    });

    expect(result.responseText).toBe('Hello! How can I assist you today?');
    expect(result.suggestedAction).toBe('continue');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        model: 'openai/gpt-oss-120b',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Hi there' }),
        ]),
      }),
      expect.any(Object),
    );
  });

  it('should handle Groq API error gracefully without throwing', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Groq rate limit exceeded'));

    const result = await service.generateResponse({
      sessionId: 'sess-error',
      callId: 'call-error',
      context: { tenantId: 't1', agentId: 'a1' },
      userMessage: 'Test message',
      history: [],
    });

    expect(result.responseText).toContain('I apologize');
    expect(result.metadata?.error).toContain('rate limit');
  });
});
