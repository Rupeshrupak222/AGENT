"use client";

import { useState, useEffect, useCallback } from "react";
import { BrainCircuit, Plus, Activity, Power, PowerOff, Trash2, KeyRound } from "lucide-react";
import { superAdminApi, AiProviderItem, normalizeApiError } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button, Badge, EmptyState, TableRowSkeleton, Modal, Input, Select, TextArea, ConfirmDialog } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, any> = {
  healthy: "success",
  degraded: "warning",
  down: "error",
  unknown: "gray",
};

const EMPTY_FORM = { name: "", provider: "", baseUrl: "", apiKeyEncrypted: "", defaultModel: "", models: "", rateLimit: "0" };

export default function AiProvidersPage() {
  const { success, error: toastError } = useToast();
  const [providers, setProviders] = useState<AiProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AiProviderItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [probeResult, setProbeResult] = useState<any>(null);
  const [probingId, setProbingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiProviderItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProviders(await superAdminApi.listAiProviders());
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setProbeResult(null);
    setModalOpen(true);
  };

  const openEdit = (p: AiProviderItem) => {
    setEditing(p);
    setForm({
      name: p.name,
      provider: p.provider,
      baseUrl: p.baseUrl || "",
      apiKeyEncrypted: "",
      defaultModel: p.defaultModel || "",
      models: Array.isArray(p.models) ? p.models.join(", ") : "",
      rateLimit: String(p.rateLimit || 0),
    });
    setFormError(null);
    setProbeResult(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim() || !form.provider.trim()) {
      setFormError("Name and provider slug are required");
      return;
    }
    setSaving(true);
    try {
      const models = form.models.split(",").map((s) => s.trim()).filter(Boolean);
      const payload: any = {
        name: form.name.trim(),
        provider: form.provider.trim().toLowerCase().replace(/\s+/g, "_"),
        baseUrl: form.baseUrl.trim() || undefined,
        apiKeyEncrypted: form.apiKeyEncrypted || undefined,
        defaultModel: form.defaultModel.trim() || undefined,
        models,
        rateLimit: Number(form.rateLimit) || 0,
      };
      if (editing) {
        await superAdminApi.updateAiProvider(editing.id, payload);
        success("Provider updated");
      } else {
        await superAdminApi.createAiProvider(payload);
        success("Provider registered");
      }
      setModalOpen(false);
      fetchData();
    } catch (e) {
      setFormError(normalizeApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleProbe = async (id: string) => {
    setProbingId(id);
    setProbeResult(null);
    try {
      const res = await superAdminApi.probeAiProvider(id);
      setProbeResult(res);
      success(`Probe complete: ${res.reachable ? "reachable" : "unreachable"}`);
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setProbingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await superAdminApi.deleteAiProvider(deleteTarget.id);
      success("Provider removed");
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Providers</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Registry of LLM providers available to the platform
            </p>
          </div>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Register Provider
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={5} />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
            </div>
          ) : providers.length === 0 ? (
            <EmptyState
              icon={<BrainCircuit className="w-10 h-10 text-slate-300 dark:text-white/20" />}
              title="No AI providers"
              description="Register an LLM provider to run AI agents"
              action={<Button size="sm" onClick={openCreate}>Register Provider</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Provider</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Default Model</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">API Key</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Status</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Usage</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {providers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-50 dark:bg-brand-500/10">
                            <BrainCircuit className="w-4 h-4 text-brand-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white capitalize">{p.name}</p>
                            <p className="text-xs text-slate-500 dark:text-white/40 font-mono">{p.provider}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-slate-600 dark:text-white/60">{p.defaultModel || "—"}</span>
                        {p.baseUrl && <p className="text-xs text-slate-400 dark:text-white/25 mt-0.5 truncate max-w-[220px]">{p.baseUrl}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {p.apiKeyEncrypted ? (
                          <Badge variant="success" size="sm"><KeyRound className="w-3 h-3 inline mr-1" />Configured</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Not set</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge variant={p.isEnabled ? "success" : "gray"} dot size="sm">{p.isEnabled ? "Enabled" : "Disabled"}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs text-slate-500 dark:text-white/40">{p.usageCount}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={probingId === p.id}
                            icon={<Activity className="w-3.5 h-3.5" />}
                            onClick={() => handleProbe(p.id)}
                          >
                            Probe
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {probeResult && (
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Last Probe Result</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Provider", value: probeResult.provider },
                { label: "Reachable", value: probeResult.reachable ? "Yes" : "No", ok: !!probeResult.reachable },
                { label: "Has API Key", value: probeResult.hasKey ? "Yes" : "No" },
                { label: "Checked At", value: new Date(probeResult.checkedAt).toLocaleTimeString("en-IN") },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.04]">
                  <p className="text-[11px] text-slate-500 dark:text-white/40">{s.label}</p>
                  <p className={cn("text-sm font-semibold mt-0.5", s.ok === false ? "text-red-500" : "text-slate-900 dark:text-white")}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Modal
          open={modalOpen}
          onClose={() => { if (!saving) setModalOpen(false); }}
          title={editing ? "Edit AI Provider" : "Register AI Provider"}
          description="Configure an LLM provider for AI agents"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={handleSave} loading={saving}>Save Provider</Button>
            </>
          }
        >
          <div className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">{formError}</div>
            )}
            <Input label="Display Name" placeholder="OpenRouter" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Provider Slug" placeholder="openrouter" disabled={!!editing} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
            <Input label="Base URL (optional)" placeholder="https://openrouter.ai/api/v1" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
            <Input
              label={editing ? "Replace API Key (leave blank to keep)" : "API Key"}
              type="password"
              placeholder="sk-..."
              value={form.apiKeyEncrypted}
              onChange={(e) => setForm({ ...form, apiKeyEncrypted: e.target.value })}
            />
            <Input label="Default Model" placeholder="openai/gpt-4o-mini" value={form.defaultModel} onChange={(e) => setForm({ ...form, defaultModel: e.target.value })} />
            <TextArea
              label="Model List (comma separated)"
              placeholder="openai/gpt-4o, openai/gpt-4o-mini"
              value={form.models}
              onChange={(e) => setForm({ ...form, models: e.target.value })}
            />
            <Input label="Rate Limit (req/min, 0 = unlimited)" type="number" value={form.rateLimit} onChange={(e) => setForm({ ...form, rateLimit: e.target.value })} />
          </div>
        </Modal>

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Remove AI Provider"
          message={`Are you sure you want to remove "${deleteTarget?.name}"? AI agents may stop working for providers using this registry entry.`}
          confirmLabel="Remove"
          variant="danger"
          loading={deleting}
        />
      </div>
    </AdminLayout>
  );
}