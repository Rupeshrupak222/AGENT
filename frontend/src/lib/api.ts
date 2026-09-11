import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore, AuthUser, AuthTenant } from "@/store/auth.store";

// Base API URL derived exclusively from environment variable with development fallback
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

// ── Central Axios Client ──────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request Interceptor: Attach Access Token ──────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: 401 Refresh Lock & Loop Prevention ─────
let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If no response or not a 401, reject immediately
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Never attempt token refresh on auth endpoints themselves (prevents infinite refresh loops)
    const requestUrl = originalRequest.url || "";
    if (
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    // If request was already retried once, force logout and reject
    if (originalRequest._retry) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // Concurrency Lock: reuse the ongoing refresh promise across multiple concurrent 401 requests
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const res = await axios.post<{
            success: boolean;
            data: { accessToken: string; refreshToken?: string };
          }>(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken },
            { headers: { "Content-Type": "application/json" } }
          );

          if (res.data?.success && res.data.data?.accessToken) {
            const newAccess = res.data.data.accessToken;
            const newRefresh = res.data.data.refreshToken || refreshToken;
            useAuthStore.getState().setTokens(newAccess, newRefresh);
            return newAccess;
          }
          throw new Error("Invalid refresh response");
        } catch (refreshErr) {
          useAuthStore.getState().logout();
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const newAccessToken = await refreshPromise;
    if (newAccessToken) {
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

// ── Error Normalization Utility ───────────────────────────────────
export function normalizeApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    if (data) {
      if (Array.isArray(data.message) && data.message.length > 0) {
        return data.message.join(", ");
      }
      if (typeof data.message === "string") {
        return data.message;
      }
      if (data.error && typeof data.error === "string") {
        return data.error;
      }
    }

    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return "Request timed out. Please check your network connection and retry.";
    }

    if (error.message.includes("Network Error")) {
      return `Cannot connect to backend server at ${API_BASE_URL}. Ensure the API is running.`;
    }

    return error.message || "An unexpected error occurred.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

// ── Typed API Contracts ───────────────────────────────────────────
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  companyName: string;
  plan?: string;
}

export interface AuthResponseData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  tenant: AuthTenant;
}

export interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

// ── Domain API Services ───────────────────────────────────────────
export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponseData> => {
    const res = await apiClient.post<ApiResponseWrapper<AuthResponseData>>(
      "/auth/login",
      payload
    );
    return res.data.data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponseData> => {
    const res = await apiClient.post<ApiResponseWrapper<AuthResponseData>>(
      "/auth/register",
      payload
    );
    return res.data.data;
  },

  refresh: async (refreshToken: string) => {
    const res = await apiClient.post<
      ApiResponseWrapper<{ accessToken: string; refreshToken?: string }>
    >("/auth/refresh", { refreshToken });
    return res.data.data;
  },

  me: async (): Promise<AuthUser & { tenant: AuthTenant }> => {
    const res = await apiClient.get<
      ApiResponseWrapper<AuthUser & { tenant: AuthTenant }>
    >("/auth/me");
    return res.data.data;
  },
};

/**
 * Validates a persisted session on app load by calling /auth/me.
 * On success, refreshes the stored user + tenant and ensures we are
 * authenticated. On failure (expired/invalid token) the response
 * interceptor already handles refresh; if that fails, we force logout.
 * Returns true if the session is valid.
 */
export async function bootstrapAuth(): Promise<boolean> {
  const state = useAuthStore.getState();
  if (!state.accessToken) {
    state.logout();
    return false;
  }

  try {
    // 1.2s timeout safeguard so users never get stuck indefinitely on "Authenticating session..."
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Auth timeout")), 1200)
    );
    const data = await Promise.race([authApi.me(), timeoutPromise]);
    if (data) {
      const { tenant: userTenant, ...userData } = data;
      state.login(userData as AuthUser, userTenant, state.accessToken ?? "", state.refreshToken ?? undefined);
      return true;
    }
    // If response was null but we have cached session, preserve it
    if (state.user) return true;
    state.logout();
    return false;
  } catch {
    // If network timed out or failed, preserve valid cached user session instead of blocking
    if (state.user && state.accessToken) {
      return true;
    }
    state.logout();
    return false;
  }
}

export const healthApi = {
  check: async (): Promise<{
    status: string;
    checks: Record<string, { status: string; latencyMs?: number; message?: string }>;
    timestamp: string;
    uptime: number;
  }> => {
    const res = await apiClient.get<ApiResponseWrapper<any>>(
      "/health/ready"
    );
    return res.data.data;
  },
};

// ── Analytics API Contracts ─────────────────────────────────────────
export interface DashboardMetrics {
  totalCalls: number;
  connected: number;
  qualified: number;
  appointments: number;
  closedWon: number;
  connectRate: number;
  conversionRate: number;
  avgDuration: number;
  avgSentiment: number;
}

export interface CallTrendItem {
  day: string;
  total_calls: number;
  connected: number;
  avg_sentiment: number;
}

export interface AgentPerformanceItem {
  id: string;
  name: string;
  role: string;
  totalCalls: number;
  completedCalls: number;
  avgDuration: number;
  avgSentiment: number;
  avgQuality: number;
}

export interface ConversionFunnelItem {
  stage: string;
  count: number;
  pct: number;
}

export interface SentimentBucket {
  bucket: string;
  count: number;
}

export const analyticsApi = {
  overview: async (
    range: "today" | "week" | "month" = "week"
  ): Promise<DashboardMetrics> => {
    const res = await apiClient.get<ApiResponseWrapper<DashboardMetrics>>(
      "/analytics/overview",
      { params: { range } }
    );
    return res.data.data;
  },

  callTrend: async (days = 7): Promise<CallTrendItem[]> => {
    const res = await apiClient.get<ApiResponseWrapper<CallTrendItem[]>>(
      "/analytics/call-trend",
      { params: { days } }
    );
    return res.data.data;
  },

  agentPerformance: async (): Promise<AgentPerformanceItem[]> => {
    const res = await apiClient.get<ApiResponseWrapper<AgentPerformanceItem[]>>(
      "/analytics/agent-performance"
    );
    return res.data.data;
  },

  conversionFunnel: async (): Promise<ConversionFunnelItem[]> => {
    const res = await apiClient.get<ApiResponseWrapper<ConversionFunnelItem[]>>(
      "/analytics/conversion-funnel"
    );
    return res.data.data;
  },

  sentiment: async (): Promise<SentimentBucket[]> => {
    const res = await apiClient.get<ApiResponseWrapper<SentimentBucket[]>>(
      "/analytics/sentiment"
    );
    return res.data.data;
  },
};

// ── Calls API Contracts ───────────────────────────────────────────
export interface CallItem {
  id: string;
  phone: string;
  direction: "outbound" | "inbound";
  status:
    | "queued"
    | "ringing"
    | "in_progress"
    | "completed"
    | "missed"
    | "failed"
    | "transferred";
  outcome?: string | null;
  providerCallId?: string | null;
  metadata?: Record<string, unknown> | null;
  duration: number | null;
  sentimentScore?: number | null;
  qualityScore?: number | null;
  startedAt: string;
  lead?: { id: string; name: string; phone: string };
  agent?: { id: string; name: string; role: string };
}

