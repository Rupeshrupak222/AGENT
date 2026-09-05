"use client";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  Brain, Zap, Target, Star, RefreshCw, Info, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }   from "@/components/ui/Badge";
import { Button }  from "@/components/ui/Button";
import { analyticsApi, DashboardMetrics, AgentPerformanceItem, ConversionFunnelItem, SentimentBucket, CallTrendItem, normalizeApiError } from "@/lib/api";

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

// ── Display metadata (static, not data) ─────────────────────────
const SENTIMENT_META: Record<string, { label: string; color: string }> = {
  very_positive: { label: "Very Positive", color: "#22c55e" },
  positive:      { label: "Positive",      color: "#84cc16" },
  neutral:       { label: "Neutral",       color: "#eab308" },
  negative:      { label: "Negative",      color: "#f97316" },
  very_negative: { label: "Very Negative", color: "#ef4444" },
};

const FUNNEL_COLORS = ["#6366f1","#8b5cf6","#06b6d4","#22c55e","#84cc16","#eab308","#f97316"];

interface DerivedInsight {
  type: "success" | "warning" | "info";
  icon: ReactNode;
  title: string;
  body: string;
  impact: string;
}

// ── Tooltip ────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl p-3 text-xs border border-slate-200 dark:border-white/10">
      {label && <p className="font-semibold text-slate-900 dark:text-white mb-1.5">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
          <span className="text-slate-500 dark:text-white/60 capitalize">{p.name}:</span>
          <span className="text-slate-900 dark:text-white font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Insight card ────────────────────────────────────────────────
function InsightCard({ insight }: { insight: DerivedInsight }) {
  const borderColor = insight.type === "success" ? "border-green-500/20" : insight.type === "warning" ? "border-yellow-500/20" : "border-brand-500/20";
  const bgColor     = insight.type === "success" ? "bg-green-500/5"      : insight.type === "warning" ? "bg-yellow-500/5"      : "bg-brand-500/5";
  return (
    <div className={`glass-card rounded-xl p-4 border ${borderColor} ${bgColor}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100/70 dark:bg-white/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5">{insight.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{insight.title}</p>
            <Badge variant={insight.type === "success" ? "green" : insight.type === "warning" ? "yellow" : "blue"} className="text-[10px] flex-shrink-0">{insight.impact}</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed">{insight.body}</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────
type Range = "today" | "week" | "month";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Range>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trend, setTrend] = useState<CallTrendShape[]>([]);
  const [funnel, setFunnel] = useState<ConversionFunnelItem[]>([]);
  const [agents, setAgents] = useState<AgentPerformanceItem[]>([]);
  const [sentiment, setSentiment] = useState<SentimentBucket[]>([]);

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

  const handleRange = (p: string) => {
    if (p === "today" || p === "week" || p === "month") setPeriod(p);
  };

  const rangeLabel = period === "today" ? "today" : period === "week" ? "last 7 days" : "last 30 days";
  const topAgent = agents.reduce<AgentPerformanceItem | null>(
    (best, a) => (!best || a.totalCalls > best.totalCalls ? a : best),
    null
  );
  const mostCommonSentiment = [...sentiment].sort((a, b) => b.count - a.count)[0] ?? null;

  const insights: DerivedInsight[] = [];
  if (metrics) {
    insights.push({
      type: "info",
      icon: <Zap className="w-4 h-4 text-brand-400" />,
      title: "Total Calls",
      body: `${metrics.totalCalls.toLocaleString()} calls recorded over the ${rangeLabel}.`,
      impact: metrics.totalCalls.toLocaleString(),
    });
  } else {
    insights.push({
      type: "info",
      icon: <Info className="w-4 h-4 text-brand-400" />,
      title: "Total Calls",
      body: "No data available yet.",
      impact: "—",
    });
  }

  if (metrics) {
    insights.push({
      type: "success",
      icon: <Target className="w-4 h-4 text-green-400" />,
      title: "Connect Rate",
      body: `${(metrics.connectRate ?? 0).toFixed(1)}% of calls were connected over the ${rangeLabel}.`,
      impact: `${(metrics.connectRate ?? 0).toFixed(1)}%`,
    });
  } else {
    insights.push({
      type: "info",
      icon: <Info className="w-4 h-4 text-green-400" />,
      title: "Connect Rate",
      body: "No data available yet.",
      impact: "—",
    });
  }

  if (topAgent) {
    insights.push({
      type: "success",
      icon: <Star className="w-4 h-4 text-yellow-400" />,
      title: "Top Agent by Calls",
      body: `${topAgent.name} handled the most calls with ${topAgent.totalCalls} total.`,
      impact: `${topAgent.totalCalls}`,
    });
  } else {
    insights.push({
      type: "info",
      icon: <Info className="w-4 h-4 text-yellow-400" />,
      title: "Top Agent by Calls",
      body: "No data available yet.",
      impact: "—",
    });
  }

  if (mostCommonSentiment) {
    const meta = SENTIMENT_META[mostCommonSentiment.bucket] || { label: mostCommonSentiment.bucket };
    insights.push({
      type: "info",
      icon: <Brain className="w-4 h-4 text-purple-400" />,
      title: "Most Common Sentiment",
      body: `${meta.label} was the most frequent sentiment with ${mostCommonSentiment.count} calls.`,
      impact: `${mostCommonSentiment.count}`,
    });
  } else {
    insights.push({
      type: "info",
      icon: <Info className="w-4 h-4 text-purple-400" />,
      title: "Most Common Sentiment",
      body: "No data available yet.",
      impact: "—",
    });
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500 mr-2" />
        <span className="text-sm text-slate-500 dark:text-white/50">Loading analytics…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">AI Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Deep operational insights powered by GPT-4o conversational analysis</p>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Period selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100/70 dark:bg-white/[0.04] rounded-xl p-1">
            {(["today","week","month"] as const).map(p=>(
              <button key={p} onClick={()=>handleRange(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${period===p?"bg-brand-500 text-white":"text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"}`}>
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4"/>} onClick={() => load(period)}>Refresh</Button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm font-medium flex items-center justify-between gap-4">
            <span>{error}</span>
            <button onClick={() => load(period)} className="text-xs font-semibold underline">Retry</button>
          </div>
        )}

        {/* AI Insight summary row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:"Avg Sentiment Score",    value: metrics ? `${(metrics.avgSentiment ?? 0).toFixed(1)} / 5` : "—",  icon:<Star className="w-5 h-5"/>,  color:"bg-yellow-500/20 text-yellow-400", change:"Avg sentiment" },
            { label:"Conversion Rate",        value: metrics ? `${(metrics.conversionRate ?? 0).toFixed(1)}%` : "—", icon:<Target className="w-5 h-5"/>, color:"bg-green-500/20 text-green-400",  change:"Overall" },
            { label:"Total Calls",            value: metrics ? metrics.totalCalls.toLocaleString() : "—",              icon:<Zap className="w-5 h-5"/>,   color:"bg-brand-500/20 text-brand-400",  change:"Completed + missed" },
            { label:"Connect Rate",           value: metrics ? `${(metrics.connectRate ?? 0).toFixed(1)}%` : "—",      icon:<Brain className="w-5 h-5"/>, color:"bg-purple-500/20 text-purple-400", change:"Call connection" },
          ].map(s=>(
            <Card key={s.label} className="p-5">
              <div className={`inline-flex p-2.5 rounded-xl ${s.color} mb-3`}>{s.icon}</div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-white/40">{s.label}</p>
              <p className="text-[11px] text-slate-400 dark:text-white/25 mt-1">{s.change}</p>
            </Card>
          ))}
        </div>

        {/* Main charts row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversion trend */}
          <Card className="lg:col-span-2 p-6">
            <CardHeader>
              <CardTitle>Call Volume & Connected Trend</CardTitle>
              {metrics && <Badge variant="green" dot>{metrics.totalCalls.toLocaleString()} total</Badge>}
            </CardHeader>
            {trend.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-white/30 py-10 text-center">No call data for this range yet.</p>
            ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top:5, right:5, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)"/>
                <XAxis dataKey="label" tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Line type="monotone" dataKey="total_calls" stroke="#6366f1" strokeWidth={2.5} dot={{ fill:"#6366f1", r:4 }} name="Calls"/>
                <Line type="monotone" dataKey="connected" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Connected"/>
              </LineChart>
            </ResponsiveContainer>
            )}
          </Card>

          {/* Sentiment distribution */}
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
              <button className="text-slate-400 dark:text-white/30 hover:text-slate-900 dark:hover:text-white transition-colors"><Info className="w-4 h-4"/></button>
            </CardHeader>
            <div className="space-y-3 mt-2">
              {sentiment.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-white/30 py-10 text-center">No sentiment data yet.</p>
              ) : sentiment.map(s=>{
                const meta = SENTIMENT_META[s.bucket] || { label: s.bucket, color: "#6366f1" };
                return (
                <div key={s.bucket}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-white/60">{meta.label}</span>
                    <span className="text-slate-900 dark:text-white font-medium">{s.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-white/[0.10] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${Math.min(100, s.count)}%`, background:meta.color }}/>
                  </div>
                </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Second row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversion funnel */}
          <Card className="p-6">
            <CardHeader><CardTitle>Conversion Funnel</CardTitle></CardHeader>
            <div className="space-y-2 mt-2">
              {funnel.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-white/30 py-10 text-center">No funnel data yet.</p>
              ) : funnel.map((f, i)=>(
                <div key={f.stage}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-white/60 capitalize">{f.stage.replace("_"," ")}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 dark:text-white font-medium">{f.count.toLocaleString()}</span>
                      <span className="text-slate-400 dark:text-white/30">({f.pct}%)</span>
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100/70 dark:bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${Math.min(100, f.pct)}%`, background:FUNNEL_COLORS[i % FUNNEL_COLORS.length], opacity:1-i*0.08 }}/>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Agent performance */}
          <Card className="p-6">
            <CardHeader><CardTitle>Agent Performance</CardTitle></CardHeader>
            {agents.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-white/30 py-10 text-center">No agent data yet.</p>
            ) : (
              <div className="space-y-3 mt-2">
                {agents.map(a=>(
                  <div key={a.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{a.name}</span>
                      <span className="text-xs text-slate-500 dark:text-white/50 capitalize">{a.role}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
                      <span>{a.completedCalls} connected / {a.totalCalls} calls</span>
                      <span className="text-emerald-600 dark:text-emerald-400">sentiment {a.avgSentiment}</span>
                    </div>
                    <div className="mt-2 h-2 bg-slate-100 dark:bg-white/[0.10] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500" style={{ width:`${a.totalCalls ? Math.min(100, Math.round((a.completedCalls / Math.max(1, a.totalCalls)) * 100)) : 0}%` }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Call sentiment distribution */}
          <Card className="p-6">
            <CardHeader><CardTitle>Call Sentiment</CardTitle></CardHeader>
            {sentiment.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-white/30 py-10 text-center">No call sentiment data yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={sentiment} layout="vertical" margin={{ top:0, right:10, left:10, bottom:0 }}>
                    <XAxis type="number" tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <YAxis dataKey="bucket" type="category" tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false} width={90}/>
                    <Tooltip content={<ChartTip/>}/>
                    <Bar dataKey="count" name="Calls" radius={[0,4,4,0]}>
                      {sentiment.map((s)=>(
                        <Cell key={s.bucket} fill={(SENTIMENT_META[s.bucket] || { color: "#6366f1" }).color}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {sentiment.map(s=>{
                    const meta = SENTIMENT_META[s.bucket] || { label: s.bucket, color: "#6366f1" };
                    return (
                      <div key={s.bucket} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{background:meta.color}}/>
                          <span className="text-slate-500 dark:text-white/50">{meta.label}</span>
                        </div>
                        <span className="text-green-400 font-medium">{s.count} calls</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Derived insights panel (computed from real loaded data) */}
        <Card className="p-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-brand-400"/>
              <CardTitle>Derived Insights</CardTitle>
              <Badge variant="purple">Data</Badge>
            </div>
          </CardHeader>
          <div className="grid md:grid-cols-2 gap-4">
            {insights.map((insight, i)=>(
              <InsightCard key={i} insight={insight}/>
            ))}
          </div>
        </Card>

        {/* Per-agent call detail */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Agent Call Detail</CardTitle>
          </CardHeader>
          {agents.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-white/30 py-10 text-center">No agent data available yet.</p>
          ) : (
            <div className="space-y-3 mt-2">
              {agents.map(a=>(
                <div key={a.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{a.name}</span>
                    <span className="text-xs text-slate-500 dark:text-white/50 capitalize">{a.role}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500 dark:text-white/50 mt-2">
                    <span>Total: <span className="text-slate-900 dark:text-white font-medium">{a.totalCalls}</span></span>
                    <span>Completed: <span className="text-slate-900 dark:text-white font-medium">{a.completedCalls}</span></span>
                    <span>Avg quality: <span className="text-slate-900 dark:text-white font-medium">{a.avgQuality != null ? a.avgQuality : "—"}</span></span>
                    <span>Avg sentiment: <span className="text-slate-900 dark:text-white font-medium">{a.avgSentiment != null ? a.avgSentiment : "—"}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
