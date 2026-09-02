"use client";
import { useState } from "react";
import {
  Plus, Bot, Play, Pause, Settings, Trash2, Copy,
  Mic2, Globe2, Brain, Phone, TrendingUp, MoreHorizontal,
  Search, Filter, ChevronDown, Zap, CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TopBar }    from "@/components/dashboard/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }     from "@/components/ui/Badge";
import { Button }    from "@/components/ui/Button";
import { Input, Select, TextArea } from "@/components/ui/Input";
import { WaveAnimation } from "@/components/ui/WaveAnimation";
import type { AIAgent, AgentRole, Language } from "@/types";

// ── Mock agents ────────────────────────────────────────────────
const mockAgents: AIAgent[] = [
  { id:"1", name:"Priya AI",  role:"telecaller",   language:"hinglish", voice:"Priya",  businessGoal:"Qualify inbound leads and book appointments", status:"active",  callsToday:143, callsTotal:4821, conversionRate:32, avgCallDuration:184, createdAt:"2026-01-10" },
  { id:"2", name:"Arjun AI",  role:"sales",        language:"english",  voice:"Arjun",  businessGoal:"Convert warm leads into paying customers",     status:"active",  callsToday:98,  callsTotal:2340, conversionRate:24, avgCallDuration:210, createdAt:"2026-01-15" },
  { id:"3", name:"Meera AI",  role:"recruiter",    language:"hindi",    voice:"Meera",  businessGoal:"Screen candidates and schedule interviews",     status:"active",  callsToday:67,  callsTotal:1890, conversionRate:18, avgCallDuration:156, createdAt:"2026-02-01" },
  { id:"4", name:"Ravi AI",   role:"collection",   language:"hindi",    voice:"Ravi",   businessGoal:"Recover overdue EMI payments politely",        status:"paused",  callsToday:0,   callsTotal:3102, conversionRate:41, avgCallDuration:98,  createdAt:"2026-01-20" },
  { id:"5", name:"Anjali AI", role:"receptionist", language:"english",  voice:"Anjali", businessGoal:"Handle inbound calls and route to right team",  status:"active",  callsToday:88,  callsTotal:5210, conversionRate:15, avgCallDuration:72,  createdAt:"2026-01-05" },
  { id:"6", name:"Dev AI",    role:"appointment_setter", language:"hinglish", voice:"Dev", businessGoal:"Book demos for SaaS product", status:"draft", callsToday:0, callsTotal:0, conversionRate:0, avgCallDuration:0, createdAt:"2026-08-28" },
];

const roleLabels: Record<AgentRole, string> = {
  telecaller:"Telecaller", recruiter:"Recruiter", receptionist:"Receptionist",
  collection:"Collection", sales:"Sales Agent", support:"Support",
  appointment_setter:"Appt. Setter",
};
const roleColors: Record<AgentRole, "blue"|"purple"|"cyan"|"orange"|"green"|"yellow"|"red"> = {
  telecaller:"blue", recruiter:"purple", receptionist:"cyan",
  collection:"orange", sales:"green", support:"yellow", appointment_setter:"red",
};
const langLabels: Record<Language,string> = {
  hindi:"Hindi", english:"English", hinglish:"Hinglish",
  tamil:"Tamil", telugu:"Telugu", marathi:"Marathi",
  bengali:"Bengali", gujarati:"Gujarati", kannada:"Kannada", punjabi:"Punjabi",
};

// ── Builder wizard steps ───────────────────────────────────────
const WIZARD_STEPS = ["Role & Goal","Voice & Language","Knowledge Base","Scripts","Review"];

