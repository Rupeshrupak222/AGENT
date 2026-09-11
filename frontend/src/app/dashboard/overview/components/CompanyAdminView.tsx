"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  PhoneCall,
  PhoneMissed,
  Target,
  Bot,
  Clock,
  Timer,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Download,
  AlertTriangle,
  Info,
  ChevronRight,
  Radio,
  CreditCard,
  Zap,
  Users,
  Phone,
  Sparkles,
  Activity,
  CheckCircle2,
  XCircle,
  Hourglass,
  ArrowUpRight,
  Landmark,
  FileText,
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
import { formatDuration, formatNumber } from "@/lib/utils";
import {
  CompanyDashboardData,
  CompanyDashboardKpis,
  DashboardGranularity,
  CallItem,
  TenantUsage,
  CompanyAlert,
} from "@/lib/api";
import type { PeriodPreset, DashboardRange } from "@/lib/dashboard-range";

const OUTCOME_COLORS = [
  "#D42027",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#f97316",
  "#94a3b8",
];

const PERIOD_OPTIONS: Array<{ key: PeriodPreset; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "7D" },
  { key: "last30", label: "30D" },
  { key: "last90", label: "90D" },
  { key: "ytd", label: "YTD" },
  { key: "custom", label: "Custom" },
];

interface CompanyAdminViewProps {
  dashboard: CompanyDashboardData | null;
  recentCalls: CallItem[];
  tenantUsage: TenantUsage | null;
  period: PeriodPreset;
  setPeriod: (p: PeriodPreset) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  range: DashboardRange;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  companyName: string;
  companyPlan: string | null;
}

