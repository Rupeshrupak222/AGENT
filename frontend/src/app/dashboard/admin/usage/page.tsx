"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Activity,
  Bot,
  Building2,
  RefreshCw,
  ArrowUpDown,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { platformApi, PlatformUsageData } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

type SortKey = "tenantName" | "plan" | "calls" | "minutes" | "agents";

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  growth: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  business: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  enterprise: "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
};

function StatCard({ title, value, icon: Icon, iconColor }: { title: string; value: string | number; icon: any; iconColor: string }) {
  return (
    <div className="p-5 rounded-xl border bg-white dark:bg-[#120a06]/80 border-slate-200 dark:border-white/[0.07] shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", iconColor)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</p>
      <p className="text-xs mt-1 font-medium text-slate-500 dark:text-white/40">{title}</p>
    </div>
  );
}

export default function AdminUsagePage() {
  const [usage, setUsage] = useState<PlatformUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("minutes");
  const [sortAsc, setSortAsc] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await platformApi.usage();
      setUsage(data);
    } catch {
      setUsage(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "tenantName" || key === "plan");
    }
  };

  const sorted = usage?.tenantUsage
    ? [...usage.tenantUsage].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      })
    : [];

  const maxMinutes = Math.max(...sorted.map((t) => t.minutes), 1);
  const maxCalls = Math.max(...sorted.map((t) => t.calls), 1);

  if (loading && !usage) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse" />
            ))}
          </div>
          <div className="h-80 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  const u = usage!;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Usage</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">Resource consumption and usage rankings across all companies</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="p-2 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Minutes"
            value={u.callMinutes.total.toLocaleString()}
            icon={Clock}
            iconColor="bg-amber-50 dark:bg-amber-500/10 text-amber-500"
          />
          <StatCard
            title="Monthly Minutes"
            value={u.callMinutes.monthly.toLocaleString()}
            icon={Activity}
            iconColor="bg-blue-50 dark:bg-blue-500/10 text-blue-500"
          />
          <StatCard
            title="Active Agents"
            value={`${u.agents.active} / ${u.agents.total}`}
            icon={Bot}
            iconColor="bg-purple-50 dark:bg-purple-500/10 text-purple-500"
          />
          <StatCard
            title="Active Tenants"
            value={`${u.tenants.active} / ${u.tenants.total}`}
            icon={Building2}
            iconColor="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
          />
        </div>

        {/* Company Usage Rankings */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/[0.06]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Company Usage Rankings</h3>
            <span className="text-xs text-slate-400 dark:text-white/25">{sorted.length} companies</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">#</th>
                  {([
                    { key: "tenantName" as SortKey, label: "Company" },
                    { key: "plan" as SortKey, label: "Plan" },
                    { key: "calls" as SortKey, label: "Calls" },
                    { key: "minutes" as SortKey, label: "Minutes" },
                    { key: "agents" as SortKey, label: "Agents" },
                  ]).map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        "px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 cursor-pointer hover:text-slate-600 dark:hover:text-white/60 transition-all select-none",
                        col.key === "tenantName" ? "text-left" : "text-center",
                        col.key !== "agents" ? (col.key === "tenantName" || col.key === "plan" ? "hidden md:table-cell" : "hidden sm:table-cell") : ""
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                  ))}
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden lg:table-cell">
                    Usage
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <Zap className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-white/15" />
                      <p className="text-sm font-medium text-slate-500 dark:text-white/40">No usage data available</p>
                    </td>
                  </tr>
                ) : (
                  sorted.map((t, i) => (
                    <tr key={t.tenantId} className="border-b border-slate-100 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <span className={cn("text-xs font-bold", i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-slate-400 dark:text-white/25")}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-brand-500">{t.tenantName[0]}</span>
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white text-xs">{t.tenantName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center hidden md:table-cell">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold capitalize", PLAN_COLORS[t.plan] || PLAN_COLORS.starter)}>
                          {t.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center hidden sm:table-cell">
                        <span className="text-xs font-semibold text-slate-700 dark:text-white/60">{t.calls.toLocaleString()}</span>
                      </td>
                      <td className="px-5 py-3 text-center hidden sm:table-cell">
                        <span className="text-xs font-semibold text-slate-700 dark:text-white/60">{t.minutes.toLocaleString()}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-xs font-semibold text-slate-700 dark:text-white/60">{t.agents}</span>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-500/70 transition-all"
                              style={{ width: `${(t.minutes / maxMinutes) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-white/25 w-12 text-right">{((t.minutes / maxMinutes) * 100).toFixed(0)}%</span>
                        </div>
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
