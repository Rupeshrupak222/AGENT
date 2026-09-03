"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Phone,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  Clock,
  Play,
  Search,
  ChevronLeft,
  ChevronRight,
  Mic,
  Bot,
  RefreshCw,
  TrendingUp,
  Activity,
  AlertTriangle,
  X,
  FileText,
  Radio,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WaveAnimation } from "@/components/ui/WaveAnimation";
import { formatDuration } from "@/lib/utils";
import {
  callsApi,
  analyticsApi,
  normalizeApiError,
  CallItem,
  CallDetail,
  CallMetrics,
  CallTrendItem,
} from "@/lib/api";

type CallFilterStatus =
  | "all"
  | "in_progress"
  | "completed"
  | "missed"
  | "failed"
  | "queued"
  | "ringing";

const statusConfig: Record<
  string,
  {
    icon: React.ReactNode;
    variant: "green" | "blue" | "yellow" | "red" | "gray" | "purple";
    label: string;
  }
> = {
  completed: {
    icon: <PhoneCall className="w-3.5 h-3.5" />,
    variant: "green",
    label: "Completed",
  },
  in_progress: {
    icon: <Phone className="w-3.5 h-3.5" />,
    variant: "blue",
    label: "Live",
  },
  ringing: {
    icon: <Phone className="w-3.5 h-3.5" />,
    variant: "yellow",
    label: "Ringing",
  },
  queued: {
    icon: <Clock className="w-3.5 h-3.5" />,
    variant: "gray",
    label: "Queued",
  },
  missed: {
    icon: <PhoneMissed className="w-3.5 h-3.5" />,
    variant: "yellow",
    label: "Missed",
  },
  failed: {
    icon: <PhoneOff className="w-3.5 h-3.5" />,
    variant: "red",
    label: "Failed",
  },
  transferred: {
    icon: <Radio className="w-3.5 h-3.5" />,
    variant: "purple",
    label: "Transferred",
  },
};

