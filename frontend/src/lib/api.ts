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

export const healthApi = {
  check: async () => {
    const res = await apiClient.get<ApiResponseWrapper<{ status: string }>>(
      "/health"
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
}

export const callsApi = {
  list: async (params?: {
    status?: string;
    agentId?: string;
    leadId?: string;
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
};

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
};

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
};

