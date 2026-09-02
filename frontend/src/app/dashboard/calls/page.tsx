"use client";
import { useState } from "react";
import {
  Phone, PhoneCall, PhoneMissed, PhoneOff, Clock, Download,
  Play, Pause, SkipForward, Volume2, Search, Filter,
  ChevronDown, Mic, MicOff, User, Bot, RefreshCw,
  TrendingUp, BarChart2, Activity, AlertCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { motion } from "framer-motion";
import { TopBar }  from "@/components/dashboard/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }   from "@/components/ui/Badge";
import { Button }  from "@/components/ui/Button";
import { Input }   from "@/components/ui/Input";
import { WaveAnimation } from "@/components/ui/WaveAnimation";
import { formatDuration } from "@/lib/utils";
import type { Call, CallStatus } from "@/types";

// ── Mock calls ─────────────────────────────────────────────────
const mockCalls: Call[] = [
  { id:"1",  leadId:"1", leadName:"Rahul Sharma",   agentId:"1", agentName:"Priya AI",  direction:"outbound", status:"completed",    duration:204, sentimentScore:4.5, qualityScore:88, outcome:"Qualified — appointment booked", startedAt:"2026-08-30T09:15:00" },
  { id:"2",  leadId:"2", leadName:"Anita Patel",    agentId:"2", agentName:"Arjun AI",  direction:"outbound", status:"in_progress",  duration:72,  sentimentScore:3.8, qualityScore:72, outcome:undefined, startedAt:"2026-08-30T11:32:00" },
  { id:"3",  leadId:"3", leadName:"Vikram Singh",   agentId:"3", agentName:"Meera AI",  direction:"outbound", status:"completed",    duration:156, sentimentScore:4.9, qualityScore:95, outcome:"Interested — follow-up tomorrow",startedAt:"2026-08-30T10:05:00" },
  { id:"4",  leadId:"4", leadName:"Sunita Gupta",   agentId:"1", agentName:"Priya AI",  direction:"inbound",  status:"completed",    duration:98,  sentimentScore:3.2, qualityScore:61, outcome:"Not interested", startedAt:"2026-08-30T08:45:00" },
  { id:"5",  leadId:"5", leadName:"Manish Kumar",   agentId:"2", agentName:"Arjun AI",  direction:"outbound", status:"missed",       duration:0,   sentimentScore:undefined, qualityScore:undefined, outcome:"No answer", startedAt:"2026-08-30T07:30:00" },
  { id:"6",  leadId:"6", leadName:"Priya Nair",     agentId:"5", agentName:"Anjali AI", direction:"inbound",  status:"completed",    duration:312, sentimentScore:4.7, qualityScore:91, outcome:"Deal closed — ₹45,000", startedAt:"2026-08-29T15:20:00" },
  { id:"7",  leadId:"7", leadName:"Amit Joshi",     agentId:"4", agentName:"Ravi AI",   direction:"outbound", status:"completed",    duration:65,  sentimentScore:2.9, qualityScore:45, outcome:"Payment promised for tomorrow", startedAt:"2026-08-29T14:10:00" },
  { id:"8",  leadId:"8", leadName:"Deepa Reddy",    agentId:"1", agentName:"Priya AI",  direction:"outbound", status:"failed",       duration:0,   sentimentScore:undefined, qualityScore:undefined, outcome:"Number unreachable", startedAt:"2026-08-29T11:00:00" },
];

const hourlyData = [
  { hour:"6AM",calls:12,connected:9 }, { hour:"7AM",calls:45,connected:38 },
  { hour:"8AM",calls:98,connected:82 }, { hour:"9AM",calls:187,connected:155 },
  { hour:"10AM",calls:241,connected:198 }, { hour:"11AM",calls:312,connected:267 },
  { hour:"12PM",calls:198,connected:162 }, { hour:"1PM",calls:145,connected:118 },
  { hour:"2PM",calls:267,connected:221 }, { hour:"3PM",calls:305,connected:248 },
  { hour:"4PM",calls:278,connected:232 }, { hour:"5PM",calls:189,connected:153 },
  { hour:"6PM",calls:87,connected:71 }, { hour:"7PM",calls:34,connected:27 },
];

// ── Status config ──────────────────────────────────────────────
const statusConfig: Record<CallStatus, { icon: React.ReactNode; variant: "green"|"blue"|"yellow"|"red"|"gray"|"purple"; label: string }> = {
  completed:    { icon:<PhoneCall className="w-3.5 h-3.5"/>,  variant:"green",  label:"Completed" },
  in_progress:  { icon:<Phone className="w-3.5 h-3.5"/>,      variant:"blue",   label:"Live" },
  ringing:      { icon:<Phone className="w-3.5 h-3.5"/>,      variant:"yellow", label:"Ringing" },
  queued:       { icon:<Clock className="w-3.5 h-3.5"/>,      variant:"gray",   label:"Queued" },
  missed:       { icon:<PhoneMissed className="w-3.5 h-3.5"/>,variant:"yellow", label:"Missed" },
  failed:       { icon:<PhoneOff className="w-3.5 h-3.5"/>,   variant:"red",    label:"Failed" },
};

// ── Call player ────────────────────────────────────────────────
function CallPlayer({ call, onClose }: { call: Call; onClose: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(30);

  return (
    <motion.div
      initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
    >
      <div className="glass-card rounded-2xl p-5 border border-white/20 shadow-glass mx-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-white">{call.leadName}</p>
            <p className="text-xs text-white/40">{call.agentName} · {formatDuration(call.duration)}</p>
          </div>
          <div className="flex items-center gap-2">
            {call.sentimentScore && (
              <Badge variant={call.sentimentScore >= 4 ? "green" : "yellow"}>
                Sentiment {call.sentimentScore}/5
              </Badge>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-lg">×</button>
          </div>
        </div>

        {/* Waveform progress */}
        <div className="flex items-center gap-3 mb-3">
          <WaveAnimation active={playing} size="md" bars={20} className="flex-1" color="bg-brand-400"/>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-4 cursor-pointer">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width:`${progress}%`}}/>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40 font-mono">{formatDuration(Math.floor(call.duration * progress/100))}</span>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
              <SkipForward className="w-4 h-4 rotate-180"/>
            </button>
            <button
              onClick={()=>setPlaying(p=>!p)}
              className="w-10 h-10 rounded-xl bg-brand-500 hover:bg-brand-400 flex items-center justify-center text-white transition-all"
            >
              {playing ? <Pause className="w-5 h-5 fill-white"/> : <Play className="w-5 h-5 fill-white"/>}
            </button>
            <button className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
              <SkipForward className="w-4 h-4"/>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-white/40"/>
            <span className="text-xs text-white/40 font-mono">{formatDuration(call.duration)}</span>
          </div>
        </div>

        {/* Transcript snippet */}
        {call.outcome && (
          <div className="mt-4 pt-4 border-t border-white/[0.07]">
            <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Outcome</p>
            <p className="text-sm text-white/70">{call.outcome}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Page ────────────────────────────────────────────────────────
export default function CallsPage() {
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [playing, setPlaying] = useState<Call|null>(null);

  const filtered = mockCalls.filter(c => {
    const matchStatus = filter === "all" || c.status === filter;
    const matchSearch = c.leadName.toLowerCase().includes(search.toLowerCase()) ||
                        c.agentName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Live calls
  const liveCalls = mockCalls.filter(c => c.status === "in_progress");

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Call Center" subtitle="Monitor and manage all AI agent calls" action={{ label:"Launch Campaign", onClick:()=>{} }}/>

      <div className="flex-1 p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label:"Total Calls",    value:"2,847", icon:<Phone className="w-4 h-4"/>,         color:"text-brand-400",  bg:"bg-brand-500/15" },
            { label:"Connected",      value:"2,134", icon:<PhoneCall className="w-4 h-4"/>,     color:"text-green-400",  bg:"bg-green-500/15" },
            { label:"Answered",       value:"1,821", icon:<Mic className="w-4 h-4"/>,           color:"text-cyan-400",   bg:"bg-cyan-500/15" },
            { label:"Missed",         value:"713",   icon:<PhoneMissed className="w-4 h-4"/>,   color:"text-yellow-400", bg:"bg-yellow-500/15" },
            { label:"Qualified",      value:"847",   icon:<TrendingUp className="w-4 h-4"/>,    color:"text-purple-400", bg:"bg-purple-500/15" },
            { label:"Appts Booked",   value:"134",   icon:<Activity className="w-4 h-4"/>,      color:"text-orange-400", bg:"bg-orange-500/15" },
            { label:"Revenue",        value:"₹4.2L", icon:<BarChart2 className="w-4 h-4"/>,    color:"text-green-400",  bg:"bg-green-500/15" },
          ].map(s=>(
            <Card key={s.label} className="p-4">
              <div className={`inline-flex p-2 rounded-xl ${s.bg} ${s.color} mb-2`}>{s.icon}</div>
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-white/40 mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Hourly calls */}
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Calls by Hour</CardTitle>
              <Badge variant="green" dot>Live</Badge>
            </CardHeader>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={hourlyData} margin={{ top:5, right:5, left:-25, bottom:0 }}>
                <defs>
                  <linearGradient id="gH1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="hour" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="glass-card rounded-xl p-2.5 text-xs border border-white/10">
                        <p className="font-semibold text-white mb-1">{label}</p>
                        <p className="text-brand-300">Calls: {payload[0]?.value}</p>
                        <p className="text-green-400">Connected: {payload[1]?.value}</p>
                      </div>
                    ) : null
                  }
                />
                <Area type="monotone" dataKey="calls"     stroke="#6366f1" fill="url(#gH1)" strokeWidth={2}/>
                <Area type="monotone" dataKey="connected" stroke="#22c55e" fill="none"       strokeWidth={1.5} strokeDasharray="4 2"/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Live calls panel */}
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Live Calls ({liveCalls.length})</CardTitle>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
                <span className="text-xs text-green-400">Real-time</span>
              </div>
            </CardHeader>
            {liveCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-white/30">
                <Phone className="w-8 h-8 mb-2"/>
                <p className="text-sm">No active calls right now</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveCalls.map(call=>(
                  <div key={call.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-green-500/15">
                    <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <PhoneCall className="w-4 h-4 text-green-400"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{call.leadName}</p>
                      <p className="text-xs text-white/40">{call.agentName} · {call.direction}</p>
                    </div>
                    <WaveAnimation active size="sm" bars={5} color="bg-green-400"/>
                    <span className="text-xs font-mono text-white/50">{formatDuration(call.duration)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {["all","in_progress","completed","missed","failed"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter===f?"bg-brand-500 text-white":"text-white/40 hover:text-white"}`}>
                {f === "in_progress" ? "Live" : f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px] max-w-sm">
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by lead or agent..." leftIcon={<Search className="w-4 h-4"/>}/>
          </div>
          <Button variant="secondary" size="sm" icon={<Filter className="w-4 h-4"/>} iconRight={<ChevronDown className="w-3.5 h-3.5"/>}>Filter</Button>
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4"/>}>Export</Button>
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4"/>}>Refresh</Button>
        </div>

        {/* Calls table */}
        <Card padding="none" className="overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lead</th><th>Agent</th><th>Direction</th>
                <th>Status</th><th>Duration</th>
                <th>Sentiment</th><th>Quality</th>
                <th>Outcome</th><th>Time</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(call=>{
                const sc = statusConfig[call.status];
                return (
                  <tr key={call.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-300">{call.leadName[0]}</div>
                        <span className="text-white/80 font-medium">{call.leadName}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        <Bot className="w-3.5 h-3.5 text-brand-400"/>{call.agentName}
                      </div>
                    </td>
                    <td>
                      <Badge variant={call.direction==="inbound"?"cyan":"purple"} className="text-xs capitalize">{call.direction}</Badge>
                    </td>
                    <td>
                      <Badge variant={sc.variant} dot className="text-xs gap-1">
                        {sc.icon}{sc.label}
                        {call.status==="in_progress" && <WaveAnimation active size="sm" bars={3} color="bg-green-400" className="ml-1"/>}
                      </Badge>
                    </td>
                    <td>
                      <span className="font-mono text-sm text-white/70">{call.duration ? formatDuration(call.duration) : "—"}</span>
                    </td>
                    <td>
                      {call.sentimentScore ? (
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${call.sentimentScore>=4?"bg-green-400":call.sentimentScore>=3?"bg-yellow-400":"bg-red-400"}`}/>
                          <span className="text-sm text-white/70">{call.sentimentScore}/5</span>
                        </div>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td>
                      {call.qualityScore ? (
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${call.qualityScore>=80?"bg-green-500":call.qualityScore>=60?"bg-yellow-500":"bg-red-500"}`} style={{width:`${call.qualityScore}%`}}/>
                          </div>
                          <span className="text-xs text-white/50">{call.qualityScore}</span>
                        </div>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td><span className="text-xs text-white/50 truncate max-w-[160px] block">{call.outcome||"—"}</span></td>
                    <td><span className="text-xs text-white/30">{new Date(call.startedAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span></td>
                    <td>
                      {call.status==="completed" && call.duration > 0 && (
                        <button onClick={()=>setPlaying(call)}
                          className="w-7 h-7 rounded-lg bg-brand-500/15 hover:bg-brand-500/30 flex items-center justify-center text-brand-400 transition-all">
                          <Play className="w-3.5 h-3.5 fill-current"/>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Audio player */}
      {playing && <CallPlayer call={playing} onClose={()=>setPlaying(null)}/>}
    </div>
  );
}
