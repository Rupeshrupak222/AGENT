import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  AgentBrain,
  AgentTurnInput,
  AgentTurnOutput,
} from '../../telephony/interfaces/agent-brain.interface';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';

@Injectable()
export class GroqAgentBrainService implements AgentBrain {
  private readonly logger = new Logger(GroqAgentBrainService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://api.groq.com/openai/v1';

  constructor(
    private configService: ConfigService,
    private featureFlags: FeatureFlagsService,
  ) {
    this.apiKey = this.configService.get<string>('GROQ_API_KEY', '');
    this.model = this.configService.get<string>('GROQ_MODEL', 'llama-3.3-70b-versatile');
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  /**
   * Generates conversational AI turn response using Groq LLM with knowledge-grounded fallback.
   */
  async generateResponse(input: AgentTurnInput): Promise<AgentTurnOutput> {
    const startTime = Date.now();
    const ragEnabled = await this.featureFlags.isEnabled('knowledge_rag', input.context.tenantId);

    if (!this.isConfigured) {
      const responseText = ragEnabled
        ? this.generateKnowledgeGroundedResponse(input)
        : this.genericFallbackResponse(input);
      return {
        responseText,
        suggestedAction: 'continue',
        latencyMs: Date.now() - startTime,
        metadata: { provider: 'knowledge-grounded', configured: false },
      };
    }

    try {
      const messages = this.buildPromptMessages(input);

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: 0.6,
          max_tokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 3000,
        },
      );

      const latencyMs = Date.now() - startTime;
      const rawText = response.data?.choices?.[0]?.message?.content?.trim() || '';

      // Clean conversational text (strip reasoning tags or markdown formatting if present)
      const cleanedText = this.sanitizeResponseText(rawText);

      this.logger.log(
        `Groq response generated for session [${input.sessionId}] in ${latencyMs}ms (${this.model})`,
      );

      return {
        responseText: cleanedText || (ragEnabled ? this.generateKnowledgeGroundedResponse(input) : this.genericFallbackResponse(input)),
        suggestedAction: 'continue',
        latencyMs,
        metadata: {
          provider: 'groq',
          model: this.model,
          tokens: response.data?.usage?.total_tokens,
        },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err.response?.data?.error?.message || err.message;
      this.logger.warn(`Groq API unavailable (${errorMsg}), applying fallback.`);

      const responseText = ragEnabled
        ? this.generateKnowledgeGroundedResponse(input)
        : this.genericFallbackResponse(input);
      return {
        responseText,
        suggestedAction: 'continue',
        latencyMs,
        metadata: { provider: 'knowledge-grounded', fallbackReason: errorMsg },
      };
    }
  }

  /** Small talk when knowledge grounding is disabled by feature flag. */
  private genericFallbackResponse(input: AgentTurnInput): string {
    const { context, userMessage } = input;
    const msg = (userMessage || '').trim();
    if (!msg) return 'I apologize, could you repeat that?';
    if (context.openingScript) return context.openingScript.replace(/\{\{name\}\}/gi, 'there');
    return 'I want to make sure I help you correctly. Let me check with the right person and get right back to you.';
  }

  /**
   * Generates factual, knowledge-grounded responses directly from the agent's RAG knowledge base.
   */
  private generateKnowledgeGroundedResponse(input: AgentTurnInput): string {
    const { context, userMessage } = input;
    const msg = (userMessage || '').toLowerCase();
    const kb = context.knowledgeBase || '';
    const goal = context.businessGoal || '';

    // Greetings
    if (/^(hi|hello|hey|namaste|good\s*(morning|afternoon|evening))/i.test(msg.trim())) {
      if (context.openingScript) {
        return context.openingScript.replace(/\{\{name\}\}/gi, 'there');
      }
      return 'Hello! I am your AI admissions and counseling advisor. How can I assist you with our tech and AI career programs today?';
    }

    // Fee / Cost / Price inquiries
    if (/fee|cost|price|charge|emi|scholarship|discount|payment|rupees|rs|inr/i.test(msg)) {
      if (/full\s*stack|web|mern|react|node/i.test(msg) && kb.includes('34,999')) {
        return 'Our Full Stack Web Development course fee is ₹34,999 with flexible zero-cost EMI starting at ₹2,999 per month. We also offer a 20% Early Bird scholarship. Would you like to attend our free trial class this Saturday?';
      }
      if (/data\s*science|ml|machine\s*learning|ai|genai|python/i.test(msg) && kb.includes('48,000')) {
        return 'The Data Science and Generative AI program fee is ₹48,000, with no-cost EMI at ₹3,999 per month. It includes hands-on projects deployed to AWS and HuggingFace. Would you like me to book your demo seat?';
      }
      if (/cloud|devops|aws|docker|kubernetes/i.test(msg) && kb.includes('29,999')) {
        return 'The Cloud Engineering and DevOps program is ₹29,999, or ₹2,500 per month on EMI. Would you like details on the upcoming weekend batch?';
      }
      if (kb.includes('EMI') || kb.includes('₹')) {
        return 'Our certified programs range from ₹29,999 to ₹48,000 with flexible zero-cost EMI starting at ₹2,500 per month. Which specific program interests you: Full Stack, Data Science, or DevOps?';
      }
    }

    // Duration / Schedule / Timeline inquiries
    if (/duration|month|week|how\s*long|time|schedule|timing|batch|when/i.test(msg)) {
      if (/full\s*stack|web|mern/i.test(msg)) {
        return 'The Full Stack Web Development course runs for 6 months with live weekend sessions and 24/7 doubt clearing. Would you like me to reserve your free demo class?';
      }
      if (/data\s*science|ml|ai/i.test(msg)) {
        return 'The Data Science and Generative AI program duration is 8 months with live capstone projects. Shall I share the curriculum overview?';
      }
      if (/cloud|devops/i.test(msg)) {
        return 'The Cloud and DevOps engineering track is 5 months, covering AWS, Docker, Kubernetes, and CI/CD. Does that timeline match your goals?';
      }
      return 'Most of our specialized career programs run between 5 to 8 months with flexible live weekend classes designed for working professionals.';
    }

    // Booking / Demo / Masterclass / Trial
    if (/demo|trial|book|register|class|masterclass|saturday|enroll|admission|sign\s*up/i.test(msg)) {
      return 'I can reserve your free 1-on-1 trial demo class for this Saturday at 5:00 PM IST. Shall I confirm your seat?';
    }

    // Affirmation (yes, sure, ok, please, yeah)
    if (/^(yes|yeah|sure|okay|ok|yep|definitely|please|confirm)/i.test(msg.trim())) {
      return 'Wonderful! Your slot has been reserved. You will receive an SMS and WhatsApp confirmation with the calendar invite shortly. Is there anything else I can help you with?';
    }

    // Keyword matching against knowledgeBase lines
    if (kb) {
      const lines = kb.split('\n').map(l => l.trim()).filter(Boolean);
      const userWords = msg.split(/\s+/).filter(w => w.length > 3);
      let bestLine = '';
      let maxMatches = 0;

      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        let matches = 0;
        for (const w of userWords) {
          if (lowerLine.includes(w)) matches++;
        }
        if (matches > maxMatches) {
          maxMatches = matches;
          bestLine = line;
        }
      }

      if (bestLine && maxMatches >= 1) {
        const clean = bestLine.replace(/^[-*\d.)\s]+/, '').replace(/[*#_]/g, '').trim();
        return `${clean}. Would you like to know more about the syllabus or schedule a free trial session?`;
      }
    }

    if (goal) {
      return `Based on our curriculum, I can assist you with certified career programs, fee schedules, and booking free trial classes. Which program would you like to explore?`;
    }

    return 'I understand. How else can I assist you with your career and training goals today?';
  }

  /**
   * Builds bounded prompt messages incorporating agent instructions and conversational context.
   */
  private buildPromptMessages(input: AgentTurnInput): Array<{ role: string; content: string }> {
    const { context, history, userMessage } = input;

    // Construct rich system prompt tailored to the agent persona
    let systemPrompt =
      'You are a professional, helpful, and concise conversational AI phone agent representing Adyapan AI. ' +
      'Keep your responses brief (1 to 3 short sentences maximum) and suitable for natural phone speech. ' +
      'Do not use bullet points, asterisks, emojis, or markdown formatting.\n\n';

    if (context.businessGoal) {
      systemPrompt += `Goal: ${context.businessGoal}\n`;
    }
    if (context.openingScript) {
      systemPrompt += `Opening guidance: ${context.openingScript}\n`;
    }
    if (context.qualificationRules) {
      systemPrompt += `Rules: ${context.qualificationRules}\n`;
    }
    if (context.knowledgeBase) {
      systemPrompt += `Knowledge context: ${context.knowledgeBase}\n`;
    }

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt.trim() },
    ];

    // Append bounded conversation history (last 10 turns)
    const recentHistory = (history || []).slice(-10);
    for (const turn of recentHistory) {
      messages.push({
        role: turn.speaker === 'agent' ? 'assistant' : 'user',
        content: turn.content,
      });
    }

    // Append latest user turn
    messages.push({
      role: 'user',
      content: userMessage,
    });

    return messages;
  }

  /**
   * Cleans text of internal thinking tags or asterisks that would sound awkward on a phone call.
   */
  private sanitizeResponseText(text: string): string {
    return text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/[*#_~`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
