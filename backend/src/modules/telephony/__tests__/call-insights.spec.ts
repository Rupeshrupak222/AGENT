import { CallInsightsService } from '../services/call-insights.service';

describe('CallInsightsService', () => {
  let service: CallInsightsService;

  beforeEach(() => {
    service = new CallInsightsService();
  });

  it('should return null insights for empty transcripts (no fabrication)', () => {
    const result = service.analyze([]);
    expect(result.outcome).toBeNull();
    expect(result.sentimentScore).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('should return null insights for transcripts with only whitespace', () => {
    const result = service.analyze([{ speaker: 'user', text: '   ' }]);
    expect(result.outcome).toBeNull();
    expect(result.sentimentScore).toBeNull();
  });

  it('should classify an appointment_booked outcome from a real booking conversation', () => {
    const result = service.analyze([
      { speaker: 'agent', text: 'Shall I book you in for tomorrow at 2pm?' },
      { speaker: 'user', text: 'Yes please, please confirm the appointment.' },
      { speaker: 'agent', text: 'Your appointment is confirmed for tomorrow.' },
    ]);
    expect(result.outcome).toBe('appointment_booked');
    expect(result.sentimentScore).not.toBeNull();
  });

  it('should classify a call_back_requested outcome', () => {
    const result = service.analyze([
      { speaker: 'user', text: 'I am busy right now, could you call me back later?' },
    ]);
    expect(result.outcome).toBe('call_back_requested');
  });

  it('should classify not_interested outcome', () => {
    const result = service.analyze([
      { speaker: 'user', text: 'No thanks, I am not interested.' },
    ]);
    expect(result.outcome).toBe('not_interested');
    expect(result.sentimentScore).not.toBeNull();
  });

  it('should produce a positive sentiment score for a positive conversation', () => {
    const result = service.analyze([
      { speaker: 'user', text: 'Great, that is perfect, thank you so much!' },
    ]);
    expect(result.sentimentScore).toBeGreaterThan(3);
  });

  it('should produce a negative sentiment score for a negative conversation', () => {
    const result = service.analyze([
      { speaker: 'user', text: 'This is terrible, I hate this, so frustrated.' },
    ]);
    expect(result.sentimentScore).not.toBeNull();
    expect(result.sentimentScore).toBeLessThan(3);
  });

  it('should return null sentiment when there is no sentiment-bearing vocabulary', () => {
    const result = service.analyze([
      { speaker: 'user', text: 'hello accounting department regarding invoice ninety two' },
    ]);
    expect(result.sentimentScore).toBeNull();
  });

  it('should clamp sentiment to the 1..5 range', () => {
    const result = service.analyze([
      {
        speaker: 'user',
        text: 'awesome great perfect amazing excellent fantastic absolutely love delighted wonderful brilliant superb',
      },
    ]);
    expect(result.sentimentScore!).toBeGreaterThanOrEqual(1);
    expect(result.sentimentScore!).toBeLessThanOrEqual(5);
  });
});
