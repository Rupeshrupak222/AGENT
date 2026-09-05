"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Bot,
  Play,
  Pause,
  Copy,
  Trash2,
  Globe2,
  Phone,
  MoreHorizontal,
  Search,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  X,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { WaveAnimation } from "@/components/ui/WaveAnimation";
import {
  agentsApi,
  normalizeApiError,
  AgentItem,
  CreateAgentInput,
} from "@/lib/api";

const roleLabels: Record<string, string> = {
  telecaller: "Telecaller",
  recruiter: "Recruiter",
  receptionist: "Receptionist",
  collection: "Collection",
  sales: "Sales Agent",
  support: "Support",
  appointment_setter: "Appt. Setter",
};

const roleColors: Record<
  string,
  "blue" | "purple" | "cyan" | "orange" | "green" | "yellow" | "red"
> = {
  telecaller: "blue",
  recruiter: "purple",
  receptionist: "cyan",
  collection: "orange",
  sales: "green",
  support: "yellow",
  appointment_setter: "red",
};

const langLabels: Record<string, string> = {
  hindi: "Hindi",
  english: "English",
  hinglish: "Hinglish",
  tamil: "Tamil",
  telugu: "Telugu",
  marathi: "Marathi",
  bengali: "Bengali",
  gujarati: "Gujarati",
  kannada: "Kannada",
  punjabi: "Punjabi",
};

const WIZARD_STEPS = [
  "Role & Identity",
  "Voice & Language",
  "Knowledge & Scripts",
  "Review & Deploy",
];

const ROLE_OPTIONS = [
  {
    value: "telecaller",
    label: "AI Telecaller",
    desc: "Outbound prospect qualification & structured follow-ups",
  },
  {
    value: "sales",
    label: "AI Sales Representative",
    desc: "Inbound discovery, product demos & sales pipeline conversion",
  },
  {
    value: "recruiter",
    label: "AI Talent Recruiter",
    desc: "Candidate resume screening & interview scheduling",
  },
  {
    value: "receptionist",
    label: "AI Front Desk Receptionist",
    desc: "Live call routing, office FAQs & greeting automation",
  },
  {
    value: "collection",
    label: "AI Collections Specialist",
    desc: "EMI payment reminders & payment reconciliation",
  },
  {
    value: "appointment_setter",
    label: "AI Appointment Setter",
    desc: "High-volume calendar bookings & demo confirmations",
  },
  {
    value: "support",
    label: "AI Support Specialist",
    desc: "Troubleshooting FAQs & tier-1 issue resolution",
  },
];

const VOICE_OPTIONS = [
  { id: "priya-warm", name: "Priya", lang: "Hindi/Hinglish", gender: "Female" },
  { id: "arjun-clear", name: "Arjun", lang: "English", gender: "Male" },
  { id: "meera-calm", name: "Meera", lang: "Hindi", gender: "Female" },
  { id: "ravi-deep", name: "Ravi", lang: "Hindi/Marathi", gender: "Male" },
  { id: "anjali-crisp", name: "Anjali", lang: "English/Hindi", gender: "Female" },
  { id: "dev-upbeat", name: "Dev", lang: "Hinglish", gender: "Male" },
];

