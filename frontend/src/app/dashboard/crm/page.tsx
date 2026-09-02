"use client";
import { useState } from "react";
import {
  Plus, Search, Filter, MoreHorizontal, Phone, Mail, Star,
  ChevronDown, ArrowUpDown, Tag, Clock, User, SlidersHorizontal,
  CheckCircle2, XCircle, Calendar, MessageSquare, Activity,
  TrendingUp, Users, Target, DollarSign,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TopBar }   from "@/components/dashboard/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge }    from "@/components/ui/Badge";
import { Button }   from "@/components/ui/Button";
import { Input }    from "@/components/ui/Input";
import type { Lead, LeadStatus } from "@/types";

// ── Mock data ───────────────────────────────────────────────────
const PIPELINE_STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id:"new",         label:"New Lead",    color:"bg-white/10 border-white/20" },
  { id:"contacted",   label:"Contacted",   color:"bg-brand-500/15 border-brand-500/30" },
  { id:"interested",  label:"Interested",  color:"bg-cyan-500/15 border-cyan-500/30" },
  { id:"qualified",   label:"Qualified",   color:"bg-purple-500/15 border-purple-500/30" },
  { id:"appointment", label:"Appointment", color:"bg-yellow-500/15 border-yellow-500/30" },
  { id:"closed_won",  label:"Won ✓",       color:"bg-green-500/15 border-green-500/30" },
  { id:"closed_lost", label:"Lost",        color:"bg-red-500/15 border-red-500/30" },
];

const statusVariant: Record<LeadStatus, "gray"|"blue"|"cyan"|"purple"|"yellow"|"green"|"red"> = {
  new:"gray", contacted:"blue", interested:"cyan", qualified:"purple",
  appointment:"yellow", closed_won:"green", closed_lost:"red",
};

const mockLeads: Lead[] = [
  { id:"1",  name:"Rahul Sharma",   phone:"+91 98765 43210", email:"rahul@acmecorp.com",  company:"Acme Corp",    status:"qualified",   score:87, assignedAgent:"Priya AI", lastContact:"2h ago",  createdAt:"2026-08-25" },
  { id:"2",  name:"Anita Patel",    phone:"+91 87654 32109", email:"anita@startupxyz.in", company:"Startup XYZ",  status:"interested",  score:72, assignedAgent:"Arjun AI", lastContact:"30m ago", createdAt:"2026-08-26" },
  { id:"3",  name:"Vikram Singh",   phone:"+91 76543 21098", email:"vikram@infosys.com",  company:"Infosys",      status:"appointment", score:91, assignedAgent:"Meera AI", lastContact:"1h ago",  createdAt:"2026-08-24" },
  { id:"4",  name:"Sunita Gupta",   phone:"+91 65432 10987", email:"sunita@tcs.com",      company:"TCS",          status:"contacted",   score:58, assignedAgent:"Priya AI", lastContact:"3h ago",  createdAt:"2026-08-27" },
  { id:"5",  name:"Manish Kumar",   phone:"+91 54321 09876", email:"manish@wipro.com",    company:"Wipro",        status:"new",         score:45, assignedAgent:undefined,  lastContact:undefined, createdAt:"2026-08-28" },
  { id:"6",  name:"Priya Nair",     phone:"+91 43210 98765", email:"priya@hcl.com",       company:"HCL",          status:"closed_won",  score:95, assignedAgent:"Arjun AI", lastContact:"1d ago",  createdAt:"2026-08-20" },
  { id:"7",  name:"Amit Joshi",     phone:"+91 32109 87654", email:"amit@bajaj.com",      company:"Bajaj Finance", status:"qualified",  score:80, assignedAgent:"Ravi AI",  lastContact:"5h ago",  createdAt:"2026-08-22" },
  { id:"8",  name:"Deepa Reddy",    phone:"+91 21098 76543", email:"deepa@hdfc.com",      company:"HDFC",         status:"closed_lost", score:30, assignedAgent:"Priya AI", lastContact:"2d ago",  createdAt:"2026-08-18" },
];

// ── Score indicator ────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width:`${score}%` }}/>
      </div>
      <span className="text-xs font-semibold text-white/60">{score}</span>
    </div>
  );
}