export interface CallsListResponse {
  items: CallItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CallMetrics {
  total: number;
  completed: number;
  missed: number;
  failed: number;
  connectRate: string;
  avgDuration: number;
}

export interface CallTranscript {
  id: string;
  rawText?: string;
  turns?: Array<{ speaker: string; text: string; timestamp?: string }>;
  summary?: string;
}

export interface CallDetail extends CallItem {
  notes?: string;
  recordingUrl?: string;
  lead?: { id: string; name: string; phone: string; email?: string; company?: string };
  agent?: { id: string; name: string; role: string };
  transcript?: CallTranscript | null;
  analysis?: CallAnalysisData | null;
}

export const callsApi = {
  list: async (params?: {
    status?: string;
    agentId?: string;
    leadId?: string;
    direction?: string;
    outcome?: string;
    campaignId?: string;
    search?: string;
    from?: string;
    to?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
  }): Promise<CallsListResponse> => {
    const res = await apiClient.get<ApiResponseWrapper<CallsListResponse>>(
      "/calls",
      { params }
    );
    return res.data.data;
  },

  metrics: async (
    range: "today" | "week" | "month" = "today"
  ): Promise<CallMetrics> => {
    const res = await apiClient.get<ApiResponseWrapper<CallMetrics>>(
      "/calls/metrics",
      { params: { range } }
    );
    return res.data.data;
  },

  get: async (id: string): Promise<CallDetail> => {
    const res = await apiClient.get<ApiResponseWrapper<CallDetail>>(`/calls/${id}`);
    return res.data.data;
  },

  initiate: async (payload: {
    leadId: string;
    agentId: string;
    direction?: "outbound" | "inbound";
  }): Promise<CallItem> => {
    const res = await apiClient.post<ApiResponseWrapper<CallItem>>(
      "/calls",
      payload
    );
    return res.data.data;
  },

  getRecording: async (id: string): Promise<CallRecordingData> => {
    const res = await apiClient.get<ApiResponseWrapper<CallRecordingData>>(`/calls/${id}/recording`);
    return res.data.data;
  },

  getAnalysis: async (id: string): Promise<CallAnalysisData> => {
    const res = await apiClient.get<ApiResponseWrapper<CallAnalysisData>>(`/calls/${id}/analysis`);
    return res.data.data;
  },

  retryAnalysis: async (id: string): Promise<{ enqueued: boolean; callId: string; message: string }> => {
    const res = await apiClient.post<ApiResponseWrapper<{ enqueued: boolean; callId: string; message: string }>>(`/calls/${id}/analysis/retry`);
    return res.data.data;
  },
};

// ── Telephony API Contracts ──────────────────────────────────────────
export interface TelephonySystemStatus {
  status: string;
  database: string;
  architecture: string;
  mediaStreaming: string;
  providers: Array<{ name: string; configured: boolean }>;
  anyProviderConfigured: boolean;
  activeSessions: number;
  redisQueues: string;
  speechPipeline: string;
  speechPipelineDetail: { stt: string; brain: string; tts: string };
}

export const telephonyApi = {
  status: async (): Promise<TelephonySystemStatus> => {
    const res = await apiClient.get<ApiResponseWrapper<TelephonySystemStatus>>(
      "/telephony/status"
    );
    return res.data.data;
  },
};

export interface CallRecordingData {
  callId: string;
  recordingId: string;
  url?: string;
  duration?: number | null;
  mimeType?: string;
  expiresInSeconds?: number;
}

export interface CallAnalysisData {
  id: string;
  callId: string;
  tenantId: string;
  provider: string;
  model?: string;
  summary: string;
  leadScore?: number;
  intent?: string;
  sentiment?: "positive" | "neutral" | "negative" | "mixed" | "unknown";
  qualificationOutcome?: string;
  qualification?: {
    qualified: boolean;
    reasons: string[];
    metCriteria?: string[];
    unmetCriteria?: string[];
  };
  appointmentDetected: boolean;
  appointmentDetails?: {
    topic?: string;
    date?: string;
    duration?: number;
  };
  entitiesJson?: any;
  topicsJson?: string[];
  actionItemsJson?: string[];
  costUsd?: number;
  latencyMs?: number;
  processingStatus: "pending" | "processing" | "completed" | "failed" | "skipped";
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Agents API Contracts ──────────────────────────────────────────
export interface AgentItem {
  id: string;
  name: string;
  role: string;
  language: string;
  voiceId: string;
  status: "draft" | "active" | "paused" | "archived";
  businessGoal?: string;
  openingScript?: string;
  qualificationRules?: string;
  knowledgeBase?: string;
  settings?: Record<string, any>;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan?: string;
  };
  createdAt?: string;
  _count?: {
    calls: number;
    campaigns: number;
  };
}

export interface AgentStats {
  totalCalls: number;
  connectedCalls: number;
  qualifiedLeads: number;
  conversionRate: string;
  avgCallDuration: number;
}

export interface CreateAgentInput {
  name: string;
  role: string;
  language: string;
  voiceId: string;
  businessGoal: string;
  openingScript?: string;
  qualificationRules?: string;
  knowledgeBase?: string;
  settings?: Record<string, any>;
}

export const agentsApi = {
  listPlatform: async (): Promise<AgentItem[]> => {
    const res = await apiClient.get<ApiResponseWrapper<AgentItem[]>>("/agents/platform/all");
    return res.data.data;
  },

  list: async (filters?: {
    status?: string;
    role?: string;
  }): Promise<AgentItem[]> => {
    const res = await apiClient.get<ApiResponseWrapper<AgentItem[]>>("/agents", {
      params: filters,
    });
    return res.data.data;
  },

  get: async (id: string): Promise<AgentItem> => {
    const res = await apiClient.get<ApiResponseWrapper<AgentItem>>(`/agents/${id}`);
    return res.data.data;
  },

  getStats: async (id: string): Promise<AgentStats> => {
    const res = await apiClient.get<ApiResponseWrapper<AgentStats>>(`/agents/${id}/stats`);
    return res.data.data;
  },

  create: async (dto: CreateAgentInput): Promise<AgentItem> => {
    const res = await apiClient.post<ApiResponseWrapper<AgentItem>>("/agents", dto);
    return res.data.data;
  },

  update: async (id: string, dto: Partial<CreateAgentInput>): Promise<AgentItem> => {
    const res = await apiClient.patch<ApiResponseWrapper<AgentItem>>(`/agents/${id}`, dto);
    return res.data.data;
  },

  activate: async (id: string): Promise<AgentItem> => {
    const res = await apiClient.post<ApiResponseWrapper<AgentItem>>(`/agents/${id}/activate`);
    return res.data.data;
  },

  pause: async (id: string): Promise<AgentItem> => {
    const res = await apiClient.post<ApiResponseWrapper<AgentItem>>(`/agents/${id}/pause`);
    return res.data.data;
  },

  duplicate: async (id: string): Promise<AgentItem> => {
    const res = await apiClient.post<ApiResponseWrapper<AgentItem>>(`/agents/${id}/duplicate`);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/agents/${id}`);
  },

  testChat: async (
    id: string,
    payload: {
      userMessage: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    }
  ): Promise<TestChatResponse> => {
    const res = await apiClient.post<ApiResponseWrapper<TestChatResponse>>(
      `/agents/${id}/test-chat`,
      payload
    );
    return res.data.data;
  },
};

export interface TestChatResponse {
  agentId: string;
  agentName: string;
  role: string;
  language: string;
  voiceId?: string | null;
  replyText: string;
  audioBase64?: string | null;
  totalLatencyMs: number;
  metrics: {
    llmLatencyMs: number;
    ttsLatencyMs: number;
  };
}

// ── Leads API Contracts ───────────────────────────────────────────
export interface LeadItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  status:
    | "new"
    | "contacted"
    | "interested"
    | "qualified"
    | "appointment"
    | "closed_won"
    | "closed_lost";
  score: number;
  source?: string | null;
  notes?: string | null;
  assignedAgentId?: string | null;
  assignedAgent?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsListResponse {
  items: LeadItem[];
  total: number;
  page: number;
  limit: number;
  pages?: number;
}

export interface LeadActivity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface LeadDetail extends LeadItem {
  calls?: CallItem[];
  activities?: LeadActivity[];
}

export interface CreateLeadInput {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  source?: string;
  status?: LeadItem["status"];
  notes?: string;
  agentId?: string;
}

export const leadsApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    agentId?: string;
    assignedTo?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<LeadsListResponse> => {
    const res = await apiClient.get<ApiResponseWrapper<LeadsListResponse>>(
      "/leads",
      { params }
    );
    return res.data.data;
  },

  pipeline: async (): Promise<Record<string, number>> => {
    const res = await apiClient.get<ApiResponseWrapper<Record<string, number>>>(
      "/leads/pipeline"
    );
    return res.data.data;
  },

  get: async (id: string): Promise<LeadDetail> => {
    const res = await apiClient.get<ApiResponseWrapper<LeadDetail>>(`/leads/${id}`);
    return res.data.data;
  },

  create: async (dto: CreateLeadInput): Promise<LeadDetail> => {
    const res = await apiClient.post<ApiResponseWrapper<LeadDetail>>("/leads", dto);
    return res.data.data;
  },

  update: async (id: string, dto: Partial<CreateLeadInput>): Promise<LeadDetail> => {
    const res = await apiClient.patch<ApiResponseWrapper<LeadDetail>>(`/leads/${id}`, dto);
    return res.data.data;
  },

  updateStatus: async (
    id: string,
    status: LeadItem["status"]
  ): Promise<LeadDetail> => {
    const res = await apiClient.patch<ApiResponseWrapper<LeadDetail>>(
      `/leads/${id}/status`,
      { status }
    );
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/leads/${id}`);
  },

