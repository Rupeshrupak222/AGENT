"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Bot,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  CreditCard,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowRight,
  Target,
  RefreshCw,
  Calendar,
  Headphones,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { platformApi, PlatformDashboardData, PlatformCallTrendItem, PlatformCompanyPerformance } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

const PLAN_CONFIG: Record<string, { name: string; price: number; color: string }> = {
  starter: { name: "Starter", price: 4999, color: "bg-blue-500" },
  growth: { name: "Growth", price: 14999, color: "bg-amber-500" },
  business: { name: "Business", price: 39999, color: "bg-emerald-500" },
  enterprise: { name: "Enterprise", price: 99999, color: "bg-purple-500" },
};

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  href,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: any;
  iconColor: string;
  href?: string;
}) {
  const Wrapper = href ? Link : "div";
  const wrapperProps = href ? { href } : {};
  return (
    <Wrapper {...(wrapperProps as any)} className={cn(
      "p-5 rounded-xl border transition-all duration-200 bg-white dark:bg-[#120a06]/80 border-slate-200 dark:border-white/[0.07] shadow-sm hover:shadow-md",
      href && "cursor-pointer hover:border-brand-500/20"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", iconColor)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        {change !== undefined && (
          <span className={cn("flex items-center gap-1 text-xs font-semibold", change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <p className="text-xs mt-1 font-medium text-slate-500 dark:text-white/40">{title}</p>
    </Wrapper>
  );
}

function MiniBarChart({ data, label }: { data: { day: string; total_calls: number; completed: number }[]; label: string }) {
  const maxVal = Math.max(...data.map((d) => d.total_calls), 1);
  return (
    <div className="flex items-end gap-[2px] h-12">
      {data.slice(-14).map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.day}: ${d.total_calls} calls`}>
          <div
            className="w-full rounded-sm bg-brand-500/80 transition-all"
            style={{ height: `${(d.total_calls / maxVal) * 100}%`, minHeight: "2px" }}
          />
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
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
    } catch (e) { /* handled by Promise.allSettled */ }
    setLoading(false);
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !dashboard) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const d = dashboard!;
  const revenue = d.revenue.mrr > 0 ? `₹${formatNumber(d.revenue.mrr)}` : "—";

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Overview</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">Monitor your entire AI calling platform at a glance</p>
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

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Companies" value={d.companies.total} change={d.companies.change} icon={Building2} iconColor="bg-blue-50 dark:bg-blue-500/10 text-blue-500" href="/dashboard/admin/companies" />
          <StatCard title="Active Users" value={d.users.active} change={d.users.change} icon={Users} iconColor="bg-violet-50 dark:bg-violet-500/10 text-violet-500" href="/dashboard/admin/users" />
          <StatCard title="AI Agents" value={d.agents.total} icon={Bot} iconColor="bg-purple-50 dark:bg-purple-500/10 text-purple-500" href="/dashboard/admin/agents" />
          <StatCard title="Platform Calls" value={d.calls.total} change={d.calls.change} icon={PhoneCall} iconColor="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" href="/dashboard/admin/calls" />
          <StatCard title="Call Minutes" value={d.callMinutes.total} icon={Clock} iconColor="bg-amber-50 dark:bg-amber-500/10 text-amber-500" />
          <StatCard title="Success Rate" value={d.calls.total > 0 ? `${((d.calls.completed / d.calls.total) * 100).toFixed(1)}%` : "—"} icon={Activity} iconColor="bg-teal-50 dark:bg-teal-500/10 text-teal-500" />
          <StatCard title="MRR" value={revenue} icon={CreditCard} iconColor="bg-rose-50 dark:bg-rose-500/10 text-rose-500" href="/dashboard/admin/revenue" />
          <StatCard title="Campaigns" value={d.campaigns.total} icon={Target} iconColor="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500" href="/dashboard/admin/campaigns" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Call Volume Chart */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Call Volume Trend</h3>
              <div className="flex items-center gap-4 text-[10px] font-medium text-slate-500 dark:text-white/35">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-500" />Total</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Completed</span>
              </div>
            </div>
            {callTrend.length > 0 ? (
              <div className="space-y-1">
                {callTrend.map((d) => {
                  const maxCall = Math.max(...callTrend.map((t) => t.total_calls), 1);
                  return (
                    <div key={d.day} className="flex items-center gap-3 text-xs">
                      <span className="w-16 text-right text-slate-400 dark:text-white/30 font-mono text-[10px]">{d.day.slice(5)}</span>
                      <div className="flex-1 flex gap-1 items-center">
                        <div className="h-3 rounded-sm bg-brand-500/70" style={{ width: `${(d.total_calls / maxCall) * 100}%` }} />
                        <div className="h-3 rounded-sm bg-emerald-500/70" style={{ width: `${(d.completed / maxCall) * 100}%` }} />
                      </div>
                      <span className="w-12 text-right font-mono text-slate-600 dark:text-white/50">{d.total_calls}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-sm text-slate-400 dark:text-white/30">No call data available</div>
            )}
          </div>

          {/* Call Distribution */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Call Distribution</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhoneIncoming className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-slate-600 dark:text-white/60">Inbound</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{d.calls.inbound}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhoneOutgoing className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-slate-600 dark:text-white/60">Outbound</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{d.calls.outbound}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-violet-500" />
                  <span className="text-sm text-slate-600 dark:text-white/60">Transferred</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{d.calls.transferred}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-slate-600 dark:text-white/60">Completed</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{d.calls.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-slate-600 dark:text-white/60">Failed</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{d.calls.failed}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.06]">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/35">
                <span>Avg Duration</span>
                <span className="font-semibold text-slate-700 dark:text-white/70">{d.callMinutes.avgDuration}s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Company Performance Table */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/[0.06]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Company Performance</h3>
            <Link href="/dashboard/admin/companies" className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Company</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Plan</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Users</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Agents</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Calls</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Success</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {companyPerf.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 dark:text-white/30">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No company data available
                    </td>
                  </tr>
                ) : (
                  companyPerf.slice(0, 10).map((c) => {
                    const plan = PLAN_CONFIG[c.plan] || PLAN_CONFIG.starter;
                    return (
                      <tr key={c.id} className="border-b border-slate-100 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/admin/companies/${c.id}`)}>
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{c.name}</div>
                          <div className="text-[11px] text-slate-400 dark:text-white/30 font-mono">/{c.slug}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold text-white", plan.color)}>{plan.name}</span>
                        </td>
                        <td className="px-5 py-3 text-center font-medium text-slate-700 dark:text-white/60">{c.users}</td>
                        <td className="px-5 py-3 text-center font-medium text-slate-700 dark:text-white/60">{c.activeAgents}/{c.agents}</td>
                        <td className="px-5 py-3 text-center font-medium text-slate-700 dark:text-white/60">{c.calls}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={cn("font-semibold", c.successRate >= 80 ? "text-emerald-500" : c.successRate >= 50 ? "text-amber-500" : "text-red-500")}>
                            {c.successRate}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">₹{formatNumber(c.revenue)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
