import { z } from 'zod';

export const PostCallIntentEnum = z.enum([
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
]);
export type PostCallIntent = z.infer<typeof PostCallIntentEnum>;

export const PostCallSentimentEnum = z.enum([
  'positive',
  'neutral',
  'negative',
  'mixed',
  'unknown',
]);
export type PostCallSentiment = z.infer<typeof PostCallSentimentEnum>;

export const PostCallNextActionEnum = z.enum([
  'call_back',
  'send_information',
  'schedule_demo',
  'schedule_follow_up',
  'no_action',
  'mark_not_interested',
]);
export type PostCallNextAction = z.infer<typeof PostCallNextActionEnum>;

export const PostCallAnalysisResultSchema = z.object({
  summary: z.string().min(1),
  leadScore: z.number().int().min(0).max(100),
  intent: PostCallIntentEnum,
  sentiment: PostCallSentimentEnum,
  outcome: z.string().min(1),
  nextAction: PostCallNextActionEnum,
  qualification: z.object({
    qualified: z.boolean(),
    reasons: z.array(z.string()).default([]),
    metCriteria: z.array(z.string()).default([]),
    unmetCriteria: z.array(z.string()).default([]),
  }),
  appointment: z.object({
    detected: z.boolean(),
    details: z
      .object({
        topic: z.string().optional(),
        date: z.string().optional(),
        duration: z.number().optional(),
      })
      .nullable()
      .default(null),
  }),
});

export type PostCallAnalysisResult = z.infer<typeof PostCallAnalysisResultSchema>;

export interface PostCallAnalysisInput {
  callId: string;
  tenantId: string;
  duration?: number;
  transcript: string;
  agentContext?: {
    name?: string;
    businessGoal?: string;
    qualificationRules?: string;
    knowledgeBase?: string;
  };
  leadContext?: {
    name?: string;
    company?: string;
    designation?: string;
  };
  campaignContext?: {
    campaignId?: string;
    campaignName?: string;
  };
}

export interface PostCallIntelligenceProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  readonly modelName: string;
  analyze(input: PostCallAnalysisInput): Promise<PostCallAnalysisResult>;
}