  bulkImport: async (
    leads: Array<{ name: string; phone: string; email?: string; company?: string; status?: string }>
  ): Promise<{
    total: number;
    created: number;
    duplicates: number;
    invalid: number;
    leads: LeadItem[];
  }> => {
    const res = await apiClient.post<
      ApiResponseWrapper<{
        total: number;
        created: number;
        duplicates: number;
        invalid: number;
        leads: LeadItem[];
      }>
    >("/leads/bulk", { leads });
    return res.data.data;
  },
};

// ── Team / Users API Contracts ────────────────────────────────────
export interface TeamMember extends AuthUser {
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface InviteMemberInput {
  name: string;
  email: string;
  role: string;
}

export const teamApi = {
  list: async (): Promise<TeamMember[]> => {
    const res = await apiClient.get<ApiResponseWrapper<TeamMember[]>>("/users");
    return res.data.data;
  },

  invite: async (dto: InviteMemberInput): Promise<TeamMember> => {
    const res = await apiClient.post<ApiResponseWrapper<TeamMember>>(
      "/users/invite",
      dto
    );
    return res.data.data;
  },

  updateRole: async (
    id: string,
    role: string
  ): Promise<TeamMember> => {
    const res = await apiClient.patch<ApiResponseWrapper<TeamMember>>(
      `/users/${id}/role`,
      { role }
    );
    return res.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};

// ── Tenant / Workspace Config API ─────────────────────────────────
export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  website?: string | null;
  industry?: string | null;
  plan: string;
  isActive: boolean;
  settings?: Record<string, any>;
  whitelabelDomain?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number; agents: number };
}

export interface TenantUsage {
  plan: string;
  planName: string;
  agentCount: number;
  userCount: number;
  leadCount: number;
  campaignCount: number;
  appointmentCount: number;
  callCount: number;
  analysisCount: number;
  minutesUsed: number;
  limits: { agents: number; members: number; calls: number };
  usage: {
    agents:  { used: number; limit: number; unlimited: boolean; pct: number | null };
    members: { used: number; limit: number; unlimited: boolean; pct: number | null };
    calls:   { used: number; limit: number; unlimited: boolean; pct: number | null };
  };
}

export const tenantApi = {
  me: async (): Promise<TenantRecord> => {
    const res = await apiClient.get<ApiResponseWrapper<TenantRecord>>("/tenants/me");
    return res.data.data;
  },

  usage: async (): Promise<TenantUsage> => {
    const res = await apiClient.get<ApiResponseWrapper<TenantUsage>>(
      "/tenants/me/usage"
    );
    return res.data.data;
  },

  updateMe: async (dto: {
    name?: string;
    logo?: string;
    settings?: Record<string, any>;
  }): Promise<TenantRecord> => {
    const res = await apiClient.patch<ApiResponseWrapper<TenantRecord>>(
      "/tenants/me",
      dto
    );
    return res.data.data;
  },
};

// ── Voices API ─────────────────────────────────────────────────
export interface VoiceProfile {
  id: string;
  name: string;
  gender: "Female" | "Male";
  languages: string[];
  accent: string;
  tone: string;
  avatarColor: string;
}

export const voicesApi = {
  list: async (): Promise<VoiceProfile[]> => {
    const res = await apiClient.get<ApiResponseWrapper<VoiceProfile[]>>(
      "/voices"
    );
    return res.data.data;
  },
};

// ── Calendar / Appointments API ────────────────────────────────
export type AppointmentStatus =
  | "scheduled"
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled"
  | "failed";

export type CalendarProviderKind = "auto" | "native" | "calcom" | "mock";
export type AppointmentSource = "manual" | "ai" | "whatsapp" | "call";

