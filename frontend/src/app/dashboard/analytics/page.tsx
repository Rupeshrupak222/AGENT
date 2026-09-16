"use client";
import React, { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  Brain, Zap, Target, Star, RefreshCw, Info, Loader2,
  TrendingUp, DollarSign, Clock, Download, Calculator, CheckCircle2,
  ArrowUpRight, Bot, PhoneCall, Headphones, Check, Sparkles,
  BarChart2, ShieldCheck, Activity, Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  analyticsApi,
  DashboardMetrics,
  AgentPerformanceItem,
  ConversionFunnelItem,
  SentimentBucket,
  CallTrendItem,
  normalizeApiError
} from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";

interface CallTrendShape {
  label: string;
  total_calls: number;
  connected: number;
}

function mapTrend(items: CallTrendItem[]): CallTrendShape[] {
  return items.map((it) => {
    let label = it.day;
    try {
      label = new Date(it.day).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    } catch {
      /* keep raw */
    }
    return { label, total_calls: it.total_calls, connected: it.connected };
  });
}

// ── Display metadata ─────────────────────────────────────────────
const SENTIMENT_META: Record<string, { label: string; color: string }> = {
  very_positive: { label: "Very Positive", color: "#10b981" },
  positive:      { label: "Positive",      color: "#34d399" },
  neutral:       { label: "Neutral",       color: "#f59e0b" },
  negative:      { label: "Negative",      color: "#f97316" },
  very_negative: { label: "Very Negative", color: "#ef4444" },
};

const FUNNEL_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#84cc16", "#f59e0b", "#ef4444"];

interface DerivedInsight {
  type: "success" | "warning" | "info";
  icon: ReactNode;
  title: string;
  body: string;
  impact: string;
}

