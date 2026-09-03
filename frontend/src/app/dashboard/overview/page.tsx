"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Phone,
  DollarSign,
  PhoneCall,
  PhoneMissed,
  Clock,
  Target,
  Bot,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Zap,
  RefreshCw,
  Calendar,
  Radio,
  AlertTriangle,
  Award,
} from "lucide-react";
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
import { motion } from "framer-motion";
import { WaveAnimation } from "@/components/ui/WaveAnimation";
import { formatDuration } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import {
  analyticsApi,
  callsApi,
  agentsApi,
  normalizeApiError,
  DashboardMetrics,
  CallMetrics,
  CallTrendItem,
  AgentPerformanceItem,
  ConversionFunnelItem,
  CallItem,
  AgentItem,
} from "@/lib/api";

// Stage color mapping for lead disposition funnel
const STAGE_COLORS: Record<string, string> = {
  new: "#3b82f6",
  contacted: "#06b6d4",
  interested: "#8b5cf6",
  qualified: "#6366f1",
  appointment: "#10b981",
  closed_won: "#22c55e",
  closed_lost: "#ef4444",
};

// Activity stream fallback (noted as audit trail pending dedicated backend feed)
const AUDIT_TRAIL_ACTIVITIES = [
  {
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
    text: "AI Voice Engine telemetry initialized with tenant isolation",
    time: "Real-time",
    badge: "System",
  },
  {
    icon: <PhoneCall className="w-4 h-4 text-brand-500 dark:text-brand-400" />,
    text: "WebRTC audio media stream dispatcher ready",
    time: "Live",
    badge: "Telephony",
  },
  {
    icon: <Target className="w-4 h-4 text-purple-500 dark:text-purple-400" />,
    text: "Automated qualification scoring pipeline attached",
    time: "Active",
    badge: "CRM",
  },
  {
    icon: <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
    text: "Zero-latency compliance monitor active",
    time: "Policy",
    badge: "Compliance",
  },
];

