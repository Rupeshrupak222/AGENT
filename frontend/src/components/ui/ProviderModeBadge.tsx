import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export type ProviderMode =
  | "mock"
  | "configured"
  | "connected"
  | "unavailable"
  | "error";

export interface CalendarProviderStatusLike {
  provider?: string;
  configured?: boolean;
  isMock?: boolean;
  success?: boolean;
  message?: string;
}

export interface ProviderStatusItemLike {
  provider?: string;
  state?: "not_connected" | "configured" | "connected" | "mock_mode" | "disabled";
  isConfigured?: boolean;
  isMock?: boolean;
}

const MODE_STYLES: Record<ProviderMode, { label: string; cls: string; dot: string }> = {
  mock: {
    label: "Mock provider",
    cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dot: "bg-amber-500",
  },
  configured: {
    label: "Configured",
    cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    dot: "bg-blue-500",
  },
  connected: {
    label: "Connected",
    cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  unavailable: {
    label: "Not configured",
    cls: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/[0.05] dark:text-white/40 dark:border-white/10",
    dot: "bg-gray-400 dark:bg-white/30",
  },
  error: {
    label: "Error",
    cls: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    dot: "bg-red-500",
  },
};

/** Derive a normalized mode from the calendar provider status payload. */
export function deriveCalendarProviderMode(status: CalendarProviderStatusLike | null | undefined): ProviderMode {
  if (!status) return "unavailable";
  if (status.isMock) return "mock";
  if (status.configured && status.success) return "connected";
  if (status.configured) return "configured";
  return status.message ? "error" : "unavailable";
}

/** Derive a normalized mode from the automation provider status payload. */
export function deriveAutomationProviderMode(status: ProviderStatusItemLike | null | undefined): ProviderMode {
  if (!status) return "unavailable";
  if (status.isMock) return "mock";
  switch (status.state) {
    case "connected":
      return "connected";
    case "configured":
      return "configured";
    case "mock_mode":
      return "mock";
    case "not_connected":
      return "unavailable";
    case "disabled":
      return "unavailable";
    default:
      return status.isConfigured ? "configured" : "unavailable";
  }
}

interface ProviderModeBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  mode: ProviderMode;
  provider?: string;
  label?: string;
  withDot?: boolean;
}

export function ProviderModeBadge({
  mode,
  provider,
  label,
  withDot = true,
  className,
  ...props
}: ProviderModeBadgeProps) {
  const cfg = MODE_STYLES[mode];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[10px] font-bold border whitespace-nowrap",
        cfg.cls,
        className
      )}
      {...props}
    >
      {withDot && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />}
      {provider ? `${provider}: ` : ""}
      {label || cfg.label}
    </span>
  );
}