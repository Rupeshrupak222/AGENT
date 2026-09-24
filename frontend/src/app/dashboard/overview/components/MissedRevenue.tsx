"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingDown } from "lucide-react";
import type { CompanyDashboardData } from "@/lib/api";
import { Skeleton } from "./shared";

const DEFAULT_AVG_DEAL = 40000;

const inr = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");

export function MissedRevenue({
  dashboard,
  isLoading,
}: {
  dashboard: CompanyDashboardData | null;
  isLoading: boolean;
}) {
  const [avgDeal, setAvgDeal] = useState(DEFAULT_AVG_DEAL);

  useEffect(() => {
    const saved = Number(localStorage.getItem("ac_avg_deal_value"));
    if (!Number.isNaN(saved) && saved > 0) setAvgDeal(saved);
  }, []);

  const calc = useMemo(() => {
    const k = dashboard?.kpis?.current;
    const totalCalls = k?.totalCalls ?? 0;
    const missed = k?.missedCalls ?? 0;
    const failed = k?.failedCalls ?? 0;
    const closedWon = k?.closedWon ?? 0;
    const closeRate = totalCalls > 0 ? closedWon / totalCalls : 0;
    const recoveryBias = 0.5;

    const missedPotential = missed * avgDeal * closeRate * recoveryBias;
    const failedPotential = failed * avgDeal * closeRate * recoveryBias;
    const totalPotential = missedPotential + failedPotential;
    const closedRevenue = closedWon * avgDeal;
    const pctOfClosed = closedRevenue > 0 ? (totalPotential / closedRevenue) * 100 : 0;

    return {
      missed,
      failed,
      lostCalls: missed + failed,
      closeRate,
      totalPotential,
      missedPotential,
      failedPotential,
      pctOfClosed,
      closedRevenue,
    };
  }, [dashboard, avgDeal]);

  const max = Math.max(1, calc.missedPotential, calc.failedPotential);

  return (
    <div className="rounded-2xl bg-white dark:bg-modal border border-slate-200 dark:border-white/15 p-4 sm:p-5 shadow-sm">
      {isLoading && !dashboard ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <div className="grid md:grid-cols-[auto_1fr_1fr] gap-4 items-center">
          <div className="flex items-center gap-3 min-w-[220px]">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-white/50">
                Missed-Revenue Impact
              </p>
              <p className="text-xl font-extrabold text-rose-500">{inr(calc.totalPotential)}</p>
              <p className="text-[10px] text-slate-400 dark:text-white/40">
                est. from {calc.lostCalls} lost calls · avg deal ₹{avgDeal.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-white/50 mb-1">
                <span>
                  Missed · {calc.missed} calls
                </span>
                <span className="font-bold text-slate-800 dark:text-white/80">{inr(calc.missedPotential)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                  style={{ width: `${Math.min(100, (calc.missedPotential / max) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-white/50 mb-1">
                <span>Failed / carrier errors · {calc.failed} calls</span>
                <span className="font-bold text-slate-800 dark:text-white/80">{inr(calc.failedPotential)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500"
                  style={{ width: `${Math.min(100, (calc.failedPotential / max) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] px-4 py-3">
            <p className="text-[11px] text-slate-500 dark:text-white/50 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${calc.pctOfClosed > 25 ? "bg-rose-500" : "bg-emerald-500"}`} />
              {calc.pctOfClosed > 25
                ? `Watch out — recovery could reach ${calc.pctOfClosed.toFixed(0)}% of closed-won value (${inr(calc.closedRevenue)}).`
                : `Healthy posture — recovery is under ${calc.pctOfClosed.toFixed(0)}% of closed-won value.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}