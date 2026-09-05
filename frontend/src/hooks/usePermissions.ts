"use client";

import { useAuthStore } from "@/store/auth.store";
import { Permission, PERMISSIONS, hasPermission, hasAllPermissions, hasAnyPermission } from "@/lib/permissions";

/**
 * Hook for checking permissions in React components.
 *
 * IMPORTANT: This is a UX-only layer. The backend is the authoritative security boundary.
 * Use this hook for:
 * - Hiding/showing UI elements
 * - Enabling/disabling buttons
 * - Showing/hiding navigation items
 *
 * NEVER rely on this hook for actual security. The API must independently enforce authorization.
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "").toLowerCase().trim();

  const can = (permission: Permission): boolean => {
    if (!role) return false;
    return hasPermission(role, permission);
  };

  const canAll = (...permissions: Permission[]): boolean => {
    if (!role) return false;
    return hasAllPermissions(role, permissions);
  };

  const canAny = (...permissions: Permission[]): boolean => {
    if (!role) return false;
    return hasAnyPermission(role, permissions);
  };

  const isRole = (r: string) => role === r;
  const isAdmin = isRole("company_admin") || isRole("super_admin");
  const isManager = isRole("manager") || isAdmin;
  const isAgent = isRole("agent") || isManager;
  const isViewer = isRole("viewer") || isAgent;
  const isSuperAdmin = isRole("super_admin");

  return {
    role,
    can,
    canAll,
    canAny,
    isRole,
    isAdmin,
    isManager,
    isAgent,
    isViewer,
    isSuperAdmin,
    PERMISSIONS,
  };
}