// ── Agent Creation Modal ─────────────────────────────────────────
function AgentBuilderModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateAgentInput>({
    name: "",
    role: "telecaller",
    language: "english",
    voiceId: "priya-warm",
    businessGoal: "",
    openingScript: "",
    qualificationRules: "",
    knowledgeBase: "",
  });

  const setField = (k: keyof CreateAgentInput, v: string) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const canNext = () => {
    if (step === 0) return form.name.trim().length >= 2 && form.businessGoal.trim().length >= 10;
    if (step === 1) return !!form.language && !!form.voiceId;
    return true;
  };

  const handleDeploy = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await agentsApi.create({
        ...form,
        openingScript: form.openingScript?.trim() || undefined,
        qualificationRules: form.qualificationRules?.trim() || undefined,
        knowledgeBase: form.knowledgeBase?.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(normalizeApiError(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-card border-slate-200 dark:border-white/15 shadow-2xl p-6 text-slate-900 dark:text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.06] dark:border-white/10">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              Build Autonomous AI Agent
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Configure persona, conversational goals, and voice telemetry
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 dark:text-white/40 hover:text-slate-500 dark:hover:text-white/40 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress */}
        <div className="py-4">
          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((s, i) => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step
                      ? "bg-emerald-500 text-white"
                      : i === step
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 dark:bg-white/[0.08] dark:bg-white/10 text-slate-400 dark:text-white/40"
                  }`}
                >
                  {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="hidden sm:inline text-[11px] font-medium text-slate-500 dark:text-white/60 truncate">
                  {s}
                </span>
                {i < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full ${
                      i < step ? "bg-emerald-500" : "bg-slate-100 dark:bg-white/[0.08] dark:bg-white/10"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Wizard Form Steps */}
        <div className="space-y-4 py-2">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-white/80 mb-1">
                  Agent Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Priya - Enterprise Qualification"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-sm outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-white/80 mb-1">
                  Agent Role Taxonomy *
                </label>
                <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      type="button"
                      key={r.value}
                      onClick={() => setField("role", r.value)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        form.role === r.value
                          ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/15"
                          : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/15 dark:hover:border-white/20"
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {r.label}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">
                        {r.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-white/80 mb-1">
                  Core Business Objective / Prompt Goal * (Min 10 chars)
                </label>
                <textarea
                  rows={3}
                  value={form.businessGoal}
                  onChange={(e) => setField("businessGoal", e.target.value)}
                  placeholder="Describe what this voice employee should accomplish during conversations..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-xs outline-none focus:border-brand-500 resize-none"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-white/80 mb-1">
                  Primary Dialect / Language
                </label>
                <select
                  value={form.language}
                  onChange={(e) => setField("language", e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] dark:bg-input border-slate-200 dark:border-white/10 text-xs outline-none focus:border-brand-500"
                >
                  {Object.entries(langLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-white/80 mb-2">
                  Select Synthetic Voice Profile
                </label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {VOICE_OPTIONS.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setField("voiceId", v.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        form.voiceId === v.id
                          ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/15"
                          : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/15 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
<p className="text-xs font-bold text-slate-900 dark:text-white">
                        {v.name} ({v.gender})
                      </p>
                        <Badge variant="gray" className="text-[10px]">
                          {v.lang}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-white/80 mb-1">
                  Opening Hook Script (Optional)
                </label>
                <input
                  value={form.openingScript}
                  onChange={(e) => setField("openingScript", e.target.value)}
                  placeholder="e.g. Hello! This is Priya from Acme Corp calling regarding your inquiry..."
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-white/80 mb-1">
                  Lead Qualification Rules (Optional)
                </label>
                <textarea
                  rows={2}
                  value={form.qualificationRules}
                  onChange={(e) => setField("qualificationRules", e.target.value)}
                  placeholder="Budget > $10,000, Timeline < 30 days, B2B company"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-xs outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-white/80 mb-1">
                  Company Knowledge Context / FAQs (Optional)
                </label>
                <textarea
                  rows={3}
                  value={form.knowledgeBase}
                  onChange={(e) => setField("knowledgeBase", e.target.value)}
                  placeholder="Add pricing details, service offerings, and objection handling guidelines..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-xs outline-none focus:border-brand-500 resize-none"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-xs">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                Verify Agent Parameters
              </h4>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/40">Name:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{form.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/40">Role:</span>
                <span className="font-semibold capitalize text-slate-900 dark:text-white">{roleLabels[form.role] || form.role}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/40">Language:</span>
                <span className="font-semibold capitalize text-slate-900 dark:text-white">{langLabels[form.language] || form.language}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/40">Voice Profile:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{form.voiceId}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 dark:text-white/40 block mb-1">Objective:</span>
                <p className="text-slate-700 dark:text-white/80 italic">{form.businessGoal}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="pt-4 border-t border-slate-200 dark:border-white/[0.06] dark:border-white/10 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}
            disabled={submitting}
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>

          {step < WIZARD_STEPS.length - 1 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
            >
              Continue →
            </Button>
          ) : (
            <button
              onClick={handleDeploy}
              disabled={submitting}
              className="btn-red text-xs px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-500/20 disabled:opacity-50"
            >
              {submitting ? "Deploying..." : "Deploy Agent Fleet"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Agent Card ───────────────────────────────────────────────────
function AgentCardItem({
  agent,
  onRefresh,
}: {
  agent: AgentItem;
  onRefresh: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const toggleStatus = async () => {
    try {
      setActionLoading(true);
      if (agent.status === "active") {
        await agentsApi.pause(agent.id);
        toastSuccess(`"${agent.name}" paused`);
      } else {
        await agentsApi.activate(agent.id);
        toastSuccess(`"${agent.name}" activated`);
      }
      onRefresh();
    } catch (err) {
      toastError(normalizeApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      setActionLoading(true);
      setMenuOpen(false);
      await agentsApi.duplicate(agent.id);
      toastSuccess(`"${agent.name}" duplicated`);
      onRefresh();
    } catch (err) {
      toastError(normalizeApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      setMenuOpen(false);
      await agentsApi.delete(agent.id);
      toastSuccess(`"${agent.name}" archived`);
      onRefresh();
    } catch (err) {
      toastError(normalizeApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Card hover className="p-5 relative panel-card">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
              {agent.name[0]}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                {agent.name}
              </p>
              <Badge variant={roleColors[agent.role] || "gray"} className="mt-0.5 text-[10px]">
                {roleLabels[agent.role] || agent.role}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={
                agent.status === "active"
                  ? "green"
                  : agent.status === "paused"
                  ? "yellow"
                  : "gray"
              }
              dot
              className="text-[10px] capitalize"
            >
              {agent.status}
            </Badge>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.04] dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 w-36 rounded-xl bg-dropdown border-slate-200 dark:border-white/10 shadow-xl z-20 overflow-hidden text-xs">
                  <button
                    onClick={handleDuplicate}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/[0.02] dark:hover:bg-white/5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteConfirm(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Archive
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Call count metric */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/5 mb-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-brand-600 dark:text-brand-400 mb-1">
            <Phone className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">Total Handled Calls</span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {(agent._count?.calls ?? 0).toLocaleString()}
          </p>
        </div>

        {/* Language & Voice */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/40 mb-4">
          <div className="flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5" />
            <span>{langLabels[agent.language] || agent.language}</span>
          </div>
          {agent.status === "active" && (
            <WaveAnimation active size="sm" bars={4} color="bg-brand-500" />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant={agent.status === "active" ? "secondary" : "primary"}
          size="sm"
          className="flex-1 text-xs"
          disabled={actionLoading}
          onClick={toggleStatus}
          icon={
            agent.status === "active" ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )
          }
        >
          {agent.status === "active" ? "Pause" : "Activate"}
        </Button>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Archive AI Agent"
        message={`Are you sure you want to archive "${agent.name}"? It will stop handling calls and be removed from active deployment.`}
        confirmLabel="Archive Agent"
        loading={actionLoading}
      />
    </Card>
  );
}

// ── Main Agents Page ─────────────────────────────────────────────
export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentsApi.list({
        status: filter === "all" ? undefined : filter,
      });
      setAgents(data || []);
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filtered = agents.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.role || "").toLowerCase().includes(q)
    );
  });

  const activeCount = agents.filter((a) => a.status === "active").length;
  const totalCalls = agents.reduce((s, a) => s + (a._count?.calls ?? 0), 0);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 pb-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            AI Agent Studio
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            Build, train and deploy autonomous voice employees for your company
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchAgents}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.12] border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-brand-500" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowBuilder(true)}
            className="btn-red text-xs py-2 px-4 h-9 shadow-md shadow-brand-500/25 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Agent
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchAgents}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-xs transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Real Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="p-4 panel-card">
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {loading ? "—" : agents.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-1">Configured Agents</p>
          </Card>
          <Card className="p-4 panel-card">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {loading ? "—" : activeCount}
            </p>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-1">Active in Production</p>
          </Card>
          <Card className="p-4 panel-card">
            <p className="text-2xl font-black text-brand-600 dark:text-brand-400 font-mono">
              {loading ? "—" : totalCalls.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-1">Total Handled Calls</p>
          </Card>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100/70 dark:bg-white/[0.08]/70 dark:bg-white/5 rounded-xl p-1">
            {["all", "active", "paused", "draft", "archived"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[200px] max-w-xs relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by agent name or role..."
              className="w-full h-9 pl-9 pr-3 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Agent Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-64 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center panel-card">
            <Bot className="w-10 h-10 mx-auto mb-3 text-slate-400 dark:text-white/20" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No AI Agents Configured
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40 max-w-md mx-auto mt-1 mb-4">
              Deploy your first autonomous conversational agent to start qualifying prospects and handling live phone calls.
            </p>
            <button
              onClick={() => setShowBuilder(true)}
              className="btn-red text-xs py-2 px-4 shadow-md shadow-brand-500/20"
            >
              Build New Agent
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((agent) => (
              <AgentCardItem
                key={agent.id}
                agent={agent}
                onRefresh={fetchAgents}
              />
            ))}

            {/* Create New Agent Tile */}
            <button
              onClick={() => setShowBuilder(true)}
              className="rounded-2xl p-5 border-2 border-dashed border-slate-200 dark:border-white/15 hover:border-brand-500/50 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition-all group flex flex-col items-center justify-center gap-3 min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20 border-slate-200 dark:border-white/10 flex items-center justify-center transition-all">
                <Plus className="w-6 h-6 text-slate-500 dark:text-white/40 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-all" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700 dark:text-white/70 group-hover:text-brand-600 dark:group-hover:text-white transition-colors">
                  Create New Agent
                </p>
                <p className="text-xs text-slate-400 dark:text-white/30 mt-0.5">
                  Autonomous conversational voice builder
                </p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Builder Modal */}
      <AnimatePresence>
        {showBuilder && (
          <AgentBuilderModal
            onClose={() => setShowBuilder(false)}
            onSuccess={fetchAgents}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
