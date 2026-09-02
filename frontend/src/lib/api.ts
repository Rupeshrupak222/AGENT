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
