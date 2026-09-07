import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  PostCallAnalysisInput,
  PostCallAnalysisResult,
  PostCallAnalysisResultSchema,
  PostCallIntelligenceProvider,
} from '../interfaces/post-call.interface';

@Injectable()
export class GeminiPostCallProvider implements PostCallIntelligenceProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiPostCallProvider.name);

  private readonly apiKey: string;
  readonly modelName: string;
  private readonly maxTranscriptChars = 16000;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    this.modelName = this.configService.get<string>('GEMINI_MODEL', 'gemini-1.5-flash');

    if (this.isConfigured) {
      this.logger.log(`Gemini Post-Call Provider initialized with model [${this.modelName}]`);
    } else {
      this.logger.warn(
        'GEMINI_API_KEY is unconfigured. Operating in safe offline mock intelligence mode.',
      );
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Analyzes completed call transcript with agent qualification rules and returns structured insights.
   */
  async analyze(input: PostCallAnalysisInput): Promise<PostCallAnalysisResult> {
    const truncatedTranscript = this.truncateTranscript(input.transcript);

    if (this.isConfigured) {
      try {
        return await this.callGeminiApi(input, truncatedTranscript);
      } catch (err: any) {
        this.logger.error(`Gemini live API analysis failed for call ${input.callId}: ${err.message}`);
        throw err;
      }
    }

    // Offline / Mock fallback execution for dev & testing environments
    return this.generateMockAnalysis(input, truncatedTranscript);
  }

  private async callGeminiApi(
    input: PostCallAnalysisInput,
    transcriptText: string,
  ): Promise<PostCallAnalysisResult> {
    const prompt = this.buildPrompt(input, transcriptText);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    };

    const res = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000,
    });

    const candidates = res.data?.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No completion candidates returned from Gemini API');
    }

    const rawText = candidates[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Empty text content in Gemini response');
    }

    const parsedJson = JSON.parse(rawText);
    return this.validateAndNormalize(parsedJson);
  }

  /**
   * Constructs prompt enforcing data minimization and agent qualification rule auditing.
   */
  private buildPrompt(input: PostCallAnalysisInput, transcriptText: string): string {
    const agent = input.agentContext || {};
    const lead = input.leadContext || {};

    return `You are an elite post-call business intelligence and QA analysis system for an enterprise voice AI platform.
Analyze the following completed telephony call transcript and return a structured JSON response conforming strictly to the requested schema.

=== AGENT BUSINESS CONTEXT ===
Agent Role / Name: ${agent.name || 'AI Voice Agent'}
Business Goal: ${agent.businessGoal || 'Qualify prospect and schedule demo'}
Qualification Rules: ${agent.qualificationRules || 'Prospect shows interest, has budget/authority, and agrees to next steps.'}
Knowledge Base: ${agent.knowledgeBase || 'Enterprise voice AI telephony services.'}

=== PROSPECT CONTEXT ===
Name: ${lead.name || 'Prospect'}
Company: ${lead.company || 'Unknown'}
Designation: ${lead.designation || 'Unknown'}

=== CALL CONVERSATION TRANSCRIPT ===
${transcriptText}

=== OUTPUT REQUIREMENTS ===
You must output a single JSON object with EXACTLY these fields:
{
  "summary": "Concise 2-3 sentence executive summary of the conversation.",
  "leadScore": <Integer between 0 and 100 representing lead qualification score>,
  "intent": <One of: "interested", "not_interested", "request_information", "pricing", "demo_request", "appointment", "follow_up", "qualified", "unqualified", "unknown">,
  "sentiment": <One of: "positive", "neutral", "negative", "mixed", "unknown">,
  "outcome": <One of: "interested", "demo_scheduled", "callback_requested", "disqualified", "busy", "wrong_number">,
  "nextAction": <One of: "call_back", "send_information", "schedule_demo", "schedule_follow_up", "no_action", "mark_not_interested">,
  "qualification": {
    "qualified": <true or false based on Agent Qualification Rules>,
    "reasons": [<Brief explanations of qualification outcome>],
    "metCriteria": [<Specific criteria met>],
    "unmetCriteria": [<Specific criteria failed or missing>]
  },
  "appointment": {
    "detected": <true if the lead agreed to an appointment/demo with a date or timeframe, else false>,
    "details": {
      "topic": <Appointment topic or null>,
      "date": <Mentioned date/time or null>,
      "duration": <Duration in minutes, default 30, or null>
    }
  }
}
Output strictly valid JSON. Do not include markdown code block tags or extra commentary.`;
  }

  /**
   * Validates model-generated JSON using Zod with defensive defaults.
   */
  private validateAndNormalize(raw: any): PostCallAnalysisResult {
    // Ensure bounds before Zod
    if (typeof raw.leadScore === 'number') {
      raw.leadScore = Math.max(0, Math.min(100, Math.round(raw.leadScore)));
    } else {
      raw.leadScore = 50;
    }

    // Default nested structures if missing
    if (!raw.qualification || typeof raw.qualification !== 'object') {
      raw.qualification = { qualified: false, reasons: [], metCriteria: [], unmetCriteria: [] };
    }
    if (!raw.appointment || typeof raw.appointment !== 'object') {
      raw.appointment = { detected: false, details: null };
    }

    return PostCallAnalysisResultSchema.parse(raw);
  }

  /**
   * Truncates long transcripts to prevent token explosion.
   */
  private truncateTranscript(transcript: string): string {
    if (!transcript) return '';
    if (transcript.length <= this.maxTranscriptChars) return transcript;

    const half = Math.floor(this.maxTranscriptChars / 2);
    const start = transcript.slice(0, half);
    const end = transcript.slice(-half);
    return `${start}\n\n[... Transcript truncated for token optimization (${transcript.length - this.maxTranscriptChars} characters omitted) ...]\n\n${end}`;
  }

  /**
   * Deterministic mock post-call analysis for dev and unit tests when Gemini API is unconfigured.
   */
  private generateMockAnalysis(
    input: PostCallAnalysisInput,
    transcriptText: string,
  ): PostCallAnalysisResult {
    const textLower = transcriptText.toLowerCase();

    const isInterested =
      textLower.includes('interested') ||
      textLower.includes('demo') ||
      textLower.includes('yes') ||
      textLower.includes('schedule') ||
      textLower.includes('sounds good');

    const isNotInterested =
      textLower.includes('not interested') ||
      textLower.includes('do not call') ||
      textLower.includes('wrong number') ||
      textLower.includes('busy');

    const hasAppointment =
      textLower.includes('tomorrow') ||
      textLower.includes('schedule') ||
      textLower.includes('afternoon') ||
      textLower.includes('meeting') ||
      textLower.includes('calendar');

    let leadScore = 50;
    let intent: any = 'request_information';
    let sentiment: any = 'neutral';
    let outcome = 'callback_requested';
    let nextAction: any = 'send_information';
    let qualified = false;

    if (isNotInterested) {
      leadScore = 15;
      intent = 'not_interested';
      sentiment = 'negative';
      outcome = 'disqualified';
      nextAction = 'mark_not_interested';
      qualified = false;
    } else if (isInterested) {
      leadScore = 85;
      intent = hasAppointment ? 'appointment' : 'demo_request';
      sentiment = 'positive';
      outcome = hasAppointment ? 'demo_scheduled' : 'interested';
      nextAction = hasAppointment ? 'schedule_demo' : 'send_information';
      qualified = true;
    }

    return {
      summary: `Prospect ${input.leadContext?.name || 'Caller'} discussed ${input.agentContext?.businessGoal || 'offer'}. ${isInterested ? 'Prospect expressed strong interest in a demonstration.' : 'Conversation completed.'}`,
      leadScore,
      intent,
      sentiment,
      outcome,
      nextAction,
      qualification: {
        qualified,
        reasons: [
          qualified
            ? 'Prospect exhibited high engagement and confirmed problem fit.'
            : 'Prospect did not meet qualification criteria during call.',
        ],
        metCriteria: qualified ? ['Interest confirmed', 'Decision maker contact'] : [],
        unmetCriteria: qualified ? [] : ['Budget not validated', 'Timeline unconfirmed'],
      },
      appointment: {
        detected: hasAppointment,
        details: hasAppointment
          ? {
              topic: 'Product Demo & Architecture Walkthrough',
              date: 'Tomorrow afternoon',
              duration: 30,
            }
          : null,
      },
    };
  }
}
