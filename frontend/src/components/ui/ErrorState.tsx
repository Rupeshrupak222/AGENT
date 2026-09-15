import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { AlertTriangle, Database, ShieldAlert, RefreshCw, ServerCrash } from "lucide-react";

export type ErrorCategory = "db_offline" | "auth" | "forbidden" | "network" | "server";

interface ErrorStateProps {
  title?: string;
  message?: string;
  category?: ErrorCategory;
  requestId?: string;
  onRetry?: () => void;
  icon?: ReactNode;
  className?: string;
}

export function ErrorState({
  title,
  message,
  category = "server",
  requestId,
  onRetry,
  icon,
  className,
}: ErrorStateProps) {
  const isDb = category === "db_offline" || message?.toLowerCase().includes("database") || message?.toLowerCase().includes("postgres");

  const resolvedTitle =
    title ||
    (isDb
      ? "Database Temporarily Offline"
      : category === "auth"
      ? "Session Expired"
      : category === "forbidden"
      ? "Access Restricted"
      : "Operational Service Interrupted");

  const resolvedMessage =
    message ||
    (isDb
      ? "Database connection deferred or offline. Your workspace configuration is preserved. Reconnect infrastructure and retry."
      : "We encountered an unexpected issue querying live telemetry. Please retry in a moment.");

  const defaultIcon = isDb ? (
    <Database className="w-9 h-9 text-amber-500" />
  ) : category === "forbidden" ? (
    <ShieldAlert className="w-9 h-9 text-rose-500" />
  ) : (
    <ServerCrash className="w-9 h-9 text-rose-500 dark:text-rose-400" />
  );

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]",
        className
      )}
    >
      <div
        className={cn(
          "p-3.5 rounded-2xl mb-3.5 border",
          isDb
            ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
            : "bg-rose-500/10 border-rose-500/30 text-rose-500"
        )}
      >
        {icon || defaultIcon}
      </div>

      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
        {resolvedTitle}
      </h3>
      <p className="text-xs text-slate-500 dark:text-white/60 mt-1.5 max-w-md leading-relaxed">
        {resolvedMessage}
      </p>

      {requestId && (
        <div className="mt-3 px-2.5 py-1 rounded-md bg-slate-200/60 dark:bg-white/[0.06] border border-slate-300/60 dark:border-white/10 font-mono text-[11px] text-slate-600 dark:text-white/50 select-all">
          Request ID: <span className="font-semibold text-slate-800 dark:text-white/80">{requestId}</span>
        </div>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:opacity-90 transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
}

