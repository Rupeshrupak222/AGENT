"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Phone, TrendingUp, Users, DollarSign, PhoneCall,
  PhoneMissed, Clock, Target, Bot, BarChart3,
  CheckCircle2, AlertCircle, Zap, MoreHorizontal,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { WaveAnimation } from "@/components/ui/WaveAnimation";
import { formatDuration } from "@/lib/utils";

// ── Mock data ───────────────────────────────────────────────
const callTrend = [
  { day: "Mon", calls: 320, connected: 240, qualified: 72 },
  { day: "Tue", calls: 480, connected: 380, qualified: 114 },
  { day: "Wed", calls: 390, connected: 290, qualified: 87 },
  { day: "Thu", calls: 560, connected: 460, qualified: 138 },
  { day: "Fri", calls: 720, connected: 590, qualified: 177 },
  { day: "Sat", calls: 280, connected: 210, qualified: 63 },
  { day: "Sun", calls: 180, connected: 130, qualified: 39 },
];

const conversionData = [
  { name: "Qualified",  value: 30, color: "#6366f1" },
  { name: "Interested", value: 25, color: "#8b5cf6" },
  { name: "Converted",  value: 20, color: "#22c55e" },
  { name: "Lost",       value: 25, color: "#ef4444" },
];

const agentPerf = [
  { name: "Priya AI",  role: "Telecaller",   calls: 143, conv: 32, status: "active"  },
  { name: "Arjun AI",  role: "Sales",         calls: 98,  conv: 24, status: "active"  },
  { name: "Meera AI",  role: "Recruiter",     calls: 67,  conv: 18, status: "active"  },
  { name: "Ravi AI",   role: "Collection",    calls: 112, conv: 41, status: "paused"  },
  { name: "Anjali AI", role: "Receptionist",  calls: 88,  conv: 15, status: "active"  },
];

const liveCalls = [
  { id:"1", agent:"Priya AI",  lead:"Rahul Sharma",   duration:154, status:"Qualifying" },
  { id:"2", agent:"Arjun AI",  lead:"Anita Patel",    duration:72,  status:"Pitching"   },
  { id:"3", agent:"Meera AI",  lead:"Vikram Singh",   duration:48,  status:"Closing"    },
];

const activities = [
  { icon:<CheckCircle2 className="w-4 h-4 text-green-400"/>,  text:"Priya AI qualified Rahul Sharma",         time:"2m ago"  },
  { icon:<PhoneCall className="w-4 h-4 text-brand-400"/>,     text:"New call started with Anita Patel",       time:"5m ago"  },
  { icon:<Target className="w-4 h-4 text-purple-400"/>,       text:"Lead score updated: Vikram Singh → 87",   time:"12m ago" },
  { icon:<AlertCircle className="w-4 h-4 text-yellow-400"/>,  text:"Ravi AI paused — review required",        time:"25m ago" },
  { icon:<DollarSign className="w-4 h-4 text-green-400"/>,    text:"Deal closed: ₹45,000 — Infosys",          time:"1h ago"  },
  { icon:<Users className="w-4 h-4 text-cyan-400"/>,          text:"50 new leads imported from CSV",           time:"2h ago"  },
];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl p-3 border border-white/15 text-xs shadow-glass">
      <p className="font-semibold text-white mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/60 capitalize">{p.name}:</span>
          <span className="text-white font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

const kpis = [
  { title:"Total Calls",      value:"2,847", change:"+12.4%", icon:<Phone className="w-5 h-5"/>,      color:"bg-brand-500/20 text-brand-400",   up:true  },
  { title:"Connected",        value:"2,134", change:"+8.1%",  icon:<PhoneCall className="w-5 h-5"/>,  color:"bg-green-500/20 text-green-400",   up:true  },
  { title:"Qualified Leads",  value:"847",   change:"+18.6%", icon:<Target className="w-5 h-5"/>,     color:"bg-purple-500/20 text-purple-400", up:true  },
  { title:"Revenue",          value:"₹4.2L", change:"+22.3%", icon:<DollarSign className="w-5 h-5"/>, color:"bg-orange-500/20 text-orange-400", up:true  },
  { title:"Missed Calls",     value:"713",   change:"-5.2%",  icon:<PhoneMissed className="w-5 h-5"/>,color:"bg-red-500/20 text-red-400",       up:false },
  { title:"Avg Duration",     value:"3:24",  change:"",       icon:<Clock className="w-5 h-5"/>,      color:"bg-cyan-500/20 text-cyan-400",     up:true  },
  { title:"Active Agents",    value:"12",    change:"",       icon:<Bot className="w-5 h-5"/>,        color:"bg-brand-500/20 text-brand-400",   up:true  },
  { title:"Appointments Set", value:"134",   change:"+31.2%", icon:<Users className="w-5 h-5"/>,      color:"bg-teal-500/20 text-teal-400",     up:true  },
];

