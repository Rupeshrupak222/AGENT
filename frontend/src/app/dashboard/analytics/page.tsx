"use client";
import { useState } from "react";
import {
  Brain, TrendingUp, TrendingDown, Zap, Target,
  BarChart2, AlertTriangle, CheckCircle2, Star, ArrowUpRight,
  Calendar, Download, RefreshCw, Info,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ScatterChart, Scatter, ZAxis,
} from "recharts";
import { TopBar }  from "@/components/dashboard/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }   from "@/components/ui/Badge";
import { Button }  from "@/components/ui/Button";

// ── Mock data ───────────────────────────────────────────────────
const weeklyConv = [
  { week:"W1 Jul", calls:1820, conv:18.2, sentiment:3.8 },
  { week:"W2 Jul", calls:2140, conv:21.4, sentiment:4.0 },
  { week:"W3 Jul", calls:1960, conv:19.8, sentiment:3.9 },
  { week:"W4 Jul", calls:2380, conv:24.1, sentiment:4.2 },
  { week:"W1 Aug", calls:2710, conv:26.5, sentiment:4.3 },
  { week:"W2 Aug", calls:2540, conv:25.1, sentiment:4.1 },
  { week:"W3 Aug", calls:3020, conv:29.7, sentiment:4.6 },
  { week:"W4 Aug", calls:2847, conv:31.2, sentiment:4.7 },
];

const sentimentDist = [
  { name:"Very Positive", value:38, color:"#22c55e" },
  { name:"Positive",      value:29, color:"#84cc16" },
  { name:"Neutral",       value:18, color:"#eab308" },
  { name:"Negative",      value:11, color:"#f97316" },
  { name:"Very Negative", value:4,  color:"#ef4444" },
];

const intentData = [
  { intent:"High Intent",    count:412, convRate:68, color:"#6366f1" },
  { intent:"Medium Intent",  count:635, convRate:34, color:"#8b5cf6" },
  { intent:"Low Intent",     count:890, convRate:12, color:"#a855f7" },
  { intent:"No Intent",      count:310, convRate:2,  color:"#374151" },
];

const agentRadar = [
  { metric:"Conversion",    priya:88, arjun:72, meera:65 },
  { metric:"Sentiment",     priya:90, arjun:75, meera:92 },
  { metric:"Call Quality",  priya:82, arjun:80, meera:78 },
  { metric:"Avg Duration",  priya:70, arjun:85, meera:72 },
  { metric:"Follow-up",     priya:78, arjun:68, meera:80 },
  { metric:"Qualification", priya:85, arjun:74, meera:70 },
];

const conversionFunnel = [
  { stage:"Calls Made",     value:2847, pct:100, color:"#6366f1" },
  { stage:"Connected",      value:2134, pct:75,  color:"#8b5cf6" },
  { stage:"Engaged",        value:1620, pct:57,  color:"#06b6d4" },
  { stage:"Interested",     value:987,  pct:35,  color:"#22c55e" },
  { stage:"Qualified",      value:580,  pct:20,  color:"#84cc16" },
  { stage:"Appointment",    value:268,  pct:9.4, color:"#eab308" },
  { stage:"Closed",         value:134,  pct:4.7, color:"#22c55e" },
];

const aiInsights = [
  { type:"success",  icon:<CheckCircle2 className="w-4 h-4 text-green-400"/>,  title:"Peak Performance Window",       body:"Calls between 10AM–12PM have 42% higher conversion. Schedule more campaigns in this window.", impact:"+12% conv." },
  { type:"warning",  icon:<AlertTriangle className="w-4 h-4 text-yellow-400"/>, title:"Objection Spike Detected",      body:"'Price too high' objection increased 23% this week. Update Arjun AI's scripts with new value props.", impact:"-8% conv." },
  { type:"info",     icon:<Brain className="w-4 h-4 text-brand-400"/>,          title:"Language Optimisation",         body:"Hindi leads respond 31% better to Hinglish. Consider switching Priya AI to Hinglish for Hindi numbers.", impact:"+8% response" },
  { type:"success",  icon:<Zap className="w-4 h-4 text-purple-400"/>,           title:"High-Intent Lead Batch Ready",  body:"47 leads scored 85+ are ready for immediate callback. Estimated ₹2.1L pipeline value.", impact:"₹2.1L pipeline" },
];

