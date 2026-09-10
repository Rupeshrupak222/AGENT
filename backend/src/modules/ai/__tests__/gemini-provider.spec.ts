import { ConfigService } from '@nestjs/config';
import { GeminiPostCallProvider } from '../providers/gemini-post-call.provider';

describe('Gemini Post-Call Intelligence Provider', () => {
  let provider: GeminiPostCallProvider;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        if (key === 'GEMINI_MODEL') return 'gemini-1.5-flash';
        return defaultVal;
      }),
    } as any;

    provider = new GeminiPostCallProvider(configService);
  });

  it('should report isConfigured false when GEMINI_API_KEY is not set', () => {
    expect(provider.isConfigured).toBe(false);
    expect(provider.modelName).toBe('heuristic-mock');
  });

  it('should analyze synthetic interested transcript with agent qualification grounding in dev mode', async () => {
    const syntheticTranscript = `
AI Agent: Hello Alex, I am calling from AgentCall AI regarding your inquiry about automated outbound voice agents.
Caller: Hi! Yes, we have 50 telecallers right now and we are looking for a voice AI solution. Can we schedule a demo tomorrow afternoon?
AI Agent: Absolutely. I have booked that for tomorrow at 2 PM.
Caller: Sounds great, thank you!
`;

    const result = await provider.analyze({
      callId: 'call-syn-1',
      tenantId: 'tenant-1',
      transcript: syntheticTranscript,
      agentContext: {
        name: 'SDR Agent',
        businessGoal: 'Qualify sales opportunities',
        qualificationRules: 'Must have at least 10 agents and express demo interest',
      },
      leadContext: {
        name: 'Alex Mercer',
        company: 'Apex BPO Services',
      },
    });

    expect(result.leadScore).toBeGreaterThanOrEqual(70);
    expect(['demo_request', 'appointment']).toContain(result.intent);
    expect(result.sentiment).toBe('positive');
    expect(result.qualification.qualified).toBe(true);
    expect(result.appointment.detected).toBe(true);
    expect(result.nextAction).toBe('schedule_demo');
  });

  it('should correctly classify disinterested or negative prospect transcript', async () => {
    const negativeTranscript = `
AI Agent: Hi, this is AgentCall AI.
Caller: I am not interested at all. Please do not call this number again.
`;

    const result = await provider.analyze({
      callId: 'call-syn-2',
      tenantId: 'tenant-1',
      transcript: negativeTranscript,
      agentContext: {
        businessGoal: 'Outbound sales',
      },
      leadContext: {
        name: 'Unhappy Caller',
      },
    });

    expect(result.leadScore).toBeLessThanOrEqual(30);
    expect(result.intent).toBe('not_interested');
    expect(result.sentiment).toBe('negative');
    expect(result.qualification.qualified).toBe(false);
    expect(result.appointment.detected).toBe(false);
    expect(result.nextAction).toBe('mark_not_interested');
  });

  it('should truncate extremely long transcripts to prevent token explosion', async () => {
    const longTurn = 'The customer explained in extensive detail their operational workflow. '.repeat(500); // ~35,000 chars

    const result = await provider.analyze({
      callId: 'call-long-1',
      tenantId: 'tenant-1',
      transcript: longTurn,
    });

    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
  });
});
