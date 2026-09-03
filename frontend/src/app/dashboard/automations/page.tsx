"use client";
import { useState } from "react";
import {
  Zap, Plus, CheckCircle2, AlertCircle, ArrowRight,
  MessageSquare, Mail, Webhook, PhoneCall, RefreshCw,
  Trash2, Play, Pause, Filter, Settings, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AutomationRule {
  id: string;
  name: string;
  trigger: "call_completed" | "lead_qualified" | "call_missed" | "deal_closed";
  action: "whatsapp" | "sms" | "email" | "webhook" | "crm_update";
  status: "active" | "paused";
  executions: number;
  lastRun: string;
  template: string;
}

const INITIAL_RULES: AutomationRule[] = [
  {
    id: "rule-1",
    name: "Instant WhatsApp Brochure on Qualified Lead",
    trigger: "lead_qualified",
    action: "whatsapp",
    status: "active",
    executions: 847,
    lastRun: "12m ago",
    template: "Hi {{lead_name}}, thank you for speaking with Priya AI! Here is our enterprise product overview...",
  },
  {
    id: "rule-2",
    name: "SMS Follow-up on Missed Inbound Call",
    trigger: "call_missed",
    action: "sms",
    status: "active",
    executions: 412,
    lastRun: "25m ago",
    template: "Sorry we missed your call! When is a good time for our AI assistant to ring you back?",
  },
  {
    id: "rule-3",
    name: "CRM Webhook Sync to Salesforce / HubSpot",
    trigger: "call_completed",
    action: "webhook",
    status: "active",
    executions: 2847,
    lastRun: "2m ago",
    template: "POST https://api.hubspot.com/crm/v3/objects/contacts/sync",
  },
  {
    id: "rule-4",
    name: "Confirmation Email with Meeting Calendar Invite",
    trigger: "deal_closed",
    action: "email",
    status: "paused",
    executions: 134,
    lastRun: "1d ago",
    template: "Demo scheduled with Acme team. Google Meet invite attached.",
  },
];

const TRIGGER_LABELS: Record<string, { label: string; color: string }> = {
  call_completed: { label: "Call Completed", color: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border-blue-500/30" },
  lead_qualified: { label: "Lead Qualified (Score > 75)", color: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 border-purple-500/30" },
  call_missed:    { label: "Call Missed / No Answer", color: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border-amber-500/30" },
  deal_closed:    { label: "Appointment Booked", color: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-500/30" },
};

const ACTION_ICONS: Record<string, { icon: any; label: string; color: string }> = {
  whatsapp:   { icon: MessageSquare, label: "WhatsApp Message", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  sms:        { icon: PhoneCall,     label: "SMS Text",        color: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10" },
  email:      { icon: Mail,          label: "Email Notice",    color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  webhook:    { icon: Webhook,       label: "Webhook Dispatch",color: "text-brand-600 dark:text-brand-400 bg-brand-500/10" },
  crm_update: { icon: RefreshCw,     label: "CRM Property",    color: "text-purple-600 dark:text-purple-400 bg-purple-500/10" },
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>(INITIAL_RULES);
  const [showModal, setShowModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    trigger: "lead_qualified" as any,
    action: "whatsapp" as any,
    template: "",
  });

  const toggleStatus = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, status: r.status === "active" ? "paused" : "active" } : r));
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name.trim()) return;

    const created: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name,
      trigger: newRule.trigger,
      action: newRule.action,
      status: "active",
      executions: 0,
      lastRun: "Just created",
      template: newRule.template || "Standard automated trigger template",
    };

    setRules([created, ...rules]);
    setShowModal(false);
    setNewRule({ name: "", trigger: "lead_qualified", action: "whatsapp", template: "" });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Post-Call Automations</h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Configure event-driven triggers that execute automatically when calls conclude.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-red text-xs py-2 px-4 h-9 shadow-lg shadow-brand-500/25 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Automation
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Workflows", value: rules.filter(r => r.status === "active").length, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Total Triggers Sent", value: "4,240", color: "text-brand-600 dark:text-brand-400" },
          { label: "Delivery Success Rate", value: "99.4%", color: "text-cyan-600 dark:text-cyan-400" },
          { label: "Average Latency", value: "1.2s", color: "text-purple-600 dark:text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm">
            <p className={`text-2xl font-mono font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Configured Rules</h2>

        <div className="space-y-3">
          {rules.map((rule) => {
            const triggerInfo = TRIGGER_LABELS[rule.trigger] || { label: rule.trigger, color: "bg-white/10 text-white" };
            const actionInfo = ACTION_ICONS[rule.action] || { icon: Zap, label: rule.action, color: "text-white" };
            const ActionIcon = actionInfo.icon;

            return (
              <div
                key={rule.id}
                className="rounded-2xl p-5 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] hover:border-brand-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl ${actionInfo.color} flex-shrink-0 mt-0.5`}>
                    <ActionIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{rule.name}</h3>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${triggerInfo.color}`}>
                        IF: {triggerInfo.label}
                      </span>
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/70 border border-slate-200 dark:border-white/10">
                        THEN: {actionInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-1.5 line-clamp-1 max-w-xl font-mono">
                      {rule.template}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-auto flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-white/[0.05] w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">{rule.executions.toLocaleString()} sent</p>
                    <p className="text-[10px] text-slate-500 dark:text-white/40">{rule.lastRun}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStatus(rule.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        rule.status === "active"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/40 border border-slate-200 dark:border-white/10"
                      }`}
                    >
                      {rule.status === "active" ? "Active" : "Paused"}
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-white/30 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#140204] border border-slate-200 dark:border-white/15 rounded-3xl p-6 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Automation</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-lg">×</button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-white/70 block mb-1.5">Rule Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Send WhatsApp Catalog on High Intent"
                    value={newRule.name}
                    onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                    className="w-full h-10 rounded-xl px-3 text-sm bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-white/70 block mb-1.5">When (Trigger)</label>
                    <select
                      value={newRule.trigger}
                      onChange={e => setNewRule({ ...newRule, trigger: e.target.value as any })}
                      className="w-full h-10 rounded-xl px-3 text-xs bg-slate-100 dark:bg-[#1a0406] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                    >
                      <option value="lead_qualified">Lead Qualified</option>
                      <option value="call_completed">Call Completed</option>
                      <option value="call_missed">Call Missed</option>
                      <option value="deal_closed">Appointment Booked</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-white/70 block mb-1.5">Then (Action)</label>
                    <select
                      value={newRule.action}
                      onChange={e => setNewRule({ ...newRule, action: e.target.value as any })}
                      className="w-full h-10 rounded-xl px-3 text-xs bg-slate-100 dark:bg-[#1a0406] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                    >
                      <option value="whatsapp">Send WhatsApp</option>
                      <option value="sms">Send SMS Text</option>
                      <option value="email">Send Email</option>
                      <option value="webhook">Trigger Webhook</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-white/70 block mb-1.5">Message / Payload Template</label>
                  <textarea
                    rows={3}
                    placeholder="Hi {{lead_name}}, your appointment with {{agent_name}} has been confirmed for..."
                    value={newRule.template}
                    onChange={e => setNewRule({ ...newRule, template: e.target.value })}
                    className="w-full rounded-xl p-3 text-xs bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-white/40 block mt-1">Available variables: {"{{lead_name}}"}, {"{{agent_name}}"}, {"{{call_duration}}"}</span>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-red text-xs py-2 px-5 h-9"
                  >
                    Save & Activate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
