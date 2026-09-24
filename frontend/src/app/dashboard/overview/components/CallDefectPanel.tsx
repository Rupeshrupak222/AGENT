"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Wrench } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { CompanyDashboardKpis, CompanyDashboardTimeSeriesPoint } from "@/lib/api";

const DEFECT_ROWS = [
  { key: "missedCalls", label: "Missed", color: "#f59e0b", ring: "text-amber-500" },
  { key: "failedCalls", label: "Failed", color: "#f43f5e", ring: "text-rose-500" },
  { key: "transferredCalls", label: "Transferred", color: "#8b5cf6", ring: "text-violet-500" },
] as const;

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-modal shadow-lg px-3 py-2 text-xs text-slate-900 dark:text-white">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500 dark:text-white/60 capitalize">{p.name}:</span>
          <span className="font-mono font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function CallDefectPanel({
  kpis,
  timeSeries,
  isLoading,
}: {
  kpis?: CompanyDashboardKpis | null;
  timeSeries?: CompanyDashboardTimeSeriesPoint[];
  isLoading?: boolean;
}) {
  const chartData = useMemo(
    () =>
      (timeSeries ?? []).map((p) => ({
        label: new Date(p.bucket).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        missed: p.missedCalls,
        failed: p.failedCalls,
      })),
    [timeSeries]
  );

  const total = (kpis?.totalCalls ?? 0) || 1;
  const rows = DEFECT_ROWS.map((r) => ({ ...r, value: kpis?.[r.key] ?? 0 }));

  return (
    <div className="rounded-2xl p-5 panel-card min-w-0">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Wrench className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Call Defect Monitor</h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Missed, failed & transferred calls in this period
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-slate-500 dark:text-white/40">
          {(kpis?.missedCalls ?? 0) + (kpis?.failedCalls ?? 0)} defects
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mt-4">
        {rows.map((r) => {
          const pct = (r.value / total) * 100;
          return (
            <motion.div
              key={r.key}
              whileHover={{ y: -3 }}
              className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] hover:border-rose-500/30 transition-colors"
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                <span className="text-slate-400 dark:text-white/40">{r.label}</span>
                <span className={`${r.ring} font-bold`}>{r.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: r.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, pct)}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-white/40 mt-1.5 font-mono">{pct.toFixed(1)}%</p>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 text-[11px] font-mono text-slate-500 dark:text-white/50 px-1">
        <span>Inbound: <strong className="text-slate-800 dark:text-white/80">{kpis?.inboundCalls ?? 0}</strong></span>
        <span>Outbound: <strong className="text-slate-800 dark:text-white/80">{kpis?.outboundCalls ?? 0}</strong></span>
        <span>Total: <strong className="text-slate-800 dark:text-white/80">{kpis?.totalCalls ?? 0}</strong></span>
      </div>

      <div className="h-28 mt-4">
        {isLoading ? (
          <div className="h-full w-full rounded-xl bg-slate-100 dark:bg-white/[0.03] animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-[11px] text-slate-400 dark:text-white/30 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
            No defect trend data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMissed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="missed" name="Missed" stroke="#f59e0b" strokeWidth={2} fill="url(#gradMissed)" />
              <Area type="monotone" dataKey="failed" name="Failed" stroke="#f43f5e" strokeWidth={2} fill="url(#gradFailed)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}