function fmtBucket(iso: string, granularity: DashboardGranularity): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  if (granularity === "hour") {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (granularity === "month") {
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtRangeLabel(range: DashboardRange): string {
  const f = new Date(range.from);
  const t = new Date(range.to);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${f.toLocaleDateString(undefined, opts)} → ${t.toLocaleDateString(undefined, opts)}`;
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function DeltaPill({
  current,
  previous,
  invert = false,
}: {
  current: number;
  previous: number;
  invert?: boolean;
}) {
  if (current === 0 && previous === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/50">
        <Minus className="w-3 h-3" /> Flat
      </span>
    );
  }

  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        <TrendingUp className="w-3 h-3" /> New
      </span>
    );
  }

  const delta = pctDelta(current, previous) ?? 0;
  const up = delta >= 0;
  const positive = invert ? !up : up;
  const cls = positive
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

const SEVERITY_STYLES: Record<CompanyAlert["severity"], { icon: any; cls: string; ring: string }> = {
  critical: { icon: AlertTriangle, cls: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300", ring: "text-rose-500" },
  warning: { icon: AlertTriangle, cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300", ring: "text-amber-500" },
  info: { icon: Info, cls: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300", ring: "text-sky-500" },
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#180406] dark:bg-modal shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-900 dark:text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-500 dark:text-white/60 capitalize">{p.name}:</span>
          </div>
          <span className="text-slate-900 dark:text-white font-mono font-bold">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Skeleton({ className = "h-6 w-24" }: { className?: string }) {
  return <div className={`${className} rounded-lg bg-slate-200/70 dark:bg-white/[0.06] animate-pulse`} />;
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-brand-500 dark:text-brand-400">{icon}</span>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CompanyAdminView({
  dashboard,
  recentCalls,
  tenantUsage,
  period,
  setPeriod,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  range,
  isLoading,
  onRefresh,
  isRefreshing,
  companyName,
  companyPlan,
}: CompanyAdminViewProps) {
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

  const handleRefreshClick = () => {
    onRefresh();
    success("Refreshed company telemetry from live database.");
  };

  const handleExportCsv = () => {
    if (!dashboard) return;
    const d = dashboard;
    const rows: Array<string[]> = [
      ["AGENTCALL AI - COMPANY OPERATIONAL REPORT"],
      ["Company", companyName],
      ["Period", `${d.period.label} (${d.period.from} to ${d.period.to})`],
      ["Comparison", d.comparison.label],
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
      ["Inbound Calls", "inboundCalls"],
      ["Outbound Calls", "outboundCalls"],
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
    d.timeSeries.forEach((p) =>
      rows.push([p.bucket, String(p.totalCalls), String(p.connectedCalls)])
    );

    rows.push([], ["OUTCOME BREAKDOWN"], ["Outcome", "Count", "%"]);
    d.outcomes.forEach((o) => rows.push([humanize(o.outcome), String(o.count), `${o.pct}%`]));

    rows.push([], ["AI AGENT PERFORMANCE"], ["Agent", "Role", "Total Calls", "Connected", "Connect Rate %", "Qualified Leads"]);
    d.agentPerformance.forEach((a) =>
      rows.push([a.name, a.role, String(a.totalCalls), String(a.connectedCalls), a.connectRate.toFixed(1), String(a.qualifiedLeads)])
    );

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `company_report_${companyName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${d.period.label.toLowerCase().replace(/[^a-z0-9]/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Company operational CSV report exported successfully.");
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
      key: "avgDuration",
      label: "Avg Duration",
      value: isLoading ? "…" : formatDuration(kpis?.avgDuration ?? 0),
      icon: <Clock className="w-5 h-5 text-cyan-500" />,
      accent: "from-cyan-500/15 to-cyan-600/5 border-cyan-500/30",
      delta: kpis && prev ? { current: kpis.avgDuration, previous: prev.avgDuration, invert: false } : undefined,
      subtext: "Per completed call",
    },
    {
      key: "minutes",
      label: "Voice Minutes",
      value: isLoading ? "…" : formatNumber(kpis?.totalMinutes ?? 0),
      icon: <Timer className="w-5 h-5 text-violet-500" />,
      accent: "from-violet-500/15 to-violet-600/5 border-violet-500/30",
      delta: kpis && prev ? { current: kpis.totalMinutes, previous: prev.totalMinutes } : undefined,
      subtext: "Consumed this period",
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
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      accent: "from-amber-500/15 to-amber-600/5 border-amber-500/30",
      delta: kpis && prev ? { current: kpis.appointments, previous: prev.appointments } : undefined,
      subtext: `${(kpis?.appointmentRate ?? 0).toFixed(1)}% appointment rate`,
    },
    {
      key: "analyses",
      label: "AI Analyses",
      value: isLoading ? "…" : formatNumber(kpis?.aiAnalyses ?? 0),
      icon: <Brain className="w-5 h-5 text-brand-500 dark:text-brand-400" />,
      accent: "from-brand-500/15 to-brand-600/5 border-brand-500/30",
      delta: kpis && prev ? { current: kpis.aiAnalyses, previous: prev.aiAnalyses } : undefined,
      subtext: "Sentiment & quality engines",
    },
  ];

  const hasAnyData = kpis ? kpis.totalCalls > 0 || kpis.qualifiedLeads > 0 || kpis.appointments > 0 || kpis.aiAnalyses > 0 : false;

  const callsLimit = tenantUsage?.limits?.calls ?? -1;
  const callsUsed = tenantUsage?.usage?.calls?.used ?? tenantUsage?.callCount ?? 0;
  const callsPct = tenantUsage?.usage?.calls?.pct ?? null;
  const callsUnlimited = tenantUsage?.usage?.calls?.unlimited ?? callsLimit === -1;
  const agentsUsed = tenantUsage?.usage?.agents?.used ?? tenantUsage?.agentCount ?? 0;
  const agentsLimit = tenantUsage?.limits?.agents ?? -1;
  const agentsUnlimited = tenantUsage?.usage?.agents?.unlimited ?? agentsLimit === -1;
  const membersUsed = tenantUsage?.usage?.members?.used ?? tenantUsage?.userCount ?? 0;
  const membersLimit = tenantUsage?.limits?.members ?? -1;
  const membersUnlimited = tenantUsage?.usage?.members?.unlimited ?? membersLimit === -1;

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Company Operations Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/30">
              <Sparkles className="w-3 h-3" /> Company Admin
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            {companyName} · {periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-brand-500 dark:text-brand-400" : ""}`} />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={!dashboard}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-40 transition-colors"
          >
            <Download className="w-4 h-4 text-brand-500 dark:text-brand-400" /> Export CSV
          </button>
          <Link
            href="/dashboard/billing"
            className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" /> Billing
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                period === opt.key
                  ? "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-900/30 dark:shadow-brand-900/60"
                  : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <label htmlFor="co-from" className="sr-only">Custom from date</label>
            <input
              id="co-from"
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 rounded-xl px-3 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
            />
            <span className="text-slate-400 dark:text-white/40">→</span>
            <label htmlFor="co-to" className="sr-only">Custom to date</label>
            <input
              id="co-to"
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 rounded-xl px-3 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
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

      {/* ── Plan / Usage Hero ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 15% 0%, rgba(124,63,29,0.10) 0%, rgba(0,0,0,0) 70%)",
          }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-md shadow-brand-500/25">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-base font-black text-slate-900 dark:text-white">{companyName}</p>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/30">
                  {tenantUsage?.planName ?? humanize(companyPlan ?? "Active Plan")}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/50 mt-1 max-w-xl leading-relaxed">
                Supervise autonomous voice employees, monitor live customer conversations, and track
                voice-minute quota against your active plan.
              </p>
              <div className="flex items-center gap-3 flex-wrap mt-2 text-[11px] font-mono text-slate-400 dark:text-white/40">
                <span>{tenantUsage ? `${tenantUsage.userCount} users` : "— users"}</span>
                <span>{tenantUsage ? `${tenantUsage.leadCount} leads` : "— leads"}</span>
                <span>{tenantUsage ? `${tenantUsage.agentCount} agents` : "— agents"}</span>
                <span>{tenantUsage ? `${tenantUsage.campaignCount} campaigns` : "— campaigns"}</span>
                <span>{tenantUsage ? `${tenantUsage.appointmentCount} appointments` : "— appointments"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/dashboard/usage"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 transition-colors"
            >
              <Activity className="w-4 h-4 text-brand-500 dark:text-brand-400" /> View Usage
            </Link>
            <div className="min-w-[200px]">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-500 dark:text-white/50 font-medium">Monthly Call Quota</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatNumber(callsUsed)} / {callsUnlimited ? "Unlimited" : formatNumber(callsLimit)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    (callsPct ?? 0) >= 100
                      ? "bg-rose-500"
                      : (callsPct ?? 0) >= 80
                        ? "bg-amber-500"
                        : "bg-gradient-to-r from-brand-500 to-brand-700"
                  }`}
                  style={{ width: `${Math.min(100, callsPct ?? 0)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-white/40 mt-1 font-mono">
                {callsUnlimited
                  ? `${formatNumber(callsUsed)} calls this cycle`
                  : (callsPct ?? 0).toFixed(0) + "% of monthly limit used"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Grid ──────────────────────────────────────────── */}
      <section aria-label="Key performance indicators">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {kpiCards.map((k, i) => (
            <motion.div
              key={k.key + period}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="rounded-2xl p-4 panel-card hover:border-brand-500/30 transition-colors"
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
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Total
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
            ) : chartData.length === 0 ? (
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
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3f1d" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7c3f1d" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradConnected" x1="0" y1="0" x2="0" y2="1">
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
                    stroke="#7c3f1d"
                    strokeWidth={2.5}
                    fill="url(#gradTotal)"
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

        {/* Outcome donut */}
        <div className="rounded-2xl p-5 panel-card min-w-0">
          <SectionHeader
            icon={<FileText className="w-[18px] h-[18px]" />}
            title="Call Outcomes"
            subtitle="Disposition of completed calls"
          />
          <div className="h-48 w-full relative">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-white/10 border-t-brand-500 animate-spin" />
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

      {/* ── Team + Agent Performance ──────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* AI Agent Fleet */}
        <div className="rounded-2xl p-5 panel-card min-w-0">
          <SectionHeader
            icon={<Bot className="w-[18px] h-[18px]" />}
            title="AI Agent Performance"
            subtitle={`${dashboard?.facts?.activeAgents ?? "—"} active of ${tenantUsage?.agentCount ?? "—"} deployed`}
            action={
              <Link href="/dashboard/agents" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
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
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] hover:border-brand-500/40 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
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
                        <p className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">
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
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
                            style={{ width: `${Math.min(100, agent.avgQuality ?? 0)}%` }}
                          />
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all hidden sm:block" />
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
            subtitle={`${dashboard?.facts?.teamMembers ?? "—"} team members on this workspace`}
            action={
              <Link href="/dashboard/team" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
                Manage Team <ChevronRight className="w-3.5 h-3.5" />
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
              No team activity recorded in this period.{/* */}
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
                      <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-[11px] font-bold text-brand-600 dark:text-brand-400 flex-shrink-0">
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

      {/* ── Campaigns + Resource usage ────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Active campaigns */}
        <div className="lg:col-span-2 rounded-2xl p-5 panel-card min-w-0">
          <SectionHeader
            icon={<Radio className="w-[18px] h-[18px]" />}
            title="Campaign Progression"
            subtitle="Live outbound campaigns and their completion progress"
            action={
              <Link href="/dashboard/campaigns" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
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
                    className="block p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] hover:border-brand-500/40 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {camp.name}
                        </p>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded capitalize bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/25">
                          {camp.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-white/40 font-mono">
                        {camp.agentName ?? "Auto"} · {pct}%
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-700"
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

        {/* Live calls feed */}
        <div className="rounded-2xl p-5 panel-card min-w-0">
          <SectionHeader
            icon={<Phone className="w-[18px] h-[18px]" />}
            title="Recent Calls"
            subtitle="Latest customer conversations"
            action={
              <Link href="/dashboard/calls" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
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
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] hover:border-brand-500/40 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {call.lead?.name || "Customer Contact"}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-white/40 font-mono truncate">
                        {call.phone} · {call.agent?.name || "Autonomous AI"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <div className="text-right">
                        <span className={`text-xs font-mono font-bold ${failed ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {failed ? humanize(call.status) : formatDuration(call.duration || 0)}
                        </span>
                        <p className="text-[10px] text-slate-400 dark:text-white/40 uppercase tracking-wider">{call.direction}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-white/20 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Plan resource meter ───────────────────────────────── */}
      <div className="rounded-2xl p-5 panel-card min-w-0">
        <SectionHeader
          icon={<Landmark className="w-[18px] h-[18px]" />}
          title="Plan Resource Meter"
          subtitle="Your entitlement vs current consumption across the active billing cycle"
          action={
            <Link href="/dashboard/billing" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
              Upgrade Plan <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Monthly Calls",
              used: callsUsed,
              limit: callsLimit,
              unlimited: callsUnlimited,
              pct: callsPct,
              color: "from-sky-500 to-sky-600",
            },
            {
              label: "AI Agents",
              used: agentsUsed,
              limit: agentsLimit,
              unlimited: agentsUnlimited,
              pct: tenantUsage?.usage?.agents?.pct ?? (agentsLimit > 0 ? (agentsUsed / agentsLimit) * 100 : 0),
              color: "from-brand-500 to-brand-700",
            },
            {
              label: "Team Members",
              used: membersUsed,
              limit: membersLimit,
              unlimited: membersUnlimited,
              pct: tenantUsage?.usage?.members?.pct ?? (membersLimit > 0 ? (membersUsed / membersLimit) * 100 : 0),
              color: "from-violet-500 to-purple-600",
            },
            {
              label: "AI Analyses",
              used: tenantUsage?.analysisCount ?? 0,
              limit: -1,
              unlimited: true,
              pct: null,
              color: "from-emerald-500 to-emerald-600",
            },
          ].map((m) => {
            const pct = m.pct ?? 0;
            const overLimit = !m.unlimited && m.limit > 0 && pct >= 100;
            return (
              <div key={m.label} className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-white/50">{m.label}</span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {formatNumber(m.used)}
                    {!m.unlimited ? ` / ${formatNumber(m.limit)}` : ""}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${m.color} ${overLimit ? "!bg-rose-500" : ""}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <p className={`text-[10px] font-mono mt-1.5 ${overLimit ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-white/40"}`}>
                  {m.unlimited ? "Unlimited" : `${pct.toFixed(0)}% used ${overLimit ? "· over limit!" : ""}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}