export interface Appointment {
  id: string;
  leadName: string;
  phone: string;
  email?: string | null;
  topic?: string | null;
  title?: string | null;
  description?: string | null;
  date: string;
  startAt?: string | null;
  endAt?: string | null;
  duration: number;
  timezone?: string | null;
  status: AppointmentStatus;
  calendarProvider?: string | null;
  providerAppointmentId?: string | null;
  providerEventId?: string | null;
  providerBookingUrl?: string | null;
  location?: string | null;
  attendeeEmail?: string | null;
  attendeePhone?: string | null;
  source?: AppointmentSource | string | null;
  leadId?: string | null;
  agentId?: string | null;
  callId?: string | null;
  campaignId?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  rescheduledAt?: string | null;
  rescheduleReason?: string | null;
  reminder24hSentAt?: string | null;
  reminder1hSentAt?: string | null;
  idempotencyKey?: string | null;
  createdById?: string | null;
  createdByEmail?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentOverview {
  total: number;
  scheduled: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;
  failed: number;
  showUpRatio: string;
  avgDurationMins: number;
}

export interface AppointmentSlot {
  provider: string;
  startAt: string;
  endAt: string;
  timezone: string;
  available: boolean;
}

export interface AvailabilityResponse {
  provider: string;
  isMock: boolean;
  source: string;
  timezone: string;
  authenticated: boolean;
  slots: AppointmentSlot[];
  excluded?: number;
}

export interface AvailabilityRequest {
  from: string;
  to: string;
  timezone?: string;
  duration?: number;
  agentId?: string;
  provider?: CalendarProviderKind;
  topic?: string;
}

export interface CalendarProviderStatus {
  provider: string;
  configured: boolean;
  source: string;
  isMock: boolean;
  message: string;
  success?: boolean;
  details?: Record<string, any>;
}

export interface AppointmentReminderItem {
  kind: "24h" | "1h";
  offsetMs: number;
  remindAt: string;
  scheduled: boolean;
  sentAt: string | null;
  status: "scheduled" | "sent" | "passed";
}

export interface AppointmentReminderStatus {
  appointmentId: string;
  startAt: string;
  timezone: string;
  status: AppointmentStatus;
  reminders: AppointmentReminderItem[];
}

export interface CreateAppointmentInput {
  leadName: string;
  phone: string;
  email?: string;
  topic?: string;
  date: string;
  duration?: number;
  status?: AppointmentStatus;
  leadId?: string;
  agentId?: string;
}

export interface ScheduleAppointmentInput {
  leadName: string;
  phone: string;
  email?: string;
  topic?: string;
  startAt?: string;
  date?: string;
  duration?: number;
  timezone?: string;
  agentId?: string;
  leadId?: string;
  location?: string;
  title?: string;
  description?: string;
  provider?: CalendarProviderKind;
  idempotencyKey?: string;
  source?: AppointmentSource;
  callId?: string;
  campaignId?: string;
  createdByEmail?: string;
}

export interface RescheduleAppointmentInput {
  startAt: string;
  timezone?: string;
  reason?: string;
}

export interface CancelAppointmentInput {
  reason?: string;
  force?: boolean;
  provider?: CalendarProviderKind;
}

export const calendarApi = {
  list: async (params?: {
    status?: string;
    from?: string;
    to?: string;
  }): Promise<Appointment[]> => {
    const res = await apiClient.get<ApiResponseWrapper<Appointment[]>>(
      "/calendar/appointments",
      { params }
    );
    return res.data.data;
  },

  overview: async (params?: {
    from?: string;
    to?: string;
  }): Promise<AppointmentOverview> => {
    const res = await apiClient.get<ApiResponseWrapper<AppointmentOverview>>(
      "/calendar/overview",
      { params }
    );
    return res.data.data;
  },

  create: async (dto: CreateAppointmentInput): Promise<Appointment> => {
    const res = await apiClient.post<ApiResponseWrapper<Appointment>>(
      "/calendar/appointments",
      dto
    );
    return res.data.data;
  },

  update: async (
    id: string,
    dto: Partial<CreateAppointmentInput>
  ): Promise<Appointment> => {
    const res = await apiClient.patch<ApiResponseWrapper<Appointment>>(
      `/calendar/appointments/${id}`,
      dto
    );
    return res.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/calendar/appointments/${id}`);
  },
};

// ── Appointments API (Day 17 scheduling — /appointments) ──────
export type AppointmentBookingResponse = Appointment & { idempotent?: boolean };
export type AppointmentCancelResponse = Appointment & { alreadyCancelled?: boolean };

export const appointmentsApi = {
  list: async (params?: {
    status?: string;
    from?: string;
    to?: string;
    agentId?: string;
    leadId?: string;
    upcoming?: boolean;
  }): Promise<Appointment[]> => {
    const res = await apiClient.get<ApiResponseWrapper<Appointment[]>>(
      "/appointments",
      { params }
    );
    return res.data.data;
  },

  overview: async (params?: {
    from?: string;
    to?: string;
  }): Promise<AppointmentOverview> => {
    const res = await apiClient.get<ApiResponseWrapper<AppointmentOverview>>(
      "/appointments/overview",
      { params }
    );
    return res.data.data;
  },

  availability: async (
    params: AvailabilityRequest
  ): Promise<AvailabilityResponse> => {
    const res = await apiClient.get<ApiResponseWrapper<AvailabilityResponse>>(
      "/appointments/availability",
      { params }
    );
    return res.data.data;
  },

  providerStatus: async (): Promise<CalendarProviderStatus> => {
    const res = await apiClient.get<ApiResponseWrapper<CalendarProviderStatus>>(
      "/appointments/provider/status"
    );
    return res.data.data;
  },

  testProvider: async (): Promise<CalendarProviderStatus> => {
    const res = await apiClient.post<ApiResponseWrapper<CalendarProviderStatus>>(
      "/appointments/provider/test"
    );
    return res.data.data;
  },

  create: async (
    dto: ScheduleAppointmentInput
  ): Promise<AppointmentBookingResponse> => {
    const res = await apiClient.post<
      ApiResponseWrapper<AppointmentBookingResponse>
    >("/appointments", dto);
    return res.data.data;
  },

  get: async (id: string): Promise<Appointment> => {
    const res = await apiClient.get<ApiResponseWrapper<Appointment>>(
      `/appointments/${id}`
    );
    return res.data.data;
  },

  reminders: async (id: string): Promise<AppointmentReminderStatus> => {
    const res = await apiClient.get<ApiResponseWrapper<AppointmentReminderStatus>>(
      `/appointments/${id}/reminders`
    );
    return res.data.data;
  },

  reschedule: async (
    id: string,
    dto: RescheduleAppointmentInput
  ): Promise<Appointment> => {
    const res = await apiClient.post<ApiResponseWrapper<Appointment>>(
      `/appointments/${id}/reschedule`,
      dto
    );
    return res.data.data;
  },

  cancel: async (
    id: string,
    dto?: CancelAppointmentInput
  ): Promise<AppointmentCancelResponse> => {
    const res = await apiClient.post<
      ApiResponseWrapper<AppointmentCancelResponse>
    >(`/appointments/${id}/cancel`, dto ?? {});
    return res.data.data;
  },
};

// ── Automations (Rules CRUD) API ───────────────────────────────
export type AutomationTrigger =
  | "call_completed"
  | "call_missed"
  | "lead_qualified"
  | "deal_closed"
  | "call_analysis_completed"
  | "lead_disqualified"
  | "appointment_detected"
  | "campaign_lead_completed"
  | "appointment_booked"
  | "appointment_confirmed"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "appointment_completed"
  | "appointment_no_show"
  | "appointment_reminder";

export type AutomationAction =
  | "whatsapp"
  | "sms"
  | "email"
  | "webhook"
  | "crm_update"
  | "send_whatsapp"
  | "send_email";

export interface AutomationCondition {
  field: string;
  operator: "==" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "contains" | "not_contains" | "exists";
  value?: any;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  template?: string | null;
  conditions?: AutomationCondition[];
  actions?: Array<{ type: string; template?: string; subject?: string }>;
  status: "active" | "paused";
  executions: number;
  lastRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationRuleInput {
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  template?: string;
  conditions?: AutomationCondition[];
  actions?: Array<{ type: string; template?: string; subject?: string }>;
  status?: "active" | "paused";
}

export interface AutomationLogItem {
  id: string;
  type: string;
  template: string;
  message: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed" | "skipped";
  error?: string | null;
  providerMessageId?: string | null;
  attempts?: number;
  createdAt: string;
  sentAt?: string | null;
  lead?: { id?: string; name?: string; phone?: string; email?: string } | null;
}

export interface ProviderStatusItem {
  provider: "whatsapp" | "resend";
  state: "not_connected" | "configured" | "connected" | "mock_mode" | "disabled";
  isConfigured: boolean;
  isMock: boolean;
  from?: string;
  phoneNumberId?: string;
}

export const automationsApi = {
  listRules: async (): Promise<AutomationRule[]> => {
    const res = await apiClient.get<ApiResponseWrapper<AutomationRule[]>>(
      "/automations/rules"
    );
    return res.data.data;
  },

  createRule: async (dto: CreateAutomationRuleInput): Promise<AutomationRule> => {
    const res = await apiClient.post<ApiResponseWrapper<AutomationRule>>(
      "/automations/rules",
      dto
    );
    return res.data.data;
  },

  updateRule: async (
    id: string,
    dto: Partial<CreateAutomationRuleInput>
  ): Promise<AutomationRule> => {
    const res = await apiClient.patch<ApiResponseWrapper<AutomationRule>>(
      `/automations/rules/${id}`,
      dto
    );
    return res.data.data;
  },

  toggleRule: async (
    id: string,
    status: "active" | "paused"
  ): Promise<AutomationRule> => {
    const res = await apiClient.patch<ApiResponseWrapper<AutomationRule>>(
      `/automations/rules/${id}/status`,
      { status }
    );
    return res.data.data;
  },

  deleteRule: async (id: string): Promise<void> => {
    await apiClient.delete(`/automations/rules/${id}`);
  },

  getLogs: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }): Promise<{ items: AutomationLogItem[]; total: number; page: number; limit: number }> => {
    const res = await apiClient.get<ApiResponseWrapper<{ items: AutomationLogItem[]; total: number; page: number; limit: number }>>(
      "/automations/logs",
      { params }
    );
    return res.data.data;
  },

  dryRun: async (dto: {
    trigger: string;
    template?: string;
    conditions?: AutomationCondition[];
    leadId?: string;
  }): Promise<{
    success: boolean;
    conditionsMet: boolean;
    renderedMessage: string;
    contextUsed: Record<string, any>;
  }> => {
    const res = await apiClient.post<ApiResponseWrapper<any>>(
      "/automations/dry-run",
      dto
    );
    return res.data.data;
  },

  testAction: async (dto: {
    actionType: "send_whatsapp" | "send_email";
    destination: string;
    message?: string;
    subject?: string;
  }): Promise<{ success: boolean; message: string; jobId: string }> => {
    const res = await apiClient.post<ApiResponseWrapper<any>>(
      "/automations/test-action",
      dto
    );
    return res.data.data;
  },

  getProviderStatuses: async (): Promise<ProviderStatusItem[]> => {
    const res = await apiClient.get<ApiResponseWrapper<ProviderStatusItem[]>>(
      "/automations/providers/status"
    );
    return res.data.data;
  },

  testProviderConnection: async (
    provider: "whatsapp" | "resend"
  ): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
    const res = await apiClient.post<ApiResponseWrapper<any>>(
      "/automations/providers/test",
      { provider }
    );
    return res.data.data;
  },
};

// ── Tenants API ────────────────────────────────────────────────
export interface TenantItem {
  id: string;
  name: string;
  slug?: string;
  plan?: string;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  _count?: {
    users: number;
    agents: number;
    calls: number;
    leads: number;
    campaigns?: number;
  };
}

export interface TenantDetailItem extends TenantItem {
  users?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }>;
  agents?: Array<{
    id: string;
    name: string;
    role: string;
    language: string;
    status: string;
    voiceId?: string | null;
  }>;
}

export const tenantsApi = {
  list: async (): Promise<TenantItem[]> => {
    const res = await apiClient.get<ApiResponseWrapper<TenantItem[]>>("/tenants");
    return res.data.data;
  },
  create: async (data: { name: string; plan?: string }): Promise<TenantItem> => {
    const res = await apiClient.post<ApiResponseWrapper<TenantItem>>("/tenants", data);
    return res.data.data;
  },
  updatePlan: async (id: string, plan: string): Promise<TenantItem> => {
    const res = await apiClient.patch<ApiResponseWrapper<TenantItem>>(`/tenants/${id}/plan`, { plan });
    return res.data.data;
  },
  updateStatus: async (id: string, isActive: boolean): Promise<TenantItem> => {
    const res = await apiClient.patch<ApiResponseWrapper<TenantItem>>(`/tenants/${id}/status`, { isActive });
    return res.data.data;
  },
  getDetails: async (id: string): Promise<TenantDetailItem> => {
    const res = await apiClient.get<ApiResponseWrapper<TenantDetailItem>>(`/tenants/${id}/details`);
    return res.data.data;
  },
  me: async (): Promise<TenantItem> => {
    const res = await apiClient.get<ApiResponseWrapper<TenantItem>>("/tenants/me");
    return res.data.data;
  },
};

// ── Campaigns API Contracts ───────────────────────────────────────
export interface CampaignItem {
  id: string;
  name: string;
  description?: string | null;
  status: "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";
  agentId: string;
  agent?: { id: string; name: string; role?: string };
  maxConcurrentCalls: number;
  maxAttempts: number;
  callsPerDay?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  daysOfWeek?: number[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    leads: number;
    calls: number;
  };
}

export interface CampaignMetrics {
  totalLeads: number;
  pending: number;
  queued: number;
  calling: number;
  completed: number;
  failed: number;
  skipped: number;
  retryPending: number;
  totalCalls: number;
  connectedCalls: number;
  connectRate: number;
  conversionRate: number;
  avgDuration: number;
}

export interface CampaignLeadItem {
  id: string;
  campaignId: string;
  leadId: string;
  status: "pending" | "queued" | "calling" | "completed" | "failed" | "skipped" | "retry_pending";
  attemptCount: number;
  lastAttemptAt?: string | null;
  nextAttemptAt?: string | null;
  lastCallId?: string | null;
  outcome?: string | null;
  errorMessage?: string | null;
  lead: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    company?: string | null;
    status?: string;
  };
  lastCall?: {
    id: string;
    status: string;
    duration: number;
    startedAt: string;
    recordingUrl?: string | null;
    outcome?: string | null;
    analysis?: {
      leadScore?: number;
      intent?: string;
      sentiment?: string;
      summary?: string;
      processingStatus?: string;
      qualification?: any;
      appointmentDetected?: boolean;
    } | null;
  } | null;
}

export interface EligibilityCategoryBreakdown {
  [category: string]: number;
}

export interface EligibilityPreviewResult {
  campaignId?: string;
  totalEnrolled?: number;
  total?: number;
  eligibleCount: number;
  ineligibleCount: number;
  callingWindow?: {
    inWindow: boolean;
    reason?: string;
  };
  dailyLimit?: {
    withinLimit: boolean;
    dispatchedToday: number;
    limit: number | null;
  };
  categories: Record<string, number>;
  leads: Array<{
    leadId: string;
    name: string;
    phone: string;
    status?: string;
    isEligible: boolean;
    reason?: string;
  }>;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  agentId: string;
  scheduledAt?: string;
  maxCalls?: number;
  callsPerDay?: number;
  maxConcurrentCalls?: number;
  maxAttempts?: number;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  leadIds?: string[];
}

export const campaignsApi = {
  list: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: CampaignItem[]; total: number; page: number; limit: number }> => {
    const res = await apiClient.get<ApiResponseWrapper<{ items: CampaignItem[]; total: number; page: number; limit: number }>>(
      "/campaigns",
      { params }
    );
    return res.data.data;
  },

  get: async (id: string): Promise<CampaignItem> => {
    const res = await apiClient.get<ApiResponseWrapper<CampaignItem>>(`/campaigns/${id}`);
    return res.data.data;
  },

  create: async (dto: CreateCampaignInput): Promise<CampaignItem> => {
    const res = await apiClient.post<ApiResponseWrapper<CampaignItem>>("/campaigns", dto);
    return res.data.data;
  },

  update: async (id: string, dto: Partial<CreateCampaignInput>): Promise<CampaignItem> => {
    const res = await apiClient.patch<ApiResponseWrapper<CampaignItem>>(`/campaigns/${id}`, dto);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/campaigns/${id}`);
  },

