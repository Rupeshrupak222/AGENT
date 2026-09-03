import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  AgentBrain,
  AgentTurnInput,
  AgentTurnOutput,
} from '../../telephony/interfaces/agent-brain.interface';

@Injectable()
export class GroqAgentBrainService implements AgentBrain {
  private readonly logger = new Logger(GroqAgentBrainService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://api.groq.com/openai/v1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GROQ_API_KEY', '');
    this.model = this.configService.get<string>('GROQ_MODEL', 'openai/gpt-oss-120b');
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  /**
   * Generates conversational AI turn response using Groq LLM.
   */
  async generateResponse(input: AgentTurnInput): Promise<AgentTurnOutput> {
    const startTime = Date.now();

    if (!this.isConfigured) {
      this.logger.warn('Groq API key not configured. Returning unconfigured fallback turn.');
      return {
        responseText: 'Hello! I am your AI assistant. How may I assist you today?',
        latencyMs: Date.now() - startTime,
        metadata: { provider: 'groq', configured: false },
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
          max_tokens: 250,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
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
        responseText: cleanedText || 'I understand. How else can I help you today?',
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
      this.logger.error(`Groq AgentBrain error: ${errorMsg}`);

      return {
        responseText: 'I apologize, could you please repeat that? I am listening.',
        suggestedAction: 'continue',
        latencyMs,
        metadata: { provider: 'groq', error: errorMsg },
      };
    }
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
