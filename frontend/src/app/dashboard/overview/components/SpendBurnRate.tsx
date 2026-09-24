"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, PhoneCall, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CompanyDashboardKpis, TenantUsage } from "@/lib/api";

const RATE_PER_MINUTE = 2.5;
const RATE_PER_ANALYSIS = 0.35;

export function SpendBurnRate({
  kpis,
  tenantUsage,
  isLoading,
}: {
  kpis?: CompanyDashboardKpis | null;
  tenantUsage?: TenantUsage | null;
  isLoading?: boolean;
}) {
  const stats = useMemo(() => {
    const minutes = kpis?.totalMinutes ?? 0;
    const analyses = kpis?.aiAnalyses ?? 0;
    const totalCalls = kpis?.totalCalls ?? 0;

    const voiceCost = minutes * RATE_PER_MINUTE;
    const analysisCost = analyses * RATE_PER_ANALYSIS;
    const totalSpend = voiceCost + analysisCost;
    const costPerCall = totalCalls > 0 ? totalSpend / totalCalls : 0;
    const callsUsed = tenantUsage?.usage?.calls?.used ?? tenantUsage?.callCount ?? 0;
    const callsLimit = tenantUsage?.limits?.calls ?? -1;
    const callsUnlimited = tenantUsage?.usage?.calls?.unlimited ?? callsLimit === -1;

    // Project to a full month using call-rate dilution (min of 1 day and period unknown → use record count)
    const monthProjection = Math.max(totalSpend, totalSpend * 30);
    const budgetQuota = callsUnlimited
      ? null
      : callsLimit > 0
        ? (callsUsed / callsLimit) * 100
        : 0;

    return { minutes, analyses, totalCalls, voiceCost, analysisCost, totalSpend, costPerCall, monthProjection, budgetQuota };
  }, [kpis, tenantUsage]);

  const spendPct = stats.monthProjection > 0 ? Math.min(100, (stats.totalSpend / stats.monthProjection) * 100) : 0;

  const rows = [
    { label: "Voice minutes cost", value: stats.voiceCost, icon: PhoneCall, color: "text-sky-500" },
    { label: "AI analysis cost", value: stats.analysisCost, icon: Sparkles, color: "text-purple-500" },
    { label: "Total period spend", value: stats.totalSpend, icon: Flame, color: "text-amber-500", bold: true },
  ];

  return (
    <div className="rounded-2xl p-5 panel-card min-w-0">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Flame className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Burn Rate & Spend</h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Estimated AI compute spend at ₹{RATE_PER_MINUTE}/min voice, ₹{RATE_PER_ANALYSIS}/analysis
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 mt-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 rounded-xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
              <p className="text-[10px] text-slate-400 dark:text-white/40 font-mono">{stats.totalCalls} calls</p>
              <p className="text-lg font-black text-slate-900 dark:text-white font-mono">
                ₹{stats.costPerCall.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-white/50">cost / call</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
              <p className="text-[10px] text-slate-400 dark:text-white/40 font-mono">{stats.minutes} min</p>
              <p className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(stats.monthProjection)}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-white/50">projected / month</p>
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between text-xs">
                <span className={`flex items-center gap-1.5 text-slate-500 dark:text-white/60 ${r.bold ? "font-semibold text-slate-800 dark:text-white/90" : ""}`}>
                  <r.icon className={`w-3.5 h-3.5 ${r.color}`} />
                  {r.label}
                </span>
                <span className={`font-mono font-bold ${r.bold ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-white/70"}`}>
                  {formatCurrency(r.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-white/40 mb-1.5">
              <span>Monthly call quota</span>
              <span className="text-slate-700 dark:text-white/70">
                {stats.budgetQuota === null ? "Unlimited" : `${stats.budgetQuota.toFixed(0)}% used`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${
                  (stats.budgetQuota ?? 0) >= 100 ? "from-rose-500 to-rose-600" : "from-amber-500 to-orange-600"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, stats.budgetQuota ?? 0)}%` }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            {stats.budgetQuota !== null && stats.budgetQuota >= 90 && (
              <p className="text-[10px] text-rose-500 font-semibold mt-1.5">
                Near quota — consider upgrading to avoid overage charges.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}