  getMetrics: async (id: string): Promise<CampaignMetrics> => {
    const res = await apiClient.get<ApiResponseWrapper<CampaignMetrics>>(`/campaigns/${id}/metrics`);
    return res.data.data;
  },

  getLeads: async (
    id: string,
    params?: { status?: string; page?: number; limit?: number }
  ): Promise<{ items: CampaignLeadItem[]; total: number; page: number; limit: number }> => {
    const res = await apiClient.get<ApiResponseWrapper<{ items: CampaignLeadItem[]; total: number; page: number; limit: number }>>(
      `/campaigns/${id}/leads`,
      { params }
    );
    return res.data.data;
  },

  addLeads: async (id: string, leadIds: string[]): Promise<{ added: number; total: number }> => {
    const res = await apiClient.post<ApiResponseWrapper<{ added: number; total: number }>>(
      `/campaigns/${id}/leads`,
      { leadIds }
    );
    return res.data.data;
  },

  getEligibilityPreview: async (id: string): Promise<EligibilityPreviewResult> => {
    const res = await apiClient.get<ApiResponseWrapper<EligibilityPreviewResult>>(
      `/campaigns/${id}/eligibility-preview`
    );
    return res.data.data;
  },

  previewLeadsEligibility: async (
    leadIds: string[],
    agentId?: string
  ): Promise<EligibilityPreviewResult> => {
    const res = await apiClient.post<ApiResponseWrapper<EligibilityPreviewResult>>(
      "/campaigns/eligibility-preview",
      { leadIds, agentId }
    );
    return res.data.data;
  },

