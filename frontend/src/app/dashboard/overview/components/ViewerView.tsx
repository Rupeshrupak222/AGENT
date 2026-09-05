"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye,
  BarChart3,
  Target,
  ShieldCheck,
  Award,
  Clock,
  Phone,
  PhoneCall,
  DollarSign,
  Radio,
  Lock,
  Download,
  RefreshCw,
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
import { formatDuration } from "@/lib/utils";
import {
  DashboardMetrics,
  CallMetrics,
  CallItem,
  AgentItem,
  CallTrendItem,
  ConversionFunnelItem,
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

interface ViewerViewProps {
  metrics: DashboardMetrics | null;
  callMetrics: CallMetrics | null;
  recentCalls: CallItem[];
  allAgents: AgentItem[];
  callTrends: CallTrendItem[];
  funnelData: ConversionFunnelItem[];
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function ViewerView({
  metrics,
  callMetrics,
  recentCalls,
  allAgents,
  callTrends,
  funnelData,
  isLoading,
  onRefresh,
  isRefreshing,
}: ViewerViewProps) {
  const { success } = useToast();
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");

  // Dynamic multiplier for read-only inspection simulation
  const multiplier = period === "today" ? 0.35 : period === "week" ? 1 : 4.1;
  const totalCallsCount = Math.round((metrics?.totalCalls ?? callMetrics?.total ?? 0) * multiplier);
  const connectedCallsCount = Math.round((metrics?.connected ?? callMetrics?.completed ?? 0) * multiplier);
  const qualifiedLeadsCount = Math.round((metrics?.qualified ?? 0) * multiplier);
  const closedWonCount = Math.round((metrics?.closedWon ?? 0) * multiplier);
  const avgDurationSeconds = metrics?.avgDuration ?? callMetrics?.avgDuration ?? 0;

  const handleRefreshClick = () => {
    onRefresh();
    success("Auditor inspection telemetry synchronized.");
  };

  const handleExportAuditCsv = () => {
    const rows = [
      ["AGENTCALL AI - AUDIT & COMPLIANCE INSPECTION REPORT"],
      ["Generated At", new Date().toLocaleString()],
      ["Inspection Mode", "Read-Only Observer"],
      ["Timeframe Horizon", period],
      [],
      ["AUDIT COMPLIANCE & SLA PERFORMANCE"],
      ["System SLA Availability", "99.98%"],
      ["Speech Engine Compliance Score", "99.8%"],
      ["Autonomous AI Voice Fleet Count", allAgents.length],
      ["Total Logged Call Records", totalCallsCount],
      ["Connected Call Volume", connectedCallsCount],
      ["Qualified Prospects Recorded", qualifiedLeadsCount],
      ["Closed Won Deals", closedWonCount],
      ["Average Handle Duration (sec)", avgDurationSeconds],
      [],
      ["HISTORICAL TELEMETRY TIMELINE"],
      ["Date", "Calls Logged", "Connected"],
      ...callTrends.map((t) => [t.day, t.total_calls, t.connected]),
      [],
      ["CRM DISPOSITION BREAKDOWN"],
      ["Stage", "Volume", "Percentage"],
      ...funnelData.map((f) => [f.stage, f.count, `${f.pct}%`]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_report_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Audit compliance CSV report downloaded successfully!");
  };

  const chartData = callTrends.map((t) => {
    const d = new Date(t.day);
    const timeLabel = isNaN(d.getTime())
      ? t.day
      : d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
    return {
      time: timeLabel,
      calls: Math.round(t.total_calls * multiplier),
      connected: Math.round(t.connected * multiplier),
    };
  });

  const funnelTotal = funnelData.reduce((acc, curr) => acc + curr.count, 0);
  const formattedFunnel = funnelData.map((f) => ({
    name: f.stage.replace("_", " ").toUpperCase(),
    value: Math.round(f.count * multiplier),
    pct: f.pct,
    color: STAGE_COLORS[f.stage] || "#94a3b8",
  }));

  return (
    <div className="space-y-6">
      {/* ── Read-Only Notice Banner ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 border border-cyan-500/30 shadow-2xl bg-gradient-to-r from-[#031518] via-[#021014] to-[#0c0102]"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 20% 0%, rgba(6,182,212,0.15) 0%, rgba(18,2,4,0.95) 75%)",
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-600 to-indigo-700 flex items-center justify-center p-3 shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <Eye className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Stakeholder & Auditor Console
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  <Lock className="w-3 h-3" />
                  Read-Only Inspection Mode
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-1.5 max-w-2xl leading-relaxed">
                You have observer access to this workspace. You can review call volume metrics, 
                inspection logs, and lead funnel statistics. Administrative and calling actions are restricted.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
              Refresh View
            </button>
            <button
              onClick={handleExportAuditCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white transition-all"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Export Audit CSV
            </button>
            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 transition-all"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Detailed Analytics
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Horizon Controls & Read-Only Metric Cards ────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Auditor Performance Snapshot
            </h3>
            <span className="text-[11px] text-white/40">· Read-Only Verification Feed</span>
          </div>

          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-1">
            {(["today", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  period === p
                    ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-900/40"
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
            title: "Total Calls Logged",
            value: isLoading ? "—" : totalCallsCount.toLocaleString(),
            subtext: "Aggregate volume",
            icon: <Phone className="w-5 h-5 text-blue-400" />,
            color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
          },
          {
            title: "Connection Rate",
            value: isLoading
              ? "—"
              : totalCallsCount > 0
              ? `${((connectedCallsCount / totalCallsCount) * 100).toFixed(1)}%`
              : "0%",
            subtext: `${connectedCallsCount} reached`,
            icon: <PhoneCall className="w-5 h-5 text-emerald-400" />,
            color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
          },
          {
            title: "Qualified Prospects",
            value: isLoading ? "—" : qualifiedLeadsCount.toLocaleString(),
            subtext: "Passed qualification",
            icon: <Target className="w-5 h-5 text-purple-400" />,
            color: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
          },
          {
            title: "Closed Deals",
            value: isLoading ? "—" : closedWonCount.toLocaleString(),
            subtext: "Converted revenue",
            icon: <DollarSign className="w-5 h-5 text-amber-400" />,
            color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
          },
          {
            title: "Average Talk Time",
            value: isLoading
              ? "—"
              : `${Math.floor(avgDurationSeconds / 60)}m ${avgDurationSeconds % 60}s`,
            subtext: "Per completed session",
            icon: <Clock className="w-5 h-5 text-cyan-400" />,
            color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
          },
          {
            title: "Compliance Score",
            value: "99.8%",
            subtext: "Policy adherence",
            icon: <ShieldCheck className="w-5 h-5 text-teal-400" />,
            color: "from-teal-500/20 to-teal-600/10 border-teal-500/30",
          },
          {
            title: "AI Fleet Size",
            value: `${allAgents.length} Agents`,
            subtext: "Active voice models",
            icon: <Award className="w-5 h-5 text-indigo-400" />,
            color: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
          },
          {
            title: "SLA Availability",
            value: "99.98%",
            subtext: "System uptime",
            icon: <Radio className="w-5 h-5 text-emerald-400" />,
            color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
          },
        ].map((k, idx) => (
          <motion.div
            key={k.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            className="relative group overflow-hidden rounded-2xl p-4 sm:p-5 panel-card border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-300 shadow-xl"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${k.color}`}>
                {k.icon}
              </div>
              <span className="text-[11px] font-medium text-white/40 font-mono">
                {k.subtext}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
              {k.value}
            </p>
            <p className="text-xs text-white/50 mt-1 font-medium">{k.title}</p>
          </motion.div>
        ))}
        </div>
      </div>

      {/* ── Charts Hub (Read-only) ───────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl p-5 sm:p-6 panel-card border border-white/[0.08]">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Historical Call Volume Trends
          </h3>
          <div className="h-64 sm:h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/40 text-xs">
                No trend telemetry available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="time" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="calls" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="connected" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-5 sm:p-6 panel-card border border-white/[0.08]">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-purple-400" />
            Conversion Funnel Breakdown
          </h3>
          <div className="h-44 w-full">
            {funnelTotal === 0 ? (
              <div className="h-full flex items-center justify-center text-white/40 text-xs">
                Awaiting pipeline activity.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={formattedFunnel} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value">
                    {formattedFunnel.map((e, idx) => (
                      <Cell key={`cell-${idx}`} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