// ── Lead detail panel ──────────────────────────────────────────
function LeadPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview"|"activity"|"notes">("overview");
  const stage = PIPELINE_STAGES.find(s => s.id === lead.status);

  return (
    <motion.div
      initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:40 }}
      className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-[#0d0d1f] border-l border-white/[0.07] z-40 overflow-y-auto shadow-2xl"
    >
      {/* Header */}
      <div className="sticky top-0 bg-[#0d0d1f] border-b border-white/[0.07] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white">Lead Details</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all text-lg">×</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
            {lead.name[0]}
          </div>
          <div>
            <p className="font-bold text-white">{lead.name}</p>
            <p className="text-sm text-white/50">{lead.company}</p>
          </div>
          <Badge variant={statusVariant[lead.status]} dot className="ml-auto text-xs">
            {stage?.label}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.07]">
        {(["overview","activity","notes"] as const).map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)}
            className={`flex-1 py-3 text-xs font-medium capitalize transition-all ${activeTab===t?"text-brand-400 border-b-2 border-brand-500":"text-white/40 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-5">
        {activeTab === "overview" && (
          <>
            {/* Contact info */}
            <div className="space-y-3">
              {[
                { icon:<Phone className="w-4 h-4"/>,   label:"Phone",   value:lead.phone },
                { icon:<Mail className="w-4 h-4"/>,    label:"Email",   value:lead.email||"—" },
                { icon:<User className="w-4 h-4"/>,    label:"Agent",   value:lead.assignedAgent||"Unassigned" },
                { icon:<Clock className="w-4 h-4"/>,   label:"Last Contact", value:lead.lastContact||"Never" },
              ].map(item=>(
                <div key={item.label} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 flex-shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-xs text-white/30">{item.label}</p>
                    <p className="text-white/80 font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Score */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">Lead Score</p>
                <span className={`text-xl font-extrabold ${lead.score >= 80 ? "text-green-400" : lead.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>{lead.score}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${lead.score >= 80 ? "bg-green-500" : lead.score >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{width:`${lead.score}%`}}/>
              </div>
            </div>

            {/* Pipeline stage */}
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Move to Stage</p>
              <div className="flex flex-wrap gap-2">
                {PIPELINE_STAGES.map(s=>(
                  <button key={s.id}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${lead.status===s.id?s.color+" text-white":"border-white/10 text-white/40 hover:border-white/25 hover:text-white"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="primary" size="sm" icon={<Phone className="w-3.5 h-3.5"/>} className="w-full">Call Now</Button>
              <Button variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5"/>} className="w-full">WhatsApp</Button>
              <Button variant="secondary" size="sm" icon={<Calendar className="w-3.5 h-3.5"/>} className="w-full">Schedule</Button>
              <Button variant="secondary" size="sm" icon={<Mail className="w-3.5 h-3.5"/>} className="w-full">Email</Button>
            </div>
          </>
        )}

        {activeTab === "activity" && (
          <div className="space-y-3">
            {[
              { icon:<Phone className="w-4 h-4 text-brand-400"/>,        text:"Call completed — 3:24 mins",         time:"2h ago",  type:"call" },
              { icon:<CheckCircle2 className="w-4 h-4 text-green-400"/>, text:"Lead marked as Qualified",            time:"2h ago",  type:"status" },
              { icon:<MessageSquare className="w-4 h-4 text-cyan-400"/>, text:"WhatsApp brochure sent",              time:"2.5h ago",type:"message" },
              { icon:<Activity className="w-4 h-4 text-purple-400"/>,    text:"Score updated: 72 → 87",              time:"3h ago",  type:"score" },
              { icon:<Phone className="w-4 h-4 text-brand-400"/>,        text:"First call — no answer",              time:"1d ago",  type:"call" },
              { icon:<User className="w-4 h-4 text-white/40"/>,          text:"Lead created from CSV import",        time:"3d ago",  type:"system" },
            ].map((a,i)=>(
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">{a.icon}</div>
                <div>
                  <p className="text-sm text-white/70">{a.text}</p>
                  <p className="text-xs text-white/30">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-3">
            <textarea
              placeholder="Add a note..."
              rows={4}
              className="w-full rounded-xl border bg-white/5 border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-500/60 resize-none"
            />
            <Button variant="primary" size="sm">Save Note</Button>
            {lead.notes && (
              <div className="glass-card rounded-xl p-3 text-sm text-white/70">{lead.notes}</div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Page ────────────────────────────────────────────────────────
export default function CRMPage() {
  const [view,    setView]    = useState<"list"|"kanban">("list");
  const [selected,setSelected] = useState<Lead|null>(null);
  const [search,  setSearch]  = useState("");

  const filtered = mockLeads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.company||"").toLowerCase().includes(search.toLowerCase())
  );

  // Pipeline counts
  const pipelineCounts = PIPELINE_STAGES.reduce((acc, s) => {
    acc[s.id] = mockLeads.filter(l => l.status === s.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="CRM — Lead Management" subtitle={`${mockLeads.length} leads in pipeline`} action={{ label:"Add Lead", onClick:()=>{} }}/>

      <div className="flex-1 p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label:"Total Leads",    value:mockLeads.length,                                        icon:<Users className="w-5 h-5"/>,    color:"bg-brand-500/20 text-brand-400" },
            { label:"Qualified",      value:mockLeads.filter(l=>l.status==="qualified").length,     icon:<Target className="w-5 h-5"/>,   color:"bg-purple-500/20 text-purple-400" },
            { label:"Won This Month", value:mockLeads.filter(l=>l.status==="closed_won").length,    icon:<CheckCircle2 className="w-5 h-5"/>, color:"bg-green-500/20 text-green-400" },
            { label:"Pipeline Value", value:"₹12.4L",                                              icon:<DollarSign className="w-5 h-5"/>, color:"bg-orange-500/20 text-orange-400" },
          ].map(s=>(
            <Card key={s.label} className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${s.color}`}>{s.icon}</div>
                <div>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-white/40">{s.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Pipeline overview */}
        <Card className="p-5">
          <CardHeader>
            <CardTitle>Pipeline Overview</CardTitle>
          </CardHeader>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {PIPELINE_STAGES.map(s=>(
              <div key={s.id} className={`flex-shrink-0 px-4 py-3 rounded-xl border ${s.color} text-center min-w-[110px]`}>
                <p className="text-lg font-bold text-white">{pipelineCounts[s.id]||0}</p>
                <p className="text-xs text-white/60 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search leads..." leftIcon={<Search className="w-4 h-4"/>}/>
          </div>
          <Button variant="secondary" size="sm" icon={<Filter className="w-4 h-4"/>} iconRight={<ChevronDown className="w-3.5 h-3.5"/>}>Filter</Button>
          <Button variant="secondary" size="sm" icon={<ArrowUpDown className="w-4 h-4"/>}>Sort</Button>
          <Button variant="secondary" size="sm" icon={<SlidersHorizontal className="w-4 h-4"/>}>Columns</Button>
          <div className="ml-auto flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {(["list","kanban"] as const).map(v=>(
              <button key={v} onClick={()=>setView(v)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${view===v?"bg-brand-500 text-white":"text-white/40 hover:text-white"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Table / Kanban */}
        {view === "list" ? (
          <Card padding="none" className="overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th><th>Company</th><th>Status</th><th>Score</th>
                  <th>Assigned Agent</th><th>Last Contact</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead=>(
                  <tr key={lead.id} className="cursor-pointer" onClick={()=>setSelected(lead)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500/60 to-purple-500/60 flex items-center justify-center text-xs font-bold text-white">{lead.name[0]}</div>
                        <div>
                          <p className="font-medium text-white">{lead.name}</p>
                          <p className="text-xs text-white/40">{lead.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="text-white/70">{lead.company||"—"}</span></td>
                    <td><Badge variant={statusVariant[lead.status]} dot className="text-xs">{PIPELINE_STAGES.find(s=>s.id===lead.status)?.label}</Badge></td>
                    <td><ScoreBar score={lead.score}/></td>
                    <td>
                      {lead.assignedAgent
                        ? <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-brand-500/40 flex items-center justify-center text-[10px] text-white">{lead.assignedAgent[0]}</div><span className="text-xs text-white/60">{lead.assignedAgent}</span></div>
                        : <span className="text-xs text-white/25">Unassigned</span>
                      }
                    </td>
                    <td><span className="text-xs text-white/40">{lead.lastContact||"—"}</span></td>
                    <td>
                      <div className="flex items-center gap-1.5" onClick={e=>e.stopPropagation()}>
                        <button className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-brand-400 transition-all"><Phone className="w-3.5 h-3.5"/></button>
                        <button className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all"><MoreHorizontal className="w-3.5 h-3.5"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map(stage=>{
              const stageLeads = filtered.filter(l=>l.status===stage.id);
              return (
                <div key={stage.id} className="flex-shrink-0 w-64">
                  <div className={`mb-3 px-3 py-2 rounded-xl border ${stage.color} flex items-center justify-between`}>
                    <span className="text-sm font-semibold text-white">{stage.label}</span>
                    <Badge variant="gray" className="text-xs">{stageLeads.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {stageLeads.map(lead=>(
                      <div key={lead.id} onClick={()=>setSelected(lead)}
                        className="glass-card rounded-xl p-3 cursor-pointer hover:border-brand-500/30 transition-all">
                        <p className="text-sm font-semibold text-white mb-1">{lead.name}</p>
                        <p className="text-xs text-white/40 mb-2">{lead.company}</p>
                        <div className="flex items-center justify-between">
                          <ScoreBar score={lead.score}/>
                          {lead.assignedAgent&&<span className="text-[10px] text-white/30">{lead.assignedAgent}</span>}
                        </div>
                      </div>
                    ))}
                    <button className="w-full p-2 rounded-xl border border-dashed border-white/10 text-xs text-white/30 hover:border-brand-500/30 hover:text-brand-400 transition-all flex items-center justify-center gap-1.5">
                      <Plus className="w-3.5 h-3.5"/>Add lead
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lead detail panel */}
      <AnimatePresence>
        {selected && <LeadPanel lead={selected} onClose={()=>setSelected(null)}/>}
      </AnimatePresence>
    </div>
  );
}
