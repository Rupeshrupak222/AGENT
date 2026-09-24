"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import type { CompanyDashboardData } from "@/lib/api";
import { SectionHeader, Skeleton } from "./shared";

const MEDALS = ["text-amber-400", "text-slate-400", "text-orange-400"];

export function AgentLeaderboard({
  dashboard,
  isLoading,
}: {
  dashboard: CompanyDashboardData | null;
  isLoading: boolean;
}) {
  const agents = useMemo(() => dashboard?.agentPerformance ?? [], [dashboard]);
  const teamConnectRate = dashboard?.kpis?.current?.connectRate ?? null;

  const ranked = useMemo(
    () =>
      agents
        .filter((a) => a.totalCalls > 0)
        .slice()
        .sort((a, b) => b.totalCalls - a.totalCalls)
        .slice(0, 8),
    [agents]
  );

  const maxCalls = Math.max(1, ...ranked.map((a) => a.totalCalls));
  const maxLeads = Math.max(1, ...ranked.map((a) => a.qualifiedLeads));

  return (
    <div className="rounded-2xl bg-white dark:bg-modal border border-slate-200 dark:border-white/15 p-4 sm:p-5 shadow-sm min-w-0">
      <SectionHeader
        icon={<Trophy className="w-[18px] h-[18px]" />}
        title="Agent Leaderboard"
        subtitle="Highest call volume this period"
      />

      {isLoading && ranked.length === 0 ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-white/50 text-center py-6">No agent call data yet.</p>
      ) : (
        <div className="space-y-1">
          {ranked.map((a, i) => {
            const callsWeight = (a.totalCalls / maxCalls) * 100;
            const leadsWeight = (a.qualifiedLeads / maxLeads) * 100;
            const aboveTeam = teamConnectRate !== null && a.connectRate >= teamConnectRate;
            return (
              <div key={a.id} className="rounded-xl px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 ${MEDALS[i] ?? "bg-slate-100 dark:bg-white/[0.06] text-slate-500"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{a.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-white/40">
                        {a.totalCalls.toLocaleString()} calls · {a.connectRate}% conn
                        {aboveTeam ? " · above team avg" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-bold text-violet-500">{a.qualifiedLeads} leads</span>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-white/40">
                      {(a.avgSentiment ?? 0).toFixed(1)} S · {(a.avgQuality ?? 0).toFixed(1)} Q
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                      style={{ width: `${callsWeight}%` }}
                    />
                  </div>
                  <div className="w-16 h-1 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-brand-500"
                      style={{ width: `${leadsWeight}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}