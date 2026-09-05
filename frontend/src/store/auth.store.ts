import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setSessionCookie, clearSessionCookie } from "@/lib/session-cookie";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  avatar?: string;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, tenant: AuthTenant, accessToken: string, refreshToken?: string) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  logout: () => void;
  updateUser: (data: Partial<AuthUser>) => void;
  updateTenant: (data: Partial<AuthTenant>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, tenant, accessToken, refreshToken) => {
        setSessionCookie();
        return set({
          user,
          tenant,
          accessToken,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
        });
      },

      setTokens: (accessToken, refreshToken) => {
        setSessionCookie();
        return set((state) => ({
          accessToken,
          refreshToken: refreshToken !== undefined ? refreshToken : state.refreshToken,
        }));
      },

      logout: () => {
        clearSessionCookie();
        return set({
          user: null,
          tenant: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      updateUser: (data) =>
        set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),

      updateTenant: (data) =>
        set((s) => ({ tenant: s.tenant ? { ...s.tenant, ...data } : null })),
    }),
    {
      name: "agentcall-auth",
      partialize: (s) => ({
        user: s.user,
        tenant: s.tenant,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
);
