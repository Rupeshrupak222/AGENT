"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PhoneCall,
  Activity,
  Clock,
  PhoneForwarded,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  platformApi,
  PlatformDashboardData,
  PlatformCallTrendItem,
  PlatformCompanyPerformance,
} from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  iconColor: string;
  trend?: number;
}) {
  return (
    <div className="p-5 rounded-xl border bg-white dark:bg-[#120a06]/80 border-slate-200 dark:border-white/[0.07] shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", iconColor)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        {trend !== undefined && (
          <span className={cn("flex items-center gap-1 text-xs font-semibold", trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</p>
      <p className="text-xs mt-1 font-medium text-slate-500 dark:text-white/40">{title}</p>
      {subtitle && <p className="text-[11px] text-slate-400 dark:text-white/25 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [dashboard, setDashboard] = useState<PlatformDashboardData | null>(null);
  const [callTrend, setCallTrend] = useState<PlatformCallTrendItem[]>([]);
  const [companyPerf, setCompanyPerf] = useState<PlatformCompanyPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"today" | "week" | "month">("week");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, trend, perf] = await Promise.allSettled([
        platformApi.dashboard(range),
        platformApi.callTrend(range === "today" ? 1 : range === "week" ? 7 : 30),
        platformApi.companyPerformance(range),
      ]);
      if (dash.status === "fulfilled") setDashboard(dash.value);
      if (trend.status === "fulfilled") setCallTrend(trend.value);
      if (perf.status === "fulfilled") setCompanyPerf(perf.value);
    } catch {}
    setLoading(false);
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !dashboard) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse" />
            ))}
          </div>
          <div className="h-80 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse" />
          <div className="h-64 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  const d = dashboard!;
  const completionRate = d.calls.total > 0 ? ((d.calls.completed / d.calls.total) * 100) : 0;
  const avgDurationSec = d.callMinutes.avgDuration;
  const transferRate = d.calls.total > 0 ? ((d.calls.transferred / d.calls.total) * 100) : 0;

  const maxCalls = Math.max(...callTrend.map((t) => t.total_calls), 1);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Analytics</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">Platform-wide performance metrics and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] rounded-xl p-0.5">
              {(["today", "week", "month"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize",
                    range === r ? "bg-brand-500 text-white shadow-sm" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {r === "today" ? "Today" : r === "week" ? "7 Days" : "30 Days"}
                </button>
              ))}
            </div>
            <button onClick={() => fetchData()} className="p-2 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-all">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Calls"
            value={d.calls.total.toLocaleString()}
            subtitle={`${d.calls.inbound} inbound · ${d.calls.outbound} outbound`}
            icon={PhoneCall}
            iconColor="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
            trend={d.calls.change}
          />
          <StatCard
            title="Completion Rate"
            value={`${completionRate.toFixed(1)}%`}
            subtitle={`${d.calls.completed} of ${d.calls.total} calls`}
            icon={Activity}
            iconColor="bg-blue-50 dark:bg-blue-500/10 text-blue-500"
          />
          <StatCard
            title="Avg Duration"
            value={`${Math.floor(avgDurationSec / 60)}m ${Math.floor(avgDurationSec % 60)}s`}
            subtitle={`${d.callMinutes.total.toLocaleString()} total minutes`}
            icon={Clock}
            iconColor="bg-amber-50 dark:bg-amber-500/10 text-amber-500"
          />
          <StatCard
            title="Transfer Rate"
            value={`${transferRate.toFixed(1)}%`}
            subtitle={`${d.calls.transferred} transferred calls`}
            icon={PhoneForwarded}
            iconColor="bg-violet-50 dark:bg-violet-500/10 text-violet-500"
          />
        </div>

        {/* Call Volume Chart */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Call Volume</h3>
            <div className="flex items-center gap-4 text-[10px] font-medium text-slate-500 dark:text-white/35">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-500" />Total</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Completed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Inbound</span>
            </div>
          </div>
          {callTrend.length > 0 ? (
            <div className="space-y-1">
              {callTrend.map((d) => (
                <div key={d.day} className="flex items-center gap-3 text-xs">
                  <span className="w-16 text-right text-slate-400 dark:text-white/30 font-mono text-[10px]">{d.day.slice(5)}</span>
                  <div className="flex-1 flex gap-1 items-center">
                    <div className="h-3 rounded-sm bg-brand-500/70" style={{ width: `${(d.total_calls / maxCalls) * 100}%` }} />
                    <div className="h-3 rounded-sm bg-emerald-500/70" style={{ width: `${(d.completed / maxCalls) * 100}%` }} />
                    <div className="h-3 rounded-sm bg-blue-400/70" style={{ width: `${(d.inbound / maxCalls) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right font-mono text-slate-600 dark:text-white/50">{d.total_calls}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-sm text-slate-400 dark:text-white/30">No call data available</div>
          )}
        </div>

        {/* Agent Performance */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/[0.06]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Company Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Company</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden md:table-cell">Plan</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Agents</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Calls</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden sm:table-cell">Success Rate</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden md:table-cell">Avg Duration</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden lg:table-cell">Minutes</th>
                </tr>
              </thead>
              <tbody>
                {companyPerf.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 dark:text-white/30">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No performance data available
                    </td>
                  </tr>
                ) : (
                  companyPerf.slice(0, 15).map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-brand-500">{c.name[0]}</span>
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white text-xs">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold capitalize",
                          c.plan === "enterprise" ? "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400"
                          : c.plan === "business" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : c.plan === "growth" ? "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                          : "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                        )}>
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-medium text-slate-700 dark:text-white/60 text-xs">{c.activeAgents}/{c.agents}</td>
                      <td className="px-5 py-3 text-center font-medium text-slate-700 dark:text-white/60 text-xs">{c.calls.toLocaleString()}</td>
                      <td className="px-5 py-3 text-center hidden sm:table-cell">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", c.successRate >= 80 ? "bg-emerald-500" : c.successRate >= 50 ? "bg-amber-500" : "bg-red-500")}
                              style={{ width: `${Math.min(c.successRate, 100)}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-semibold w-10 text-right", c.successRate >= 80 ? "text-emerald-500" : c.successRate >= 50 ? "text-amber-500" : "text-red-500")}>
                            {c.successRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center hidden md:table-cell">
                        <span className="text-xs font-mono text-slate-600 dark:text-white/50">{Math.floor(c.avgDuration / 60)}m {Math.floor(c.avgDuration % 60)}s</span>
                      </td>
                      <td className="px-5 py-3 text-right hidden lg:table-cell">
                        <span className="text-xs font-semibold text-slate-700 dark:text-white/60">{c.minutes.toLocaleString()}</span>
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
