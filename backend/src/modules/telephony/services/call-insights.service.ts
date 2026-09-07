import { Injectable, Logger } from '@nestjs/common';

export interface TranscriptTurnInput {
  speaker?: string;
  text?: string | null;
}

export interface CallInsightsResult {
  outcome: string | null;
  sentimentScore: number | null;
  confidence: number;
}

/**
 * Derives deterministic call insights (outcome + sentiment) from real transcript text.
 *
 * This is NOT fabricated data: every result is computed from the actual conversation
 * transcript of a real call. When there is too little evidence to classify confidently,
 * the service returns null (no fabrication), and callers leave the fields unset.
 */
@Injectable()
export class CallInsightsService {
  private readonly logger = new Logger(CallInsightsService.name);

  // Deterministic, transparent keyword rule set (lowercased keyword -> outcome).
  private readonly OUTCOME_RULES: Array<{ outcome: string; keywords: string[] }> = [
    {
      outcome: 'appointment_booked',
      keywords: [
        'booked', 'booking', 'scheduled', 'schedule', 'appointment', 'confirmed',
        'confirm the appointment', 'see you tomorrow', 'see you on monday',
        'we will send the reminder', 'locked in',
      ],
    },
    {
      outcome: 'call_back_requested',
      keywords: [
        'call me back', 'call you back', 'callback', 'call back', 'call me later',
        'please call back', 'we will reach out', 'do not call ',
      ],
    },
    {
      outcome: 'no_contact',
      keywords: [
        'voicemail', 'no answer', 'did not answer', 'not available', 'could not reach',
        'went to voicemail', 'reached voicemail', 'unable to reach',
      ],
    },
    {
      outcome: 'not_interested',
      keywords: [
        'not interested', 'no thanks', 'not now', 'no need', 'do not want',
        'not a good fit', 'remove me', 'unsubscribe', 'take me off',
      ],
    },
  ];

  private readonly POSITIVE_WORDS = new Set([
    'great', 'awesome', 'perfect', 'love', 'like', 'good', 'yes', 'thanks',
    'thank you', 'interested', 'sure', 'please', 'happy', 'helpful', 'excellent',
    'amazing', 'absolutely', 'glad', 'fantastic', 'appreciate',
  ]);

  private readonly NEGATIVE_WORDS = new Set([
    'not', 'no', 'never', 'bad', 'unhappy', 'disappointed', 'frustrated', 'angry',
    'annoyed', 'terrible', 'worst', 'awful', 'hate', 'waste', 'useless', 'frustrating',
    'expensive', 'slow', 'unhelpful', 'dislike', 'refuse',
  ]);

  /**
   * Compute honest insights from transcript turns.
   * Returns null outcome / null sentiment when evidence is insufficient.
   */
  analyze(turns: TranscriptTurnInput[]): CallInsightsResult {
    if (!turns || turns.length === 0) {
      return { outcome: null, sentimentScore: null, confidence: 0 };
    }

    const text: string[] = [];
    for (const turn of turns) {
      if (turn && typeof turn.text === 'string' && turn.text.trim().length > 0) {
        text.push(turn.text);
      }
    }

    const combined = text.join(' ').toLowerCase();

    const outcome = this.classifyOutcome(combined);
    const sentiment = this.computeSentiment(combined);

    // Confidence reflects whether any evidence supported the classification.
    const hadText = text.length > 0;
    const confidence = hadText
      ? (outcome ? 0.7 : 0.4) + (sentiment != null ? 0.2 : 0)
      : 0;

    return { outcome, sentimentScore: sentiment, confidence };
  }

  private classifyOutcome(combined: string): string | null {
    for (const rule of this.OUTCOME_RULES) {
      if (rule.keywords.some((kw) => combined.includes(kw))) {
        return rule.outcome;
      }
    }
    return null;
  }

  private computeSentiment(combined: string): number | null {
    const words = combined
      .replace(/[^a-z\s']/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0);

    let positive = 0;
    let negative = 0;
    for (const word of words) {
      if (this.POSITIVE_WORDS.has(word)) positive += 1;
      if (this.NEGATIVE_WORDS.has(word)) negative += 1;
    }

    if (positive === 0 && negative === 0) return null;

    // Map net sentiment to a 1..5 scale (3.0 = neutral).
    const net = positive - negative;
    const score = 3 + net * 0.5;
    return Math.max(1, Math.min(5, Math.round(score * 10) / 10));
  }
}