const ROLE_OPTIONS = [
  { value:"telecaller",       label:"AI Telecaller",        icon:"📞", desc:"Outbound lead qualification & follow-up" },
  { value:"sales",            label:"AI Sales Agent",       icon:"💼", desc:"Lead nurturing & deal closing" },
  { value:"recruiter",        label:"AI Recruiter",         icon:"👥", desc:"Candidate screening & scheduling" },
  { value:"receptionist",     label:"AI Receptionist",      icon:"🎧", desc:"Inbound call handling & routing" },
  { value:"collection",       label:"AI Collection Agent",  icon:"💰", desc:"EMI reminders & payment recovery" },
  { value:"appointment_setter",label:"AI Appt. Setter",     icon:"📅", desc:"Calendar booking automation" },
  { value:"support",          label:"AI Support Agent",     icon:"🛠",  desc:"Customer help & FAQ resolution" },
];
const VOICE_OPTIONS = [
  { id:"priya",  name:"Priya",  lang:"Hindi/Hinglish", gender:"Female", sample:"Warm, professional" },
  { id:"arjun",  name:"Arjun",  lang:"English",        gender:"Male",   sample:"Confident, clear" },
  { id:"meera",  name:"Meera",  lang:"Hindi",          gender:"Female", sample:"Friendly, calm" },
  { id:"ravi",   name:"Ravi",   lang:"Hindi/Marathi",  gender:"Male",   sample:"Authoritative" },
  { id:"anjali", name:"Anjali", lang:"English/Hindi",  gender:"Female", sample:"Polished, crisp" },
  { id:"dev",    name:"Dev",    lang:"Hinglish",       gender:"Male",   sample:"Casual, upbeat" },
];
const LANG_OPTIONS = Object.entries(langLabels).map(([v,l])=>({value:v,label:l}));

function AgentBuilderModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name:"", role:"", goal:"", language:"english", voice:"",
    knowledgeBase:"", scripts:"", qualRules:"",
  });

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const canNext = () => {
    if (step === 0) return form.name.trim() && form.role && form.goal.trim();
    if (step === 1) return form.language && form.voice;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity:0, scale:0.95, y:20 }}
        animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.95, y:20 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card rounded-3xl border border-white/15 shadow-glass"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0d0d1f]/95 backdrop-blur-xl border-b border-white/[0.07] px-6 py-4 rounded-t-3xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Create AI Agent</h2>
              <p className="text-xs text-white/40">No-code agent builder</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all text-lg">×</button>
          </div>
          {/* Progress steps */}
          <div className="flex items-center gap-1">
            {WIZARD_STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all ${i < step ? "bg-green-500 text-white" : i === step ? "bg-brand-500 text-white" : "bg-white/10 text-white/30"}`}>
                  {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                {i < WIZARD_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full transition-all ${i < step ? "bg-green-500" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {WIZARD_STEPS.map((s, i) => (
              <span key={s} className={`text-[10px] ${i === step ? "text-brand-400 font-medium" : "text-white/25"}`}>{s}</span>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="p-6 space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}
              transition={{ duration:0.2 }}
            >
              {step === 0 && (
                <div className="space-y-5">
                  <Input label="Agent Name" placeholder="e.g. Priya AI" value={form.name} onChange={e=>set("name",e.target.value)} leftIcon={<Bot className="w-4 h-4"/>} />
                  <div>
                    <p className="text-sm font-medium text-white/70 mb-3">Agent Role</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLE_OPTIONS.map(r => (
                        <button key={r.value} onClick={()=>set("role",r.value)}
                          className={`p-3 rounded-xl border text-left transition-all ${form.role===r.value ? "border-brand-500/60 bg-brand-500/10 text-white" : "border-white/10 hover:border-white/25 text-white/60"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span>{r.icon}</span>
                            <span className="text-sm font-semibold">{r.label}</span>
                          </div>
                          <p className="text-xs text-white/40">{r.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <TextArea label="Business Goal" placeholder="Describe what this agent should achieve in calls..." value={form.goal} onChange={e=>set("goal",e.target.value)} rows={3} />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <Select label="Primary Language" options={LANG_OPTIONS} value={form.language} onChange={e=>set("language",e.target.value)} />
                  <div>
                    <p className="text-sm font-medium text-white/70 mb-3">Select Voice (ElevenLabs)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {VOICE_OPTIONS.map(v => (
                        <button key={v.id} onClick={()=>set("voice",v.id)}
                          className={`p-4 rounded-xl border text-left transition-all ${form.voice===v.id ? "border-brand-500/60 bg-brand-500/10" : "border-white/10 hover:border-white/25"}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">{v.name[0]}</div>
                            <div>
                              <p className="text-sm font-semibold text-white">{v.name}</p>
                              <p className="text-xs text-white/40">{v.gender}</p>
                            </div>
                          </div>
                          <p className="text-xs text-white/50">{v.lang}</p>
                          <p className="text-xs text-brand-400 mt-1">{v.sample}</p>
                          {form.voice===v.id && <WaveAnimation active size="sm" bars={5} color="bg-brand-400" className="mt-2" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-medium text-white/70 mb-2">Upload Knowledge Base</p>
                    <div className="border-2 border-dashed border-white/15 rounded-2xl p-8 text-center hover:border-brand-500/40 transition-all cursor-pointer group">
                      <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-brand-500/20 transition-all">
                        <Brain className="w-6 h-6 text-brand-400" />
                      </div>
                      <p className="text-sm font-medium text-white/70">Drop files or click to upload</p>
                      <p className="text-xs text-white/30 mt-1">PDF, DOCX, TXT — up to 50MB</p>
                    </div>
                  </div>
                  <TextArea label="Or paste text directly" placeholder="Paste your product info, FAQs, pricing, objection handlers..." value={form.knowledgeBase} onChange={e=>set("knowledgeBase",e.target.value)} rows={6} />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <TextArea label="Opening Script" placeholder="Hello {name}, I'm calling from {company}. Is this a good time?..." value={form.scripts} onChange={e=>set("scripts",e.target.value)} rows={4} />
                  <TextArea label="Qualification Rules" placeholder="Must have: Budget > ₹50K, Decision maker, Interested in [product]..." value={form.qualRules} onChange={e=>set("qualRules",e.target.value)} rows={4} />
                  <div className="glass-card rounded-xl p-4 border border-brand-500/20">
                    <p className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-brand-400"/>AI Script Enhancement</p>
                    <p className="text-xs text-white/50">AgentCall AI will automatically improve your scripts for higher conversions using GPT-4o.</p>
                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                      <div className="w-10 h-5 rounded-full bg-brand-500 relative"><div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" /></div>
                      <span className="text-xs text-white/60">Enable AI enhancement</span>
                    </label>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="glass-card rounded-2xl p-5 border border-green-500/20 bg-green-500/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold">{(form.name||"A")[0]}</div>
                      <div>
                        <p className="font-bold text-white">{form.name || "Unnamed Agent"}</p>
                        <p className="text-xs text-white/40">{form.role ? ROLE_OPTIONS.find(r=>r.value===form.role)?.label : "No role"}</p>
                      </div>
                      <Badge variant="green" dot className="ml-auto">Ready to Deploy</Badge>
                    </div>
                    {[
                      ["Language", langLabels[form.language as Language]||"English"],
                      ["Voice",    form.voice ? VOICE_OPTIONS.find(v=>v.id===form.voice)?.name : "—"],
                      ["Goal",     form.goal||"—"],
                    ].map(([k,v])=>(
                      <div key={k} className="flex gap-3 text-sm py-1.5 border-b border-white/[0.05] last:border-0">
                        <span className="text-white/40 w-24 flex-shrink-0">{k}</span>
                        <span className="text-white/80 truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-white/40 text-center">Your agent will be live within 2 minutes after deployment.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer buttons */}
        <div className="sticky bottom-0 bg-[#0d0d1f]/95 backdrop-blur-xl border-t border-white/[0.07] px-6 py-4 flex justify-between rounded-b-3xl">
          <Button variant="secondary" size="md" onClick={() => step > 0 ? setStep(s=>s-1) : onClose()}>
            {step === 0 ? "Cancel" : "← Back"}
          </Button>
          <Button variant="primary" size="md" disabled={!canNext()}
            onClick={() => step < WIZARD_STEPS.length-1 ? setStep(s=>s+1) : onClose()}>
            {step === WIZARD_STEPS.length-1 ? "🚀 Deploy Agent" : "Continue →"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Agent card ─────────────────────────────────────────────────
function AgentCard({ agent }: { agent: AIAgent }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <Card hover className="p-5 group relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-brand-sm">
            {agent.name[0]}
          </div>
          <div>
            <p className="font-bold text-white">{agent.name}</p>
            <Badge variant={roleColors[agent.role]} className="mt-0.5">{roleLabels[agent.role]}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={agent.status === "active" ? "green" : agent.status === "paused" ? "yellow" : "gray"} dot>
            {agent.status}
          </Badge>
          <div className="relative">
            <button onClick={()=>setMenuOpen(o=>!o)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all">
              <MoreHorizontal className="w-4 h-4"/>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-40 glass-card rounded-xl border border-white/10 shadow-glass z-20 overflow-hidden">
                {[
                  { icon:<Settings className="w-3.5 h-3.5"/>, label:"Edit Agent" },
                  { icon:<Copy className="w-3.5 h-3.5"/>,     label:"Duplicate" },
                  { icon:<Trash2 className="w-3.5 h-3.5 text-red-400"/>, label:"Delete", red:true },
                ].map(item=>(
                  <button key={item.label} onClick={()=>setMenuOpen(false)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-all ${item.red?"text-red-400":"text-white/70"}`}>
                    {item.icon}{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label:"Today", value:agent.callsToday, icon:<Phone className="w-3.5 h-3.5"/>, color:"text-brand-400" },
          { label:"Conv%", value:`${agent.conversionRate}%`, icon:<TrendingUp className="w-3.5 h-3.5"/>, color:"text-green-400" },
          { label:"Avg Min", value:`${Math.floor(agent.avgCallDuration/60)}:${(agent.avgCallDuration%60).toString().padStart(2,"0")}`, icon:<Mic2 className="w-3.5 h-3.5"/>, color:"text-purple-400" },
        ].map(s=>(
          <div key={s.label} className="bg-white/[0.03] rounded-xl p-2.5 text-center border border-white/[0.05]">
            <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
            <p className="text-sm font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-white/30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Language */}
      <div className="flex items-center gap-2 mb-4 text-xs text-white/40">
        <Globe2 className="w-3.5 h-3.5"/>
        <span>{langLabels[agent.language]}</span>
        {agent.status === "active" && <WaveAnimation active size="sm" bars={4} color="bg-brand-400" className="ml-auto"/>}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant={agent.status==="active"?"secondary":"primary"} size="sm" className="flex-1"
          icon={agent.status==="active" ? <Pause className="w-3.5 h-3.5"/> : <Play className="w-3.5 h-3.5"/>}>
          {agent.status==="active" ? "Pause" : "Activate"}
        </Button>
        <Button variant="ghost" size="sm" icon={<Settings className="w-3.5 h-3.5"/>}>Configure</Button>
      </div>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function AgentsPage() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? mockAgents : mockAgents.filter(a => a.status === filter);

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="AI Agents" subtitle="Build, configure and manage your AI workforce" action={{ label:"Create Agent", onClick:()=>setShowBuilder(true) }}/>

      <div className="flex-1 p-6 space-y-6">
        {/* Summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label:"Total Agents",  value:mockAgents.length,                           color:"text-white" },
            { label:"Active",        value:mockAgents.filter(a=>a.status==="active").length,  color:"text-green-400" },
            { label:"Calls Today",   value:mockAgents.reduce((s,a)=>s+a.callsToday,0), color:"text-brand-400" },
            { label:"Avg Conv Rate", value:`${(mockAgents.reduce((s,a)=>s+a.conversionRate,0)/mockAgents.length).toFixed(1)}%`, color:"text-purple-400" },
          ].map(s=>(
            <Card key={s.label} className="p-4 text-center">
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-white/40 mt-1">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {["all","active","paused","draft"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filter===f?"bg-brand-500 text-white":"text-white/40 hover:text-white"}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px] max-w-xs">
            <Input placeholder="Search agents..." leftIcon={<Search className="w-4 h-4"/>}/>
          </div>
          <Button variant="secondary" size="sm" icon={<Filter className="w-4 h-4"/>} iconRight={<ChevronDown className="w-3.5 h-3.5"/>}>Filter</Button>
        </div>

        {/* Agent grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(agent=><AgentCard key={agent.id} agent={agent}/>)}

          {/* Create new card */}
          <button onClick={()=>setShowBuilder(true)}
            className="glass-card rounded-2xl p-5 border-dashed border-white/15 hover:border-brand-500/40 hover:bg-brand-500/5 transition-all group flex flex-col items-center justify-center gap-3 min-h-[280px]">
            <div className="w-14 h-14 rounded-2xl bg-white/5 group-hover:bg-brand-500/10 border border-white/10 group-hover:border-brand-500/30 flex items-center justify-center transition-all">
              <Plus className="w-7 h-7 text-white/30 group-hover:text-brand-400 transition-all"/>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white/50 group-hover:text-white transition-colors">Create New Agent</p>
              <p className="text-xs text-white/25 mt-1">No-code builder</p>
            </div>
          </button>
        </div>
      </div>

      {/* Builder modal */}
      <AnimatePresence>
        {showBuilder && <AgentBuilderModal onClose={()=>setShowBuilder(false)}/>}
      </AnimatePresence>
    </div>
  );
}
