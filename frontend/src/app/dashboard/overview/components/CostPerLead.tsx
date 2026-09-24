"use client";

import { useMemo, useState, useEffect } from "react";
import { Coins } from "lucide-react";
import type { CompanyDashboardData } from "@/lib/api";
import { SectionHeader, Skeleton } from "./shared";

const RATE_PER_MINUTE = 2.5;
const RATE_PER_ANALYSIS = 0.35;
const DEFAULT_AVG_DEAL = 40000;

const inr = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");

export function CostPerLead({
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

  const totals = useMemo(() => {
    const k = dashboard?.kpis?.current;
    const totalMinutes = k?.totalMinutes ?? 0;
    const aiAnalyses = k?.aiAnalyses ?? 0;
    const qualifiedLeads = k?.qualifiedLeads ?? 0;
    const appointments = k?.appointments ?? 0;
    const closedWon = k?.closedWon ?? 0;

    const spend = totalMinutes * RATE_PER_MINUTE + aiAnalyses * RATE_PER_ANALYSIS;
    const cpql = qualifiedLeads > 0 ? spend / qualifiedLeads : null;
    const cpa = appointments > 0 ? spend / appointments : null;
    const revenue = closedWon * avgDeal;
    const roi = spend > 0 ? revenue / spend : null;

    return { spend, cpql, cpa, revenue, roi, qualifiedLeads, closedWon };
  }, [dashboard, avgDeal]);

  const tiles = [
    { label: "AI Spend", value: inr(totals.spend), color: "text-slate-900 dark:text-white" },
    {
      label: "Cost / Qualified Lead",
      value: totals.cpql !== null ? inr(totals.cpql) : "—",
      color: totals.cpql !== null && totals.cpql > avgDeal ? "text-rose-500" : "text-emerald-500",
    },
    { label: "Cost / Booking", value: totals.cpa !== null ? inr(totals.cpa) : "—", color: "text-sky-500" },
    { label: "Pipeline Value", value: inr(totals.revenue), color: "text-violet-500" },
  ];

  return (
    <div className="rounded-2xl bg-white dark:bg-modal border border-slate-200 dark:border-white/15 p-4 sm:p-5 shadow-sm min-w-0">
      <SectionHeader
        icon={<Coins className="w-[18px] h-[18px]" />}
        title="Cost-per-Lead & Pipeline ROI"
        subtitle="AI spend against qualified output"
      />

      {isLoading && !dashboard ? (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-xl border border-slate-200 dark:border-white/10 p-2.5">
                <p className={`text-sm font-extrabold truncate ${t.color}`}>{t.value}</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-white/50 mt-0.5">
                  {t.label}
                </p>
              </div>
            ))}
          </div>

          {totals.cpql !== null && totals.cpql > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-white/50 mb-1">
                <span>CPQL vs avg deal (₹{avgDeal.toLocaleString("en-IN")})</span>
                <span className="font-bold text-slate-800 dark:text-white/80">
                  {((totals.cpql / avgDeal) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-brand-500"
                  style={{ width: `${Math.min(100, (totals.cpql / avgDeal) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5">
            <p className="text-base font-extrabold text-slate-900 dark:text-white">
              {totals.roi !== null ? `${totals.roi.toFixed(1)}×` : "—"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-white/50">
              return on {inr(totals.spend)} AI spend · {totals.qualifiedLeads.toLocaleString()} qualified,{" "}
              {totals.closedWon.toLocaleString()} closed
            </p>
          </div>
        </>
      )}
    </div>
  );
}