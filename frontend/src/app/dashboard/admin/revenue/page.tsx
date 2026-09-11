"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { platformApi, PlatformRevenueData } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-blue-500",
  growth: "bg-amber-500",
  business: "bg-emerald-500",
  enterprise: "bg-purple-500",
};

function KpiCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string;
  change?: number;
  icon: any;
  iconColor: string;
}) {
  return (
    <div className="p-5 rounded-xl border bg-white dark:bg-[#120a06]/80 border-slate-200 dark:border-white/[0.07] shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", iconColor)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        {change !== undefined && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-semibold",
              change >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {change >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        {value}
      </p>
      <p className="text-xs mt-1 font-medium text-slate-500 dark:text-white/40">
        {title}
      </p>
    </div>
  );
}

export default function RevenuePage() {
  const [data, setData] = useState<PlatformRevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await platformApi.revenue();
        if (!cancelled) setData(res);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load revenue data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading && !data) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse"
              />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-8 text-center">
            <XCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {error}
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-12 text-center">
            <CreditCard className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-white/20" />
            <p className="text-sm text-slate-400 dark:text-white/30">
              No revenue data available
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const maxPlanCount =
    Math.max(...data.planDistribution.map((p) => p.count), 1);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Revenue &amp; Billing
            </h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Monitor platform revenue, subscriptions, and plan distribution
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              platformApi
                .revenue()
                .then(setData)
                .catch(() => {})
                .finally(() => setLoading(false));
            }}
            className="p-2 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Monthly Recurring Revenue"
            value={formatCurrency(data.mrr)}
            change={data.revenueGrowth}
            icon={IndianRupee}
            iconColor="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
          />
          <KpiCard
            title="Annual Recurring Revenue"
            value={formatCurrency(data.arr)}
            icon={TrendingUp}
            iconColor="bg-blue-50 dark:bg-blue-500/10 text-blue-500"
          />
          <KpiCard
            title="Monthly Revenue"
            value={formatCurrency(data.monthlyRevenue)}
            change={data.revenueGrowth}
            icon={CreditCard}
            iconColor="bg-purple-50 dark:bg-purple-500/10 text-purple-500"
          />
          <KpiCard
            title="Revenue Growth"
            value={
              data.revenueGrowth >= 0
                ? `+${data.revenueGrowth.toFixed(1)}%`
                : `${data.revenueGrowth.toFixed(1)}%`
            }
            icon={ArrowUpRight}
            iconColor="bg-amber-50 dark:bg-amber-500/10 text-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plan Distribution */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Plan Distribution
            </h3>
            {data.planDistribution.length > 0 ? (
              <div className="space-y-4">
                {data.planDistribution.map((plan) => (
                  <div key={plan.plan}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            PLAN_COLORS[plan.plan] || "bg-slate-400"
                          )}
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-white/70 capitalize">
                          {plan.plan}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500 dark:text-white/40">
                          {formatCurrency(plan.price)}/mo
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {plan.count}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/[0.04] overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          PLAN_COLORS[plan.plan] || "bg-slate-400"
                        )}
                        style={{
                          width: `${(plan.count / maxPlanCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-sm text-slate-400 dark:text-white/30">
                No plan data available
              </div>
            )}
          </div>

          {/* Subscription Stats */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Subscriptions
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-slate-600 dark:text-white/60">
                    Total Subscriptions
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {data.subscriptions.total}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-slate-600 dark:text-white/60">
                    On Trial
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {data.subscriptions.trial}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-slate-600 dark:text-white/60">
                    Cancelled
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {data.subscriptions.cancelled}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.06]">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/35">
                <span>Failed Payments</span>
                <span className="font-semibold text-red-500">
                  {data.recentTransactions.filter((t) => t.status === "failed")
                    .length || data.subscriptions.cancelled > 0
                    ? "Yes"
                    : "None"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.06]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recent Transactions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                    Transaction ID
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                    Plan
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-slate-400 dark:text-white/30"
                    >
                      <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No transactions recorded yet
                    </td>
                  </tr>
                ) : (
                  data.recentTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-slate-100 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-white/50">
                        {tx.id.slice(0, 8)}...
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold text-white capitalize",
                            PLAN_COLORS[tx.plan] || "bg-slate-400"
                          )}
                        >
                          {tx.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold",
                            tx.status === "paid" || tx.status === "succeeded"
                              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                              : tx.status === "failed"
                              ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                              : "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                          )}
                        >
                          {tx.status === "paid" || tx.status === "succeeded" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : tx.status === "failed" ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-slate-500 dark:text-white/40">
                        {tx.paidAt
                          ? new Date(tx.paidAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : new Date(tx.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