  start: async (id: string): Promise<{ status: string; enqueued: number }> => {
    const res = await apiClient.post<ApiResponseWrapper<{ status: string; enqueued: number }>>(
      `/campaigns/${id}/start`
    );
    return res.data.data;
  },

  pause: async (id: string): Promise<{ status: string }> => {
    const res = await apiClient.post<ApiResponseWrapper<{ status: string }>>(
      `/campaigns/${id}/pause`
    );
    return res.data.data;
  },

  resume: async (id: string): Promise<{ status: string; enqueued: number }> => {
    const res = await apiClient.post<ApiResponseWrapper<{ status: string; enqueued: number }>>(
      `/campaigns/${id}/resume`
    );
    return res.data.data;
  },

  cancel: async (id: string): Promise<{ status: string }> => {
    const res = await apiClient.post<ApiResponseWrapper<{ status: string }>>(
      `/campaigns/${id}/cancel`
    );
    return res.data.data;
  },
};

export interface IntegrationItem {
  id: string;
  provider: string;
  isActive: boolean;
  isConfigured: boolean;
  settings?: Record<string, any>;
  lastSyncAt?: string | null;
  maskedKey?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrmConnectionTestResponse {
  success: boolean;
  provider: string;
  message: string;
  accountInfo?: {
    organization?: string;
    userId?: string;
    email?: string;
  };
}

export const integrationsApi = {
  list: async (): Promise<IntegrationItem[]> => {
    const res = await apiClient.get<ApiResponseWrapper<IntegrationItem[]>>("/integrations");
    return res.data.data;
  },

  get: async (provider: string): Promise<IntegrationItem | null> => {
    const res = await apiClient.get<ApiResponseWrapper<IntegrationItem>>(`/integrations/${provider}`);
    return res.data.data;
  },

  upsert: async (
    provider: string,
    payload: {
      isActive?: boolean;
      credentials?: Record<string, any>;
      settings?: Record<string, any>;
    }
  ): Promise<IntegrationItem> => {
    const res = await apiClient.post<ApiResponseWrapper<IntegrationItem>>(
      `/integrations/${provider}`,
      payload
    );
    return res.data.data;
  },

  testConnection: async (
    provider: string,
    credentials?: Record<string, any>
  ): Promise<CrmConnectionTestResponse> => {
    const res = await apiClient.post<ApiResponseWrapper<CrmConnectionTestResponse>>(
      `/integrations/${provider}/test`,
      { credentials }
    );
    return res.data.data;
  },

  syncCall: async (callId: string): Promise<any> => {
    const res = await apiClient.post<ApiResponseWrapper<any>>(
      `/integrations/sync/${callId}`
    );
    return res.data.data;
  },
};

// ── Platform (Super Admin) API Contracts ────────────────────────
export interface PlatformDashboardData {
  companies: { total: number; active: number; change: number };
  users: { total: number; active: number; change: number };
  agents: { total: number; active: number };
  calls: { total: number; completed: number; failed: number; inbound: number; outbound: number; transferred: number; change: number };
  callMinutes: { total: number; avgDuration: number };
  leads: { total: number };
  campaigns: { total: number };
  revenue: { total: number; mrr: number; invoicesCount: number; failedPayments: number };
}

export interface PlatformCallTrendItem {
  day: string;
  total_calls: number;
  completed: number;
  inbound: number;
  outbound: number;
  avg_sentiment: number;
}

export interface PlatformCompanyPerformance {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  users: number;
  agents: number;
  activeAgents: number;
  calls: number;
  completedCalls: number;
  successRate: number;
  minutes: number;
  avgDuration: number;
  revenue: number;
  lastActivity: string;
}

export interface PlatformUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  tenant: { id: string; name: string; slug?: string };
}

