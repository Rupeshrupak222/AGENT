"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { IndianRupee, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CompanyDashboardKpis } from "@/lib/api";

const DEFAULT_AVG_DEAL = 40000;

export function ClosedWonRevenue({
  kpis,
  prev,
  isLoading,
}: {
  kpis?: CompanyDashboardKpis | null;
  prev?: CompanyDashboardKpis | null;
  isLoading?: boolean;
}) {
  const [avgDeal, setAvgDeal] = useState<number>(DEFAULT_AVG_DEAL);

  useEffect(() => {
    const saved = Number(localStorage.getItem("ac_avg_deal_value"));
    if (!Number.isNaN(saved) && saved > 0) setAvgDeal(saved);
  }, []);

  const closedWon = kpis?.closedWon ?? 0;
  const appointments = kpis?.appointments ?? 0;
  const qualified = kpis?.qualifiedLeads ?? 0;

  const closedRevenue = closedWon * avgDeal;
  const appointmentRevenue = appointments * avgDeal;
  const qualifiedRevenue = qualified * avgDeal;

  const prevClosedWon = prev?.closedWon ?? null;
  const delta = prevClosedWon ? ((closedWon - prevClosedWon) / prevClosedWon) * 100 : null;

  const revenueColor = useMemo(
    () => (revenueStage(closedWon, appointments, qualified)),
    [closedWon, appointments, qualified]
  );

  function revenueStage(closed: number, booked: number, qual: number): string {
    if (closed > 0) return "from-emerald-500 to-teal-600";
    if (booked > 0) return "from-brand-500 to-amber-600";
    if (qual > 0) return "from-sky-500 to-blue-600";
    return "from-slate-400 to-slate-500";
  }

  const maxRevenue = Math.max(1, closedRevenue, appointmentRevenue, qualifiedRevenue);

  const rows = [
    { label: "Qualified Pipeline", value: qualifiedRevenue, count: qualified, color: "bg-sky-500" },
    { label: "Appointments Booked", value: appointmentRevenue, count: appointments, color: "bg-brand-500" },
    { label: "Closed Won (Booked)", value: closedRevenue, count: closedWon, color: "bg-emerald-500" },
  ];

  return (
    <div className="rounded-2xl p-5 panel-card min-w-0">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06] gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <IndianRupee className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Closed-Won Revenue Track</h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Estimated booked revenue from qualified → won pipeline
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-mono">
          <span className="text-slate-400 dark:text-white/40">Avg deal &nbsp;₹</span>
          <input
            type="number"
            min={1}
            value={avgDeal || ""}
            onChange={(e) => {
              const v = Math.max(0, Number(e.target.value));
              setAvgDeal(v);
              localStorage.setItem("ac_avg_deal_value", String(v));
            }}
            className="w-20 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500 px-2 text-center text-[11px] font-mono"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 mt-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/40">
                Estimated Booked Revenue
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {formatCurrency(closedRevenue)}
              </p>
            </div>
            {delta !== null && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${
                  delta >= 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                }`}
              >
                <TrendingUp className={`w-3 h-3 ${delta < 0 ? "rotate-180" : ""}`} />
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {rows.map((r) => {
              const w = (r.value / maxRevenue) * 100;
              return (
                <div key={r.label} className="flex items-center gap-3">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-white/70 truncate">{r.label}</p>
                    <p className="text-[10px] font-mono text-slate-400 dark:text-white/40">
                      {r.count} deals · {formatCurrency(r.value)}
                    </p>
                  </div>
                  <div className="flex-1 h-4 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
                    <motion.div
                      className={`h-full rounded-lg bg-gradient-to-r ${r.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(2, w)}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`p-3 rounded-xl bg-gradient-to-r ${revenueColor} bg-opacity-10 text-xs flex items-center justify-between`}>
            <span className="text-slate-600 dark:text-white/70 font-medium">
              {closedWon > 0
                ? "Closed-won revenue is booked. Excellent quarter!"
                : appointments > 0
                  ? "Appointments booked — close the loop to lock revenue."
                  : qualified > 0
                    ? "Qualified pipeline ready — book appointments to advance."
                    : "No won deals yet this period."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}