"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Radio,
  Copy,
  Check,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
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
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  available: { label: "Available", cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" },
  assigned: { label: "Agent Bound", cls: "bg-amber-500/10 text-amber-300 border border-amber-500/30" },
  inactive: { label: "Standby", cls: "bg-white/5 text-white/40 border border-white/10" },
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

  // Telemetry aggregates
  const telephonyTelemetry = useMemo(() => {
    let inboundCount = 0;
    let outboundCount = 0;
    let boundCount = 0;

    items.forEach((n) => {
      if (n.isInbound) inboundCount++;
      if (n.isOutbound) outboundCount++;
      if (n.assignedAgentId) boundCount++;
    });

    return {
      totalNumbers: total || items.length,
      inboundCount,
      outboundCount,
      boundCount,
    };
  }, [items, total]);

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
      toastError("A number must support at least inbound or outbound direction.");
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
        success("Virtual number updated.");
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
        success("Virtual number provisioned into inventory.");
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
    if (!window.confirm(`De-provision phone number ${item.number}? Inbound routing will terminate immediately.`)) return;
    setDeletingId(item.id);
    try {
      await numbersApi.remove(item.id);
      success("Phone number removed from inventory.");
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
        <div className="rounded-2xl p-8 text-center bg-white/[0.02] border border-white/10">
          <p className="text-sm font-semibold text-white">Access Restricted</p>
          <p className="text-xs text-white/50 mt-1">You do not have permission to view telephony inventory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/20 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <PhoneIncoming className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Telephony Fleet & Carrier DIDs
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Virtual phone numbers, SIP trunks, and webhook routing bindings for your AI workforce
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowGuide(true)}
          >
            <Radio className="w-3.5 h-3.5 mr-1.5 text-brand-500" />
            <span>Webhook Guide</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin text-brand-500" : ""}`} />
            <span>Sync</span>
          </Button>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreate}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Add Virtual DID</span>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Provisioned DIDs</span>
            <Phone className="w-3.5 h-3.5 text-brand-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{telephonyTelemetry.totalNumbers}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Global & Indian National DIDs</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Inbound Routes</span>
            <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{telephonyTelemetry.inboundCount}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Live customer reception lines</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Outbound Trunks</span>
            <PhoneOutgoing className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">{telephonyTelemetry.outboundCount}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Dialer campaign caller IDs</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Assigned Agents</span>
            <Bot className="w-3.5 h-3.5 text-brand-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-brand-600 dark:text-brand-400">{telephonyTelemetry.boundCount}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Bound to neural voice bots</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="num-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search numbers by international digits or department label…"
            className="w-full h-10 pl-9 pr-3 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-brand-500 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            id="num-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 shadow-sm"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Numbers Grid */}
      {loading && items.length === 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-slate-100 dark:bg-slate-900/60 animate-pulse border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <Phone className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">No telephony numbers found</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Add virtual numbers to assign them to your autonomous voice agents.
          </p>
          {canManage && (
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>Provision First DID</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const sm = STATUS_META[item.status] ?? STATUS_META.available;
            return (
              <div
                key={item.id}
                className="rounded-xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/40 dark:hover:border-brand-500/40 flex flex-col justify-between transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-brand-600 dark:text-brand-300 font-bold">
                        {item.provider}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${sm.cls}`}>
                        {sm.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {canManage && (
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-500 disabled:opacity-50 transition-colors"
                          title="Remove"
                        >
                          {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2">
                    <p className="text-base font-bold font-mono text-slate-900 dark:text-white tracking-wide">
                      {item.number}
                    </p>
                    <button
                      onClick={() => handleCopy(item.number, `num-${item.id}`)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                      title="Copy Number"
                    >
                      {copiedKey === `num-${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {item.label && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.label}
                    </p>
                  )}

                  {/* Capabilities */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {item.isInbound && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <PhoneIncoming className="w-2.5 h-2.5" /> Inbound
                      </span>
                    )}
                    {item.isOutbound && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                        <PhoneOutgoing className="w-2.5 h-2.5" /> Outbound
                      </span>
                    )}
                  </div>
                </div>

                {/* Assigned Agent Ribbon */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Routing Target:</span>
                  {item.assignedAgent ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-300">
                      <Bot className="w-3 h-3 text-brand-500" /> {item.assignedAgent.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Provider Webhook Configuration Modal */}
      {/* Provider Webhook Configuration Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setShowGuide(false)}>
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Telephony Webhook Endpoints</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Paste these URLs into your carrier console (Twilio, Exotel, Plivo) for real-time SIP signaling.
                </p>
              </div>
              <button onClick={() => setShowGuide(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">Twilio Inbound Voice Webhook (POST)</span>
                  <button
                    onClick={() => handleCopy(twilioInboundWebhook, "twilio-in")}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copiedKey === "twilio-in" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>Copy URL</span>
                  </button>
                </div>
                <p className="text-xs font-mono text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-950/80 p-2.5 rounded border border-slate-200 dark:border-slate-800 break-all">
                  {twilioInboundWebhook}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">Twilio Status Callback URL (POST)</span>
                  <button
                    onClick={() => handleCopy(twilioStatusWebhook, "twilio-status")}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copiedKey === "twilio-status" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>Copy URL</span>
                  </button>
                </div>
                <p className="text-xs font-mono text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-950/80 p-2.5 rounded border border-slate-200 dark:border-slate-800 break-all">
                  {twilioStatusWebhook}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">Exotel Inbound Call App Webhook</span>
                  <button
                    onClick={() => handleCopy(exotelInboundWebhook, "exotel-in")}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {copiedKey === "exotel-in" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>Copy URL</span>
                  </button>
                </div>
                <p className="text-xs font-mono text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-950/80 p-2.5 rounded border border-slate-200 dark:border-slate-800 break-all">
                  {exotelInboundWebhook}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowGuide(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {form.id ? "Edit Virtual DID" : "Provision Virtual DID"}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="num-val" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number (E.164 Format) *</label>
                <input
                  id="num-val"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="+918045678901 or +14155552671"
                  className="w-full h-10 rounded-lg px-3 text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-brand-500 shadow-xs"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="num-provider" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Carrier Gateway</label>
                  <select
                    id="num-provider"
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    className="w-full h-10 rounded-lg px-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-brand-500 shadow-xs"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="num-label" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Department / Label</label>
                  <input
                    id="num-label"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="e.g. Inbound Sales Primary"
                    className="w-full h-10 rounded-lg px-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-brand-500 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="num-agent" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Assigned Autonomous Agent</label>
                <select
                  id="num-agent"
                  value={form.assignedAgentId}
                  onChange={(e) => setForm({ ...form, assignedAgentId: e.target.value })}
                  className="w-full h-10 rounded-lg px-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-brand-500 shadow-xs"
                >
                  <option value="">Unassigned (Standby Line)</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Direction Capabilities */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isInbound}
                    onChange={(e) => setForm({ ...form, isInbound: e.target.checked })}
                    className="accent-brand-600 w-4 h-4"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">Inbound Reception</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Accept inbound prospect calls</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isOutbound}
                    onChange={(e) => setForm({ ...form, isOutbound: e.target.checked })}
                    className="accent-brand-600 w-4 h-4"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">Outbound Dialing</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Use as caller ID for campaigns</p>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-2 justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  <span>{saving ? "Provisioning..." : "Save Number"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}