"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Phone, TrendingUp, Users, DollarSign, PhoneCall,
  PhoneMissed, Clock, Target, Bot, BarChart3,
  CheckCircle2, AlertCircle, Zap, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, RefreshCw, Sparkles,
  Calendar, ShieldCheck, Play, Radio
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { WaveAnimation } from "@/components/ui/WaveAnimation";
import { formatDuration } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { apiClient } from "@/lib/api";

// ── Mock datasets with period switching ─────────────────────────────
const PERIOD_DATA = {
  today: {
    kpis: [
      { title: "Total Calls", value: "482", change: "+14.2%", up: true, icon: <Phone className="w-5 h-5" />, color: "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30" },
      { title: "Connected", value: "394", change: "+9.5%", up: true, icon: <PhoneCall className="w-5 h-5" />, color: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30" },
      { title: "Qualified Leads", value: "148", change: "+22.1%", up: true, icon: <Target className="w-5 h-5" />, color: "from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30" },
      { title: "Pipeline Value", value: "₹1.8L", change: "+18.3%", up: true, icon: <DollarSign className="w-5 h-5" />, color: "from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30" },
      { title: "Avg Duration", value: "3m 12s", change: "-8s", up: true, icon: <Clock className="w-5 h-5" />, color: "from-cyan-500/20 to-cyan-600/10 text-cyan-400 border-cyan-500/30" },
      { title: "Active Agents", value: "3", change: "100%", up: true, icon: <Bot className="w-5 h-5" />, color: "from-brand-500/20 to-brand-600/10 text-brand-400 border-brand-500/30" },
      { title: "Missed / Failed", value: "88", change: "-12.4%", up: false, icon: <PhoneMissed className="w-5 h-5" />, color: "from-rose-500/20 to-rose-600/10 text-rose-400 border-rose-500/30" },
      { title: "Appts Booked", value: "28", change: "+35.0%", up: true, icon: <Calendar className="w-5 h-5" />, color: "from-teal-500/20 to-teal-600/10 text-teal-400 border-teal-500/30" },
    ],
    trend: [
      { time: "9 AM", calls: 42, connected: 36, qualified: 14 },
      { time: "11 AM", calls: 86, connected: 72, qualified: 28 },
      { time: "1 PM", calls: 110, connected: 92, qualified: 35 },
      { time: "3 PM", calls: 145, connected: 121, qualified: 44 },
      { time: "5 PM", calls: 99, connected: 73, qualified: 27 },
    ],
  },
  week: {
    kpis: [
      { title: "Total Calls", value: "2,847", change: "+12.4%", up: true, icon: <Phone className="w-5 h-5" />, color: "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30" },
      { title: "Connected", value: "2,134", change: "+8.1%", up: true, icon: <PhoneCall className="w-5 h-5" />, color: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30" },
      { title: "Qualified Leads", value: "847", change: "+18.6%", up: true, icon: <Target className="w-5 h-5" />, color: "from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30" },
      { title: "Pipeline Value", value: "₹4.2L", change: "+22.3%", up: true, icon: <DollarSign className="w-5 h-5" />, color: "from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30" },
      { title: "Avg Duration", value: "3m 24s", change: "+14s", up: true, icon: <Clock className="w-5 h-5" />, color: "from-cyan-500/20 to-cyan-600/10 text-cyan-400 border-cyan-500/30" },
      { title: "Active Agents", value: "3", change: "100%", up: true, icon: <Bot className="w-5 h-5" />, color: "from-brand-500/20 to-brand-600/10 text-brand-400 border-brand-500/30" },
      { title: "Missed / Failed", value: "713", change: "-5.2%", up: false, icon: <PhoneMissed className="w-5 h-5" />, color: "from-rose-500/20 to-rose-600/10 text-rose-400 border-rose-500/30" },
      { title: "Appts Booked", value: "134", change: "+31.2%", up: true, icon: <Calendar className="w-5 h-5" />, color: "from-teal-500/20 to-teal-600/10 text-teal-400 border-teal-500/30" },
    ],
    trend: [
      { time: "Mon", calls: 320, connected: 240, qualified: 72 },
      { time: "Tue", calls: 480, connected: 380, qualified: 114 },
      { time: "Wed", calls: 390, connected: 290, qualified: 87 },
      { time: "Thu", calls: 560, connected: 460, qualified: 138 },
      { time: "Fri", calls: 720, connected: 590, qualified: 177 },
      { time: "Sat", calls: 280, connected: 210, qualified: 63 },
      { time: "Sun", calls: 180, connected: 130, qualified: 39 },
    ],
  },
  month: {
    kpis: [
      { title: "Total Calls", value: "12,490", change: "+24.8%", up: true, icon: <Phone className="w-5 h-5" />, color: "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30" },
      { title: "Connected", value: "9,820", change: "+19.4%", up: true, icon: <PhoneCall className="w-5 h-5" />, color: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30" },
      { title: "Qualified Leads", value: "3,610", change: "+28.1%", up: true, icon: <Target className="w-5 h-5" />, color: "from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30" },
      { title: "Pipeline Value", value: "₹18.5L", change: "+34.2%", up: true, icon: <DollarSign className="w-5 h-5" />, color: "from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30" },
      { title: "Avg Duration", value: "3m 38s", change: "+25s", up: true, icon: <Clock className="w-5 h-5" />, color: "from-cyan-500/20 to-cyan-600/10 text-cyan-400 border-cyan-500/30" },
      { title: "Active Agents", value: "3", change: "100%", up: true, icon: <Bot className="w-5 h-5" />, color: "from-brand-500/20 to-brand-600/10 text-brand-400 border-brand-500/30" },
      { title: "Missed / Failed", value: "2,670", change: "-8.1%", up: false, icon: <PhoneMissed className="w-5 h-5" />, color: "from-rose-500/20 to-rose-600/10 text-rose-400 border-rose-500/30" },
      { title: "Appts Booked", value: "612", change: "+42.6%", up: true, icon: <Calendar className="w-5 h-5" />, color: "from-teal-500/20 to-teal-600/10 text-teal-400 border-teal-500/30" },
    ],
    trend: [
      { time: "Week 1", calls: 2450, connected: 1910, qualified: 680 },
      { time: "Week 2", calls: 3100, connected: 2450, qualified: 890 },
      { time: "Week 3", calls: 3420, connected: 2710, qualified: 990 },
      { time: "Week 4", calls: 3520, connected: 2750, qualified: 1050 },
    ],
  },
};

const conversionData = [
  { name: "Qualified", value: 35, color: "#6366f1" },
  { name: "Interested", value: 25, color: "#8b5cf6" },
  { name: "Converted", value: 22, color: "#10b981" },
  { name: "Follow-up", value: 10, color: "#f59e0b" },
  { name: "Lost", value: 8, color: "#ef4444" },
];

const agentPerf = [
  { name: "Priya AI", role: "Telecaller", language: "Hinglish", calls: 143, conv: 34, rating: 4.8, status: "active" },
  { name: "Arjun AI", role: "Enterprise Sales", language: "English", calls: 98, conv: 27, rating: 4.9, status: "active" },
  { name: "Meera AI", role: "Recruiter", language: "Hindi", calls: 67, conv: 21, rating: 4.6, status: "active" },
  { name: "Ravi AI", role: "Collections", language: "Hindi", calls: 112, conv: 41, rating: 4.4, status: "paused" },
  { name: "Anjali AI", role: "Receptionist", language: "English", calls: 88, conv: 16, rating: 4.7, status: "active" },
];

const initialLiveCalls = [
  { id: "call-1", agent: "Priya AI", lead: "Rahul Sharma", phone: "+91 98765 43210", duration: 154, status: "Qualifying Intent", sentiment: "positive" },
  { id: "call-2", agent: "Arjun AI", lead: "Anita Patel", phone: "+91 98234 56789", duration: 72, status: "Pitching Demo", sentiment: "neutral" },
  { id: "call-3", agent: "Meera AI", lead: "Vikram Singh", phone: "+91 97112 34567", duration: 48, status: "Salary Expectation", sentiment: "positive" },
];

const initialActivities = [
  { icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, text: "Priya AI booked an appointment with Rahul Sharma", time: "Just now", badge: "Booking" },
  { icon: <PhoneCall className="w-4 h-4 text-brand-400" />, text: "Outbound call initiated for Anita Patel (Tata Tech)", time: "3m ago", badge: "Live Call" },
  { icon: <Target className="w-4 h-4 text-purple-400" />, text: "Lead score updated: Vikram Singh escalated to 94", time: "8m ago", badge: "CRM" },
  { icon: <AlertCircle className="w-4 h-4 text-amber-400" />, text: "Ravi AI flagged review: Disputed invoice reminder", time: "22m ago", badge: "Compliance" },
  { icon: <DollarSign className="w-4 h-4 text-emerald-400" />, text: "Payment confirmed: ₹45,000 via Razorpay link", time: "45m ago", badge: "Revenue" },
];

function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#180406]/95 border border-white/10 backdrop-blur-xl rounded-xl p-3 text-xs shadow-2xl shadow-black/80">
      <p className="font-semibold text-white/90 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-white/60 capitalize">{p.name}:</span>
          </div>
          <span className="text-white font-mono font-bold">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");
  const [liveCallsList, setLiveCallsList] = useState(initialLiveCalls);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dbMetrics, setDbMetrics] = useState<{ totalCalls: number; connected: number; qualified: number; activeAgents: number; avgDur: number } | null>(null);
  const user = useAuthStore((s) => s.user);

  const fetchLiveMetrics = async () => {
    try {
      const [metricsRes, agentsRes, leadsRes] = await Promise.all([
        apiClient.get(`/calls/metrics?range=${period}`).catch(() => null),
        apiClient.get("/agents").catch(() => null),
        apiClient.get("/leads").catch(() => null),
      ]);

      const callsTotal = metricsRes?.data?.total ?? 5;
      const connected = metricsRes?.data?.completed ?? 4;
      const agentsCount = Array.isArray(agentsRes?.data) ? agentsRes.data.length : 3;
      const leads = Array.isArray(leadsRes?.data) ? leadsRes.data : [];
      const qualifiedCount = leads.filter((l: any) => l.status === "qualified").length || 3;
      const avgDur = metricsRes?.data?.avgDuration ?? 145;

      setDbMetrics({
        totalCalls: callsTotal,
        connected: connected,
        qualified: qualifiedCount,
        activeAgents: agentsCount,
        avgDur: avgDur,
      });
    } catch (e) {
      console.error("Failed to load live metrics:", e);
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
  }, [period]);

  // Live timer simulation for calls
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCallsList((prev) =>
        prev.map((call) => ({
          ...call,
          duration: call.duration + 1,
        }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLiveMetrics();
    setIsRefreshing(false);
  };

  const currentData = PERIOD_DATA[period];
  const dynamicKpis = [
    { title: "Total Calls", value: dbMetrics ? String(dbMetrics.totalCalls) : currentData.kpis[0].value, change: "+14.2%", up: true, icon: <Phone className="w-5 h-5" />, color: "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30" },
    { title: "Connected", value: dbMetrics ? String(dbMetrics.connected) : currentData.kpis[1].value, change: "+9.5%", up: true, icon: <PhoneCall className="w-5 h-5" />, color: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30" },
    { title: "Qualified Leads", value: dbMetrics ? String(dbMetrics.qualified) : currentData.kpis[2].value, change: "+22.1%", up: true, icon: <Target className="w-5 h-5" />, color: "from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30" },
    { title: "Pipeline Value", value: "₹4.8L", change: "+18.3%", up: true, icon: <DollarSign className="w-5 h-5" />, color: "from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30" },
    { title: "Avg Duration", value: dbMetrics ? `${Math.floor(dbMetrics.avgDur / 60)}m ${dbMetrics.avgDur % 60}s` : currentData.kpis[4].value, change: "+14s", up: true, icon: <Clock className="w-5 h-5" />, color: "from-cyan-500/20 to-cyan-600/10 text-cyan-400 border-cyan-500/30" },
    { title: "Active Agents", value: dbMetrics ? String(dbMetrics.activeAgents) : currentData.kpis[5].value, change: "100%", up: true, icon: <Bot className="w-5 h-5" />, color: "from-brand-500/20 to-brand-600/10 text-brand-400 border-brand-500/30" },
    { title: "Missed / Failed", value: dbMetrics ? String(Math.max(0, dbMetrics.totalCalls - dbMetrics.connected)) : "1", change: "-12.4%", up: false, icon: <PhoneMissed className="w-5 h-5" />, color: "from-rose-500/20 to-rose-600/10 text-rose-400 border-rose-500/30" },
    { title: "Appts Booked", value: "4", change: "+35.0%", up: true, icon: <Calendar className="w-5 h-5" />, color: "from-teal-500/20 to-teal-600/10 text-teal-400 border-teal-500/30" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* ── Top Hero Banner ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 border border-brand-500/30 shadow-2xl"
        style={{
          background: "radial-gradient(ellipse 90% 70% at 20% 0%, rgba(212,32,39,0.22) 0%, rgba(18,2,4,0.95) 75%)",
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-rose-700 flex items-center justify-center p-3 shadow-lg shadow-brand-500/30 flex-shrink-0">
              <Zap className="w-7 h-7 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Welcome back, {user?.name || "Team Acme"}!
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Telephony Engine Online
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-1.5 max-w-2xl leading-relaxed">
                Your AI voice agents are autonomously handling calls, qualifying prospects, and setting appointments in real-time across 10 Indian dialects.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-brand-400" : ""}`} />
              Refresh
            </button>
            <Link
              href="/dashboard/agents"
              className="btn-red text-xs py-2 px-4 h-9 shadow-lg shadow-brand-500/25"
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
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Operational Metrics</h3>
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
                    ? "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-900/50"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {dynamicKpis.map((k, i) => (
            <motion.div
              key={k.title + period}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="relative group overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] hover:border-brand-500/40 transition-all duration-300 shadow-xl"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${k.color}`}>
                  {k.icon}
                </div>
                {k.change && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                      k.up
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {k.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {k.change}
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">{k.value}</p>
              <p className="text-xs text-white/50 mt-1 font-medium">{k.title}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Charts Section ──────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Volume & Conversion Chart */}
        <div className="lg:col-span-2 rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                Call Volume & Qualified Pipeline
              </h3>
              <p className="text-xs text-white/40 mt-0.5">Total dialed volume vs qualified opportunities generated</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-white/60">Total Dialed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-white/60">Qualified Leads</span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentData.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradQualified" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Area type="monotone" dataKey="calls" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradCalls)" />
                <Area type="monotone" dataKey="qualified" stroke="#10b981" strokeWidth={2.5} fill="url(#gradQualified)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Disposition Funnel */}
        <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                Disposition Breakdown
              </h3>
              <span className="text-[11px] text-white/40 font-mono">100% Dialed</span>
            </div>

            <div className="h-44 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {conversionData.map((e, idx) => (
                      <Cell key={`cell-${idx}`} fill={e.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="bg-[#180406]/95 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white shadow-lg">
                          <span className="font-semibold">{payload[0].name}: {payload[0].value}%</span>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-white/40 font-medium">Conversion</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">35%</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-white/[0.06]">
            {conversionData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-white/60">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono font-semibold">{d.value}%</span>
                  <div className="w-14 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.value}%`, background: d.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lower Operational Row ────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-6">

        {/* Live Calls Feed */}
        <div className="rounded-2xl p-5 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Call Sessions</h3>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {liveCallsList.length} Active
            </span>
          </div>

          <div className="space-y-3">
            {liveCallsList.map((call) => (
              <div
                key={call.id}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-brand-500/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">
                        {call.lead}
                      </p>
                      <p className="text-xs text-white/40 flex items-center gap-1.5">
                        <span>{call.agent}</span>
                        <span>·</span>
                        <span className="font-mono text-[11px]">{call.phone}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <WaveAnimation active size="sm" bars={4} color="bg-emerald-400" />
                    <span className="text-[10px] font-mono text-white/50 mt-1">
                      {formatDuration(call.duration)}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
                  <span className="text-white/40">Status: <span className="text-white/80 font-medium">{call.status}</span></span>
                  <span className="text-emerald-400 font-medium">Sentiment: {call.sentiment}</span>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard/calls"
            className="mt-4 block text-center text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04]"
          >
            Open Call Center Console →
          </Link>
        </div>

        {/* AI Agent Leaderboard */}
        <div className="rounded-2xl p-5 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Performing Agents</h3>
            <Link href="/dashboard/agents" className="text-xs font-semibold text-brand-400 hover:text-brand-300">
              Manage →
            </Link>
          </div>

          <div className="space-y-2.5">
            {agentPerf.map((agent, i) => (
              <div
                key={agent.name}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-xs font-mono font-bold text-white/30 w-4">{i + 1}</span>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md flex-shrink-0">
                  {agent.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{agent.name}</p>
                  <p className="text-xs text-white/40 truncate">{agent.role} · {agent.language}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-mono font-bold text-emerald-400">{agent.conv}%</p>
                  <p className="text-[10px] text-white/40">{agent.calls} calls</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Activity Stream */}
        <div className="rounded-2xl p-5 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Activity</h3>
            <span className="text-[11px] text-white/40">Audit Trail</span>
          </div>

          <div className="space-y-3.5">
            {initialActivities.map((act, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {act.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/80 leading-relaxed">{act.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-white/40">{act.time}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.06] text-white/60 font-medium">
                      {act.badge}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Fast Navigation Bar ──────────────────────────────── */}
      <div className="rounded-2xl p-5 bg-gradient-to-r from-white/[0.05] via-brand-950/20 to-white/[0.02] border border-white/[0.08] shadow-2xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Quick Navigation</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "AI Agent Studio", href: "/dashboard/agents", desc: "Build & configure voices", icon: <Bot className="w-5 h-5 text-brand-400" /> },
            { label: "Live Call Center", href: "/dashboard/calls", desc: "Monitor calls in real time", icon: <Phone className="w-5 h-5 text-emerald-400" /> },
            { label: "CRM & Leads Pipeline", href: "/dashboard/crm", desc: "Kanban & lead scores", icon: <Users className="w-5 h-5 text-purple-400" /> },
            { label: "Deep Analytics", href: "/dashboard/analytics", desc: "Conversion & sentiment", icon: <BarChart3 className="w-5 h-5 text-amber-400" /> },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-brand-500/30 transition-all duration-200 group flex items-start gap-3"
            >
              <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 group-hover:scale-110 transition-transform">
                {action.icon}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                  {action.label}
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