const leadPriorityScatter = Array.from({ length: 40 }, (_, i) => ({
  score: Math.floor(Math.random() * 60 + 40),
  conv:  Math.floor(Math.random() * 80 + 10),
  calls: Math.floor(Math.random() * 8 + 1),
}));

// ── Tooltip ────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl p-3 text-xs border border-white/10">
      {label && <p className="font-semibold text-white mb-1.5">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
          <span className="text-white/60 capitalize">{p.name}:</span>
          <span className="text-white font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── AI Insight card ────────────────────────────────────────────
function InsightCard({ insight }: { insight: typeof aiInsights[0] }) {
  const borderColor = insight.type === "success" ? "border-green-500/20" : insight.type === "warning" ? "border-yellow-500/20" : "border-brand-500/20";
  const bgColor     = insight.type === "success" ? "bg-green-500/5"      : insight.type === "warning" ? "bg-yellow-500/5"      : "bg-brand-500/5";
  return (
    <div className={`glass-card rounded-xl p-4 border ${borderColor} ${bgColor}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">{insight.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-white">{insight.title}</p>
            <Badge variant={insight.type === "success" ? "green" : insight.type === "warning" ? "yellow" : "blue"} className="text-[10px] flex-shrink-0">{insight.impact}</Badge>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">{insight.body}</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"week"|"month"|"quarter">("month");

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-black text-white tracking-tight">AI Analytics</h1>
        <p className="text-sm text-white/50 mt-1">Deep operational insights powered by GPT-4o conversational analysis</p>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Period selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {(["week","month","quarter"] as const).map(p=>(
              <button key={p} onClick={()=>setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${period===p?"bg-brand-500 text-white":"text-white/40 hover:text-white"}`}>
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Calendar className="w-4 h-4"/>}>Date Range</Button>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4"/>}>Export PDF</Button>
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4"/>}>Refresh</Button>
          </div>
        </div>

        {/* AI Insight summary row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:"Avg Sentiment Score",    value:"4.6 / 5",   icon:<Star className="w-5 h-5"/>,         color:"bg-yellow-500/20 text-yellow-400", change:"+0.3 vs last month" },
            { label:"Conversion Prediction",  value:"34.2%",     icon:<Target className="w-5 h-5"/>,       color:"bg-green-500/20 text-green-400",   change:"Next 7 days" },
            { label:"Avg Lead Priority",      value:"72 / 100",  icon:<Zap className="w-5 h-5"/>,          color:"bg-brand-500/20 text-brand-400",   change:"+5 pts this week" },
            { label:"Intent Detection Rate",  value:"89.4%",     icon:<Brain className="w-5 h-5"/>,        color:"bg-purple-500/20 text-purple-400", change:"Model accuracy" },
          ].map(s=>(
            <Card key={s.label} className="p-5">
              <div className={`inline-flex p-2.5 rounded-xl ${s.color} mb-3`}>{s.icon}</div>
              <p className="text-2xl font-extrabold text-white mb-1">{s.value}</p>
              <p className="text-xs text-white/40">{s.label}</p>
              <p className="text-[11px] text-white/25 mt-1">{s.change}</p>
            </Card>
          ))}
        </div>

        {/* Main charts row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversion trend */}
          <Card className="lg:col-span-2 p-6">
            <CardHeader>
              <CardTitle>Conversion Rate Trend</CardTitle>
              <Badge variant="green" dot>AI Predicted: 34.2%</Badge>
            </CardHeader>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyConv} margin={{ top:5, right:5, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="week" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Line type="monotone" dataKey="conv" stroke="#6366f1" strokeWidth={2.5} dot={{ fill:"#6366f1", r:4 }} name="Conv %"/>
                <Line type="monotone" dataKey="sentiment" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Sentiment"/>
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Sentiment distribution */}
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
              <button className="text-white/30 hover:text-white transition-colors"><Info className="w-4 h-4"/></button>
            </CardHeader>
            <div className="space-y-3 mt-2">
              {sentimentDist.map(s=>(
                <div key={s.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">{s.name}</span>
                    <span className="text-white font-medium">{s.value}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width:`${s.value}%`, background:s.color }}/>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Second row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversion funnel */}
          <Card className="p-6">
            <CardHeader><CardTitle>Conversion Funnel</CardTitle></CardHeader>
            <div className="space-y-2 mt-2">
              {conversionFunnel.map((f, i)=>(
                <div key={f.stage}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">{f.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{f.value.toLocaleString()}</span>
                      <span className="text-white/30">({f.pct}%)</span>
                    </div>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${f.pct}%`, background:f.color, opacity:1-i*0.08 }}/>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Agent radar */}
          <Card className="p-6">
            <CardHeader><CardTitle>Agent Comparison</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={agentRadar}>
                <PolarGrid stroke="rgba(255,255,255,0.08)"/>
                <PolarAngleAxis dataKey="metric" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:9 }}/>
                <PolarRadiusAxis tick={false} axisLine={false}/>
                <Radar name="Priya AI" dataKey="priya" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15}/>
                <Radar name="Arjun AI" dataKey="arjun" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1}/>
                <Radar name="Meera AI" dataKey="meera" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1}/>
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {[["#6366f1","Priya"],["#22c55e","Arjun"],["#a855f7","Meera"]].map(([c,l])=>(
                <div key={l} className="flex items-center gap-1.5 text-xs text-white/40">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background:c}}/>
                  {l}
                </div>
              ))}
            </div>
          </Card>

          {/* Intent breakdown */}
          <Card className="p-6">
            <CardHeader><CardTitle>Customer Intent Detection</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={intentData} layout="vertical" margin={{ top:0, right:10, left:10, bottom:0 }}>
                <XAxis type="number" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis dataKey="intent" type="category" tick={{ fill:"rgba(255,255,255,0.4)", fontSize:10 }} axisLine={false} tickLine={false} width={90}/>
                <Tooltip content={<ChartTip/>}/>
                <Bar dataKey="count" radius={[0,4,4,0]}>
                  {intentData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1.5">
              {intentData.map(d=>(
                <div key={d.intent} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{background:d.color}}/>
                    <span className="text-white/50">{d.intent}</span>
                  </div>
                  <span className="text-green-400 font-medium">{d.convRate}% conv</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* AI Insights panel */}
        <Card className="p-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-brand-400"/>
              <CardTitle>AI-Generated Insights</CardTitle>
              <Badge variant="purple">GPT-4o Analysis</Badge>
            </div>
            <Button variant="secondary" size="sm" iconRight={<ArrowUpRight className="w-4 h-4"/>}>Full Report</Button>
          </CardHeader>
          <div className="grid md:grid-cols-2 gap-4">
            {aiInsights.map((insight,i)=>(
              <InsightCard key={i} insight={insight}/>
            ))}
          </div>
        </Card>

        {/* Lead priority scatter */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Lead Priority Score Distribution</CardTitle>
            <p className="text-xs text-white/40">Score vs Conversion Rate (bubble size = calls made)</p>
          </CardHeader>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top:5, right:5, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="score" name="Priority Score" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} label={{ value:"Priority Score", position:"insideBottom", offset:-2, fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis dataKey="conv"  name="Conv Rate %" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false}/>
              <ZAxis dataKey="calls" range={[20, 100]}/>
              <Tooltip cursor={{ strokeDasharray:"3 3" }} content={({ active, payload })=>
                active && payload?.length ? (
                  <div className="glass-card rounded-xl p-2.5 text-xs border border-white/10">
                    <p className="text-white/60">Score: <span className="text-white font-medium">{payload[0]?.value}</span></p>
                    <p className="text-white/60">Conv: <span className="text-green-400 font-medium">{payload[1]?.value}%</span></p>
                  </div>
                ) : null
              }/>
              <Scatter data={leadPriorityScatter} fill="#6366f1" fillOpacity={0.7}/>
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
