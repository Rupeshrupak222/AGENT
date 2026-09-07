"use client";

import { CheckCircle2, Phone, Clock, AlertTriangle } from "lucide-react";
import { CampaignMetrics } from "@/lib/api";

interface CampaignProgressBarProps {
  metrics: CampaignMetrics | null;
  status: string;
}

export function CampaignProgressBar({ metrics, status }: CampaignProgressBarProps) {
  const total = metrics?.totalLeads ?? 0;
  const completed = metrics?.completed ?? 0;
  const failed = metrics?.failed ?? 0;
  const skipped = metrics?.skipped ?? 0;
  const calling = metrics?.calling ?? 0;
  const queued = metrics?.queued ?? 0;
  const pending = metrics?.pending ?? 0;

  const processed = completed + failed + skipped;
  const percentage = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  const completedPct = total > 0 ? (completed / total) * 100 : 0;
  const callingPct = total > 0 ? (calling / total) * 100 : 0;
  const queuedPct = total > 0 ? (queued / total) * 100 : 0;
  const failedPct = total > 0 ? ((failed + skipped) / total) * 100 : 0;

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-surface-card border border-slate-200/80 dark:border-white/5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
              Execution Progress
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                status === "running"
                  ? "bg-emerald-500/10 text-emerald-500 animate-pulse"
                  : status === "paused"
                  ? "bg-amber-500/10 text-amber-500"
                  : status === "completed"
                  ? "bg-blue-500/10 text-blue-500"
                  : "bg-slate-500/10 text-slate-400"
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
            <span className="font-bold text-slate-900 dark:text-white">{processed}</span> of{" "}
            <span className="font-bold text-slate-900 dark:text-white">{total}</span> contacts processed
          </p>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-brand-600 dark:text-brand-400">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Multi-segment Progress Track */}
      <div className="w-full h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex shadow-inner">
        {/* Completed Segment (Green) */}
        <div
          style={{ width: `${completedPct}%` }}
          className="bg-emerald-500 transition-all duration-500"
          title={`Completed: ${completed}`}
        />
        {/* Calling Segment (Blue) */}
        <div
          style={{ width: `${callingPct}%` }}
          className="bg-blue-500 animate-pulse transition-all duration-500"
          title={`Calling: ${calling}`}
        />
        {/* Queued Segment (Amber) */}
        <div
          style={{ width: `${queuedPct}%` }}
          className="bg-amber-400 transition-all duration-500"
          title={`Queued: ${queued}`}
        />
        {/* Failed Segment (Red) */}
        <div
          style={{ width: `${failedPct}%` }}
          className="bg-rose-500 transition-all duration-500"
          title={`Failed/Skipped: ${failed + skipped}`}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-white/50 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Completed ({completed})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Active Calling ({calling})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Queued ({queued})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Failed / Skipped ({failed + skipped})</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-white/20" />
          <span>Pending ({pending})</span>
        </div>
      </div>
    </div>
  );
}
