"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";
import type { CompanyDashboardData } from "@/lib/api";
import { SectionHeader, Skeleton } from "./shared";

export function CallQualityScorecard({
  dashboard,
  isLoading,
}: {
  dashboard: CompanyDashboardData | null;
  isLoading: boolean;
}) {
  const agents = useMemo(() => dashboard?.agentPerformance ?? [], [dashboard]);

  const metrics = useMemo(() => {
    const withData = agents.filter((a) => a.totalCalls > 0);
    const teamQuality = withData.length
      ? withData.reduce((s, a) => s + (a.avgQuality ?? 0), 0) / withData.length
      : 0;
    const teamSentiment = withData.length
      ? withData.reduce((s, a) => s + (a.avgSentiment ?? 0), 0) / withData.length
      : 0;
    const maxQuality = Math.max(1, ...withData.map((a) => a.avgQuality ?? 0));
    const maxSentiment = Math.max(1, ...withData.map((a) => a.avgSentiment ?? 0));
    return { teamQuality, teamSentiment, maxQuality, maxSentiment };
  }, [agents]);

  const pct = (v: number, max: number) => Math.min(100, Math.round((v / max) * 100));

  return (
    <div className="rounded-2xl bg-white dark:bg-modal border border-slate-200 dark:border-white/15 p-4 sm:p-5 shadow-sm min-w-0">
      <SectionHeader
        icon={<Star className="w-[18px] h-[18px]" />}
        title="Call Quality Scorecard"
        subtitle="Quality & sentiment by AI agent"
      />

      {isLoading && agents.length === 0 ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-white/50 text-center py-6">
          No agent call data in the selected period.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-5 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
            <div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                {(metrics.teamQuality).toFixed(1)}
              </p>
              <p className="text-[10px] font-medium text-slate-500 dark:text-white/50">
                Team quality score
              </p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
            <div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                {metrics.teamSentiment.toFixed(2)}
              </p>
              <p className="text-[10px] font-medium text-slate-500 dark:text-white/50">
                Avg sentiment / 5
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {agents.slice(0, 6).map((a) => (
              <div key={a.id}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-white/80 truncate">
                    {a.name}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-white/40 flex-shrink-0">
                    {a.totalCalls.toLocaleString()} calls · {a.connectRate}% conn
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                      style={{ width: `${pct(a.avgQuality ?? 0, metrics.maxQuality)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/50 w-8 text-right">
                    {(a.avgQuality ?? 0).toFixed(1)}
                  </span>
                  <div className="w-12 h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-brand-500"
                      style={{ width: `${pct(a.avgSentiment ?? 0, metrics.maxSentiment)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/50 w-8 text-right">
                    {(a.avgSentiment ?? 0).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}