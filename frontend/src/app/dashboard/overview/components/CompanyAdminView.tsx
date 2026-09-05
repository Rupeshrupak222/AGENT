"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Phone,
  PhoneCall,
  Target,
  DollarSign,
  Clock,
  Bot,
  PhoneMissed,
  Calendar,
  BarChart3,
  RefreshCw,
  Plus,
  CreditCard,
  Radio,
  Award,
  ArrowUpRight,
  Sparkles,
  Download,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { WaveAnimation } from "@/components/ui/WaveAnimation";
import { formatDuration } from "@/lib/utils";
import {
  DashboardMetrics,
  CallMetrics,
  CallItem,
  AgentItem,
  AgentPerformanceItem,
  CallTrendItem,
  ConversionFunnelItem,
  TenantUsage,
} from "@/lib/api";

const STAGE_COLORS: Record<string, string> = {
  new: "#3b82f6",
  contacted: "#06b6d4",
  interested: "#8b5cf6",
  qualified: "#6366f1",
  appointment: "#10b981",
  closed_won: "#22c55e",
  closed_lost: "#ef4444",
};

interface CompanyAdminViewProps {
  metrics: DashboardMetrics | null;
  callMetrics: CallMetrics | null;
  recentCalls: CallItem[];
  allAgents: AgentItem[];
  agentPerfList: AgentPerformanceItem[];
  callTrends: CallTrendItem[];
  funnelData: ConversionFunnelItem[];
  period: "today" | "week" | "month";
  setPeriod: (p: "today" | "week" | "month") => void;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  companyName: string;
  companyPlan: string | null;
  companyUsage: TenantUsage | null;
}

