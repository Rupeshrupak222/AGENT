export interface ConversationTurn {
  speaker: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
}

export interface AgentContext {
  tenantId: string;
  agentId: string;
  leadId?: string;
  businessGoal?: string;
  openingScript?: string;
  qualificationRules?: string;
  knowledgeBase?: string;
}

export interface AgentTurnInput {
  sessionId: string;
  callId: string;
  context: AgentContext;
  userMessage: string;
  history: ConversationTurn[];
}

export interface AgentTurnOutput {
  responseText: string;
  suggestedAction?: 'continue' | 'transfer' | 'hangup';
  transferDestination?: string;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentBrain {
  generateResponse(input: AgentTurnInput): Promise<AgentTurnOutput>;
}
