"use client";

import { motion } from "framer-motion";
import { Filter, ArrowDown } from "lucide-react";
import type { CompanyDashboardKpis } from "@/lib/api";

const STAGES = [
  { key: "leads", label: "Leads Dialed", color: "from-sky-500 to-blue-600", text: "text-blue-500" },
  { key: "connected", label: "Connected", color: "from-emerald-500 to-teal-600", text: "text-emerald-500" },
  { key: "qualified", label: "Qualified Leads", color: "from-brand-500 to-amber-600", text: "text-brand-500" },
  { key: "appointments", label: "Appointments", color: "from-amber-500 to-orange-600", text: "text-amber-500" },
  { key: "closedWon", label: "Closed Won", color: "from-purple-500 to-fuchsia-600", text: "text-purple-500" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

function stageCount(k: StageKey, kpis: CompanyDashboardKpis): number {
  switch (k) {
    case "leads": return kpis.totalCalls;
    case "connected": return kpis.connectedCalls;
    case "qualified": return kpis.qualifiedLeads;
    case "appointments": return kpis.appointments;
    case "closedWon": return kpis.closedWon;
  }
}

function stagePrevCount(k: StageKey, prev: CompanyDashboardKpis | undefined): number | null {
  if (!prev) return null;
  const cur = stageCount(k, prev);
  return cur;
}

function DeltaBadge({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null || current === 0) return null;
  const delta = previous === 0 ? null : ((current - previous) / previous) * 100;
  if (delta === null) return <span className="text-[10px] font-mono text-emerald-500">new</span>;
  const up = delta >= 0;
  return (
    <span className={`text-[10px] font-mono font-semibold ${up ? "text-emerald-500" : "text-rose-500"}`}>
      {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

export function PipelineFunnel({
  kpis,
  prev,
  isLoading,
}: {
  kpis?: CompanyDashboardKpis | null;
  prev?: CompanyDashboardKpis | null;
  isLoading?: boolean;
}) {
  const counts = STAGES.map((s) => stageCount(s.key, kpis ?? ({} as CompanyDashboardKpis)));
  const max = Math.max(1, ...counts);
  const totalStages = STAGES.length;

  return (
    <div className="rounded-2xl p-5 panel-card min-w-0">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <Filter className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pipeline Funnel</h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Dialed leads → qualified pipeline → closed won
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 mt-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2 mt-4">
          {STAGES.map((stage, idx) => {
            const cur = counts[idx];
            const pv = stagePrevCount(stage.key, prev ?? undefined);
            const width = (cur / max) * 100;
            const prevStage = idx > 0 ? counts[idx - 1] : 0;
            const conv = prevStage > 0 ? (cur / prevStage) * 100 : 0;
            return (
              <div key={stage.key} className="flex items-center gap-3 group">
                <div className="w-28 flex-shrink-0">
                  <p className={`text-[11px] font-bold ${stage.text} truncate`}>{stage.label}</p>
                  <p className="text-[10px] font-mono text-slate-400 dark:text-white/40">
                    {cur.toLocaleString()}
                    {conv > 0 ? ` · ${conv.toFixed(0)}%` : ""}
                  </p>
                </div>
                <div className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] overflow-hidden relative">
                  <motion.div
                    className={`h-full rounded-xl bg-gradient-to-r ${stage.color} flex items-center justify-end px-2`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(2, width)}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <div className="w-16 flex-shrink-0 flex items-center justify-end">
                  <DeltaBadge current={cur} previous={pv} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] text-[10px] font-mono text-slate-400 dark:text-white/40">
        <ArrowDown className="w-3 h-3 text-brand-500" />
        End-to-end conversion:{" "}
        <span className="font-bold text-slate-700 dark:text-white/70">
          {counts[totalStages - 1] > 0 && counts[0] > 0
            ? ((counts[totalStages - 1] / counts[0]) * 100).toFixed(2)
            : "0.00"}
          %
        </span>
      </div>
    </div>
  );
}