function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#150305] border border-white/10 backdrop-blur-xl rounded-xl p-3 text-xs shadow-2xl shadow-black/80">
      <p className="font-semibold text-white/90 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-white/60 capitalize">{p.name}:</span>
          </div>
          <span className="text-white font-mono font-bold">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CompanyAdminView({
  metrics,
  callMetrics,
  recentCalls,
  allAgents,
  agentPerfList,
  callTrends,
  funnelData,
  period,
  setPeriod,
  isLoading,
  onRefresh,
  isRefreshing,
  companyName,
  companyPlan,
  companyUsage,
}: CompanyAdminViewProps) {
  const totalCallsCount = metrics?.totalCalls ?? callMetrics?.total ?? 0;
  const connectedCallsCount = metrics?.connected ?? callMetrics?.completed ?? 0;
  const qualifiedLeadsCount = metrics?.qualified ?? 0;
  const closedWonCount = metrics?.closedWon ?? 0;
  const avgDurationSeconds = metrics?.avgDuration ?? callMetrics?.avgDuration ?? 0;
  const activeAgentsCount = allAgents.filter((a) => a.status === "active").length;
  const missedOrFailedCount =
    callMetrics
      ? callMetrics.missed + callMetrics.failed
      : Math.max(0, totalCallsCount - connectedCallsCount);
  const appointmentsCount = metrics?.appointments ?? 0;

  // Chart Trend Mapping
  const chartData = callTrends.map((t) => {
    const d = new Date(t.day);
    const timeLabel = isNaN(d.getTime())
      ? t.day
      : d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
    return {
      time: timeLabel,
      calls: t.total_calls,
      connected: t.connected,
    };
  });

  // Funnel Mapping
  const funnelTotal = funnelData.reduce((acc, curr) => acc + curr.count, 0);
  const formattedFunnel = funnelData.map((f) => ({
    name: f.stage.replace("_", " ").toUpperCase(),
    value: f.count,
    pct: f.pct,
    color: STAGE_COLORS[f.stage] || "#94a3b8",
  }));

  const { success } = useToast();

  const handleRefreshClick = () => {
    onRefresh();
    success("Refreshed latest company telemetry from live database!");
  };

  const handleExportCsv = () => {
    const rows = [
      ["AGENTCALL AI - COMPANY OPERATIONAL REPORT"],
      ["Generated At", new Date().toLocaleString()],
      ["Company", companyName],
      ["Period Horizon", period],
      [],
      ["Key Performance Indicator", "Value"],
      ["Total Calls Logged", totalCallsCount],
      ["Connected Calls", connectedCallsCount],
      ["Qualified Leads", qualifiedLeadsCount],
      ["Closed Won Deals", closedWonCount],
      ["Average Call Duration (seconds)", avgDurationSeconds],
      ["Active Autonomous AI Agents", activeAgentsCount],
      ["Missed or Failed Attempts", missedOrFailedCount],
      ["Appointments Booked", appointmentsCount],
      [],
      ["CALL VOLUME TELEMETRY OVER TIME"],
      ["Date Label", "Total Dialed Calls", "Connected Calls"],
      ...callTrends.map((t) => [t.day, t.total_calls, t.connected]),
      [],
      ["CRM PIPELINE DISPOSITION BREAKDOWN"],
      ["Pipeline Stage", "Lead Count", "Conversion %"],
      ...funnelData.map((f) => [f.stage, f.count, `${f.pct}%`]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `enterprise_report_${companyName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Company analytics & funnel CSV report exported successfully!");
  };

  return (
    <div className="space-y-6">
      {/* ── Top Hero Banner ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 border border-brand-500/30 shadow-2xl bg-gradient-to-r from-[#180306] via-[#120204] to-[#0c0102]"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 20% 0%, rgba(212,32,39,0.22) 0%, rgba(18,2,4,0.95) 75%)",
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-rose-700 flex items-center justify-center p-3 shadow-lg shadow-brand-500/30 flex-shrink-0">
              <Bot className="w-7 h-7 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {companyName} — Enterprise AI Workforce
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  🏢 Company Admin Console
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-1.5 max-w-2xl leading-relaxed">
                Supervise autonomous voice employees, monitor real-time customer conversations, 
                inspect lead qualification funnels, and track voice minute quota.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white transition-all duration-200 shadow-sm disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-brand-500" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5 text-brand-400" />
              Export Report
            </button>
            <Link
              href="/dashboard/agents"
              className="btn-red text-xs py-2 px-4 h-9 shadow-md shadow-brand-500/25 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Build AI Agent
            </Link>
            <Link
              href="/dashboard/billing"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white transition-all duration-200"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Billing & Quota
            </Link>
          </div>
        </div>

        {/* Monthly Call Volume (real usage) */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Monthly Call Volume:{" "}
                <span className="text-brand-300 font-mono">
                  {isLoading ? "—" : (companyUsage?.callCount ?? 0).toLocaleString() + " calls this cycle"}
                </span>
              </p>
              <p className="text-[11px] text-white/40">
                {companyPlan ? `${companyPlan.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} Plan` : "Current plan"} · minute-level burn-down requires per-call duration aggregation (not exposed yet)
              </p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-white/40 flex items-center gap-3">
            <span>{companyUsage ? `${companyUsage.userCount} users` : "— users"}</span>
            <span>{companyUsage ? `${companyUsage.leadCount} leads` : "— leads"}</span>
            <span>{companyUsage ? `${companyUsage.agentCount} agents` : "— agents"}</span>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Grid ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Company Operational Metrics
            </h3>
            <span className="text-[11px] text-white/40">· Live Telephony & CRM Sync</span>
          </div>

          {/* Period Toggle */}
          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-1">
            {(["today", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  period === p
                    ? "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-900/40"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              title: "Total Calls",
              value: isLoading ? "—" : totalCallsCount.toLocaleString(),
              subtext: `${period} volume`,
              icon: <Phone className="w-5 h-5 text-blue-400" />,
              color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
            },
            {
              title: "Connected",
              value: isLoading ? "—" : connectedCallsCount.toLocaleString(),
              subtext:
                totalCallsCount > 0
                  ? `${((connectedCallsCount / totalCallsCount) * 100).toFixed(1)}% connect rate`
                  : "0% connect rate",
              icon: <PhoneCall className="w-5 h-5 text-emerald-400" />,
              color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
            },
            {
              title: "Qualified Leads",
              value: isLoading ? "—" : qualifiedLeadsCount.toLocaleString(),
              subtext:
                totalCallsCount > 0
                  ? `${((qualifiedLeadsCount / totalCallsCount) * 100).toFixed(1)}% conversion`
                  : "0% conversion",
              icon: <Target className="w-5 h-5 text-purple-400" />,
              color: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
            },
            {
              title: "Closed Won",
              value: isLoading ? "—" : closedWonCount.toLocaleString(),
              subtext: "Converted deals",
              icon: <DollarSign className="w-5 h-5 text-amber-400" />,
              color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
            },
            {
              title: "Avg Duration",
              value: isLoading
                ? "—"
                : `${Math.floor(avgDurationSeconds / 60)}m ${avgDurationSeconds % 60}s`,
              subtext: "Per completed call",
              icon: <Clock className="w-5 h-5 text-cyan-400" />,
              color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
            },
            {
              title: "Active Agents",
              value: isLoading ? "—" : activeAgentsCount.toLocaleString(),
              subtext: `${allAgents.length} total deployed`,
              icon: <Bot className="w-5 h-5 text-brand-400" />,
              color: "from-brand-500/20 to-brand-600/10 border-brand-500/30",
            },
            {
              title: "Missed / Failed",
              value: isLoading ? "—" : missedOrFailedCount.toLocaleString(),
              subtext: "Unsuccessful attempts",
              icon: <PhoneMissed className="w-5 h-5 text-rose-400" />,
              color: "from-rose-500/20 to-rose-600/10 border-rose-500/30",
            },
            {
              title: "Appts Booked",
              value: isLoading ? "—" : appointmentsCount.toLocaleString(),
              subtext: "Scheduled demos",
              icon: <Calendar className="w-5 h-5 text-teal-400" />,
              color: "from-teal-500/20 to-teal-600/10 border-teal-500/30",
            },
          ].map((k, i) => (
            <motion.div
              key={k.title + period}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="relative group overflow-hidden rounded-2xl p-4 sm:p-5 panel-card border border-white/[0.08] hover:border-brand-500/40 transition-all duration-300 shadow-xl"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${k.color}`}>
                  {k.icon}
                </div>
                {k.subtext && (
                  <span className="text-[11px] font-medium text-white/40 font-mono">
                    {k.subtext}
                  </span>
                )}
              </div>
              {isLoading ? (
                <div className="h-8 w-24 bg-white/10 rounded-lg animate-pulse my-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                  {k.value}
                </p>
              )}
              <p className="text-xs text-white/50 mt-1 font-medium">{k.title}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Two-Column Analytics Hub ────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Call Volume Chart */}
        <div className="lg:col-span-2 rounded-2xl p-5 sm:p-6 panel-card">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-400" />
                  Call Volume & Connected Activity
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Actual dialed calls vs completed connections recorded in database
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-white/60 font-medium">Total Calls</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-white/60 font-medium">Connected Calls</span>
                </div>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              {isLoading ? (
                <div className="h-full w-full bg-white/[0.03] rounded-xl flex items-center justify-center animate-pulse">
                  <span className="text-xs text-white/40">Loading trend telemetry...</span>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                  <Phone className="w-8 h-8 text-white/20 mb-2" />
                  <p className="text-sm font-semibold text-white/70">No Call Trends Recorded Yet</p>
                  <p className="text-xs text-white/40 max-w-sm mt-1">
                    Once AI agents execute calls, trend distribution will chart here automatically.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradCalls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradConnected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="calls"
                      name="Total Calls"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#gradCalls)"
                    />
                    <Area
                      type="monotone"
                      dataKey="connected"
                      name="Connected"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#gradConnected)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Lead Funnel */}
        <div className="rounded-2xl p-5 sm:p-6 panel-card">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                Pipeline Disposition
              </h3>
              <span className="text-[11px] text-white/40 font-mono">
                {funnelTotal} Leads Tracked
              </span>
            </div>

            <div className="h-44 w-full relative">
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center animate-pulse">
                  <div className="w-28 h-28 rounded-full border-4 border-white/10 border-t-brand-500 animate-spin" />
                </div>
              ) : funnelTotal === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                  <Target className="w-6 h-6 text-white/20 mb-1.5" />
                  <p className="text-xs font-semibold text-white/70">No Leads in Pipeline</p>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    Import leads or trigger calling campaigns to populate CRM stages.
                  </p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={formattedFunnel}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {formattedFunnel.map((e, idx) => (
                          <Cell key={`cell-${idx}`} fill={e.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload?.length ? (
                            <div className="bg-[#150305] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white shadow-lg">
                              <span className="font-semibold">
                                {payload[0].name}: {payload[0].value} (
                                {(payload[0].payload as any).pct}%)
                              </span>
                            </div>
                          ) : null
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] text-white/40 font-medium">Qualified</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">
                      {qualifiedLeadsCount}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-white/[0.06] max-h-40 overflow-y-auto">
            {formattedFunnel.length > 0 ? (
              formattedFunnel.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-white/60 text-[11px]">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono font-semibold text-[11px]">
                      {d.value} ({d.pct}%)
                    </span>
                    <div className="w-12 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, d.pct)}%`, background: d.color }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-[11px] text-white/30 py-2">
                Awaiting CRM lead activity
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── AI Fleet Leaderboard & Live Calls Row ─────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Active AI Agent Workforce */}
        <div className="rounded-2xl p-5 panel-card border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4 text-brand-400" />
                Active AI Employees Fleet
              </h3>
              <p className="text-xs text-white/40 mt-0.5">Autonomous callers deployed on voice channels</p>
            </div>
            <Link
              href="/dashboard/agents"
              className="text-xs font-semibold text-brand-400 hover:text-brand-300"
            >
              Configure Agents →
            </Link>
          </div>

          <div className="space-y-2.5">
            {(agentPerfList.length > 0 ? agentPerfList : (allAgents as any)).map(
              (agent: any, i: number) => {
                const agentName = agent.name || "Agent";
                const roleName = agent.role || "Telecaller";
                const totalCalls = agent.totalCalls ?? agent._count?.calls ?? 0;
                const completedCalls = agent.completedCalls ?? 0;

                return (
                  <Link
                    key={agent.id || agentName}
                    href={`/dashboard/agents${agent.id ? `?agentId=${agent.id}` : ""}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-500/40 hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
                        {agentName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                            {agentName}
                          </p>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Live
                          </span>
                        </div>
                        <p className="text-xs text-white/40 capitalize">{roleName} · Deepgram + Groq</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold text-emerald-400">
                          {totalCalls > 0
                            ? `${Math.round((completedCalls / totalCalls) * 100)}%`
                            : "Ready"}
                        </p>
                        <p className="text-[11px] text-white/40">{totalCalls} calls handled</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        </div>

        {/* Live Call Sessions */}
        <div className="rounded-2xl p-5 panel-card border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                Live Customer Calls Feed
              </h3>
              <p className="text-xs text-white/40 mt-0.5">Real-time transcripts & audio recordings</p>
            </div>
            <Link
              href="/dashboard/calls"
              className="text-xs font-semibold text-brand-400 hover:text-brand-300"
            >
              Call Center →
            </Link>
          </div>

          <div className="space-y-3">
            {recentCalls.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-xs">
                No recent calls recorded.
              </div>
            ) : (
              recentCalls.map((call) => (
                <Link
                  key={call.id}
                  href={`/dashboard/calls?callId=${call.id}`}
                  className="block p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-500/40 hover:bg-white/[0.04] transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
                        {call.lead?.name || "Customer Contact"}
                      </p>
                      <p className="text-xs text-white/40 font-mono">
                        {call.phone} · Agent: {call.agent?.name || "Autonomous AI"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {formatDuration(call.duration || 0)}
                        </span>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">
                          {call.direction}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
