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

  private readonly geminiApiKey: string;
  readonly geminiModelName: string;
  private readonly groqApiKey: string;
  readonly groqModelName: string;
  private readonly maxTranscriptChars = 16000;

  constructor(private readonly configService: ConfigService) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    this.geminiModelName = this.configService.get<string>('GEMINI_MODEL', 'gemini-1.5-flash');
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY', '');
    this.groqModelName = this.configService.get<string>('GROQ_MODEL', 'openai/gpt-oss-20b');

    if (this.isGeminiConfigured) {
      this.logger.log(`Gemini Post-Call Provider initialized with model [${this.geminiModelName}]`);
    } else if (this.isGroqConfigured) {
      this.logger.log(`Groq LPU Post-Call Provider initialized with model [${this.groqModelName}]`);
    } else {
      this.logger.warn(
        'Neither GEMINI_API_KEY nor GROQ_API_KEY is configured. Operating in safe offline mock intelligence mode.',
      );
    }
  }

  get modelName(): string {
    if (this.isGeminiConfigured) return this.geminiModelName;
    if (this.isGroqConfigured) return this.groqModelName;
    return 'heuristic-mock';
  }

  get isGeminiConfigured(): boolean {
    return Boolean(this.geminiApiKey && this.geminiApiKey.trim().length > 0);
  }

  get isGroqConfigured(): boolean {
    return Boolean(this.groqApiKey && this.groqApiKey.trim().length > 0);
  }

  get isConfigured(): boolean {
    return this.isGeminiConfigured || this.isGroqConfigured;
  }

  /**
   * Analyzes completed call transcript with agent qualification rules and returns structured insights.
   */
  async analyze(input: PostCallAnalysisInput): Promise<PostCallAnalysisResult> {
    const truncatedTranscript = this.truncateTranscript(input.transcript);

    if (this.isGeminiConfigured) {
      try {
        return await this.callGeminiApi(input, truncatedTranscript);
      } catch (err: any) {
        this.logger.warn(`Gemini live API analysis failed for call ${input.callId}: ${err.message}. Trying Groq...`);
      }
    }

    if (this.isGroqConfigured) {
      try {
        return await this.callGroqApi(input, truncatedTranscript);
      } catch (err: any) {
        this.logger.warn(`Groq live API analysis failed for call ${input.callId}: ${err.message}. Falling back to heuristic...`);
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModelName}:generateContent?key=${this.geminiApiKey}`;

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

  private async callGroqApi(
    input: PostCallAnalysisInput,
    transcriptText: string,
  ): Promise<PostCallAnalysisResult> {
    const prompt = this.buildPrompt(input, transcriptText);

    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: this.groqModelName,
        messages: [
          {
            role: 'system',
            content:
              'You are an elite post-call business intelligence and QA analysis system for an enterprise voice AI platform. You must output strictly valid JSON conforming to the requested schema.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      },
    );

    const content = res.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Groq API');
    }

    const parsedJson = JSON.parse(content);
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
      "date": <Mentioned date/time e.g. "next Monday at 3pm" or ISO string or null>,
      "duration": <Duration in minutes, default 30>
    }
  }
}
Output strictly valid JSON. Do not include markdown code block tags or extra commentary.`;
  }

  /**
   * Validates model-generated JSON using Zod with defensive defaults and casing normalization.
   */
  private validateAndNormalize(raw: any): PostCallAnalysisResult {
    // 1. Lead score normalization
    let leadScore = 50;
    if (typeof raw.leadScore === 'number') {
      leadScore = raw.leadScore <= 10 && raw.leadScore > 0 ? raw.leadScore * 10 : raw.leadScore;
      leadScore = Math.max(0, Math.min(100, Math.round(leadScore)));
    }

    // 2. Intent normalization
    const validIntents = [
      'interested',
      'not_interested',
      'request_information',
      'pricing',
      'demo_request',
      'appointment',
      'follow_up',
      'qualified',
      'unqualified',
      'unknown',
    ];
    let rawIntent = String(raw.intent || '').toLowerCase().replace(/[\s-]+/g, '_');
    if (rawIntent.includes('demo') || rawIntent.includes('book')) rawIntent = 'demo_request';
    if (!validIntents.includes(rawIntent)) {
      rawIntent = raw.qualification?.qualified ? 'qualified' : 'request_information';
    }

    // 3. Sentiment normalization
    const validSentiments = ['positive', 'neutral', 'negative', 'mixed', 'unknown'];
    let rawSentiment = String(raw.sentiment || '').toLowerCase().trim();
    if (!validSentiments.includes(rawSentiment)) {
      rawSentiment = 'neutral';
    }

    // 4. Next action normalization
    const validActions = [
      'call_back',
      'send_information',
      'schedule_demo',
      'schedule_follow_up',
      'no_action',
      'mark_not_interested',
    ];
    let rawNextAction = String(raw.nextAction || '').toLowerCase().replace(/[\s-]+/g, '_');
    if (rawNextAction.includes('invite') || rawNextAction.includes('demo')) rawNextAction = 'schedule_demo';
    if (rawNextAction.includes('follow')) rawNextAction = 'schedule_follow_up';
    if (rawNextAction.includes('call')) rawNextAction = 'call_back';
    if (rawNextAction.includes('info') || rawNextAction.includes('email')) rawNextAction = 'send_information';
    if (!validActions.includes(rawNextAction)) {
      rawNextAction = 'schedule_demo';
    }

    // 5. Qualification normalization
    const qualification = {
      qualified: Boolean(raw.qualification?.qualified ?? (leadScore >= 60)),
      reasons: Array.isArray(raw.qualification?.reasons) ? raw.qualification.reasons.map(String) : [],
      metCriteria: Array.isArray(raw.qualification?.metCriteria) ? raw.qualification.metCriteria.map(String) : [],
      unmetCriteria: Array.isArray(raw.qualification?.unmetCriteria) ? raw.qualification.unmetCriteria.map(String) : [],
    };

    // 6. Appointment normalization
    let appointment = { detected: false, details: null as any };
    if (raw.appointment && typeof raw.appointment === 'object') {
      const detected = Boolean(raw.appointment.detected);
      let details = null;
      if (detected && raw.appointment.details) {
        const rawDur = raw.appointment.details.duration;
        const durNum = typeof rawDur === 'number' ? rawDur : parseInt(String(rawDur || '30'), 10) || 30;
        details = {
          topic: raw.appointment.details.topic ? String(raw.appointment.details.topic) : 'Consultation Call',
          date: raw.appointment.details.date ? String(raw.appointment.details.date) : undefined,
          duration: durNum,
        };
      }
      appointment = { detected, details };
    }

    const normalized = {
      summary: String(raw.summary || 'Call completed successfully.'),
      leadScore,
      intent: rawIntent as any,
      sentiment: rawSentiment as any,
      outcome: String(raw.outcome || (appointment.detected ? 'appointment_scheduled' : 'interested')),
      nextAction: rawNextAction as any,
      qualification,
      appointment,
    };

    return PostCallAnalysisResultSchema.parse(normalized);
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
