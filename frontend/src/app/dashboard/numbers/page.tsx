"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PhoneIncoming,
  PhoneOutgoing,
  Plus,
  X,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Bot,
  Phone,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  numbersApi,
  agentsApi,
  normalizeApiError,
  PhoneNumberItem,
  AgentItem,
} from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  available: { label: "Available", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" },
  assigned: { label: "Assigned", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30" },
  inactive: { label: "Inactive", cls: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/40 border border-slate-200 dark:border-white/10" },
};

const PROVIDERS = ["twilio", "exotel", "sandbox"];

interface FormState {
  id?: string;
  number: string;
  provider: string;
  label: string;
  isInbound: boolean;
  isOutbound: boolean;
  status: string;
  assignedAgentId: string;
}

const EMPTY_FORM: FormState = {
  number: "",
  provider: "twilio",
  label: "",
  isInbound: true,
  isOutbound: true,
  status: "available",
  assignedAgentId: "",
};

export default function NumbersPage() {
  const { can } = usePermissions();
  const [items, setItems] = useState<PhoneNumberItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showGuide, setShowGuide] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { success, error: toastError } = useToast();
  const canManage = can(PERMISSIONS.TELEPHONY_MANAGE);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const domain = typeof window !== "undefined" ? window.location.origin : "https://api.agentcall.ai";
  const twilioInboundWebhook = `${domain}/api/v1/telephony/webhooks/incoming/twilio`;
  const twilioStatusWebhook = `${domain}/api/v1/telephony/webhooks/status/twilio`;
  const exotelInboundWebhook = `${domain}/api/v1/telephony/webhooks/incoming/exotel`;
  const exotelStatusWebhook = `${domain}/api/v1/telephony/webhooks/status/exotel`;

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await numbersApi.list({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          limit: 100,
        });
        setItems(res.items);
        setTotal(res.total);
      } catch (e) {
        setError(normalizeApiError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (canManage) {
      agentsApi
        .list()
        .then(setAgents)
        .catch(() => {});
    }
  }, [canManage]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item: PhoneNumberItem) => {
    setForm({
      id: item.id,
      number: item.number,
      provider: item.provider || "twilio",
      label: item.label ?? "",
      isInbound: item.isInbound,
      isOutbound: item.isOutbound,
      status: item.status || "available",
      assignedAgentId: item.assignedAgentId ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.number.trim()) {
      toastError("Phone number is required.");
      return;
    }
    if (!form.isInbound && !form.isOutbound) {
      toastError("A number must support at least one direction.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await numbersApi.update(form.id, {
          provider: form.provider,
          label: form.label.trim() || undefined,
          isInbound: form.isInbound,
          isOutbound: form.isOutbound,
          status: form.status,
          assignedAgentId: form.assignedAgentId || null,
        });
        success("Phone number updated.");
      } else {
        const created = await numbersApi.create({
          number: form.number.trim(),
          provider: form.provider,
          label: form.label.trim() || undefined,
          isInbound: form.isInbound,
          isOutbound: form.isOutbound,
          status: form.status,
        });
        if (form.assignedAgentId) {
          await numbersApi.update(created.id, {
            assignedAgentId: form.assignedAgentId,
            status: "assigned",
          });
        }
        success("Phone number added to inventory.");
      }
      setShowForm(false);
      await load();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: PhoneNumberItem) => {
    if (!window.confirm(`Remove phone number ${item.number}? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try {
      await numbersApi.remove(item.id);
      success("Phone number removed.");
      await load();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setDeletingId(null);
    }
  };

  if (!can(PERMISSIONS.TELEPHONY_VIEW)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="rounded-2xl p-8 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Access Restricted</p>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">You do not have permission to view phone numbers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <PhoneIncoming className="w-6 h-6 text-brand-500 dark:text-brand-400" /> Phone Numbers
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            Company telephony inventory — numbers your AI agents dial from and answer on.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowGuide(true)}
            className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Provider Webhooks Guide
          </button>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-brand-500 dark:text-brand-400" : ""}`} />
            Refresh
          </button>
          {canManage && (
            <button
              onClick={openCreate}
              className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Number
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/40" />
          <label htmlFor="num-search" className="sr-only">Search numbers</label>
          <input
            id="num-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number or label…"
            className="w-full h-10 pl-9 pr-3 rounded-xl text-sm bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="num-status" className="sr-only">Filter by status</label>
          <select id="num-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl px-3 text-sm bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <span className="text-xs font-mono text-slate-400 dark:text-white/40 whitespace-nowrap">{total} numbers</span>
        </div>
      </div>

      {/* Grid */}
      {loading && items.length === 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-slate-200/60 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
          <Phone className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white/70">No phone numbers in inventory</p>
          <p className="text-xs text-slate-400 dark:text-white/40 mt-1 max-w-sm mx-auto">
            {canManage
              ? "Add the numbers your AI agents should use for outbound calls and inbound reception."
              : "Provisioned numbers will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const sm = STATUS_META[item.status] ?? STATUS_META.available;
            return (
              <div key={item.id} className="rounded-2xl p-5 panel-card flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400">
                    <PhoneIncoming className="w-5 h-5" />
                  </div>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold", sm.cls)}>
                    {sm.label}
                  </span>
                </div>

                <p className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight">{item.number}</p>
                <p className="text-xs text-slate-400 dark:text-white/40 mt-0.5">{item.label || `Provisioned via ${item.provider}`}</p>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/50 capitalize">
                    <PhoneIncoming className="w-3 h-3" /> {item.isInbound ? "Inbound" : "-"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/50 capitalize">
                    <PhoneOutgoing className="w-3 h-3" /> {item.isOutbound ? "Outbound" : "-"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/25 capitalize">
                    {item.provider}
                  </span>
                </div>

                {item.assignedAgent && (
                  <div className="flex items-center gap-2 mt-3 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
                    <Bot className="w-4 h-4 text-sky-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.assignedAgent.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-white/40 capitalize">{item.assignedAgent.role}</p>
                    </div>
                  </div>
                )}

                {canManage && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                    <button
                      onClick={() => openEdit(item)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 h-8 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/[0.12] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Manage
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-500 dark:text-white/60 hover:text-rose-500 disabled:opacity-50 transition-colors"
                      aria-label="Remove number"
                    >
                      {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Provider Webhook & Telephony Gateway Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#140b08] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Telephony Gateway & Webhooks Guide
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                  How to configure real phone numbers from Twilio and Exotel to route to your AI agents.
                </p>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 text-xs text-slate-600 dark:text-white/70">
              {/* Option 1: Exotel (India) */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    🇮🇳 Exotel Telephony (India DLT & Virtual Numbers)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                    Recommended for India
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
                  Best for calling in India (+91) with zero latency and full compliance. Get a Virtual Number (VN) from Exotel, then set the passthru applet URL:
                </p>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Voice Incoming Webhook URL:</div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10">
                    <span className="flex-1 truncate text-slate-800 dark:text-amber-300">{exotelInboundWebhook}</span>
                    <button
                      onClick={() => handleCopy(exotelInboundWebhook, "exotel-inbound")}
                      className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-[10px] font-sans font-bold"
                    >
                      {copiedKey === "exotel-inbound" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Option 2: Twilio (Global / US) */}
              <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    🌐 Twilio Telephony (US & Global Numbers)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-800 dark:text-sky-200">
                    Global PSTN
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
                  In Twilio Console &gt; Phone Numbers &gt; Configure &gt; A Call Comes In &gt; Select <strong>Webhook (HTTP POST)</strong> and paste:
                </p>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">TwiML Inbound Webhook:</div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10">
                    <span className="flex-1 truncate text-slate-800 dark:text-sky-300">{twilioInboundWebhook}</span>
                    <button
                      onClick={() => handleCopy(twilioInboundWebhook, "twilio-inbound")}
                      className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-800 dark:text-sky-200 text-[10px] font-sans font-bold"
                    >
                      {copiedKey === "twilio-inbound" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step by step instructions */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">Connecting Phone Numbers to Agents:</h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-600 dark:text-white/60">
                  <li>Click <strong>&quot;Add Number&quot;</strong> in the top right.</li>
                  <li>Enter your number (e.g. <code>+91 80 4712 3456</code> or <code>+1 415 555 2671</code>).</li>
                  <li>Select your provider (<strong>Twilio</strong>, <strong>Exotel</strong>, or <strong>Sandbox</strong>).</li>
                  <li>Assign your AI Agent (e.g., <strong>Adyapan AI</strong> for Edutech course counseling, <strong>Priya</strong> for Hindi inquiries, or <strong>Srinivas</strong> for Telugu).</li>
                  <li>Save! All calls to that number will instantly trigger real-time AI autonomous voice conversations.</li>
                </ol>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-white/20 hover:bg-slate-800 dark:hover:bg-white/30"
              >
                Got It, Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / edit modal */}
      {showForm && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 bg-white dark:bg-[#1a0405] border border-slate-200 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {form.id ? "Manage Phone Number" : "Add Phone Number"}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="num-number" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Phone Number *</label>
                <input
                  id="num-number"
                  value={form.number}
                  disabled={!!form.id}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="+91 98XXX XXXXX"
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="num-provider" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Provider</label>
                <select
                  id="num-provider"
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p} className="capitalize">{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="num-label" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Label</label>
                <input
                  id="num-label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. Primary sales line"
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label htmlFor="num-status-sel" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Status</label>
                <select
                  id="num-status-sel"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                >
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label htmlFor="num-agent" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Assign to Agent</label>
                <select
                  id="num-agent"
                  value={form.assignedAgentId}
                  onChange={(e) => setForm({ ...form, assignedAgentId: e.target.value })}
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                >
                  <option value="">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isInbound}
                    onChange={(e) => setForm({ ...form, isInbound: e.target.checked })}
                    className="w-4 h-4 accent-[#D42027]"
                  />
                  <span className="text-xs text-slate-700 dark:text-white/80 flex items-center gap-1">
                    <PhoneIncoming className="w-3.5 h-3.5" /> Inbound
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isOutbound}
                    onChange={(e) => setForm({ ...form, isOutbound: e.target.checked })}
                    className="w-4 h-4 accent-[#D42027]"
                  />
                  <span className="text-xs text-slate-700 dark:text-white/80 flex items-center gap-1">
                    <PhoneOutgoing className="w-3.5 h-3.5" /> Outbound
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-2 justify-end pt-2">
                <button onClick={() => setShowForm(false)} className="h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-600 dark:text-white/70">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Number
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}