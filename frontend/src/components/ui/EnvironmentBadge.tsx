import React, { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type EnvironmentMode = "LIVE" | "SANDBOX" | "MOCK" | "DEGRADED" | "OFFLINE";

interface EnvironmentBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  mode: EnvironmentMode;
  cluster?: string;
  pulse?: boolean;
}

const ENV_STYLES: Record<EnvironmentMode, { label: string; bg: string; text: string; border: string; dot: string }> = {
  LIVE: {
    label: "LIVE",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  SANDBOX: {
    label: "SANDBOX",
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  MOCK: {
    label: "MOCK",
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
  },
  DEGRADED: {
    label: "DEGRADED",
    bg: "bg-orange-500/10 dark:bg-orange-500/15",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-500/30",
    dot: "bg-orange-500",
  },
  OFFLINE: {
    label: "OFFLINE",
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
  },
};

export function EnvironmentBadge({
  mode,
  cluster,
  pulse = true,
  className,
  ...props
}: EnvironmentBadgeProps) {
  const conf = ENV_STYLES[mode] || ENV_STYLES.MOCK;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border select-none",
        conf.bg,
        conf.text,
        conf.border,
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          conf.dot,
          pulse && mode === "LIVE" && "animate-pulse"
        )}
      />
      <span>{conf.label}</span>
      {cluster && (
        <span className="opacity-60 text-[9px] font-normal tracking-normal border-l pl-1 border-current">
          {cluster}
        </span>
      )}
    </span>
  );
}
