"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Zap, Plus, CheckCircle2, AlertCircle,
  MessageSquare, Mail, Webhook, PhoneCall, RefreshCw,
  Trash2, Loader2, Play, Eye, Clock, Check, X, ShieldAlert,
  Send, ChevronLeft, ChevronRight, HelpCircle, Layers,
  Smartphone, CheckCheck, SendHorizontal, Sparkles, Bot, Smile,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  automationsApi,
  AutomationRule,
  AutomationCondition,
  AutomationLogItem,
  ProviderStatusItem,
} from "@/lib/api";
import { ProviderModeBadge, deriveAutomationProviderMode } from "@/components/ui/ProviderModeBadge";

const TRIGGER_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  call_completed:          { label: "Call Completed", color: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border-blue-500/30", desc: "Fires immediately when telephony terminates" },
  call_analysis_completed: { label: "AI Analysis Completed", color: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 border-indigo-500/30", desc: "Fires when Gemini generates scores and intent" },
  lead_qualified:          { label: "Lead Qualified (Score >= 75)", color: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-500/30", desc: "Fires when lead meets criteria" },
  lead_disqualified:        { label: "Lead Disqualified", color: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 border-rose-500/30", desc: "Fires when lead fails qualification criteria" },
  appointment_detected:    { label: "Appointment Detected", color: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 border-purple-500/30", desc: "Fires when caller agrees to an appointment" },
  call_missed:             { label: "Call Missed / No Answer", color: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border-amber-500/30", desc: "Fires when lead does not answer or call fails" },
  campaign_lead_completed: { label: "Campaign Lead Completed", color: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400 border-cyan-500/30", desc: "Fires when campaign worker finishes call" },
  deal_closed:             { label: "Deal Closed / Won", color: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-500/30", desc: "Fires on CRM deal closure" },
};

const ACTION_ICONS: Record<string, { icon: any; label: string; color: string }> = {
  whatsapp:      { icon: MessageSquare, label: "Meta WhatsApp", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  send_whatsapp: { icon: MessageSquare, label: "Meta WhatsApp", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  email:         { icon: Mail,          label: "Resend Email",   color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  send_email:    { icon: Mail,          label: "Resend Email",   color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  sms:           { icon: PhoneCall,     label: "SMS Text",       color: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10" },
  webhook:       { icon: Webhook,       label: "Webhook Dispatch", color: "text-brand-600 dark:text-brand-400 bg-brand-500/10" },
  crm_update:    { icon: RefreshCw,     label: "CRM Sync",       color: "text-purple-600 dark:text-purple-400 bg-purple-500/10" },
};

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ProviderStatusStat({ title, status }: { title: string; status?: ProviderStatusItem }) {
  const mode = deriveAutomationProviderMode(status || null);
  const label =
    status?.state === "mock_mode"
      ? "Mock mode active"
      : status?.state === "connected"
        ? "Connected"
        : status?.state === "configured"
          ? "Configured"
          : status?.state === "not_connected"
            ? "Not configured"
            : status?.isMock
              ? "Mock mode active"
              : undefined;
  return (
    <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5 truncate">
          {status?.phoneNumberId ? status.phoneNumberId : status?.from || "No provider detail"}
        </p>
      </div>
      <ProviderModeBadge mode={mode} label={label} />
    </div>
  );
}

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLogItem[]>([]);
  const [providers, setProviders] = useState<ProviderStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Omnichannel Post-Call Hub State
  const [activeSection, setActiveSection] = useState<"omnichannel" | "rules" | "logs">("omnichannel");
  const [omniChannel, setOmniChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [omniTrigger, setOmniTrigger] = useState<string>("appointment_detected");
  const [omniCustomerName, setOmniCustomerName] = useState("Vikram Malhotra");
  const [omniAgentName, setOmniAgentName] = useState("Sophia (AI Concierge)");
  const [omniAppointmentTime, setOmniAppointmentTime] = useState("Tomorrow, 3:30 PM IST");
  const [omniCalendarLink, setOmniCalendarLink] = useState("https://cal.com/agentcall/consultation");
  const [omniTemplate, setOmniTemplate] = useState(
    "Hi {{customer_name}}, this is {{agent_name}} following up on our call! Your consultation is confirmed for {{appointment_time}}.\n\nMeeting Details & Calendar invite: {{calendar_link}}\n\nReply YES to confirm or let us know if you need to reschedule."
  );
  const [omniMessages, setOmniMessages] = useState<Array<{ sender: "bot" | "customer"; text: string; time: string; status?: "read" | "delivered" | "sent" }>>([
    {
      sender: "bot",
      text: "Hi Vikram Malhotra, this is Sophia (AI Concierge) following up on our call! Your consultation is confirmed for Tomorrow, 3:30 PM IST.\n\nMeeting Details & Calendar invite: https://cal.com/agentcall/consultation\n\nReply YES to confirm or let us know if you need to reschedule.",
      time: "10:42 AM",
      status: "read",
    },
    {
      sender: "customer",
      text: "YES! Confirmed. Could we also invite my co-founder at rajesh@nexus.io?",
      time: "10:44 AM",
    },
    {
      sender: "bot",
      text: "Added Rajesh to the calendar invite! Looking forward to connecting tomorrow at 3:30 PM.",
      time: "10:45 AM",
      status: "read",
    }
  ]);
  const [customerReplyInput, setCustomerReplyInput] = useState("");
  const [isSimulatingSend, setIsSimulatingSend] = useState(false);
  const [omniDispatchSuccess, setOmniDispatchSuccess] = useState(false);

  const getRenderedOmniMessage = () => {
    return omniTemplate
      .replace(/\{\{customer_name\}\}/g, omniCustomerName)
      .replace(/\{\{agent_name\}\}/g, omniAgentName)
      .replace(/\{\{appointment_time\}\}/g, omniAppointmentTime)
      .replace(/\{\{calendar_link\}\}/g, omniCalendarLink);
  };

  const handleSendReply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customerReplyInput.trim()) return;
    const newMsg = {
      sender: "customer" as const,
      text: customerReplyInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setOmniMessages((prev) => [...prev, newMsg]);
    setCustomerReplyInput("");

    setIsSimulatingSend(true);
    setTimeout(() => {
      setIsSimulatingSend(false);
      setOmniMessages((prev) => [
        ...prev,
        {
          sender: "bot" as const,
          text: "Thanks for the update! Our voice agent has automatically logged this preference in your CRM file.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: "delivered" as const,
        }
      ]);
    }, 900);
  };

  const handleTestOmniDispatch = () => {
    setOmniDispatchSuccess(true);
    setOmniMessages((prev) => [
      ...prev,
      {
        sender: "bot" as const,
        text: getRenderedOmniMessage(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "delivered" as const,
      }
    ]);
    setTimeout(() => setOmniDispatchSuccess(false), 3000);
  };

  // Pagination for logs
  const [logPage, setLogPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4>(1);
  const [saving, setSaving] = useState(false);

  // New Rule Form State
  const [newRule, setNewRule] = useState<{
    name: string;
    trigger: string;
    action: string;
    template: string;
    conditions: AutomationCondition[];
  }>({
    name: "",
    trigger: "call_analysis_completed",
    action: "send_whatsapp",
    template: "Hi {{lead.name}}, thanks for speaking with us today! Following up on our discussion regarding {{lead.company}}.",
    conditions: [{ field: "leadScore", operator: ">=", value: 75 }],
  });

  // Dry-run preview state
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    conditionsMet: boolean;
    renderedMessage: string;
    contextUsed: any;
  } | null>(null);

  // Test Action Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testActionData, setTestActionData] = useState({
    actionType: "send_whatsapp" as "send_whatsapp" | "send_email",
    destination: "+919876543210",
    message: "Test message from AgentCall AI CRM Automation Engine.",
    subject: "AgentCall AI Test Notification",
  });
  const [testSending, setTestSending] = useState(false);

  const loadRulesAndProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rulesData, provsData] = await Promise.all([
        automationsApi.listRules(),
        automationsApi.getProviderStatuses().catch(() => []),
      ]);
      setRules(rulesData);
      setProviders(provsData);
    } catch {
      setError("Could not load automation rules. Please verify backend connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async (page = 1) => {
    setLogsLoading(true);
    try {
      const data = await automationsApi.getLogs({ page, limit: 10 });
      setLogs(data.items);
      setTotalLogs(data.total);
      setLogPage(data.page);
    } catch {
      // Offline fallback
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRulesAndProviders();
    loadLogs(1);
  }, [loadRulesAndProviders, loadLogs]);

  const toggleStatus = async (rule: AutomationRule) => {
    try {
      await automationsApi.toggleRule(rule.id, rule.status === "active" ? "paused" : "active");
      await loadRulesAndProviders();
    } catch {
      setError("Could not update the rule status.");
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await automationsApi.deleteRule(id);
      await loadRulesAndProviders();
    } catch {
      setError("Could not delete the rule.");
    }
  };

  const handleRunPreview = async () => {
    setDryRunLoading(true);
    try {
      const res = await automationsApi.dryRun({
        trigger: newRule.trigger,
        template: newRule.template,
        conditions: newRule.conditions,
      });
      setPreviewResult(res);
    } catch {
      setPreviewResult({
        conditionsMet: true,
        renderedMessage: newRule.template.replace(/\{\{lead\.name\}\}/g, "Alex Mercer"),
        contextUsed: { sample: "offline preview" },
      });
    } finally {
      setDryRunLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name.trim() || saving) return;
    setSaving(true);
    try {
      await automationsApi.createRule({
        name: newRule.name,
        trigger: newRule.trigger as any,
        action: newRule.action as any,
        template: newRule.template,
        conditions: newRule.conditions,
        status: "active",
      });
      setShowModal(false);
      setModalStep(1);
      setNewRule({
        name: "",
        trigger: "call_analysis_completed",
        action: "send_whatsapp",
        template: "Hi {{lead.name}}, thanks for connecting with us!",
        conditions: [{ field: "leadScore", operator: ">=", value: 75 }],
      });
      setSuccessMsg("Automation rule activated successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadRulesAndProviders();
    } catch {
      setError("Could not create automation rule.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testActionData.destination.trim() || testSending) return;
    setTestSending(true);
    try {
      const res = await automationsApi.testAction(testActionData);
      setShowTestModal(false);
      setSuccessMsg(`Test message enqueued (Job: ${res.jobId.slice(0, 8)})!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadLogs(1);
    } catch (err: any) {
      setError("Failed to enqueue test message. Please verify provider settings.");
    } finally {
      setTestSending(false);
    }
  };

  const totalSent = rules.reduce((sum, r) => sum + r.executions, 0);
  const activeCount = rules.filter(r => r.status === "active").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">CRM Automation Engine</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">Phase 3</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Event-driven WhatsApp & Email messaging with declarative condition evaluation and safe variable templating.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTestModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center gap-1.5 transition-all"
          >
            <Send className="w-3.5 h-3.5 text-brand-500" />
            Send Test
          </button>
          <button
            onClick={() => { setShowModal(true); setModalStep(1); }}
            className="btn-red text-xs py-2 px-4 h-9 shadow-lg shadow-brand-500/25 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Automation
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
          <button onClick={() => setError(null)} className="text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {successMsg}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Workflows", value: `${activeCount} / ${rules.length}`, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Triggers Executed", value: totalSent.toLocaleString(), color: "text-brand-600 dark:text-brand-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm">
            <p className={`text-xl font-mono font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-1">{s.label}</p>
          </div>
        ))}

        {/* Engine status: explicit Mock / Configured / Connected / Not configured state */}
        <ProviderStatusStat
          title="WhatsApp Engine"
          status={providers.find((p) => p.provider === "whatsapp")}
        />
        <ProviderStatusStat
          title="Email Engine"
          status={providers.find((p) => p.provider === "resend")}
        />
      </div>

      {/* Navigation Switcher Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-6 text-sm overflow-x-auto">
        {[
          { id: "omnichannel", label: "Omnichannel Post-Call Hub (WhatsApp & SMS)", icon: MessageSquare },
          { id: "rules", label: "Configured Automation Rules", icon: Layers },
          { id: "logs", label: "Execution & Delivery Audit Logs", icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              className={`pb-3 font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? "text-brand-600 dark:text-white"
                  : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-brand-500" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: OMNICHANNEL POST-CALL HUB */}
      {activeSection === "omnichannel" && (
        <div className="space-y-6">
          
          {/* Header Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-brand-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Post-Call WhatsApp & SMS Automation Studio</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    2-Way Messaging Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                  Trigger automated personalized WhatsApp & SMS messages the moment a call ends with interactive 2-way replies.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestOmniDispatch}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch Live Test Message
            </button>
          </div>

          {omniDispatchSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-xs flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Automated message dispatched to <strong>{omniCustomerName}</strong>! See live delivery status in phone preview below.</span>
            </div>
          )}

          {/* Studio Grid: Config on Left, Smartphone Simulator on Right */}
          <div className="grid lg:grid-cols-12 gap-6">

            {/* Left: Template & Trigger Configuration (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Trigger & Channel Card */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-white/70 block mb-1.5">
                      Call Lifecycle Trigger Event
                    </label>
                    <select
                      value={omniTrigger}
                      onChange={(e) => setOmniTrigger(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    >
                      <option value="appointment_detected">Appointment Scheduled on Calendar</option>
                      <option value="lead_qualified">Lead Qualified (Score &ge; 75)</option>
                      <option value="call_missed">Call Missed / Callback Requested</option>
                      <option value="call_completed">Standard Post-Call Follow-up</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-white/70 block mb-1.5">
                      Dispatch Channel
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOmniChannel("whatsapp")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                          omniChannel === "whatsapp"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm"
                            : "bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Meta WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => setOmniChannel("sms")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                          omniChannel === "sms"
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-400 shadow-sm"
                            : "bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500"
                        }`}
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Twilio SMS
                      </button>
                    </div>
                  </div>
                </div>

                {/* Variable Token Inserter */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/70">
                      Insert Dynamic Personalization Tokens
                    </label>
                    <span className="text-[10px] text-slate-400">Click pill to inject</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { key: "customer_name", label: "{{customer_name}}" },
                      { key: "agent_name", label: "{{agent_name}}" },
                      { key: "appointment_time", label: "{{appointment_time}}" },
                      { key: "calendar_link", label: "{{calendar_link}}" },
                    ].map((pill) => (
                      <button
                        key={pill.key}
                        type="button"
                        onClick={() => setOmniTemplate((prev) => prev + ` ${pill.label}`)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 transition-colors"
                      >
                        + {pill.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Template Textarea */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-white/70 block mb-1.5">
                    Message Template Body
                  </label>
                  <textarea
                    rows={4}
                    value={omniTemplate}
                    onChange={(e) => setOmniTemplate(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:border-emerald-500 resize-none font-sans"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>A2P 10DLC Verified • Opt-out &lsquo;STOP&rsquo; footer automatic</span>
                    <span>{omniTemplate.length} characters</span>
                  </div>
                </div>
              </div>

              {/* Sample Lead Test Data Fields */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Live Simulation Variables
                </h4>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={omniCustomerName}
                      onChange={(e) => setOmniCustomerName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Agent Persona</label>
                    <input
                      type="text"
                      value={omniAgentName}
                      onChange={(e) => setOmniAgentName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Appointment Slot</label>
                    <input
                      type="text"
                      value={omniAppointmentTime}
                      onChange={(e) => setOmniAppointmentTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Calendar URL</label>
                    <input
                      type="text"
                      value={omniCalendarLink}
                      onChange={(e) => setOmniCalendarLink(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Live Interactive Smartphone Simulator (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-[340px] rounded-[40px] bg-slate-900 p-3 shadow-2xl border-4 border-slate-800 relative">
                
                {/* Speaker & camera punch-hole */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-950 rounded-full z-20 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-white/10" />
                </div>

                {/* Smartphone Screen */}
                <div className="w-full h-[540px] rounded-[32px] bg-[#0b141a] overflow-hidden flex flex-col text-slate-100 relative">
                  
                  {/* Status Bar */}
                  <div className="px-5 pt-3 pb-2 flex items-center justify-between text-[10px] text-slate-300 font-mono">
                    <span>10:45</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px]">5G</span>
                      <span>98%</span>
                    </div>
                  </div>

                  {/* WhatsApp Header */}
                  <div className="px-3 py-2.5 bg-[#202c33] flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                        AC
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold leading-tight">AgentCall AI Concierge</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" title="Verified Business" />
                        </div>
                        <span className="text-[10px] text-emerald-400 font-medium">online</span>
                      </div>
                    </div>
                  </div>

                  {/* Message Stream */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]">
                    
                    <div className="text-center my-1">
                      <span className="px-2 py-0.5 rounded bg-[#182229] text-[9px] text-slate-400">
                        TODAY • END-TO-END ENCRYPTED
                      </span>
                    </div>

                    {omniMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex flex-col ${
                          msg.sender === "bot" ? "items-start" : "items-end"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow ${
                            msg.sender === "bot"
                              ? "bg-[#202c33] text-slate-100 rounded-tl-none border border-white/5"
                              : "bg-[#005c4b] text-white rounded-tr-none"
                          }`}
                        >
                          {msg.text}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-300/70">
                            <span>{msg.time}</span>
                            {msg.sender === "bot" && (
                              <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {isSimulatingSend && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 italic">
                        <Bot className="w-3 h-3 text-emerald-400" />
                        <span>AgentCall AI is typing a response...</span>
                      </div>
                    )}
                  </div>

                  {/* 2-Way Reply Input Simulator */}
                  <form
                    onSubmit={handleSendReply}
                    className="p-2 bg-[#202c33] border-t border-white/5 flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      placeholder="Simulate customer reply..."
                      value={customerReplyInput}
                      onChange={(e) => setCustomerReplyInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-full bg-[#2a3942] text-xs text-white placeholder-slate-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!customerReplyInput.trim()}
                      className="w-7 h-7 rounded-full bg-[#00a884] text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
                    >
                      <SendHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-white/40 mt-3 text-center">
                Interactive 2-Way WhatsApp preview with dynamic token replacement & instant conversational replies.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: CONFIGURED RULES (shown when activeSection === "rules") */}
      {activeSection === "rules" && (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-500" />
            Configured Automation Rules
          </h2>
          <span className="text-xs text-slate-500 dark:text-white/40">{rules.length} rule{rules.length === 1 ? '' : 's'} active</span>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-white/50">
            <Loader2 className="w-6 h-6 animate-spin mb-3" />
            <p className="text-sm">Loading automation rules&hellip;</p>
          </div>
        )}

        {!loading && rules.length === 0 && (
          <div className="text-center py-16 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
            <Zap className="w-8 h-8 text-slate-400 dark:text-white/30 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-white/50">No automation rules configured yet.</p>
            <button onClick={() => { setShowModal(true); setModalStep(1); }} className="mt-3 text-xs font-semibold text-brand-600 dark:text-brand-400 underline">
              Create your first automation rule
            </button>
          </div>
        )}

        <div className="space-y-3">
          {!loading && rules.map((rule) => {
            const triggerInfo = TRIGGER_LABELS[rule.trigger] || { label: rule.trigger, color: "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white" };
            const actionInfo = ACTION_ICONS[rule.action] || { icon: Zap, label: rule.action, color: "text-slate-900 dark:text-white" };
            const ActionIcon = actionInfo.icon;
            const conditionsCount = rule.conditions?.length || 0;

            return (
              <div
                key={rule.id}
                className="rounded-2xl p-5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] hover:border-brand-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl ${actionInfo.color} flex-shrink-0 mt-0.5`}>
                    <ActionIcon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{rule.name}</h3>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${triggerInfo.color}`}>
                        WHEN: {triggerInfo.label}
                      </span>
                      {conditionsCount > 0 && (
                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          IF: {rule.conditions?.map(c => `${c.field} ${c.operator} ${c.value}`).join(' & ')}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-white/70 border border-slate-200 dark:border-white/10">
                        THEN: {actionInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/50 line-clamp-1 max-w-2xl font-mono">
                      {rule.template || "Standard automated trigger template"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-auto flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-white/[0.05] w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">{rule.executions.toLocaleString()} sent</p>
                    <p className="text-[10px] text-slate-500 dark:text-white/40">Last: {rule.lastRunAt ? fmtTime(rule.lastRunAt) : "Never"}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStatus(rule)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        rule.status === "active"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/40 border border-slate-200 dark:border-white/10"
                      }`}
                    >
                      {rule.status === "active" ? "Active" : "Paused"}
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-white/30 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                      title="Delete Rule"
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
      )}

      {/* SECTION 3: EXECUTION HISTORY LOGS (shown when activeSection === "logs") */}
      {activeSection === "logs" && (
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-500" />
              Recent Automation Executions
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Authoritative audit log of outbound WhatsApp & Email transmissions with delivery verification.</p>
          </div>
          <button
            onClick={() => loadLogs(logPage)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 border-b border-slate-200 dark:border-white/[0.06] font-semibold">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Recipient / Lead</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Message Preview</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Delivery Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/[0.05]">
                {logsLoading && logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">Loading delivery logs&hellip;</td>
                  </tr>
                )}
                {!logsLoading && logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">No automation logs recorded yet.</td>
                  </tr>
                )}
                {logs.map((log) => {
                  const isWa = log.type === 'whatsapp';
                  const statusColors: Record<string, string> = {
                    delivered: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                    read:      "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
                    sent:      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
                    queued:    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                    failed:    "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
                    skipped:   "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
                  };
                  return (
                    <tr key={log.id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-white/40 whitespace-nowrap">
                        {fmtTime(log.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">{log.lead?.name || "Anonymous Contact"}</span>
                        <span className="text-[11px] text-slate-500 dark:text-white/40 font-mono">{log.lead?.phone || log.lead?.email || "—"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-white/80">
                          {isWa ? <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> : <Mail className="w-3.5 h-3.5 text-amber-500" />}
                          {isWa ? "WhatsApp" : "Email"}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-600 dark:text-white/70 font-mono text-[11px]">{log.message}</p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[log.status] || statusColors.queued}`}>
                          {log.status.toUpperCase()}
                        </span>
                        {log.error && (
                          <span className="block text-[10px] text-rose-500 line-clamp-1 mt-0.5" title={log.error}>
                            {log.error}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400 dark:text-white/30 whitespace-nowrap">
                        {log.providerMessageId ? log.providerMessageId.slice(0, 16) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border-t border-slate-200 dark:border-white/[0.06] text-xs text-slate-500 dark:text-white/50">
            <span>Showing {logs.length} of {totalLogs} events</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadLogs(Math.max(1, logPage - 1))}
                disabled={logPage <= 1}
                className="p-1 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono">Page {logPage}</span>
              <button
                onClick={() => loadLogs(logPage + 1)}
                disabled={logs.length < 10}
                className="p-1 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Multi-Step Create Rule Modal */}
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
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 space-y-6 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white">Create Automation Rule</h3>
                  <p className="text-xs text-white/50 mt-0.5">Step {modalStep} of 4: {modalStep === 1 ? "Trigger & Channel" : modalStep === 2 ? "Conditions" : modalStep === 3 ? "Message Template" : "Review & Test"}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white text-lg">×</button>
              </div>

              {/* Progress Stepper */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      step <= modalStep ? "bg-brand-500" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>

              <form onSubmit={handleCreateRule} className="space-y-5">

                {/* Step 1: Trigger & Channel */}
                {modalStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-white/70 block mb-1.5">Rule Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. WhatsApp follow-up on Qualified Demo Request"
                        value={newRule.name}
                        onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                        className="w-full h-10 rounded-xl px-3 text-sm bg-white/[0.04] border border-white/15 text-white outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-white/70 block mb-1.5">WHEN (Trigger Event)</label>
                        <select
                          value={newRule.trigger}
                          onChange={e => setNewRule({ ...newRule, trigger: e.target.value })}
                          className="w-full h-10 rounded-xl px-3 text-xs bg-slate-800 border border-white/15 text-white outline-none"
                        >
                          <option value="call_analysis_completed">AI Analysis Completed</option>
                          <option value="lead_qualified">Lead Qualified (Score &gt;= 75)</option>
                          <option value="appointment_detected">Appointment Detected</option>
                          <option value="call_completed">Call Completed</option>
                          <option value="lead_disqualified">Lead Disqualified</option>
                          <option value="call_missed">Call Missed</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-white/70 block mb-1.5">THEN (Action Channel)</label>
                        <select
                          value={newRule.action}
                          onChange={e => setNewRule({ ...newRule, action: e.target.value })}
                          className="w-full h-10 rounded-xl px-3 text-xs bg-slate-800 border border-white/15 text-white outline-none"
                        >
                          <option value="send_whatsapp">Send WhatsApp (Meta Cloud)</option>
                          <option value="send_email">Send Email (Resend)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Conditions */}
                {modalStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white/70">IF Conditions (Declarative Rule Matching)</label>
                      <button
                        type="button"
                        onClick={() => setNewRule({
                          ...newRule,
                          conditions: [...newRule.conditions, { field: "leadScore", operator: ">=", value: 70 }]
                        })}
                        className="text-[11px] text-brand-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Condition
                      </button>
                    </div>

                    {newRule.conditions.length === 0 ? (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-center text-xs text-white/50">
                        No conditions configured. This automation will fire for <strong>every</strong> {TRIGGER_LABELS[newRule.trigger]?.label || newRule.trigger} event.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {newRule.conditions.map((cond, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white/[0.03] p-2.5 rounded-xl border border-white/10">
                            <select
                              value={cond.field}
                              onChange={e => {
                                const next = [...newRule.conditions];
                                next[idx].field = e.target.value;
                                setNewRule({ ...newRule, conditions: next });
                              }}
                              className="h-8 rounded-lg px-2 text-xs bg-slate-800 border border-white/10 text-white flex-1"
                            >
                              <option value="leadScore">Lead Score</option>
                              <option value="intent">AI Intent</option>
                              <option value="sentiment">AI Sentiment</option>
                              <option value="qualification">Qualification Status</option>
                              <option value="duration">Call Duration (sec)</option>
                            </select>

                            <select
                              value={cond.operator}
                              onChange={e => {
                                const next = [...newRule.conditions];
                                next[idx].operator = e.target.value as any;
                                setNewRule({ ...newRule, conditions: next });
                              }}
                              className="h-8 rounded-lg px-2 text-xs bg-slate-800 border border-white/10 text-white w-24"
                            >
                              <option value=">=">&gt;=</option>
                              <option value=">">&gt;</option>
                              <option value="==">==</option>
                              <option value="!=">!=</option>
                              <option value="<=">&lt;=</option>
                              <option value="<">&lt;</option>
                              <option value="contains">contains</option>
                            </select>

                            <input
                              type="text"
                              value={String(cond.value ?? "")}
                              onChange={e => {
                                const next = [...newRule.conditions];
                                next[idx].value = e.target.value;
                                setNewRule({ ...newRule, conditions: next });
                              }}
                              placeholder="e.g. 75 or positive"
                              className="h-8 rounded-lg px-2 text-xs bg-slate-800 border border-white/10 text-white flex-1 font-mono"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                const next = newRule.conditions.filter((_, i) => i !== idx);
                                setNewRule({ ...newRule, conditions: next });
                              }}
                              className="p-1 text-white/40 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Message Template */}
                {modalStep === 3 && (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-white/70 block">Message Template</label>
                    <textarea
                      rows={4}
                      value={newRule.template}
                      onChange={e => setNewRule({ ...newRule, template: e.target.value })}
                      className="w-full rounded-xl p-3 text-xs bg-white/[0.04] border border-white/15 text-white outline-none focus:border-brand-500 font-mono"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-white/40">
                      <span>Allowed tags:</span>
                      {["{{lead.name}}", "{{lead.phone}}", "{{lead.company}}", "{{analysis.leadScore}}", "{{appointment.date}}"].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setNewRule({ ...newRule, template: `${newRule.template} ${tag}` })}
                          className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/70 font-mono"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Review & Live Preview */}
                {modalStep === 4 && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/50">Rule:</span>
                        <span className="font-bold">{newRule.name || "Untitled"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Trigger:</span>
                        <span>{TRIGGER_LABELS[newRule.trigger]?.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Action:</span>
                        <span>{ACTION_ICONS[newRule.action]?.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Conditions:</span>
                        <span>{newRule.conditions.length === 0 ? "Always fires" : `${newRule.conditions.length} condition(s)`}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-white/70">Live Dry-Run Preview</label>
                        <button
                          type="button"
                          onClick={handleRunPreview}
                          className="text-[11px] text-brand-400 hover:underline flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" /> Simulate Trigger
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-white/10 font-mono text-xs text-white/80 space-y-2">
                        {dryRunLoading ? (
                          <div className="flex items-center gap-2 text-white/40">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Simulating execution...
                          </div>
                        ) : previewResult ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${previewResult.conditionsMet ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                                {previewResult.conditionsMet ? "✓ Conditions Match" : "✕ Conditions Do Not Match"}
                              </span>
                            </div>
                            <p className="border-t border-white/10 pt-2 text-white/90 whitespace-pre-wrap">{previewResult.renderedMessage}</p>
                          </>
                        ) : (
                          <p className="text-white/40">Click &quot;Simulate Trigger&quot; to test variables and condition matching.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal Navigation Buttons */}
                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                  {modalStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setModalStep((s) => (s - 1) as any)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.05] text-white/70 hover:text-white"
                    >
                      Back
                    </button>
                  ) : <div />}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.05] text-white/50 hover:text-white"
                    >
                      Cancel
                    </button>
                    {modalStep < 4 ? (
                      <button
                        type="button"
                        onClick={() => setModalStep((s) => (s + 1) as any)}
                        disabled={modalStep === 1 && !newRule.name.trim()}
                        className="btn-red text-xs py-2 px-5 h-9 disabled:opacity-50"
                      >
                        Continue
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={saving}
                        className="btn-red text-xs py-2 px-5 h-9 flex items-center gap-2 disabled:opacity-60"
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? "Saving..." : "Save & Activate"}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Test Action Modal */}
      <AnimatePresence>
        {showTestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowTestModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-brand-500" />
                  <h3 className="text-base font-bold text-white">Send Direct Test Message</h3>
                </div>
                <button onClick={() => setShowTestModal(false)} className="text-white/40 hover:text-white text-lg">×</button>
              </div>

              <form onSubmit={handleSendTest} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-white/70 block mb-1">Destination Channel</label>
                  <select
                    value={testActionData.actionType}
                    onChange={e => setTestActionData({ ...testActionData, actionType: e.target.value as any })}
                    className="w-full h-9 rounded-xl px-3 bg-slate-800 border border-white/15 text-white"
                  >
                    <option value="send_whatsapp">WhatsApp (Meta Cloud)</option>
                    <option value="send_email">Email (Resend)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-white/70 block mb-1">
                    {testActionData.actionType === 'send_whatsapp' ? 'Recipient Phone Number (E.164)' : 'Recipient Email Address'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={testActionData.actionType === 'send_whatsapp' ? '+919876543210' : 'test@example.com'}
                    value={testActionData.destination}
                    onChange={e => setTestActionData({ ...testActionData, destination: e.target.value })}
                    className="w-full h-9 rounded-xl px-3 bg-white/[0.04] border border-white/15 text-white font-mono"
                  />
                </div>

                {testActionData.actionType === 'send_email' && (
                  <div>
                    <label className="font-semibold text-white/70 block mb-1">Subject</label>
                    <input
                      type="text"
                      value={testActionData.subject}
                      onChange={e => setTestActionData({ ...testActionData, subject: e.target.value })}
                      className="w-full h-9 rounded-xl px-3 bg-white/[0.04] border border-white/15 text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="font-semibold text-white/70 block mb-1">Test Message Body</label>
                  <textarea
                    rows={3}
                    value={testActionData.message}
                    onChange={e => setTestActionData({ ...testActionData, message: e.target.value })}
                    className="w-full rounded-xl p-2.5 bg-white/[0.04] border border-white/15 text-white font-mono"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                  <span>Test messages are sent to this designated contact only. They will not broadcast to contacts or leads.</span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowTestModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.05] text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={testSending}
                    className="btn-red text-xs py-1.5 px-4 h-8 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testSending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {testSending ? "Enqueuing..." : "Send Test Now"}
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