export default function OverviewPage() {
  const [period, setPeriod] = useState<"today"|"week"|"month">("week");

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* ── Welcome banner ───────────────────────────────── */}
      <motion.div
        initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
        className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background:"rgba(212,32,39,0.10)", border:"1px solid rgba(212,32,39,0.25)", backdropFilter:"blur(16px)" }}
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-brand-sm">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Good morning! Your AI agents are working.</h2>
            <p className="text-xs sm:text-sm text-white/50 mt-0.5">
              <span className="text-green-400 font-medium">3 agents active</span> · 847 leads qualified this week
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Live</span>
          <WaveAnimation active size="sm" bars={6} color="bg-green-400" />
        </div>
      </motion.div>

      {/* ── KPI grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.title}
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl p-4 sm:p-5 hover:border-brand-500/25 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 sm:p-2.5 rounded-xl ${k.color}`}>{k.icon}</div>
              {k.change && (
                <span className={`text-xs font-semibold ${k.up ? "text-green-400" : "text-red-400"}`}>{k.change}</span>
              )}
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{k.value}</p>
            <p className="text-xs text-white/45 mt-0.5 font-medium">{k.title}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Charts row ───────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Call trend */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
            <h3 className="text-base font-semibold text-white">Call Activity</h3>
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 self-start sm:self-auto">
              {(["today","week","month"] as const).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize ${period===p?"bg-brand-500 text-white":"text-white/40 hover:text-white"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={callTrend} margin={{ top:5, right:5, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gQ" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="day" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"rgba(255,255,255,0.3)", fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Area type="monotone" dataKey="calls"     stroke="#6366f1" fill="url(#gC)" strokeWidth={2}/>
              <Area type="monotone" dataKey="qualified" stroke="#22c55e" fill="url(#gQ)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3">
            {[["#6366f1","Total Calls"],["#22c55e","Qualified"]].map(([c,l])=>(
              <div key={l} className="flex items-center gap-1.5 text-xs text-white/40">
                <div className="w-3 h-0.5 rounded-full" style={{background:c}}/>
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Lead outcomes */}
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <h3 className="text-base font-semibold text-white mb-4">Lead Outcomes</h3>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={conversionData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {conversionData.map((e,i) => <Cell key={i} fill={e.color} stroke="transparent"/>)}
              </Pie>
              <Tooltip content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="glass-card rounded-lg px-3 py-2 text-xs border border-white/10">
                    <span className="text-white font-medium">{payload[0].name}: {payload[0].value}%</span>
                  </div>
                ) : null}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {conversionData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:d.color}}/>
                  <span className="text-white/60">{d.name}</span>
                </div>
                <span className="text-white font-semibold">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row ───────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-4 sm:gap-6">

        {/* Live calls */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Live Calls</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
              <span className="text-xs text-green-400 font-medium">{liveCalls.length} active</span>
            </div>
          </div>
          <div className="space-y-2.5">
            {liveCalls.map((call) => (
              <div key={call.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                  <PhoneCall className="w-3.5 h-3.5 text-brand-400"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{call.lead}</p>
                  <p className="text-xs text-white/40">{call.agent}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <WaveAnimation active size="sm" bars={4} color="bg-green-400"/>
                  <span className="text-[10px] font-mono text-white/40">{formatDuration(call.duration)}</span>
                </div>
              </div>
            ))}
            <Link href="/dashboard/calls" className="block text-center text-xs text-brand-400 hover:text-brand-300 transition-colors pt-1">
              View all calls →
            </Link>
          </div>
        </div>

        {/* Agent leaderboard */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Agent Performance</h3>
            <Link href="/dashboard/agents" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">View all →</Link>
          </div>
          <div className="space-y-2">
            {agentPerf.map((agent, i) => (
              <div key={agent.name} className="flex items-center gap-2.5 py-1.5">
                <span className="text-xs font-bold text-white/20 w-4 flex-shrink-0">{i+1}</span>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {agent.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                  <p className="text-xs text-white/40">{agent.role}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">{agent.conv}%</p>
                  <p className="text-[10px] text-white/30">{agent.calls} calls</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${agent.status==="active" ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"}`}>
                  {agent.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Recent Activity</h3>
            <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all">
              <MoreHorizontal className="w-4 h-4"/>
            </button>
          </div>
          <div className="space-y-3">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 leading-snug">{a.text}</p>
                  <p className="text-xs text-white/30 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h3 className="text-base font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:"Create Agent",    href:"/dashboard/agents",    icon:<Bot className="w-5 h-5"/>,        color:"from-brand-500 to-brand-700"   },
            { label:"Import Leads",    href:"/dashboard/crm",       icon:<Users className="w-5 h-5"/>,      color:"from-purple-500 to-purple-700" },
            { label:"Launch Campaign", href:"/dashboard/calls",     icon:<Phone className="w-5 h-5"/>,      color:"from-green-500 to-green-700"   },
            { label:"View Analytics",  href:"/dashboard/analytics", icon:<BarChart3 className="w-5 h-5"/>, color:"from-orange-500 to-orange-700" },
          ].map((q) => (
            <Link
              key={q.label}
              href={q.href}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-white/10 hover:border-brand-500/30 bg-white/[0.02] hover:bg-white/[0.05] transition-all group"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${q.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                {q.icon}
              </div>
              <span className="text-xs font-semibold text-white/60 group-hover:text-white transition-colors text-center leading-tight">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
