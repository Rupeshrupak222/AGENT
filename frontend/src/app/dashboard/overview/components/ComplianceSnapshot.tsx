"use client";

import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import type { CompanyDashboardData } from "@/lib/api";
import { SectionHeader, Skeleton } from "./shared";

export function ComplianceSnapshot({
  dashboard,
  isLoading,
}: {
  dashboard: CompanyDashboardData | null;
  isLoading: boolean;
}) {
  const calc = useMemo(() => {
    const k = dashboard?.kpis?.current;
    const total = k?.totalCalls ?? 0;
    const withAnalysis = k?.aiAnalyses ?? 0;
    const transferred = k?.transferredCalls ?? 0;
    const inbound = k?.inboundCalls ?? 0;
    const failed = k?.failedCalls ?? 0;

    const analysisCoverage = total > 0 ? Math.round((withAnalysis / total) * 100) : 0;
    const humanOverrideRate = total > 0 ? Math.round((transferred / total) * 100) : 0;
    const inboundRate = total > 0 ? Math.round((inbound / total) * 100) : 0;
    const failedRate = total > 0 ? Math.round((failed / total) * 100) : 0;

    const campaigns = dashboard?.activeCampaigns ?? [];
    const running = campaigns.filter((c) => c.status === "running").length;
    const paused = campaigns.filter((c) => c.status === "paused" || c.status === "cancelled").length;

    const topOutcomes = (dashboard?.outcomes ?? [])
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const verdict =
      analysisCoverage >= 70 && failedRate <= 12
        ? "Compliance posture is healthy — high analysis coverage with a low carrier-failure rate."
        : analysisCoverage < 70
          ? `Compliance gap — only ${analysisCoverage}% of calls have post-call analysis for audit trail. Retry failed analyses.`
          : "Watch deliveries — carrier failures are above the 12% comfort threshold.";

    return {
      total,
      analysisCoverage,
      humanOverrideRate,
      inboundRate,
      failedRate,
      running,
      paused,
      topOutcomes,
      verdict,
    };
  }, [dashboard]);

  const gauges = [
    { label: "Analysis coverage", value: calc.analysisCoverage, color: "bg-emerald-500" },
    { label: "Carrier failures", value: calc.failedRate, color: calc.failedRate > 12 ? "bg-rose-500" : "bg-sky-500" },
    { label: "Human override", value: calc.humanOverrideRate, color: "bg-violet-500" },
    { label: "Inbound calls", value: calc.inboundRate, color: "bg-amber-500" },
  ];

  return (
    <div className="rounded-2xl bg-white dark:bg-modal border border-slate-200 dark:border-white/15 p-4 sm:p-5 shadow-sm min-w-0">
      <SectionHeader
        icon={<ShieldCheck className="w-[18px] h-[18px]" />}
        title="Compliance & Audit Snapshot"
        subtitle={`${calc.running} campaigns live · ${calc.paused} paused`}
      />

      {isLoading && !dashboard ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {gauges.map((g) => (
              <div key={g.label} className="rounded-xl border border-slate-200 dark:border-white/10 p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-white/50">{g.label}</p>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white">{g.value}%</p>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                  <div className={`h-full rounded-full ${g.color}`} style={{ width: `${Math.min(100, g.value)}%` }} />
                </div>
              </div>
            ))}
          </div>

          {calc.topOutcomes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {calc.topOutcomes.map((o) => (
                <span
                  key={o.outcome}
                  className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-[9px] font-semibold text-slate-500 dark:text-white/50 capitalize"
                >
                  {o.outcome.replace(/_/g, " ")} · {o.count}
                </span>
              ))}
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-white/70 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5">
            {calc.verdict}
          </p>
        </>
      )}
    </div>
  );
}