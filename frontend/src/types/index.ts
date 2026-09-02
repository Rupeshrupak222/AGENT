// ──────────────────────────────────────────
// Core shared types for AgentCall AI frontend
// ──────────────────────────────────────────

export type Role = "super_admin" | "company_admin" | "manager" | "agent" | "viewer";

export type PlanType = "starter" | "growth" | "business" | "enterprise";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  plan: PlanType;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  tenantId: string;
  createdAt: string;
}

// ── Agent ──────────────────────────────────
export type AgentRole =
  | "telecaller" | "recruiter" | "receptionist"
  | "collection" | "sales" | "support" | "appointment_setter";

export type AgentStatus = "active" | "paused" | "training" | "draft";

export type Language =
  | "hindi" | "english" | "hinglish" | "tamil"
  | "telugu" | "marathi" | "bengali" | "gujarati"
  | "kannada" | "punjabi";

export interface AIAgent {
  id: string;
  name: string;
  role: AgentRole;
  language: Language;
  voice: string;
  businessGoal: string;
  status: AgentStatus;
  callsToday: number;
  callsTotal: number;
  conversionRate: number;
  avgCallDuration: number;
  createdAt: string;
}

// ── Lead / CRM ─────────────────────────────
export type LeadStatus =
  | "new" | "contacted" | "interested" | "qualified"
  | "appointment" | "closed_won" | "closed_lost";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  status: LeadStatus;
  score: number;
  assignedAgent?: string;
  assignedTo?: string;
  notes?: string;
  lastContact?: string;
  createdAt: string;
}

// ── Call ───────────────────────────────────
export type CallStatus = "queued" | "ringing" | "in_progress" | "completed" | "failed" | "missed";
export type CallDirection = "inbound" | "outbound";

export interface Call {
  id: string;
  leadId: string;
  leadName: string;
  agentId: string;
  agentName: string;
  direction: CallDirection;
  status: CallStatus;
  duration: number;
  recordingUrl?: string;
  transcript?: string;
  sentimentScore?: number;
  qualityScore?: number;
  outcome?: string;
  startedAt: string;
  endedAt?: string;
}

// ── Analytics ─────────────────────────────
export interface DailyMetric {
  date: string;
  calls: number;
  connected: number;
  qualified: number;
  conversions: number;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  calls: number;
  conversionRate: number;
  avgDuration: number;
  sentimentAvg: number;
}

// ── Billing ────────────────────────────────
export interface Plan {
  id: PlanType;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  limits: {
    agents: number;
    callsPerMonth: number;
    teamMembers: number;
  };
  popular?: boolean;
}