export interface PlatformCallItem {
  id: string;
  phone: string;
  direction: string;
  status: string;
  outcome: string | null;
  duration: number | null;
  sentimentScore: number | null;
  startedAt: string;
  lead: { id: string; name: string; phone: string } | null;
  agent: { id: string; name: string; role: string } | null;
  tenant: { id: string; name: string };
}

export interface PlatformCampaignItem {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  agent: { id: string; name: string } | null;
  tenant: { id: string; name: string };
  _count: { leads: number; calls: number };
}

export interface PlatformAuditLogItem {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: any;
  ipAddress: string | null;
  createdAt: string;
  tenant: { id: string; name: string };
  user: { id: string; name: string; email: string } | null;
}

export interface PlatformUsageData {
  callMinutes: { total: number; monthly: number };
  agents: { total: number; active: number };
  storage: { totalBytes: number };
  tenants: { total: number; active: number };
  apiCalls: number;
  tenantUsage: Array<{
    tenantId: string;
    tenantName: string;
    plan: string;
    calls: number;
    minutes: number;
    agents: number;
  }>;
}

export interface PlatformRevenueData {
  mrr: number;
  arr: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  totalRevenue: number;
  planDistribution: Array<{ plan: string; count: number; price: number }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    plan: string;
    paidAt: string | null;
    createdAt: string;
  }>;
  subscriptions: { total: number; trial: number; cancelled: number };
}

export interface GlobalSearchResult {
  companies: Array<{ id: string; name: string; slug: string; plan: string; isActive: boolean }>;
  users: Array<{ id: string; name: string; email: string; role: string; tenant: { name: string } }>;
  agents: Array<{ id: string; name: string; role: string; status: string; tenant: { name: string } }>;
  calls: Array<{ id: string; phone: string; status: string; direction: string; startedAt: string; tenant: { name: string } }>;
}

export interface PlatformSettingsData {
  platformName: string;
  platformSlug: string;
  logoUrl: string;
  supportEmail: string;
  website: string;
  industry: string;
  whitelabelDomain: string;
  defaultPlan: string;
  defaultCurrency: string;
  timezone: string;
  registrationEnabled: boolean;
  maintenanceMode: boolean;
  emailNotifications: boolean;
  apiRateLimit: string;
  defaultCallLimit: number;
}

