"use client";

import { TrendingUp, TrendingDown, Minus, AlertTriangle, Info, RefreshCw } from "lucide-react";
import type { CompanyAlert, DashboardGranularity } from "@/lib/api";
import type { PeriodPreset, DashboardRange } from "@/lib/dashboard-range";

export const OUTCOME_COLORS = [
  "#D42027",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#f97316",
  "#94a3b8",
];

export const PERIOD_OPTIONS: Array<{ key: PeriodPreset; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "7D" },
  { key: "last30", label: "30D" },
  { key: "last90", label: "90D" },
  { key: "ytd", label: "YTD" },
  { key: "custom", label: "Custom" },
];

export function fmtBucket(iso: string, granularity: DashboardGranularity): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  if (granularity === "hour") {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (granularity === "month") {
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fmtRangeLabel(range: DashboardRange): string {
  const f = new Date(range.from);
  const t = new Date(range.to);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${f.toLocaleDateString(undefined, opts)} → ${t.toLocaleDateString(undefined, opts)}`;
}

export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function DeltaPill({
  current,
  previous,
  invert = false,
}: {
  current: number;
  previous: number;
  invert?: boolean;
}) {
  if (current === 0 && previous === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/50">
        <Minus className="w-3 h-3" /> Flat
      </span>
    );
  }

  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        <TrendingUp className="w-3 h-3" /> New
      </span>
    );
  }

  const delta = pctDelta(current, previous) ?? 0;
  const up = delta >= 0;
  const positive = invert ? !up : up;
  const cls = positive
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

export const SEVERITY_STYLES: Record<CompanyAlert["severity"], { icon: any; cls: string; ring: string }> = {
  critical: { icon: AlertTriangle, cls: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300", ring: "text-rose-500" },
  warning: { icon: AlertTriangle, cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300", ring: "text-amber-500" },
  info: { icon: Info, cls: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300", ring: "text-sky-500" },
};

export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#180406] dark:bg-modal shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-900 dark:text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-500 dark:text-white/60 capitalize">{p.name}:</span>
          </div>
          <span className="text-slate-900 dark:text-white font-mono font-bold">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Skeleton({ className = "h-6 w-24" }: { className?: string }) {
  return <div className={`${className} rounded-lg bg-slate-200/70 dark:bg-white/[0.06] animate-pulse`} />;
}

export function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-brand-500 dark:text-brand-400">{icon}</span>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function RefreshButton({
  isRefreshing,
  onRefresh,
  label,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-50 transition-colors"
    >
      <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-brand-500 dark:text-brand-400" : ""}`} />
      {isRefreshing ? "Refreshing…" : label ?? "Refresh"}
    </button>
  );
}