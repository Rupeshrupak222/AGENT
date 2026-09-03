"use client";

import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Permission } from "@/lib/permissions";

interface PermissionGateProps {
  /** Required permission(s) — user must have ALL of these */
  requires?: Permission | Permission[];
  /** Deny if user has ANY of these permissions */
  denies?: Permission | Permission[];
  /** Required role(s) — user must have one of these */
  roles?: string[];
  /** Fallback content when access is denied */
  fallback?: ReactNode;
  /** Children to render when access is granted */
  children: ReactNode;
}

/**
 * Conditional rendering component based on permissions.
 *
 * IMPORTANT: This is a UX layer only. The backend must enforce authorization independently.
 * Use this to hide/show UI elements, not as a security boundary.
 */
export function PermissionGate({
  requires,
  denies,
  roles,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, canAll, canAny, role } = usePermissions();

  // Check role-based access
  if (roles && roles.length > 0) {
    if (!roles.includes(role)) {
      return <>{fallback}</>;
    }
  }

  // Check denied permissions (if user has ANY of these, deny access)
  if (denies) {
    const denyList = Array.isArray(denies) ? denies : [denies];
    if (canAny(...denyList)) {
      return <>{fallback}</>;
    }
  }

  // Check required permissions (user must have ALL of these)
  if (requires) {
    const reqList = Array.isArray(requires) ? requires : [requires];
    if (!canAll(...reqList)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