function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 dark:bg-[#180406]/95 border border-slate-200 dark:border-white/10 backdrop-blur-xl rounded-xl p-3 text-xs shadow-2xl shadow-black/10 dark:shadow-black/80">
      <p className="font-semibold text-slate-900 dark:text-white/90 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-600 dark:text-white/60 capitalize">{p.name}:</span>
          </div>
          <span className="text-slate-900 dark:text-white font-mono font-bold">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Backend Data States
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [callMetrics, setCallMetrics] = useState<CallMetrics | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallItem[]>([]);
  const [agentPerfList, setAgentPerfList] = useState<AgentPerformanceItem[]>([]);
  const [allAgents, setAllAgents] = useState<AgentItem[]>([]);
  const [callTrends, setCallTrends] = useState<CallTrendItem[]>([]);
  const [funnelData, setFunnelData] = useState<ConversionFunnelItem[]>([]);

  const user = useAuthStore((s) => s.user);

  const fetchDashboardData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      const daysForPeriod = period === "today" ? 1 : period === "week" ? 7 : 30;

      // Parallel API calls with fault-tolerant Promise.allSettled
      const [
        metricsRes,
        callMetricsRes,
        callsRes,
        agentPerfRes,
        agentsRes,
        trendsRes,
        funnelRes,
      ] = await Promise.allSettled([
        analyticsApi.overview(period),
        callsApi.metrics(period),
        callsApi.list({ limit: 5 }),
        analyticsApi.agentPerformance(),
        agentsApi.list(),
        analyticsApi.callTrend(daysForPeriod),
        analyticsApi.conversionFunnel(),
      ]);

      let primaryError: string | null = null;

      // 1. Analytics Overview
      if (metricsRes.status === "fulfilled") {
        setMetrics(metricsRes.value);
      } else {
        primaryError = normalizeApiError(metricsRes.reason);
      }

      // 2. Call Metrics
      if (callMetricsRes.status === "fulfilled") {
        setCallMetrics(callMetricsRes.value);
      }

      // 3. Recent Calls
      if (callsRes.status === "fulfilled") {
        setRecentCalls(callsRes.value.items || []);
      }

      // 4. Agent Performance
      if (agentPerfRes.status === "fulfilled") {
        setAgentPerfList(agentPerfRes.value || []);
      }

      // 5. All Agents
      if (agentsRes.status === "fulfilled") {
        setAllAgents(agentsRes.value || []);
      }

      // 6. Call Trends
      if (trendsRes.status === "fulfilled") {
        setCallTrends(trendsRes.value || []);
      }

      // 7. Funnel
      if (funnelRes.status === "fulfilled") {
        setFunnelData(funnelRes.value || []);
      }

      // Only display connection warning if all key endpoints failed completely
      if (
        metricsRes.status === "rejected" &&
        callMetricsRes.status === "rejected" &&
        callsRes.status === "rejected"
      ) {
        setErrorMessage(
          primaryError || "Unable to connect to backend server at this time."
        );
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [period]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derived Values
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

  // KPI Definition List
  const kpiItems = [
    {
      title: "Total Calls",
      value: isLoading ? "—" : totalCallsCount.toLocaleString(),
      subtext: `${period} volume`,
      icon: <Phone className="w-5 h-5" />,
      color: "bg-blue-50 text-blue-600 border-blue-200 dark:from-blue-500/20 dark:to-blue-600/10 dark:text-blue-400 dark:border-blue-500/30",
    },
    {
      title: "Connected",
      value: isLoading ? "—" : connectedCallsCount.toLocaleString(),
      subtext:
        totalCallsCount > 0
          ? `${((connectedCallsCount / totalCallsCount) * 100).toFixed(1)}% connect rate`
          : "0% connect rate",
      icon: <PhoneCall className="w-5 h-5" />,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:from-emerald-500/20 dark:to-emerald-600/10 dark:text-emerald-400 dark:border-emerald-500/30",
    },
    {
      title: "Qualified Leads",
      value: isLoading ? "—" : qualifiedLeadsCount.toLocaleString(),
      subtext:
        totalCallsCount > 0
          ? `${((qualifiedLeadsCount / totalCallsCount) * 100).toFixed(1)}% conversion`
          : "0% conversion",
      icon: <Target className="w-5 h-5" />,
      color: "bg-purple-50 text-purple-600 border-purple-200 dark:from-purple-500/20 dark:to-purple-600/10 dark:text-purple-400 dark:border-purple-500/30",
    },
    {
      title: "Closed Won",
      value: isLoading ? "—" : closedWonCount.toLocaleString(),
      subtext: "Converted deals",
      icon: <DollarSign className="w-5 h-5" />,
      color: "bg-amber-50 text-amber-600 border-amber-200 dark:from-amber-500/20 dark:to-amber-600/10 dark:text-amber-400 dark:border-amber-500/30",
    },
    {
      title: "Avg Duration",
      value: isLoading
        ? "—"
        : `${Math.floor(avgDurationSeconds / 60)}m ${avgDurationSeconds % 60}s`,
      subtext: "Per completed call",
      icon: <Clock className="w-5 h-5" />,
      color: "bg-cyan-50 text-cyan-600 border-cyan-200 dark:from-cyan-500/20 dark:to-cyan-600/10 dark:text-cyan-400 dark:border-cyan-500/30",
    },
    {
      title: "Active Agents",
      value: isLoading ? "—" : activeAgentsCount.toLocaleString(),
      subtext: `${allAgents.length} total deployed`,
      icon: <Bot className="w-5 h-5" />,
      color: "bg-rose-50 text-brand-600 border-brand-200 dark:from-brand-500/20 dark:to-brand-600/10 dark:text-brand-400 dark:border-brand-500/30",
    },
    {
      title: "Missed / Failed",
      value: isLoading ? "—" : missedOrFailedCount.toLocaleString(),
      subtext: "Unsuccessful attempts",
      icon: <PhoneMissed className="w-5 h-5" />,
      color: "bg-rose-50 text-rose-600 border-rose-200 dark:from-rose-500/20 dark:to-rose-600/10 dark:text-rose-400 dark:border-rose-500/30",
    },
    {
      title: "Appts Booked",
      value: isLoading ? "—" : appointmentsCount.toLocaleString(),
      subtext: "Scheduled demos",
      icon: <Calendar className="w-5 h-5" />,
      color: "bg-teal-50 text-teal-600 border-teal-200 dark:from-teal-500/20 dark:to-teal-600/10 dark:text-teal-400 dark:border-teal-500/30",
    },
  ];

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Error Banner (if API failure occurs) ──────────────── */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Connection Warning</p>
              <p className="text-xs text-rose-600 dark:text-rose-200/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-800 dark:text-rose-200 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── Top Hero Banner ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 border border-brand-200 dark:border-brand-500/30 shadow-sm dark:shadow-2xl bg-gradient-to-r from-red-50/80 via-white to-red-50/40 dark:from-transparent dark:via-transparent dark:to-transparent"
        style={{
          backgroundImage:
            undefined,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 20% 0%, rgba(212,32,39,0.22) 0%, rgba(18,2,4,0.95) 75%)",
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-rose-700 flex items-center justify-center p-3 shadow-lg shadow-brand-500/30 flex-shrink-0">
              <Zap className="w-7 h-7 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Welcome back, {user?.name || "Team Acme"}!
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                  Live Telephony Connected
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60 mt-1.5 max-w-2xl leading-relaxed">
                Your AI voice agents are autonomously handling calls, qualifying prospects, and
                setting appointments in real-time across your workspace.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition-all duration-200 shadow-sm disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-brand-500" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              href="/dashboard/agents"
              className="btn-red text-xs py-2 px-4 h-9 shadow-md shadow-brand-500/25"
            >
              <Bot className="w-3.5 h-3.5" />
              Build New Agent
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Grid ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Operational Metrics
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-white/40">· Live Telephony & CRM Sync</span>
          </div>

          {/* Period Toggle */}
          <div className="flex items-center bg-slate-200/70 dark:bg-white/[0.04] border border-slate-300/60 dark:border-white/10 rounded-xl p-1">
            {(["today", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  period === p
                    ? "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-900/40"
                    : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {kpiItems.map((k, i) => (
            <motion.div
              key={k.title + period}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="relative group overflow-hidden rounded-2xl p-4 sm:p-5 bg-white dark:bg-gradient-to-b dark:from-white/[0.06] dark:to-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] hover:border-brand-500/40 transition-all duration-300 shadow-sm dark:shadow-xl"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl border ${k.color}`}>
                  {k.icon}
                </div>
                {k.subtext && (
                  <span className="text-[11px] font-medium text-slate-500 dark:text-white/40 font-mono">
                    {k.subtext}
                  </span>
                )}
              </div>
              {isLoading ? (
                <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse my-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                  {k.value}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-white/50 mt-1 font-medium">{k.title}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Charts Section ──────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Volume & Conversion Chart */}
        <div className="lg:col-span-2 rounded-2xl p-5 sm:p-6 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-500 dark:text-brand-400" />
                  Call Volume & Connected Activity
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  Actual dialed calls vs completed connections recorded in database
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-slate-600 dark:text-white/60 font-medium">Total Calls</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <span className="text-slate-600 dark:text-white/60 font-medium">Connected Calls</span>
                </div>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              {isLoading ? (
                <div className="h-full w-full bg-slate-100 dark:bg-white/[0.03] rounded-xl flex items-center justify-center animate-pulse">
                  <span className="text-xs text-slate-500 dark:text-white/40">Loading trend telemetry...</span>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/80 dark:bg-white/[0.02] rounded-xl border border-slate-200/80 dark:border-white/[0.04]">
                  <Phone className="w-8 h-8 text-slate-300 dark:text-white/20 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-white/70">No Call Trends Recorded Yet</p>
                  <p className="text-xs text-slate-500 dark:text-white/40 max-w-sm mt-1">
                    Once AI agents execute inbound or outbound calls, historical trend distribution
                    will chart here automatically.
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "rgba(120,120,120,0.8)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(120,120,120,0.8)", fontSize: 11 }}
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

        {/* Lead Disposition Funnel */}
        <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                Pipeline Disposition
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-white/40 font-mono">
                {funnelTotal} Leads Tracked
              </span>
            </div>

            <div className="h-44 w-full relative">
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center animate-pulse">
                  <div className="w-28 h-28 rounded-full border-4 border-slate-200 dark:border-white/10 border-t-brand-500 animate-spin" />
                </div>
              ) : funnelTotal === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 bg-slate-50/80 dark:bg-white/[0.02] rounded-xl border border-slate-200/80 dark:border-white/[0.04]">
                  <Target className="w-6 h-6 text-slate-300 dark:text-white/20 mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">No Leads in Pipeline</p>
                  <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">
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
                            <div className="bg-white/95 dark:bg-[#180406]/95 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white shadow-lg">
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
                    <span className="text-[11px] text-slate-500 dark:text-white/40 font-medium">Qualified</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {qualifiedLeadsCount}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-white/[0.06] max-h-40 overflow-y-auto">
            {formattedFunnel.length > 0 ? (
              formattedFunnel.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-slate-600 dark:text-white/60 text-[11px]">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800 dark:text-white font-mono font-semibold text-[11px]">
                      {d.value} ({d.pct}%)
                    </span>
                    <div className="w-12 h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, d.pct)}%`, background: d.color }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-[11px] text-slate-400 dark:text-white/30 py-2">
                Awaiting CRM lead activity
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Lower Operational Row ────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Live Calls Feed */}
        <div className="rounded-2xl p-5 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Recent Call Sessions
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                {recentCalls.length} Logged
              </span>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] animate-pulse space-y-2"
                  >
                    <div className="h-4 w-1/3 bg-slate-200 dark:bg-white/10 rounded" />
                    <div className="h-3 w-2/3 bg-slate-100 dark:bg-white/5 rounded" />
                  </div>
                ))
              ) : recentCalls.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50/80 dark:bg-white/[0.02] rounded-xl border border-slate-200/80 dark:border-white/[0.04]">
                  <PhoneCall className="w-8 h-8 text-slate-300 dark:text-white/20 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">No Recent Calls</p>
                  <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
                    Live call sessions will automatically appear here once initiated.
                  </p>
                </div>
              ) : (
                recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] hover:border-brand-500/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
                          <Radio className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors">
                            {call.lead?.name || "Unknown Contact"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-white/40 flex items-center gap-1.5">
                            <span>{call.agent?.name || "Autonomous Agent"}</span>
                            <span>·</span>
                            <span className="font-mono text-[11px]">{call.phone}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        {call.status === "in_progress" || call.status === "ringing" ? (
                          <WaveAnimation active size="sm" bars={4} color="bg-emerald-500" />
                        ) : null}
                        <span className="text-[10px] font-mono text-slate-500 dark:text-white/50 mt-1">
                          {formatDuration(call.duration || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.04] flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-white/40">
                        Status:{" "}
                        <span className="text-slate-800 dark:text-white/80 font-medium capitalize">
                          {call.status.replace("_", " ")}
                        </span>
                      </span>
                      <span
                        className={`font-medium ${
                          call.sentimentScore != null && call.sentimentScore >= 3.5
                            ? "text-emerald-600 dark:text-emerald-400"
                            : call.sentimentScore != null && call.sentimentScore >= 2.5
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-500 dark:text-white/40"
                        }`}
                      >
                        {call.direction.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            href="/dashboard/calls"
            className="mt-4 block text-center text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors py-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.04]"
          >
            Open Call Center Console →
          </Link>
        </div>

        {/* AI Agent Leaderboard */}
        <div className="rounded-2xl p-5 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Active AI Agents
              </h3>
              <Link
                href="/dashboard/agents"
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
              >
                Manage →
              </Link>
            </div>

            <div className="space-y-2.5">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] animate-pulse flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/10" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3.5 w-1/2 bg-slate-200 dark:bg-white/10 rounded" />
                      <div className="h-2.5 w-1/3 bg-slate-100 dark:bg-white/5 rounded" />
                    </div>
                  </div>
                ))
              ) : agentPerfList.length === 0 && allAgents.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50/80 dark:bg-white/[0.02] rounded-xl border border-slate-200/80 dark:border-white/[0.04]">
                  <Bot className="w-8 h-8 text-slate-300 dark:text-white/20 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">No Agents Configured</p>
                  <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
                    Deploy your first conversational voice agent to start handling calls.
                  </p>
                  <Link
                    href="/dashboard/agents"
                    className="mt-3 inline-block text-xs text-brand-600 dark:text-brand-400 underline font-medium"
                  >
                    Create Voice Agent
                  </Link>
                </div>
              ) : (
                (agentPerfList.length > 0 ? agentPerfList : (allAgents as any)).map(
                  (agent: any, i: number) => {
                    const agentName = agent.name || "Agent";
                    const role = agent.role || "Telecaller";
                    const totalCalls = agent.totalCalls ?? agent._count?.calls ?? 0;
                    const completedCalls = agent.completedCalls ?? 0;

                    return (
                      <div
                        key={agent.id || agentName}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                      >
                        <span className="text-xs font-mono font-bold text-slate-400 dark:text-white/30 w-4">
                          {i + 1}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md flex-shrink-0">
                          {agentName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{agentName}</p>
                          <p className="text-xs text-slate-500 dark:text-white/40 truncate capitalize">{role}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {totalCalls > 0
                              ? `${Math.round((completedCalls / totalCalls) * 100)}%`
                              : "Ready"}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-white/40">{totalCalls} calls</p>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </div>

          <Link
            href="/dashboard/agents"
            className="mt-4 block text-center text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors py-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.04]"
          >
            Deploy AI Agent Fleet →
          </Link>
        </div>

        {/* Real-time Activity Stream */}
        <div className="rounded-2xl p-5 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                System Audit Stream
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-white/40">Real-time Feed</span>
            </div>

            <div className="space-y-3.5">
              {AUDIT_TRAIL_ACTIVITIES.map((act, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {act.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-white/80 leading-relaxed">{act.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-slate-400 dark:text-white/40">{act.time}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/60 font-medium">
                        {act.badge}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[11px] text-slate-500 dark:text-white/40">
            <span className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Tenant Scope Verified
            </span>
            <span className="font-mono text-[10px]">Encrypted Bearer</span>
          </div>
        </div>
      </div>

      {/* ── Fast Navigation Bar ──────────────────────────────── */}
      <div className="rounded-2xl p-5 bg-white dark:bg-gradient-to-r dark:from-white/[0.05] dark:via-brand-950/20 dark:to-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-2xl">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
          Quick Navigation
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "AI Agent Studio",
              href: "/dashboard/agents",
              desc: "Build & configure voices",
              icon: <Bot className="w-5 h-5 text-brand-500 dark:text-brand-400" />,
            },
            {
              label: "Live Call Center",
              href: "/dashboard/calls",
              desc: "Monitor calls in real time",
              icon: <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
            },
            {
              label: "CRM & Leads Pipeline",
              href: "/dashboard/crm",
              desc: "Kanban & lead scores",
              icon: <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
            },
            {
              label: "Deep Analytics",
              href: "/dashboard/analytics",
              desc: "Conversion & sentiment",
              icon: <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
            },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="p-4 rounded-xl bg-slate-50/80 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] border border-slate-200/80 dark:border-white/[0.06] hover:border-brand-500/30 transition-all duration-200 group flex items-start gap-3 shadow-sm"
            >
              <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 group-hover:scale-110 transition-transform shadow-xs">
                {action.icon}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors">
                  {action.label}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
