"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  PhoneCall,
  PhoneMissed,
  Target,
  Clock,
  Brain,
  Zap,
  CheckCircle2,
  XCircle,
  Hourglass,
  ChevronRight,
  Radio,
  Phone,
  Users,
  Calendar,
  Download,
  Check,
  ShieldCheck,
  Sparkles,
  Bot,
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
import { formatDuration, formatNumber } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import type {
  CompanyDashboardData,
  CompanyDashboardKpis,
  CallItem,
  ConversionFunnelItem,
} from "@/lib/api";
import type { PeriodPreset, DashboardRange } from "@/lib/dashboard-range";
import {
  OUTCOME_COLORS,
  PERIOD_OPTIONS,
  fmtBucket,
  humanize,
  fmtRangeLabel,
  DeltaPill,
  SEVERITY_STYLES,
  ChartTooltip,
  Skeleton,
  SectionHeader,
  RefreshButton,
} from "./shared";

interface ManagerViewProps {
  dashboard: CompanyDashboardData | null;
  recentCalls: CallItem[];
  funnelData: ConversionFunnelItem[];
  period: PeriodPreset;
  setPeriod: (p: PeriodPreset) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  range: DashboardRange;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  workspaceName: string;
  workspacePlan: string | null;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmtCallDuration(sec: number | null | undefined): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export function ManagerView({
  dashboard,
  recentCalls,
  funnelData,
  period,
  setPeriod,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  range,
  isLoading,
  isRefreshing,
  onRefresh,
  workspaceName,
  workspacePlan,
}: ManagerViewProps) {
  const { success } = useToast();

  const kpis = dashboard?.kpis?.current;
  const prev = dashboard?.kpis?.previous;

  const chartData = useMemo(
    () =>
      (dashboard?.timeSeries ?? []).map((p) => ({
        label: fmtBucket(p.bucket, dashboard?.granularity ?? "day"),
        calls: p.totalCalls,
        connected: p.connectedCalls,
      })),
    [dashboard]
  );

  const outcomeData = useMemo(
    () =>
      (dashboard?.outcomes ?? []).map((o, i) => ({
        name: humanize(o.outcome),
        value: o.count,
        pct: o.pct,
        color: OUTCOME_COLORS[i % OUTCOME_COLORS.length],
      })),
    [dashboard]
  );

  const funnelTotal = funnelData.reduce((acc, f) => acc + f.count, 0);

  const liveCalls = recentCalls.filter(
    (c) => c.status === "in_progress" || c.status === "ringing"
  );

  const [queue, setQueue] = useState<CallItem[]>(() =>
    recentCalls.filter(
      (c) => c.status === "completed" && (c.qualityScore == null || c.sentimentScore == null)
    )
  );

  useEffect(() => {
    setQueue(
      recentCalls.filter(
        (c) => c.status === "completed" && (c.qualityScore == null || c.sentimentScore == null)
      )
    );
  }, [recentCalls]);

  const handleDismiss = (id: string) => {
    setQueue((prev) => prev.filter((c) => c.id !== id));
    success("Call removed from review queue");
  };

  const handleExportCsv = () => {
    const rows: Array<string[]> = [
      ["AGENTCALL AI - MANAGER OPERATIONS REPORT"],
      ["Workspace", workspaceName],
      [
        "Period",
        `${dashboard?.period?.label ?? fmtRangeLabel(range)} (${dashboard?.period?.from ?? range.from} to ${dashboard?.period?.to ?? range.to})`,
      ],
      ["Comparison", dashboard?.comparison?.label ?? "previous period"],
      ["Generated At", new Date().toISOString()],
      [],
      ["Key Performance Indicator", "Current", "Previous", "Delta %"],
    ];

    const kpiDefs: Array<[string, keyof CompanyDashboardKpis]> = [
      ["Total Calls", "totalCalls"],
      ["Connected Calls", "connectedCalls"],
      ["Missed Calls", "missedCalls"],
      ["Failed Calls", "failedCalls"],
      ["Transferred Calls", "transferredCalls"],
      ["Avg Duration (s)", "avgDuration"],
      ["Total Minutes", "totalMinutes"],
      ["Connect Rate (%)", "connectRate"],
      ["Qualified Leads", "qualifiedLeads"],
      ["Appointments", "appointments"],
      ["Closed Won", "closedWon"],
      ["Avg Sentiment", "avgSentiment"],
      ["AI Analyses", "aiAnalyses"],
    ];
    kpiDefs.forEach(([label, key]) => {
      const cur = kpis?.[key] ?? 0;
      const pv = prev?.[key] ?? 0;
      const delta = pv === 0 ? (cur === 0 ? 0 : null) : ((cur - pv) / pv) * 100;
      rows.push([label, String(cur), String(pv), delta === null ? "" : `${delta.toFixed(1)}%`]);
    });

    rows.push([], ["CALL VOLUME OVER TIME"], ["Bucket", "Total Calls", "Connected Calls"]);
    (dashboard?.timeSeries ?? []).forEach((p) =>
      rows.push([p.bucket, String(p.totalCalls), String(p.connectedCalls)])
    );

    rows.push([], ["OUTCOME BREAKDOWN"], ["Outcome", "Count", "%"]);
    (dashboard?.outcomes ?? []).forEach((o) =>
      rows.push([humanize(o.outcome), String(o.count), `${o.pct}%`])
    );

    rows.push([], ["RECENT CALLS"], ["id", "phone", "direction", "status", "startedAt", "duration", "lead name", "agent name"]);
    recentCalls.forEach((c) =>
      rows.push([
        c.id,
        c.lead?.phone ?? c.phone,
        c.direction,
        c.status,
        c.startedAt,
        c.duration != null ? String(c.duration) : "",
        c.lead?.name ?? "",
        c.agent?.name ?? "",
      ])
    );

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `manager_operations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Manager operations CSV report exported successfully.");
  };

  const periodLabel = dashboard?.period?.label ?? fmtRangeLabel(range);

  const kpiCards: Array<{
    key: string;
    label: string;
    value: string | number;
    icon: React.ReactNode;
    accent: string;
    delta?: { current: number; previous: number; invert?: boolean };
    subtext?: string;
  }> = [
    {
      key: "totalCalls",
      label: "Total Calls",
      value: isLoading ? "…" : formatNumber(kpis?.totalCalls ?? 0),
      icon: <PhoneCall className="w-5 h-5 text-sky-500" />,
      accent: "from-sky-500/15 to-sky-600/5 border-sky-500/30",
      delta: kpis && prev ? { current: kpis.totalCalls, previous: prev.totalCalls } : undefined,
      subtext: "Dialed this period",
    },
    {
      key: "connected",
      label: "Connected",
      value: isLoading ? "…" : formatNumber(kpis?.connectedCalls ?? 0),
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      accent: "from-emerald-500/15 to-emerald-600/5 border-emerald-500/30",
      delta: kpis && prev ? { current: kpis.connectedCalls, previous: prev.connectedCalls } : undefined,
      subtext: `${(kpis?.connectRate ?? 0).toFixed(1)}% connect rate`,
    },
    {
      key: "missedFailed",
      label: "Missed / Failed",
      value: isLoading ? "…" : formatNumber((kpis?.missedCalls ?? 0) + (kpis?.failedCalls ?? 0)),
      icon: <PhoneMissed className="w-5 h-5 text-rose-500" />,
      accent: "from-rose-500/15 to-rose-600/5 border-rose-500/30",
      delta:
        kpis && prev
          ? {
              current: (kpis.missedCalls ?? 0) + (kpis.failedCalls ?? 0),
              previous: (prev.missedCalls ?? 0) + (prev.failedCalls ?? 0),
              invert: true,
            }
          : undefined,
      subtext: "Unsuccessful attempts",
    },
    {
      key: "qualified",
      label: "Qualified Leads",
      value: isLoading ? "…" : formatNumber(kpis?.qualifiedLeads ?? 0),
      icon: <Target className="w-5 h-5 text-purple-500" />,
      accent: "from-purple-500/15 to-purple-600/5 border-purple-500/30",
      delta: kpis && prev ? { current: kpis.qualifiedLeads, previous: prev.qualifiedLeads } : undefined,
      subtext: `${(kpis?.conversionRate ?? 0).toFixed(1)}% conversion`,
    },
    {
      key: "appointments",
      label: "Appointments",
      value: isLoading ? "…" : formatNumber(kpis?.appointments ?? 0),
      icon: <Calendar className="w-5 h-5 text-amber-500" />,
      accent: "from-amber-500/15 to-amber-600/5 border-amber-500/30",
      delta: kpis && prev ? { current: kpis.appointments, previous: prev.appointments } : undefined,
      subtext: `${(kpis?.appointmentRate ?? 0).toFixed(1)}% appointment rate`,
    },
    {
      key: "avgDuration",
      label: "Avg Duration",
      value: isLoading ? "…" : formatDuration(kpis?.avgDuration ?? 0),
      icon: <Clock className="w-5 h-5 text-cyan-500" />,
      accent: "from-cyan-500/15 to-cyan-600/5 border-cyan-500/30",
      delta: kpis && prev ? { current: kpis.avgDuration, previous: prev.avgDuration } : undefined,
      subtext: "Per completed call",
    },
    {
      key: "sentiment",
      label: "Avg Sentiment",
      value: isLoading ? "…" : (kpis?.avgSentiment ?? 0).toFixed(2),
      icon: <Brain className="w-5 h-5 text-indigo-500" />,
      accent: "from-indigo-500/15 to-indigo-600/5 border-indigo-500/30",
      delta: kpis && prev ? { current: kpis.avgSentiment, previous: prev.avgSentiment } : undefined,
      subtext: "Customer emotion score",
    },
    {
      key: "liveNow",
      label: "Active AI Agents",
      value: isLoading ? "…" : `${dashboard?.facts?.activeAgents ?? 0}`,
      icon: <Bot className="w-5 h-5 text-brand-500 dark:text-brand-400" />,
      accent: "from-brand-500/15 to-brand-600/5 border-brand-500/30",
      subtext: "Live on the floor",
    },
  ];

  const hasAnyData = kpis
    ? kpis.totalCalls > 0 || kpis.qualifiedLeads > 0 || kpis.appointments > 0 || kpis.aiAnalyses > 0
    : false;

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Operations Command Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30">
              <Sparkles className="w-3 h-3" /> Manager
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            {workspaceName} · {periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <RefreshButton isRefreshing={isRefreshing} onRefresh={onRefresh} />
          <button
            onClick={handleExportCsv}
            disabled={!dashboard}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-40 transition-colors"
          >
            <Download className="w-4 h-4 text-purple-500 dark:text-purple-400" /> Export CSV
          </button>
          <Link
            href="/dashboard/calls"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 transition-all"
          >
            <Radio className="w-4 h-4" /> Live Call Floor
          </Link>
        </div>
      </div>

      {/* ── Period Filter ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              aria-pressed={period === opt.key}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                period === opt.key
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/30 dark:shadow-purple-900/60"
                  : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <label htmlFor="mg-from" className="sr-only">Custom from date</label>
            <input
              id="mg-from"
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 rounded-xl px-3 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-purple-500"
            />
            <span className="text-slate-400 dark:text-white/40">→</span>
            <label htmlFor="mg-to" className="sr-only">Custom to date</label>
            <input
              id="mg-to"
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 rounded-xl px-3 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-purple-500"
            />
          </div>
        )}

        {!isLoading && dashboard && (
          <span className="text-xs font-mono text-slate-400 dark:text-white/40">
            vs {dashboard.comparison.label}
          </span>
        )}
      </div>

      {/* ── Alerts ────────────────────────────────────────────── */}
      {!isLoading && dashboard && dashboard.alerts.length > 0 && (
        <div className="space-y-2">
          {dashboard.alerts.map((alert) => {
            const st = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
            const Icon = st.icon;
            return (
              <div
                key={alert.id}
                role="status"
                className={`flex items-start gap-3 p-3.5 rounded-xl border ${st.cls}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${st.ring}`} />
                <div className="min-w-0">
                  <p className="text-sm font-bold">{alert.title}</p>
                  <p className="text-xs opacity-90 mt-0.5">{alert.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Operational Hero ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 15% 0%, rgba(139,92,246,0.12) 0%, rgba(0,0,0,0) 70%)",
          }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-500/25">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="text-base font-black text-slate-900 dark:text-white">{workspaceName}</p>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                  {humanize(workspacePlan ?? "Active Plan")} · Operations
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/50 mt-1 max-w-xl leading-relaxed">
                Lead your AI workforce: monitor live conversations, review call quality, and steer
                campaigns across the floor in real time.
              </p>
              <div className="flex items-center gap-3 flex-wrap mt-2 text-[11px] font-mono text-slate-400 dark:text-white/40">
                <span>{dashboard?.facts?.activeAgents ?? "—"} agents live</span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  {dashboard?.facts?.teamMembers ?? "—"} team members
                </span>
                <span>{liveCalls.length} live calls now</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 transition-colors"
            >
              Full Analytics <ChevronRight className="w-3.5 h-3.5 text-purple-500" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Grid ──────────────────────────────────────────── */}
      <section aria-label="Key performance indicators">
        {!isLoading && dashboard && !hasAnyData && (
          <div className="mb-4 p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-white/50">
            No call activity recorded for this period yet. Numbers will populate as AI agents begin
            handling conversations.
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {kpiCards.map((k, i) => (
            <motion.div
              key={k.key + period}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="rounded-2xl p-4 panel-card hover:border-purple-500/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${k.accent}`}>{k.icon}</div>
                {k.delta && !isLoading ? <DeltaPill {...k.delta} /> : null}
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                  {k.value}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-white/50 mt-1 font-medium">{k.label}</p>
              {k.subtext && <p className="text-[10px] text-slate-400 dark:text-white/40 mt-0.5 font-mono">{k.subtext}</p>}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Charts Row ────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Call volume over time */}
        <div className="lg:col-span-2 rounded-2xl p-5 panel-card min-w-0">
          <SectionHeader
            icon={<PhoneCall className="w-[18px] h-[18px]" />}
            title="Call Volume & Connections"
            subtitle="Total dialed vs connected calls across the selected period"
            action={
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-white/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Total
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-white/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
            }
          />
          <div className="h-60 sm:h-72 w-full">
            {isLoading ? (
              <div className="h-full w-full rounded-xl bg-slate-100 dark:bg-white/[0.03] animate-pulse flex items-center justify-center">
                <span className="text-xs text-slate-400 dark:text-white/40">Loading trend telemetry…</span>
              </div>
            ) : chartData.length === 0 || chartData.every((p) => p.calls === 0) ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
                <PhoneCall className="w-8 h-8 text-slate-300 dark:text-white/20 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-white/70">No call data for this period</p>
                <p className="text-xs text-slate-400 dark:text-white/40 max-w-sm mt-1">
                  Once AI agents execute calls in the selected time window, volume trends will chart here automatically.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mgTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="mgConnected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={18}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    name="Total Calls"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fill="url(#mgTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="connected"
                    name="Connected"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#mgConnected)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Outcome donut */}
        <div className="rounded-2xl p-5 panel-card min-w-0">
          <SectionHeader
            icon={<Target className="w-[18px] h-[18px]" />}
            title="Call Outcomes"
            subtitle="Disposition of completed calls"
          />
          <div className="h-48 w-full relative">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-white/10 border-t-purple-500 animate-spin" />
              </div>
            ) : outcomeData.length === 0 || (dashboard?.outcomes ?? []).every((o) => o.count === 0) ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
                <Target className="w-6 h-6 text-slate-300 dark:text-white/20 mb-1.5" />
                <p className="text-xs font-semibold text-slate-700 dark:text-white/70">No outcomes in this period</p>
                <p className="text-[11px] text-slate-400 dark:text-white/40 mt-0.5">
                  Call dispositions and AI analysis results will appear here.
                </p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={74}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="transparent"
                    >
                      {outcomeData.map((e, idx) => (
                        <Cell key={`cell-${idx}`} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-modal px-2.5 py-1.5 text-xs text-slate-900 dark:text-white shadow-lg">
                            <span className="font-semibold">
                              {payload[0].name}: {payload[0].value} ({(payload[0].payload as any).pct}%)
                            </span>
                          </div>
                        ) : null
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] text-slate-400 dark:text-white/40 font-medium">Calls</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    {(dashboard?.outcomes ?? []).reduce((s, o) => s + o.count, 0)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-white/[0.06] max-h-44 overflow-y-auto">
            {outcomeData.length > 0 ? (
              outcomeData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-slate-500 dark:text-white/60 truncate">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-slate-900 dark:text-white font-mono font-semibold text-[11px]">
                      {d.value} · {d.pct}%
                    </span>
                    <div className="w-12 h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, d.pct)}%`, background: d.color }} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-[11px] text-slate-400 dark:text-white/30 py-2">
                Awaiting call disposition activity
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Live Ops: live calls + review queue ───────────────── */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Live calls */}
        <div className="lg:col-span-2 rounded-2xl p-5 panel-card min-w-0">
          <SectionHeader
            icon={<Radio className="w-4 h-4 text-emerald-400" />}
            title="Live Ongoing Calls"
            subtitle="Active conversations right now"
            action={
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {liveCalls.length} Live Now
              </span>
            }
          />
          {isLoading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : liveCalls.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 dark:text-white/40 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
              No active calls right now. When an agent starts handling a customer, live status will
              appear here.
            </div>
          ) : (
            <div className="space-y-3.5">
              {liveCalls.map((call) => (
                <Link
                  key={call.id}
                  href="/dashboard/calls"
                  className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] hover:border-purple-500/40 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Phone className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {call.lead?.name || call.phone}
                        </p>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-white/40">{call.phone}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 capitalize">
                          {call.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-600 dark:text-purple-300 mt-0.5">
                        Agent: {call.agent?.name || "—"}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-white/40 mt-0.5">
                        Started {timeAgo(call.startedAt)} · {fmtCallDuration(call.duration)} ·{" "}
                        <span className="capitalize">{call.direction}</span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all hidden sm:block flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
            <Link
              href="/dashboard/calls"
              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
            >
              Open Call Center <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Review queue */}
        <div className="rounded-2xl p-5 panel-card min-w-0">
          <SectionHeader
            icon={<ShieldCheck className="w-[18px] h-[18px]" />}
            title="Call Review Queue"
            subtitle="Completed calls awaiting quality & sentiment scoring"
            action={
              <span className="text-xs font-mono text-purple-600 dark:text-purple-300 font-bold px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                {queue.length} Pending
              </span>
            }
          />
          {queue.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 dark:text-white/40 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
              No calls awaiting review.
            </div>
          ) : (
            <div className="space-y-3">
              {queue.slice(0, 5).map((call) => (
                <div
                  key={call.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold text-xs flex-shrink-0 mt-0.5">
                      {call.qualityScore != null ? call.qualityScore : "—"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {call.lead?.name || call.phone}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-white/40 font-mono mt-0.5">
                        {timeAgo(call.startedAt)}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5">
                        Quality: {call.qualityScore ?? "not scored"} · Sentiment: {call.sentimentScore ?? "—"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismiss(call.id)}
                    aria-label={`Dismiss ${call.lead?.name || call.phone} from review queue`}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-emerald-500/15 hover:text-emerald-500 text-slate-400 dark:text-white/40 transition-colors flex-shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Agent + Team performance ──────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* AI Agent Fleet */}
        <div className="rounded-2xl p-5 panel-card min-w-0">
          <SectionHeader
            icon={<Bot className="w-[18px] h-[18px]" />}
            title="AI Agent Performance"
            subtitle={`${dashboard?.facts?.activeAgents ?? "—"} active agents on the floor`}
            action={
              <Link href="/dashboard/agents" className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
                Configure <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          {isLoading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (dashboard?.agentPerformance ?? []).length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 dark:text-white/40 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
              No agent activity recorded in this period.
            </div>
          ) : (
            <div className="space-y-2.5">
              {(dashboard?.agentPerformance ?? []).map((agent) => {
                const statusActive = agent.status === "active" || agent.status === "online";
                const connectRate = agent.connectRate ?? 0;
                return (
                  <Link
                    key={agent.id}
                    href={`/dashboard/agents?agentId=${agent.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] hover:border-purple-500/40 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {(agent.name || "A")[0]}
                        {statusActive && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#150305]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                          {agent.name}
                          <span
                            className={`hidden sm:inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded capitalize ${
                              statusActive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                                : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/50 border border-slate-200 dark:border-white/10"
                            }`}
                          >
                            {statusActive ? "Live" : agent.status || "Idle"}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-white/40 truncate capitalize">{agent.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 text-right">
                      <div>
                        <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {connectRate.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-white/40">{agent.totalCalls} calls</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">
                          {formatDuration(agent.avgDuration)}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-white/40">avg</p>
                      </div>
                      <div className="hidden md:block w-16">
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="text-slate-400 dark:text-white/40">quality</span>
                          <span className="font-mono text-slate-700 dark:text-white/70">
                            {agent.avgQuality ? `${agent.avgQuality.toFixed(0)}%` : "—"}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                            style={{ width: `${Math.min(100, agent.avgQuality ?? 0)}%` }}
                          />
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all hidden sm:block" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Team performance */}
        <div className="rounded-2xl p-5 panel-card min-w-0">
          <SectionHeader
            icon={<Users className="w-[18px] h-[18px]" />}
            title="Team Performance"
            subtitle={`${dashboard?.facts?.teamMembers ?? "—"} members contributing to operations`}
            action={
              <Link href="/dashboard/team" className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
                View Team <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          {isLoading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (dashboard?.teamPerformance ?? []).length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 dark:text-white/40 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
              No team activity recorded in this period.
            </div>
          ) : (
            <div className="space-y-2.5">
              {(dashboard?.teamPerformance ?? []).map((member) => {
                const initials = member.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[11px] font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{member.name}</p>
                        <p className="text-xs text-slate-500 dark:text-white/40 truncate">
                          {member.agentCount} agent{member.agentCount === 1 ? "" : "s"} managed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 text-right">
                      <div>
                        <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">{member.totalCalls}</p>
                        <p className="text-[10px] text-slate-400 dark:text-white/40">calls</p>
                      </div>
                      <div>
                        <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {member.connectRate.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-white/40">connect</p>
                      </div>
                      <div>
                        <p className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">{member.qualifiedLeads}</p>
                        <p className="text-[10px] text-slate-400 dark:text-white/40">qualified</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Campaigns + recent calls ──────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 rounded-2xl p-5 panel-card min-w-0">
          <SectionHeader
            icon={<Target className="w-[18px] h-[18px]" />}
            title="Campaign Progression"
            subtitle="Live outbound campaigns and their completion progress"
            action={
              <Link href="/dashboard/campaigns" className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
                All Campaigns <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          {isLoading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (dashboard?.activeCampaigns ?? []).length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 dark:text-white/40 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
              No active campaigns in this period.
            </div>
          ) : (
            <div className="space-y-3">
              {(dashboard?.activeCampaigns ?? []).map((camp) => {
                const pct = camp.total > 0 ? Math.round((camp.completed / camp.total) * 100) : 0;
                return (
                  <Link
                    key={camp.id}
                    href={`/dashboard/campaigns?campaignId=${camp.id}`}
                    className="block p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] hover:border-purple-500/40 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {camp.name}
                        </p>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded capitalize bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                          {camp.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-white/40 font-mono">
                        {camp.agentName ?? "Auto"} · {pct}%
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500 dark:text-white/50">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {camp.completed}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Hourglass className="w-3 h-3 text-amber-500" /> {camp.pending}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-500" /> {camp.failed}
                      </span>
                      <span className="ml-auto font-mono">{camp.total} total leads</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent calls feed */}
        <div className="rounded-2xl p-5 panel-card min-w-0">
          <SectionHeader
            icon={<Phone className="w-[18px] h-[18px]" />}
            title="Recent Calls"
            subtitle="Latest customer conversations"
            action={
              <Link href="/dashboard/calls" className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
                Call Center <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          <div className="space-y-2.5">
            {isLoading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </>
            ) : recentCalls.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 dark:text-white/40 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                No recent calls recorded.
              </div>
            ) : (
              recentCalls.map((call) => {
                const failed = call.status === "failed" || call.status === "missed";
                return (
                  <Link
                    key={call.id}
                    href={`/dashboard/calls?callId=${call.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] hover:border-purple-500/40 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          failed
                            ? "bg-rose-500/10 border border-rose-500/25 text-rose-500"
                            : "bg-emerald-500/10 border border-emerald-500/25 text-emerald-500"
                        }`}
                      >
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {call.lead?.name || call.phone}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-white/40 truncate">
                          {timeAgo(call.startedAt)} · <span className="capitalize">{call.status.replace("_", " ")}</span>
                          {" · "}
                          {fmtCallDuration(call.duration)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Conversion funnel strip ───────────────────────────── */}
      <div className="rounded-2xl p-5 panel-card min-w-0">
        <SectionHeader
          icon={<Zap className="w-[18px] h-[18px]" />}
          title="Conversion Pipeline"
          subtitle="Leads distributed across funnel stages"
          action={
            <Link href="/dashboard/crm" className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
              Contacts <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        {isLoading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : funnelTotal === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 dark:text-white/40 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
            No pipeline disposition data yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {funnelData.map((stage) => (
              <div
                key={stage.stage}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-white/60 capitalize font-medium">
                    {humanize(stage.stage)}
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">{stage.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                    style={{ width: `${Math.min(100, stage.pct ?? 0)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-white/40 font-mono mt-1">
                  {(stage.pct ?? 0).toFixed(1)}% of pipeline
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}