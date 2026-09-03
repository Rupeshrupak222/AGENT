"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Building2,
  Clock,
  User,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  X,
  Target,
  Users,
  Activity,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  leadsApi,
  normalizeApiError,
  LeadItem,
  LeadDetail,
  CreateLeadInput,
} from "@/lib/api";

type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "qualified"
  | "appointment"
  | "closed_won"
  | "closed_lost";

const PIPELINE_STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id: "new", label: "New Lead", color: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-white/10 dark:border-white/20 dark:text-white" },
  { id: "contacted", label: "Contacted", color: "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-300" },
  { id: "interested", label: "Interested", color: "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/15 dark:border-indigo-500/30 dark:text-indigo-300" },
  { id: "qualified", label: "Qualified", color: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/15 dark:border-purple-500/30 dark:text-purple-300" },
  { id: "appointment", label: "Appointment", color: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-yellow-500/15 dark:border-yellow-500/30 dark:text-yellow-300" },
  { id: "closed_won", label: "Won ✓", color: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-green-500/15 dark:border-green-500/30 dark:text-emerald-300" },
  { id: "closed_lost", label: "Lost", color: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-red-500/15 dark:border-red-500/30 dark:text-rose-300" },
];

const statusVariant: Record<
  LeadStatus,
  "gray" | "blue" | "cyan" | "purple" | "yellow" | "green" | "red"
> = {
  new: "gray",
  contacted: "blue",
  interested: "cyan",
  qualified: "purple",
  appointment: "yellow",
  closed_won: "green",
  closed_lost: "red",
};

// ── Lead Detail Slide-over Panel ─────────────────────────────────
function LeadDetailPanel({
  leadId,
  onClose,
  onStatusChange,
}: {
  leadId: string;
  onClose: () => void;
  onStatusChange: () => void;
}) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await leadsApi.get(leadId);
        if (mounted) setLead(data);
      } catch (err) {
        if (mounted) setError(normalizeApiError(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [leadId]);

  const handleSetStage = async (newStage: LeadStatus) => {
    if (!lead || lead.status === newStage) return;
    try {
      setUpdating(true);
      const updated = await leadsApi.updateStatus(lead.id, newStage);
      setLead((prev) => (prev ? { ...prev, status: updated.status } : prev));
      onStatusChange();
      toastSuccess(`Lead moved to "${newStage.replace("_", " ")}"`);
    } catch (err) {
      toastError(normalizeApiError(err));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        className="h-full w-full sm:w-[440px] bg-white dark:bg-[#120204] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col justify-between"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              {lead?.name?.[0] || "L"}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                {lead?.name || "Lead Details"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/40">
                {lead?.company || "Individual Contact"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-800 dark:text-white">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
              <p className="text-xs text-slate-500 dark:text-white/40">Loading contact history...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 text-rose-600 text-xs">{error}</div>
          ) : lead ? (
            <>
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-white/40">
                  Current Pipeline Stage:
                </span>
                <Badge variant={statusVariant[lead.status]} dot className="text-xs capitalize">
                  {lead.status.replace("_", " ")}
                </Badge>
              </div>

              {/* Contact Info Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-white/40">Phone</p>
                    <p className="font-mono font-semibold text-slate-900 dark:text-white">
                      {lead.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-white/40">Email</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {lead.email || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-white/40">Company</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {lead.company || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-white/40">Assigned Agent</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {lead.assignedAgent?.name || "Unassigned"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stage Transition Buttons */}
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
                  Update Stage
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PIPELINE_STAGES.map((s) => (
                    <button
                      key={s.id}
                      disabled={updating}
                      onClick={() => handleSetStage(s.id)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        lead.status === s.id
                          ? "bg-brand-600 text-white border-brand-600 shadow-xs"
                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/25"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call History / Activity Timeline */}
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
                  Call Session History ({lead.calls?.length || 0})
                </p>
                {lead.calls && lead.calls.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {lead.calls.map((call) => (
                      <div
                        key={call.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white capitalize">
                            {call.direction} · {call.status.replace("_", " ")}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-white/40">
                            {new Date(call.startedAt).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span className="font-mono text-[11px] text-slate-600 dark:text-white/60">
                          {call.duration ? `${call.duration}s` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-center text-xs text-slate-400 dark:text-white/40">
                    No calls logged with this contact yet
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10">
          <Button variant="secondary" size="sm" onClick={onClose} className="w-full text-xs">
            Close Panel
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Create Lead Modal ────────────────────────────────────────────
function CreateLeadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<CreateLeadInput>({
    name: "",
    phone: "",
    email: "",
    company: "",
    status: "new",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Contact name and phone number are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await leadsApi.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || undefined,
        company: form.company?.trim() || undefined,
        status: form.status,
        notes: form.notes?.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = normalizeApiError(err);
      if (msg.includes("unique") || msg.includes("already exists") || err?.response?.status === 409) {
        setError("A lead with this phone number already exists in your workspace.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#150305] border border-slate-200 dark:border-white/10 shadow-2xl p-6 text-slate-900 dark:text-white"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <h3 className="font-bold text-base">Add New CRM Lead</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-white/80 mb-1">
              Contact Name *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full Name"
              className="w-full h-9 px-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-white/80 mb-1">
              Phone Number *
            </label>
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+919876543210"
              className="w-full h-9 px-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-white/80 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contact@company.com"
              className="w-full h-9 px-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-white/80 mb-1">
              Company
            </label>
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Enterprise Corp"
              className="w-full h-9 px-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-white/80 mb-1">
              Pipeline Stage
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              className="w-full h-9 px-3 rounded-xl bg-slate-100 dark:bg-[#1a0405] border border-slate-200 dark:border-white/10 text-xs outline-none focus:border-brand-500"
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-red text-xs px-4 py-2 rounded-xl shadow-md shadow-brand-500/20 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Contact"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main CRM Page ────────────────────────────────────────────────
export default function CRMPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "kanban">("list");
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchLeadsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const statusParam = filter === "all" ? undefined : filter;

      const [leadsRes, pipelineRes] = await Promise.allSettled([
        leadsApi.list({
          page,
          limit,
          status: statusParam,
          search: search.trim() || undefined,
        }),
        leadsApi.pipeline(),
      ]);

      if (leadsRes.status === "fulfilled") {
        setLeads(leadsRes.value.items || []);
        setTotal(leadsRes.value.total || 0);
      } else {
        setError(normalizeApiError(leadsRes.reason));
      }

      if (pipelineRes.status === "fulfilled") {
        setPipelineCounts(pipelineRes.value || {});
      }
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeadsData();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLeadsData]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const qualifiedCount = pipelineCounts["qualified"] || 0;
  const wonCount = pipelineCounts["closed_won"] || 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 pb-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            CRM / Leads Pipeline
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            Manage prospects, stage dispositions, and qualification records
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchLeadsData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-brand-500" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-red text-xs py-2 px-4 h-9 shadow-md shadow-brand-500/25 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Lead
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
              onClick={fetchLeadsData}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-xs transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Real Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 dark:bg-brand-500/15 dark:border-brand-500/20 dark:text-brand-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                {total.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 dark:text-white/40">Total Leads</p>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-500/15 dark:border-purple-500/20 dark:text-purple-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                {qualifiedCount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 dark:text-white/40">Qualified Stage</p>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                {wonCount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 dark:text-white/40">Closed Won</p>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-200 dark:bg-cyan-500/15 dark:border-cyan-500/20 dark:text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                {total > 0 ? `${((qualifiedCount / total) * 100).toFixed(1)}%` : "0%"}
              </p>
              <p className="text-xs text-slate-500 dark:text-white/40">Qualification Ratio</p>
            </div>
          </Card>
        </div>

        {/* Real Pipeline Stage Counters */}
        <Card className="p-5 bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border-slate-200 dark:border-white/10 shadow-sm">
          <CardHeader className="mb-3">
            <CardTitle className="text-slate-900 dark:text-white text-sm uppercase tracking-wider">
              Pipeline Stage Overview
            </CardTitle>
          </CardHeader>
          <div className="flex gap-2.5 overflow-x-auto pb-2">
            {PIPELINE_STAGES.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setFilter(filter === s.id ? "all" : s.id);
                  setPage(1);
                }}
                className={`flex-shrink-0 px-4 py-3 rounded-xl border text-center min-w-[115px] cursor-pointer transition-all ${s.color} ${
                  filter === s.id ? "ring-2 ring-brand-500 shadow-sm" : ""
                }`}
              >
                <p className="text-lg font-extrabold font-mono">
                  {pipelineCounts[s.id] || 0}
                </p>
                <p className="text-xs mt-0.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-sm relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search leads by name, phone, company..."
              className="w-full h-9 pl-9 pr-3 rounded-xl text-xs bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-white/5 rounded-xl p-1">
            {(["all", "new", "qualified", "appointment", "closed_won"] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f === "all" ? "All Stages" : f.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1 bg-slate-200/70 dark:bg-white/5 rounded-xl p-1">
            {(["list", "kanban"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  view === v
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode: List or Kanban */}
        {view === "list" ? (
          <Card padding="none" className="overflow-hidden bg-white dark:bg-gradient-to-b dark:from-white/[0.05] dark:to-white/[0.02] border-slate-200 dark:border-white/10 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Lead Contact</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Status Stage</th>
                    <th className="px-4 py-3">Assigned Agent</th>
                    <th className="px-4 py-3">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-4 py-3.5">
                          <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-full" />
                        </td>
                      </tr>
                    ))
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500 dark:text-white/40">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-sm text-slate-700 dark:text-white/70">
                          No leads found in pipeline
                        </p>
                        <p className="text-xs mt-1">
                          Click &quot;Add Lead&quot; above or run inbound campaign automations to populate contacts.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                              {lead.name[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {lead.name}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-white/40 font-mono">
                                {lead.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-white/70">
                          {lead.company || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={statusVariant[lead.status] || "gray"}
                            dot
                            className="text-[10px] capitalize"
                          >
                            {lead.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-white/60">
                          {lead.assignedAgent?.name || "Unassigned"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-white/40">
                          {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
              <span>
                Showing {leads.length} of {total} leads (Page {page} of {totalPages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ) : (
          /* Kanban Board View */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => {
              const stageLeads = leads.filter((l) => l.status === stage.id);
              return (
                <div key={stage.id} className="flex-shrink-0 w-68">
                  <div className={`mb-3 px-3.5 py-2.5 rounded-xl border ${stage.color} flex items-center justify-between`}>
                    <span className="text-xs font-bold">{stage.label}</span>
                    <Badge variant="gray" className="text-[10px]">
                      {stageLeads.length}
                    </Badge>
                  </div>

                  <div className="space-y-2.5 min-h-[280px] p-1.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#180406] border border-slate-200 dark:border-white/10 hover:border-brand-500/40 cursor-pointer shadow-xs hover:shadow-md transition-all"
                      >
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {lead.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5 truncate">
                          {lead.company || lead.phone}
                        </p>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400 dark:text-white/30">
                          <span>{lead.assignedAgent?.name || "Unassigned"}</span>
                          <span>
                            {new Date(lead.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="py-8 text-center text-slate-400 dark:text-white/30 text-[11px]">
                        No leads in {stage.label}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-over Detail Panel */}
      <AnimatePresence>
        {selectedLeadId && (
          <LeadDetailPanel
            leadId={selectedLeadId}
            onClose={() => setSelectedLeadId(null)}
            onStatusChange={fetchLeadsData}
          />
        )}
      </AnimatePresence>

      {/* Create Lead Modal */}
      <AnimatePresence>
        {showAddModal && (
          <CreateLeadModal
            onClose={() => setShowAddModal(false)}
            onSuccess={fetchLeadsData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