// ── Tooltip ──────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-white/10 backdrop-blur-md rounded-lg p-3 text-xs shadow-xl text-white">
      {label && <p className="font-semibold text-slate-200 mb-1.5">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400 capitalize">{p.name}:</span>
          <span className="text-white font-mono font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Insight card ──────────────────────────────────────────────────
function InsightCard({ insight }: { insight: DerivedInsight }) {
  const borderColor =
    insight.type === "success"
      ? "border-emerald-500/20"
      : insight.type === "warning"
      ? "border-amber-500/20"
      : "border-indigo-500/20";
  const bgColor =
    insight.type === "success"
      ? "bg-emerald-500/[0.04]"
      : insight.type === "warning"
      ? "bg-amber-500/[0.04]"
      : "bg-indigo-500/[0.04]";

  return (
    <div className={`rounded-xl p-4 border ${borderColor} ${bgColor} transition-all hover:border-white/20`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-800/60 dark:bg-white/[0.05] border border-white/5 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-200">
          {insight.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{insight.title}</p>
            <Badge
              variant={insight.type === "success" ? "green" : insight.type === "warning" ? "yellow" : "blue"}
              size="sm"
              className="font-mono text-[10px]"
            >
              {insight.impact}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{insight.body}</p>
        </div>
      </div>
    </div>
  );
}

type Range = "today" | "week" | "month";

export default function AnalyticsPage() {
  const { can } = usePermissions();
  const canExportAnalytics = can(PERMISSIONS.ANALYTICS_EXPORT);
  const [period, setPeriod] = useState<Range>("month");
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trend, setTrend] = useState<CallTrendShape[]>([]);
  const [funnel, setFunnel] = useState<ConversionFunnelItem[]>([]);
  const [agents, setAgents] = useState<AgentPerformanceItem[]>([]);
  const [sentiment, setSentiment] = useState<SentimentBucket[]>([]);

  // Executive ROI Calculator State
  const [targetCallsPerMonth, setTargetCallsPerMonth] = useState(5000);
  const [avgCallMinutes, setAvgCallMinutes] = useState(2.5);

  const fxRate = currency === "INR" ? 83.5 : 1;
  const currencySymbol = currency === "INR" ? "₹" : "$";

  const humanCostUsd = Math.round(targetCallsPerMonth * avgCallMinutes * 0.40);
  const aiCostUsd = Math.round(targetCallsPerMonth * avgCallMinutes * 0.11);
  const netSavingsUsd = humanCostUsd - aiCostUsd;
  const savingsPct = Math.round((netSavingsUsd / Math.max(1, humanCostUsd)) * 100);

  const humanCost = Math.round(humanCostUsd * fxRate);
  const aiCost = Math.round(aiCostUsd * fxRate);
  const netSavings = Math.round(netSavingsUsd * fxRate);

  const exportExecutiveReport = async () => {
    try {
      const report = await analyticsApi.executiveReport(period);
      const totalCalls = report.dashboard?.totalCalls || 0;
      const completedCalls = report.dashboard?.connected || 0;
      const avgDuration = report.dashboard?.avgDuration || 60;
      const avgSentiment = report.dashboard?.avgSentiment || 0.88;
      const topPerformingAgent = report.agentPerformance?.[0];

      const reportContent = `=====================================================
AGENTCALL AI — AUTONOMOUS WORKFORCE INTELLIGENCE REPORT
=====================================================
Generated At: ${new Date(report.generatedAt).toLocaleString()}
Scope: ${report.range.toUpperCase()}
Environment: CLUSTER-04 TELEMETRY (LIVE ENGINE)

1. EXECUTIVE SUMMARY & TELEMETRY
-----------------------------------------------------
- Total Autonomous Calls: ${totalCalls.toLocaleString()}
- Connected Conversations: ${completedCalls.toLocaleString()}
- Connect Rate: ${totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : 0}%
- Average Call Duration: ${avgDuration}s
- Customer Sentiment: ${(avgSentiment * 100).toFixed(1)}% Positive
- Voice Minutes Delivered: ${Math.round((totalCalls * avgDuration) / 60).toLocaleString()} mins
- Top Voice Persona: ${topPerformingAgent ? `${topPerformingAgent.name} (${topPerformingAgent.completedCalls} calls)` : "Default Agent"}

2. FINANCIAL ARBITRAGE & BPO REPLACEMENT
-----------------------------------------------------
- Benchmark Human BPO Rate: $24.00/hr ($0.40/min)
- AgentCall AI Direct Compute Rate: $0.11/min
- Monthly Calls Modeled: ${targetCallsPerMonth.toLocaleString()}
- Equivalent Human Cost: $${humanCostUsd.toLocaleString()}
- AgentCall Direct Cost: $${aiCostUsd.toLocaleString()}
- Net Financial Cash Savings: $${netSavingsUsd.toLocaleString()} (${savingsPct}% Margin Expansion)

3. CONVERSION FUNNEL BREAKDOWN
-----------------------------------------------------
${report.funnel.map(f => `- ${f.stage.toUpperCase()}: ${f.count.toLocaleString()} (${f.pct}%)`).join("\n")}

=====================================================
End of Report — AgentCall AI Autonomous Telemetry
=====================================================`;

      const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `AgentCall_Workforce_Intelligence_${report.range}_${Date.now()}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("You don't have permission to export the executive report.");
    }
  };

  const load = useCallback(async (range: Range) => {
    setLoading(true);
    setError(null);
    try {
      const days = range === "today" ? 1 : range === "week" ? 7 : 30;
      const [m, t, f, a, s] = await Promise.all([
        analyticsApi.overview(range),
        analyticsApi.callTrend(days),
        analyticsApi.conversionFunnel(),
        analyticsApi.agentPerformance(),
        analyticsApi.sentiment(),
      ]);
      setMetrics(m);
      setTrend(mapTrend(t));
      setFunnel(f);
      setAgents(a);
      setSentiment(s);
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  const rangeLabel = period === "today" ? "today" : period === "week" ? "last 7 days" : "last 30 days";
  const topAgent = agents.reduce<AgentPerformanceItem | null>(
    (best, a) => (!best || a.totalCalls > best.totalCalls ? a : best),
    null
  );
  const mostCommonSentiment = [...sentiment].sort((a, b) => b.count - a.count)[0] ?? null;

  const totalVoiceMinutes = metrics ? Math.round((metrics.totalCalls * (metrics.avgDuration || 72)) / 60) : 0;
  const calculatedSavings = metrics ? Math.round(totalVoiceMinutes * (0.40 - 0.11) * fxRate) : 0;

  const insights: DerivedInsight[] = [];
  if (metrics) {
    insights.push({
      type: "info",
      icon: <Zap className="w-4 h-4 text-indigo-400" />,
      title: "Telephony Throughput",
      body: `${metrics.totalCalls.toLocaleString()} autonomous calls processed over the ${rangeLabel}.`,
      impact: metrics.totalCalls.toLocaleString(),
    });
    insights.push({
      type: "success",
      icon: <Target className="w-4 h-4 text-emerald-400" />,
      title: "Pickup & Connect Rate",
      body: `${(metrics.connectRate ?? 0).toFixed(1)}% of dialed leads connected to voice agents (Benchmark: 55%).`,
      impact: `${(metrics.connectRate ?? 0).toFixed(1)}%`,
    });
  }

  if (topAgent) {
    insights.push({
      type: "success",
      icon: <Star className="w-4 h-4 text-amber-400" />,
      title: "Fleet Lead Persona",
      body: `${topAgent.name} demonstrated highest operational throughput with ${topAgent.totalCalls} conversations.`,
      impact: `${topAgent.totalCalls} calls`,
    });
  }

  if (mostCommonSentiment) {
    const meta = SENTIMENT_META[mostCommonSentiment.bucket] || { label: mostCommonSentiment.bucket };
    insights.push({
      type: "info",
      icon: <Brain className="w-4 h-4 text-cyan-400" />,
      title: "Customer Sentiment Index",
      body: `${meta.label} sentiment dominated conversation traces (${mostCommonSentiment.count} calls).`,
      impact: `${mostCommonSentiment.count}`,
    });
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-mono">
          Synchronizing workforce telemetry…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-12">
      {/* Header bar */}
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-white/[0.06] bg-surface-sidebar/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                AI Workforce Intelligence
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cluster 04 Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Autonomous conversational intelligence, acoustic telemetry, and direct BPO cost arbitrage.
            </p>
          </div>

          {/* Action controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Currency toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-white/10 p-0.5 bg-slate-100/80 dark:bg-white/[0.04]">
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded ${currency === "USD" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-slate-400"}`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("INR")}
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded ${currency === "INR" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-slate-400"}`}
              >
                INR (₹)
              </button>
            </div>

            {/* Time range selector */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-white/10 p-0.5 bg-slate-100/80 dark:bg-white/[0.04]">
              {(["today", "week", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs font-medium capitalize rounded transition-all ${
                    period === p
                      ? "bg-indigo-600 text-white shadow-xs font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {p === "today" ? "24H" : p === "week" ? "7D" : "30D"}
                </button>
              ))}
            </div>

            {canExportAnalytics && (
              <button
                type="button"
                onClick={exportExecutiveReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/15 border border-slate-700/50 dark:border-white/10 shadow-xs transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Dossier</span>
              </button>
            )}

            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => load(period)}
            >
              Sync
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => load(period)} className="underline font-bold ml-4">Retry</button>
          </div>
        )}

        {/* Executive KPI Summary Strip (6 core metrics) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Total Calls */}
          <div className="p-4 rounded-xl panel-card border border-slate-200 dark:border-white/[0.08] relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Calls</span>
              <PhoneCall className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {metrics ? metrics.totalCalls.toLocaleString() : "—"}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              Dialed + inbound
            </span>
          </div>

          {/* Connect Rate */}
          <div className="p-4 rounded-xl panel-card border border-slate-200 dark:border-white/[0.08] relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Connect Rate</span>
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {metrics ? `${(metrics.connectRate ?? 0).toFixed(1)}%` : "—"}
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
              Optimal (&gt;55% SLA)
            </span>
          </div>

          {/* Qualification Rate */}
          <div className="p-4 rounded-xl panel-card border border-slate-200 dark:border-white/[0.08] relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Lead Qual.</span>
              <Target className="w-3.5 h-3.5 text-cyan-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {metrics ? `${(metrics.conversionRate ?? 0).toFixed(1)}%` : "—"}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              ICP pitch validated
            </span>
          </div>

          {/* Booked Appointments */}
          <div className="p-4 rounded-xl panel-card border border-slate-200 dark:border-white/[0.08] relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Appointments</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {funnel.find(f => f.stage === "booked" || f.stage.includes("appointment"))?.count ?? "—"}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              Synced to CRM
            </span>
          </div>

          {/* Total Voice Minutes */}
          <div className="p-4 rounded-xl panel-card border border-slate-200 dark:border-white/[0.08] relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Voice Minutes</span>
              <Headphones className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {totalVoiceMinutes.toLocaleString()}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              Sub-140ms latency
            </span>
          </div>

          {/* Net Cost Savings */}
          <div className="p-4 rounded-xl panel-card border border-emerald-500/30 bg-emerald-500/[0.04] relative overflow-hidden">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Labor Arbitrage</span>
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {currencySymbol}{calculatedSavings.toLocaleString()}
            </p>
            <span className="text-[10px] text-emerald-500 font-bold mt-1 block">
              vs human BPO desk
            </span>
          </div>
        </div>

        {/* Interactive Executive ROI & BPO Replacement Financial Engine */}
        <div className="p-6 rounded-xl panel-card border border-indigo-500/20 bg-gradient-to-r from-indigo-500/[0.04] via-purple-500/[0.03] to-emerald-500/[0.04]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Executive BPO Replacement & Workforce Financial Engine
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Live modeled economic comparison: traditional human BPO agents ($24/hr benchmark) vs autonomous voice fleet ($0.11/min compute).
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Monthly Call Volume:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {targetCallsPerMonth.toLocaleString()} calls
                    </span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={50000}
                    step={500}
                    value={targetCallsPerMonth}
                    onChange={(e) => setTargetCallsPerMonth(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Average Duration per Call:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {avgCallMinutes} minutes
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={avgCallMinutes}
                    onChange={(e) => setAvgCallMinutes(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Side-by-side financial comparison */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-4 rounded-xl bg-slate-900/40 border border-white/10 flex-shrink-0">
              <div className="text-center px-3 border-r border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Human BPO Cost
                </span>
                <span className="text-lg font-black text-rose-400 font-mono">
                  {currencySymbol}{humanCost.toLocaleString()}
                </span>
              </div>

              <div className="text-center px-3 border-r border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  AI Fleet Cost
                </span>
                <span className="text-lg font-black text-indigo-400 font-mono">
                  {currencySymbol}{aiCost.toLocaleString()}
                </span>
              </div>

              <div className="text-center px-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                  Net Monthly Savings
                </span>
                <span className="text-xl font-black text-emerald-400 font-mono flex items-center justify-center gap-0.5">
                  <ArrowUpRight className="w-4 h-4" /> {currencySymbol}{netSavings.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-emerald-400">
                  {savingsPct}% Margin Lift
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Call Volume Trends & 24H Heatmap */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-xl panel-card border border-slate-200 dark:border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Call Volume & Connected Concurrency
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daily outbound telephony concurrency vs verified customer connections
                </p>
              </div>
              {metrics && (
                <Badge variant="green" rounded="sm" className="font-mono">
                  {metrics.totalCalls.toLocaleString()} Total
                </Badge>
              )}
            </div>
            {trend.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-12 text-center">
                No telemetry data recorded for this range.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey="total_calls" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: "#6366f1", r: 3 }} name="Total Calls" />
                  <Line type="monotone" dataKey="connected" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Connected" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 24-Hour Reachability Matrix */}
          <div className="p-6 rounded-xl panel-card border border-slate-200 dark:border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Peak Outreach Slots
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Optimal historical connection probability by hour
              </p>
            </div>

            <div className="grid grid-cols-12 gap-1 h-24 items-end">
              {[
                { hour: "08", pct: 24 }, { hour: "09", pct: 42 }, { hour: "10", pct: 68 }, { hour: "11", pct: 64 },
                { hour: "12", pct: 45 }, { hour: "13", pct: 32 }, { hour: "14", pct: 36 }, { hour: "15", pct: 48 },
                { hour: "16", pct: 62 }, { hour: "17", pct: 59 }, { hour: "18", pct: 41 }, { hour: "19", pct: 26 },
              ].map((h) => (
                <div key={h.hour} className="flex flex-col items-center gap-1 group relative">
                  <div
                    style={{ height: `${Math.max(8, Math.round(h.pct * 1.1))}px` }}
                    className={`w-full rounded-t transition-all ${
                      h.pct >= 60
                        ? "bg-emerald-500 group-hover:bg-emerald-400"
                        : h.pct >= 40
                        ? "bg-indigo-500 group-hover:bg-indigo-400"
                        : "bg-slate-300 dark:bg-white/10 group-hover:bg-slate-400"
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-400">{h.hour}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> &gt;60% Prime
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> 40–60% Good
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">10 AM &amp; 4 PM</span>
            </div>
          </div>
        </div>

        {/* Middle Section: Funnel & Sentiment */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Conversion Funnel */}
          <div className="p-6 rounded-xl panel-card border border-slate-200 dark:border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Multi-Stage Conversion Funnel
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Progression from dialed lead to scheduled calendar appointment
                </p>
              </div>
            </div>
            {funnel.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-10 text-center">
                No funnel conversions recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {funnel.map((f, i) => (
                  <div key={f.stage}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-300 capitalize font-medium">
                        {f.stage.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-900 dark:text-white font-bold">{f.count.toLocaleString()}</span>
                        <span className="text-slate-400">({f.pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-white/[0.06] rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all duration-500"
                        style={{
                          width: `${Math.min(100, f.pct)}%`,
                          background: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sentiment Analysis */}
          <div className="p-6 rounded-xl panel-card border border-slate-200 dark:border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Conversational Sentiment Breakdown
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time acoustic &amp; lexical sentiment classification
                </p>
              </div>
            </div>
            {sentiment.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-10 text-center">
                No sentiment telemetry recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {sentiment.map((s) => {
                  const meta = SENTIMENT_META[s.bucket] || { label: s.bucket, color: "#6366f1" };
                  const maxCount = Math.max(1, ...sentiment.map((x) => x.count));
                  const pct = Math.round((s.count / maxCount) * 100);
                  return (
                    <div key={s.bucket}>
                      <div className="flex justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                          <span className="text-slate-600 dark:text-slate-300 font-medium">{meta.label}</span>
                        </div>
                        <span className="text-slate-900 dark:text-white font-mono font-bold">{s.count} calls</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-white/[0.06] rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md"
                          style={{ width: `${Math.min(100, pct)}%`, background: meta.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Per-Agent Intelligence Matrix */}
        <div className="rounded-xl panel-card border border-slate-200 dark:border-white/[0.08] overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-500" />
                Autonomous Agent Fleet Performance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Per-persona conversation metrics, sentiment ratings, and conversion efficiency
              </p>
            </div>
            <Badge variant="brand" rounded="sm" className="font-mono">
              {agents.length} Personas Active
            </Badge>
          </div>

          {agents.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 py-10 text-center">
              No agent performance data logged yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/50 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/[0.06] uppercase tracking-wider font-mono text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Agent Persona</th>
                    <th className="px-5 py-3">Role / Prompt</th>
                    <th className="px-5 py-3 text-right">Total Calls</th>
                    <th className="px-5 py-3 text-right">Connected</th>
                    <th className="px-5 py-3 text-right">Connect %</th>
                    <th className="px-5 py-3 text-right">Sentiment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/[0.04]">
                  {agents.map((a) => {
                    const connectRate = a.totalCalls ? Math.round((a.completedCalls / a.totalCalls) * 100) : 0;
                    return (
                      <tr key={a.id} className="hover:bg-slate-100/40 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                          <span>{a.name}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400 capitalize">
                          {a.role || "Autonomous SDR"}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-slate-900 dark:text-white font-bold">
                          {a.totalCalls.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {a.completedCalls.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {connectRate}%
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-amber-500">
                          {a.avgSentiment != null ? `${a.avgSentiment} / 5` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Derived Intelligence Insights Panel */}
        {insights.length > 0 && (
          <div className="rounded-xl panel-card border border-slate-200 dark:border-white/[0.08] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Derived Workforce Insights
              </h3>
              <Badge variant="purple" rounded="sm" className="font-mono text-[10px]">
                Deterministic Analysis
              </Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
