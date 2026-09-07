import {
  PostCallAnalysisResultSchema,
  PostCallIntentEnum,
  PostCallSentimentEnum,
  PostCallNextActionEnum,
} from '../interfaces/post-call.interface';

describe('Post-Call AI Intelligence Schema & Business Rule Enforcement', () => {
  it('should validate structured AI response with Zod schema', () => {
    const validData = {
      summary: 'Prospect James Wilson requested enterprise pricing and agreed to schedule a demo tomorrow.',
      leadScore: 88,
      intent: 'demo_request',
      sentiment: 'positive',
      outcome: 'demo_scheduled',
      nextAction: 'schedule_demo',
      qualification: {
        qualified: true,
        reasons: ['Strong budget match', 'Director-level decision maker'],
        metCriteria: ['Budget', 'Authority', 'Need'],
        unmetCriteria: [],
      },
      appointment: {
        detected: true,
        details: {
          topic: 'Platform Architecture Demo',
          date: 'Tomorrow 2:00 PM EST',
          duration: 30,
        },
      },
    };

    const parsed = PostCallAnalysisResultSchema.parse(validData);
    expect(parsed.leadScore).toBe(88);
    expect(parsed.intent).toBe('demo_request');
    expect(parsed.qualification.qualified).toBe(true);
    expect(parsed.appointment.detected).toBe(true);
  });

  it('should reject lead score outside bounds (negative or greater than 100)', () => {
    const invalidNegative = {
      summary: 'Bad call',
      leadScore: -15,
      intent: 'not_interested',
      sentiment: 'negative',
      outcome: 'disqualified',
      nextAction: 'no_action',
      qualification: { qualified: false, reasons: [], metCriteria: [], unmetCriteria: [] },
      appointment: { detected: false, details: null },
    };

    expect(() => PostCallAnalysisResultSchema.parse(invalidNegative)).toThrow();

    const invalidOver100 = {
      ...invalidNegative,
      leadScore: 105,
    };
    expect(() => PostCallAnalysisResultSchema.parse(invalidOver100)).toThrow();
  });

  it('should reject uncontrolled intent labels outside taxonomy', () => {
    const invalidIntent = {
      summary: 'Call summary',
      leadScore: 50,
      intent: 'arbitrary_invented_intent_label',
      sentiment: 'neutral',
      outcome: 'interested',
      nextAction: 'call_back',
      qualification: { qualified: false, reasons: [], metCriteria: [], unmetCriteria: [] },
      appointment: { detected: false, details: null },
    };

    expect(() => PostCallAnalysisResultSchema.parse(invalidIntent)).toThrow();
  });

  it('should support all standard taxonomy enums', () => {
    expect(PostCallIntentEnum.safeParse('interested').success).toBe(true);
    expect(PostCallIntentEnum.safeParse('pricing').success).toBe(true);
    expect(PostCallIntentEnum.safeParse('appointment').success).toBe(true);
    expect(PostCallSentimentEnum.safeParse('positive').success).toBe(true);
    expect(PostCallSentimentEnum.safeParse('mixed').success).toBe(true);
    expect(PostCallNextActionEnum.safeParse('schedule_demo').success).toBe(true);
  });
});