// ── Call Detail Modal ──────────────────────────────────────────
function CallDetailModal({
  callId,
  onClose,
}: {
  callId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await callsApi.get(callId);
        if (mounted) setDetail(data);
      } catch (err) {
        if (mounted) setError(normalizeApiError(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [callId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#150305] border border-slate-200 dark:border-white/10 shadow-2xl p-6 text-slate-900 dark:text-white"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <h3 className="text-lg font-bold">Call Session Details</h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              ID: <span className="font-mono">{callId}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
            <p className="text-xs text-slate-500 dark:text-white/40">Loading call records...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-rose-500">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : detail ? (
          <div className="space-y-5 pt-4">
            {/* Lead & Agent Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium">Contact / Lead</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {detail.lead?.name || "Unknown Contact"}
                </p>
                <p className="text-xs text-slate-500 dark:text-white/50 font-mono mt-0.5">
                  {detail.phone}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium">Assigned AI Agent</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {detail.agent?.name || "Autonomous Agent"}
                </p>
                <p className="text-xs text-slate-500 dark:text-white/50 capitalize mt-0.5">
                  {detail.agent?.role || "Telecaller"}
                </p>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                <p className="text-[10px] text-slate-400 dark:text-white/40">Status</p>
                <p className="text-xs font-bold capitalize mt-0.5 text-slate-800 dark:text-white">
                  {detail.status.replace("_", " ")}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                <p className="text-[10px] text-slate-400 dark:text-white/40">Duration</p>
                <p className="text-xs font-bold font-mono mt-0.5 text-slate-800 dark:text-white">
                  {detail.duration ? formatDuration(detail.duration) : "—"}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                <p className="text-[10px] text-slate-400 dark:text-white/40">Direction</p>
                <p className="text-xs font-bold capitalize mt-0.5 text-slate-800 dark:text-white">
                  {detail.direction}
                </p>
              </div>
            </div>

            {/* Recording */}
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-white/70 mb-2">
                Call Audio Recording
              </p>
              {detail.recordingUrl ? (
                <audio controls src={detail.recordingUrl} className="w-full h-9 rounded-lg" />
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-center">
                  <p className="text-xs text-slate-500 dark:text-white/40">Recording unavailable</p>
                </div>
              )}
            </div>

            {/* Transcript */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-brand-500" />
                <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                  Dialogue Transcript
                </p>
              </div>
              {detail.transcript?.turns && detail.transcript.turns.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-xs">
                  {detail.transcript.turns.map((turn, i) => (
                    <div key={i} className="space-y-0.5">
                      <span className="font-bold text-brand-600 dark:text-brand-400">
                        {turn.speaker}:
                      </span>{" "}
                      <span className="text-slate-700 dark:text-white/80">{turn.text}</span>
                    </div>
                  ))}
                </div>
              ) : detail.transcript?.rawText ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-white/80 max-h-40 overflow-y-auto">
                  {detail.transcript.rawText}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-center">
                  <p className="text-xs text-slate-500 dark:text-white/40">Transcript unavailable</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

// ── Main Calls Page ────────────────────────────────────────────
export default function CallsPage() {
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 15;

  const [metrics, setMetrics] = useState<CallMetrics | null>(null);
  const [trendData, setTrendData] = useState<CallTrendItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CallFilterStatus>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const fetchCallsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const statusParam = filter === "all" ? undefined : filter;

      const [callsRes, metricsRes, trendRes] = await Promise.allSettled([
        callsApi.list({ page, limit, status: statusParam }),
        callsApi.metrics("today"),
        analyticsApi.callTrend(7),
      ]);

      if (callsRes.status === "fulfilled") {
        setCalls(callsRes.value.items || []);
        setTotal(callsRes.value.total || 0);
      } else {
        setError(normalizeApiError(callsRes.reason));
      }

      if (metricsRes.status === "fulfilled") {
        setMetrics(metricsRes.value);
      }

      if (trendRes.status === "fulfilled") {
        setTrendData(trendRes.value || []);
      }
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchCallsData();
  }, [fetchCallsData]);

  // Client-side search on loaded page
  const filteredCalls = calls.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const leadName = c.lead?.name?.toLowerCase() || "";
    const agentName = c.agent?.name?.toLowerCase() || "";
    const phone = c.phone || "";
    return leadName.includes(q) || agentName.includes(q) || phone.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Chart data mapping
  const chartData = trendData.map((t) => {
    const d = new Date(t.day);
    const label = isNaN(d.getTime())
      ? t.day
      : d.toLocaleDateString("en-US", { weekday: "short" });
    return {
      day: label,
      calls: t.total_calls,
      connected: t.connected,
    };
  });

  const liveCalls = calls.filter((c) => c.status === "in_progress");

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 pb-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Calls Console
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            Real-time call center monitoring and conversational session telemetry
          </p>
        </div>
        <button
          onClick={fetchCallsData}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-brand-500" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchCallsData}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-xs transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Real KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {[
            {
              label: "Total Calls",
              value: metrics ? metrics.total.toLocaleString() : "—",
              icon: <Phone className="w-4 h-4" />,
              color: "text-brand-600 dark:text-brand-400",
              bg: "bg-brand-50 border-brand-200 dark:bg-brand-500/15 dark:border-brand-500/20",
            },
            {
              label: "Connected",
              value: metrics ? metrics.completed.toLocaleString() : "—",
              icon: <PhoneCall className="w-4 h-4" />,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/20",
            },
            {
              label: "Live Active",
              value: liveCalls.length.toLocaleString(),
              icon: <Mic className="w-4 h-4" />,
              color: "text-cyan-600 dark:text-cyan-400",
              bg: "bg-cyan-50 border-cyan-200 dark:bg-cyan-500/15 dark:border-cyan-500/20",
            },
            {
              label: "Missed",
              value: metrics ? metrics.missed.toLocaleString() : "—",
              icon: <PhoneMissed className="w-4 h-4" />,
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-50 border-amber-200 dark:bg-amber-500/15 dark:border-amber-500/20",
            },
            {
              label: "Failed",
              value: metrics ? metrics.failed.toLocaleString() : "—",
              icon: <TrendingUp className="w-4 h-4" />,
              color: "text-rose-600 dark:text-rose-400",
              bg: "bg-rose-50 border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/20",
            },
            {
              label: "Avg Duration",
              value: metrics ? `${metrics.avgDuration}s` : "—",
              icon: <Activity className="w-4 h-4" />,
              color: "text-purple-600 dark:text-purple-400",
              bg: "bg-purple-50 border-purple-200 dark:bg-purple-500/15 dark:border-purple-500/20",
            },
            {
              label: "Connect Rate",
              value: metrics ? `${metrics.connectRate}%` : "—",
              icon: <PhoneCall className="w-4 h-4" />,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/20",
            },
          ].map((s) => (
            <Card key={s.label} className="p-4 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border-slate-200 dark:border-white/10 shadow-sm">
              <div className={`inline-flex p-2 rounded-xl border ${s.bg} ${s.color} mb-2`}>
                {s.icon}
              </div>
              <p className={`text-xl font-extrabold ${s.color} font-mono`}>{s.value}</p>
              <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Charts & Live Sessions Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Trend chart */}
          <Card className="p-6 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border-slate-200 dark:border-white/10 shadow-sm">
            <CardHeader className="mb-4">
              <CardTitle className="text-slate-900 dark:text-white">
                Call Volume Trend (7 Days)
              </CardTitle>
              <Badge variant="blue">Telemetry</Badge>
            </CardHeader>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-44 text-slate-400 dark:text-white/30 text-xs">
                <Phone className="w-8 h-8 mb-2 opacity-30" />
                No trend telemetry logged yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gH1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "rgba(120,120,120,0.8)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(120,120,120,0.8)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl p-2.5 text-xs bg-white dark:bg-[#180406] border border-slate-200 dark:border-white/10 shadow-xl">
                          <p className="font-semibold text-slate-900 dark:text-white mb-1">{label}</p>
                          <p className="text-brand-600 dark:text-brand-300">
                            Calls: {payload[0]?.value}
                          </p>
                          <p className="text-emerald-600 dark:text-emerald-400">
                            Connected: {payload[1]?.value}
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke="#6366f1"
                    fill="url(#gH1)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="connected"
                    stroke="#10b981"
                    fill="none"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Live calls panel */}
          <Card className="p-6 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
            <div>
              <CardHeader className="mb-4">
                <CardTitle className="text-slate-900 dark:text-white">
                  Active Calls ({liveCalls.length})
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    Live Telephony
                  </span>
                </div>
              </CardHeader>
              {liveCalls.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-slate-400 dark:text-white/30 text-xs">
                  <Phone className="w-8 h-8 mb-2 opacity-30" />
                  <p>No active calls right now</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-44 overflow-y-auto">
                  {liveCalls.map((call) => (
                    <div
                      key={call.id}
                      onClick={() => setSelectedCallId(call.id)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-emerald-500/20 cursor-pointer hover:border-emerald-500 transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {call.lead?.name || "Customer"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-white/40 truncate">
                          {call.agent?.name || "Agent"} · {call.direction}
                        </p>
                      </div>
                      <WaveAnimation active size="sm" bars={5} color="bg-emerald-500" />
                      <span className="text-xs font-mono text-slate-500 dark:text-white/50">
                        {formatDuration(call.duration || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-white/30 pt-3 border-t border-slate-100 dark:border-white/5">
              Live WebRTC/SIP sessions synchronize automatically
            </div>
          </Card>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-white/5 rounded-xl p-1">
            {(
              [
                "all",
                "in_progress",
                "completed",
                "missed",
                "failed",
                "queued",
                "ringing",
              ] as const
            ).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f === "in_progress"
                  ? "Live"
                  : f === "all"
                  ? "All"
                  : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[200px] max-w-sm relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by contact, agent, phone..."
              className="w-full h-9 pl-9 pr-3 rounded-xl text-xs bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Calls Table */}
        <Card padding="none" className="overflow-hidden bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border-slate-200 dark:border-white/10 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Lead / Phone</th>
                  <th className="px-4 py-3">AI Agent</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Sentiment</th>
                  <th className="px-4 py-3">Quality</th>
                  <th className="px-4 py-3">Date / Time</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={9} className="px-4 py-3.5">
                        <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500 dark:text-white/40">
                      <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-sm text-slate-700 dark:text-white/70">
                        No calls recorded yet
                      </p>
                      <p className="text-xs mt-1">
                        Once AI agents initiate or receive calls, recordings and transcripts appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => {
                    const sc = statusConfig[call.status] || {
                      icon: <Phone className="w-3.5 h-3.5" />,
                      variant: "gray",
                      label: call.status,
                    };
                    const leadName = call.lead?.name || "Unknown Contact";
                    const agentName = call.agent?.name || "AI Agent";

                    return (
                      <tr
                        key={call.id}
                        onClick={() => setSelectedCallId(call.id)}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                              {leadName[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {leadName}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-white/40 font-mono">
                                {call.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-white/70">
                            <Bot className="w-3.5 h-3.5 text-brand-500" />
                            <span>{agentName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={call.direction === "inbound" ? "cyan" : "purple"}
                            className="text-[10px] capitalize"
                          >
                            {call.direction}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={sc.variant as any} dot className="text-[10px] gap-1">
                            {sc.icon}
                            {sc.label}
                            {call.status === "in_progress" && (
                              <WaveAnimation
                                active
                                size="sm"
                                bars={3}
                                color="bg-emerald-500"
                                className="ml-1"
                              />
                            )}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-white/70">
                          {call.duration ? formatDuration(call.duration) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {call.sentimentScore != null ? (
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  call.sentimentScore >= 4
                                    ? "bg-emerald-500"
                                    : call.sentimentScore >= 3
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                              />
                              <span className="text-slate-700 dark:text-white/70">
                                {call.sentimentScore.toFixed(1)}/5
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {call.qualityScore != null ? (
                            <span className="font-mono text-slate-700 dark:text-white/70">
                              {call.qualityScore}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-white/40">
                          {new Date(call.startedAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedCallId(call.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-white/70 hover:text-brand-600 transition-colors"
                            title="View Session Details"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
            <span>
              Showing {filteredCalls.length} of {total} calls (Page {page} of {totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Call Detail Modal */}
      <AnimatePresence>
        {selectedCallId && (
          <CallDetailModal
            callId={selectedCallId}
            onClose={() => setSelectedCallId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