export const platformApi = {
  dashboard: async (range: 'today' | 'week' | 'month' = 'week'): Promise<PlatformDashboardData> => {
    const res = await apiClient.get<ApiResponseWrapper<PlatformDashboardData>>('/platform/dashboard', { params: { range } });
    return res.data.data;
  },

  callTrend: async (days = 30): Promise<PlatformCallTrendItem[]> => {
    const res = await apiClient.get<ApiResponseWrapper<PlatformCallTrendItem[]>>('/platform/call-trend', { params: { days } });
    return res.data.data;
  },

  companyPerformance: async (range: 'today' | 'week' | 'month' = 'month'): Promise<PlatformCompanyPerformance[]> => {
    const res = await apiClient.get<ApiResponseWrapper<PlatformCompanyPerformance[]>>('/platform/company-performance', { params: { range } });
    return res.data.data;
  },

  allUsers: async (params?: {
    page?: number; limit?: number; search?: string; role?: string; tenantId?: string;
  }): Promise<{ items: PlatformUserItem[]; total: number; page: number; limit: number; pages: number }> => {
    const res = await apiClient.get<ApiResponseWrapper<{ items: PlatformUserItem[]; total: number; page: number; limit: number; pages: number }>>('/platform/users', { params });
    return res.data.data;
  },

  allCalls: async (params?: {
    page?: number; limit?: number; tenantId?: string; agentId?: string; status?: string; direction?: string; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: PlatformCallItem[]; total: number; page: number; limit: number; pages: number }> => {
    const res = await apiClient.get<ApiResponseWrapper<{ items: PlatformCallItem[]; total: number; page: number; limit: number; pages: number }>>('/platform/calls', { params });
    return res.data.data;
  },

  allCampaigns: async (params?: {
    page?: number; limit?: number; tenantId?: string; status?: string;
  }): Promise<{ items: PlatformCampaignItem[]; total: number; page: number; limit: number; pages: number }> => {
    const res = await apiClient.get<ApiResponseWrapper<{ items: PlatformCampaignItem[]; total: number; page: number; limit: number; pages: number }>>('/platform/campaigns', { params });
    return res.data.data;
  },

  auditLogs: async (params?: {
    page?: number; limit?: number; tenantId?: string; userId?: string; action?: string;
  }): Promise<{ items: PlatformAuditLogItem[]; total: number; page: number; limit: number; pages: number }> => {
    const res = await apiClient.get<ApiResponseWrapper<{ items: PlatformAuditLogItem[]; total: number; page: number; limit: number; pages: number }>>('/platform/audit-logs', { params });
    return res.data.data;
  },

  usage: async (): Promise<PlatformUsageData> => {
    const res = await apiClient.get<ApiResponseWrapper<PlatformUsageData>>('/platform/usage');
    return res.data.data;
  },

  revenue: async (): Promise<PlatformRevenueData> => {
    const res = await apiClient.get<ApiResponseWrapper<PlatformRevenueData>>('/platform/revenue');
    return res.data.data;
  },

  search: async (query: string): Promise<GlobalSearchResult> => {
    const res = await apiClient.get<ApiResponseWrapper<GlobalSearchResult>>('/platform/search', { params: { q: query } });
    return res.data.data;
  },

  getSettings: async (): Promise<PlatformSettingsData> => {
    const res = await apiClient.get<ApiResponseWrapper<PlatformSettingsData>>('/platform/settings');
    return res.data.data;
  },

  updateSettings: async (data: Partial<PlatformSettingsData>): Promise<PlatformSettingsData> => {
    const res = await apiClient.patch<ApiResponseWrapper<PlatformSettingsData>>('/platform/settings', data);
    return res.data.data;
  },
};

// ── Company Admin Dashboard API ───────────────────────────────────
export type DashboardGranularity = "hour" | "day" | "week" | "month";

export interface CompanyDashboardKpis {
  totalCalls: number;
  connectedCalls: number;
  missedCalls: number;
  failedCalls: number;
  transferredCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  avgDuration: number;
  totalMinutes: number;
  connectRate: number;
  qualifiedLeads: number;
  appointments: number;
  closedWon: number;
  appointmentRate: number;
  conversionRate: number;
  avgSentiment: number;
  aiAnalyses: number;
}

export interface CompanyDashboardTimeSeriesPoint {
  bucket: string;
  totalCalls: number;
  connectedCalls: number;
  missedCalls: number;
  failedCalls: number;
  avgSentiment: number;
  totalMinutes: number;
}

export interface CompanyDashboardOutcome {
  outcome: string;
  count: number;
  pct: number;
}

export interface CompanyAgentPerformance {
  id: string;
  name: string;
  role: string;
  status: string;
  managerId: string | null;
  managerName: string | null;
  totalCalls: number;
  connectedCalls: number;
  missedCalls: number;
  failedCalls: number;
  qualifiedLeads: number;
  connectRate: number;
  avgDuration: number;
  avgSentiment: number;
  avgQuality: number;
}

export interface CompanyTeamPerformance {
  id: string;
  name: string;
  agentCount: number;
  totalCalls: number;
  connectedCalls: number;
  qualifiedLeads: number;
  missedCalls: number;
  failedCalls: number;
  connectRate: number;
}

export interface CompanyActiveCampaign {
  id: string;
  name: string;
  status: string;
  agentId: string;
  agentName: string;
  scheduledAt: string | null;
  createdAt: string;
  progress: Record<string, number>;
  total: number;
  completed: number;
  failed: number;
  pending: number;
}

export interface CompanyAlert {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  createdAt: string;
}

export interface CompanyDashboardData {
  period: { from: string; to: string; label: string };
  comparison: { from: string; to: string; label: string };
  granularity: DashboardGranularity;
  kpis: { current: CompanyDashboardKpis; previous: CompanyDashboardKpis };
  facts: { activeAgents: number; teamMembers: number };
  timeSeries: CompanyDashboardTimeSeriesPoint[];
  outcomes: CompanyDashboardOutcome[];
  agentPerformance: CompanyAgentPerformance[];
  teamPerformance: CompanyTeamPerformance[];
  activeCampaigns: CompanyActiveCampaign[];
  alerts: CompanyAlert[];
  generatedAt: string;
}

export const companyDashboardApi = {
  get: async (params?: {
    from?: string;
    to?: string;
    prevFrom?: string;
    prevTo?: string;
    granularity?: DashboardGranularity;
  }): Promise<CompanyDashboardData> => {
    const res = await apiClient.get<ApiResponseWrapper<CompanyDashboardData>>(
      "/analytics/company-dashboard",
      { params }
    );
    return res.data.data;
  },
};

// ── Company Usage API ─────────────────────────────────────────────
export const companyUsageApi = {
  get: (): Promise<TenantUsage> => tenantApi.usage(),
};

// ── Company Audit API ─────────────────────────────────────────────
export interface CompanyAuditLogItem {
  id: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

export const auditApi = {
  list: async (params?: {
    action?: string;
    resource?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: CompanyAuditLogItem[]; total: number; page: number; limit: number; pages: number }> => {
    const res = await apiClient.get<
      ApiResponseWrapper<{ items: CompanyAuditLogItem[]; total: number; page: number; limit: number; pages: number }>
    >("/audit/logs", { params });
    return res.data.data;
  },
};

// ── Phone Numbers API ─────────────────────────────────────────────
export interface PhoneNumberItem {
  id: string;
  number: string;
  provider: string;
  label: string | null;
  isInbound: boolean;
  isOutbound: boolean;
  status: "available" | "assigned" | "inactive" | string;
  tenantId: string;
  assignedAgentId: string | null;
  assignedAgent?: { id: string; name: string; role: string; status?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const numbersApi = {
  list: async (params?: {
    status?: string;
    provider?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: PhoneNumberItem[]; total: number; page: number; limit: number }> => {
    const res = await apiClient.get<ApiResponseWrapper<{ items: PhoneNumberItem[]; total: number; page: number; limit: number }>>(
      "/phone-numbers",
      { params }
    );
    return res.data.data;
  },

  create: async (dto: {
    number: string;
    provider?: string;
    label?: string;
    isInbound?: boolean;
    isOutbound?: boolean;
    status?: string;
  }): Promise<PhoneNumberItem> => {
    const res = await apiClient.post<ApiResponseWrapper<PhoneNumberItem>>("/phone-numbers", dto);
    return res.data.data;
  },

  update: async (id: string, dto: {
    provider?: string;
    label?: string;
    isInbound?: boolean;
    isOutbound?: boolean;
    status?: string;
    assignedAgentId?: string | null;
  }): Promise<PhoneNumberItem> => {
    const res = await apiClient.patch<ApiResponseWrapper<PhoneNumberItem>>(`/phone-numbers/${id}`, dto);
    return res.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/phone-numbers/${id}`);
  },
};

// ── Knowledge Base API ────────────────────────────────────────────
export interface KnowledgeSourceItem {
  id: string;
  name: string;
  type: string;
  content?: string | null;
  sourceUrl?: string | null;
  status: "ready" | "processing" | "failed" | "outdated" | string;
  tags: string[];
  lastIndexedAt?: string | null;
  errorMessage?: string | null;
  agentId?: string | null;
  agent?: { id: string; name: string; role: string } | null;
  createdBy?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const knowledgeApi = {
  list: async (params?: {
    search?: string;
    type?: string;
    status?: string;
    agentId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: KnowledgeSourceItem[]; total: number; page: number; limit: number }> => {
    const res = await apiClient.get<ApiResponseWrapper<{ items: KnowledgeSourceItem[]; total: number; page: number; limit: number }>>(
      "/knowledge-base",
      { params }
    );
    return res.data.data;
  },

  get: async (id: string): Promise<KnowledgeSourceItem> => {
    const res = await apiClient.get<ApiResponseWrapper<KnowledgeSourceItem>>(`/knowledge-base/${id}`);
    return res.data.data;
  },

  create: async (dto: {
    name: string;
    type?: string;
    content?: string;
    sourceUrl?: string;
    tags?: string[];
    agentId?: string;
  }): Promise<KnowledgeSourceItem> => {
    const res = await apiClient.post<ApiResponseWrapper<KnowledgeSourceItem>>("/knowledge-base", dto);
    return res.data.data;
  },

  update: async (id: string, dto: {
    name?: string;
    type?: string;
    content?: string;
    sourceUrl?: string;
    tags?: string[];
    status?: string;
    agentId?: string | null;
  }): Promise<KnowledgeSourceItem> => {
    const res = await apiClient.patch<ApiResponseWrapper<KnowledgeSourceItem>>(`/knowledge-base/${id}`, dto);
    return res.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/knowledge-base/${id}`);
  },
};

