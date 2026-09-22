"use client";

import { useState, useEffect, useCallback } from "react";
import { KeyRound, Webhook, Plus, Trash2, Copy, Check, Radio, Loader2 } from "lucide-react";
import { superAdminApi, PlatformApiKeyItem, PlatformWebhookItem, normalizeApiError } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button, Badge, EmptyState, TableRowSkeleton, Modal, Input, ConfirmDialog } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const WEBHOOK_EVENTS = [
  "call.completed",
  "call.failed",
  "lead.qualified",
  "lead.created",
  "company.created",
  "campaign.ended",
  "platform.test",
];

export default function ApiKeysPage() {
  const { success, error: toastError } = useToast();
  const [keys, setKeys] = useState<PlatformApiKeyItem[]>([]);
  const [webhooks, setWebhooks] = useState<PlatformWebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyModal, setKeyModal] = useState(false);
  const [keyForm, setKeyForm] = useState({ name: "" });
  const [savingKey, setSavingKey] = useState(false);
  const [keyFormError, setKeyFormError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteKeyTarget, setDeleteKeyTarget] = useState<PlatformApiKeyItem | null>(null);
  const [deletingKey, setDeletingKey] = useState(false);

  const [hookModal, setHookModal] = useState(false);
  const [hookForm, setHookForm] = useState({ name: "", url: "", events: ["platform.test"], isActive: true, secret: "" });
  const [savingHook, setSavingHook] = useState(false);
  const [hookFormError, setHookFormError] = useState<string | null>(null);
  const [editingHook, setEditingHook] = useState<PlatformWebhookItem | null>(null);
  const [deleteHookTarget, setDeleteHookTarget] = useState<PlatformWebhookItem | null>(null);
  const [deletingHook, setDeletingHook] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, w] = await Promise.all([superAdminApi.listApiKeys(), superAdminApi.listWebhooks()]);
      setKeys(k.items);
      setWebhooks(w.items);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateKey = async () => {
    setKeyFormError(null);
    if (!keyForm.name.trim()) { setKeyFormError("Key name is required"); return; }
    setSavingKey(true);
    try {
      const res = await superAdminApi.createApiKey({ name: keyForm.name.trim() });
      setRevealedKey(res.key);
      success("API key created — copy it now");
      setKeyForm({ name: "" });
      fetchData();
    } catch (e) {
      setKeyFormError(normalizeApiError(e));
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!deleteKeyTarget) return;
    setDeletingKey(true);
    try {
      await superAdminApi.deleteApiKey(deleteKeyTarget.id);
      success("API key revoked");
      setDeleteKeyTarget(null);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setDeletingKey(false);
    }
  };

  const copyKey = async () => {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const openCreateHook = () => {
    setEditingHook(null);
    setHookForm({ name: "", url: "", events: ["platform.test"], isActive: true, secret: "" });
    setHookFormError(null);
    setHookModal(true);
  };

  const openEditHook = (w: PlatformWebhookItem) => {
    setEditingHook(w);
    setHookForm({ name: w.name, url: w.url, events: w.events, isActive: w.isActive, secret: "" });
    setHookFormError(null);
    setHookModal(true);
  };

  const toggleEvent = (ev: string) => {
    setHookForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  const handleSaveHook = async () => {
    setHookFormError(null);
    if (!hookForm.url.trim()) { setHookFormError("Webhook URL is required"); return; }
    if (!/^https?:\/\//i.test(hookForm.url.trim())) { setHookFormError("URL must start with http:// or https://"); return; }
    if (hookForm.events.length === 0) { setHookFormError("Select at least one event"); return; }
    setSavingHook(true);
    try {
      const payload: any = { name: hookForm.name.trim() || hookForm.url.trim(), url: hookForm.url.trim(), events: hookForm.events, isActive: hookForm.isActive };
      if (editingHook) {
        await superAdminApi.updateWebhook(editingHook.id, payload);
        success("Webhook updated");
      } else {
        if (hookForm.secret.trim()) payload.secret = hookForm.secret.trim();
        await superAdminApi.createWebhook(payload);
        success("Webhook created");
      }
      setHookModal(false);
      fetchData();
    } catch (e) {
      setHookFormError(normalizeApiError(e));
    } finally {
      setSavingHook(false);
    }
  };

  const handleDeleteHook = async () => {
    if (!deleteHookTarget) return;
    setDeletingHook(true);
    try {
      await superAdminApi.deleteWebhook(deleteHookTarget.id);
      success("Webhook deleted");
      setDeleteHookTarget(null);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setDeletingHook(false);
    }
  };

  const handleTestHook = async (w: PlatformWebhookItem) => {
    setTestingId(w.id);
    try {
      const res = await superAdminApi.testWebhook(w.id);
      if (res.success) success("Webhook ping delivered");
      else toastError(res.error || "Webhook ping failed");
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleHook = async (w: PlatformWebhookItem) => {
    try {
      await superAdminApi.updateWebhook(w.id, { isActive: !w.isActive });
      success(w.isActive ? "Webhook paused" : "Webhook activated");
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">API Keys &amp; Webhooks</h1>
          <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
            Integrate with the platform programmatically
          </p>
        </div>

        {error && !loading && (
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
          </div>
        )}

        {/* ── API keys ─────────────────────────────────────── */}
        <section className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">API Keys</h2>
                <p className="text-xs text-slate-400 dark:text-white/30">Authenticate server-to-server integrations</p>
              </div>
            </div>
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setRevealedKey(null); setKeyModal(true); }}>
              New Key
            </Button>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {Array.from({ length: 2 }).map((_, i) => <TableRowSkeleton key={i} columns={3} />)}
            </div>
          ) : keys.length === 0 ? (
            <EmptyState
              icon={<KeyRound className="w-10 h-10 text-slate-300 dark:text-white/20" />}
              title="No API keys"
              description="Create a key to authenticate automated integrations"
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {keys.map((k) => (
                <div key={k.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{k.name}</span>
                      <Badge variant={k.isActive ? "success" : "gray"} size="sm" dot>{k.isActive ? "Active" : "Revoked"}</Badge>
                      <code className="text-[11px] font-mono bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/40 px-2 py-0.5 rounded">{k.prefix}••••••••••</code>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400 dark:text-white/30">
                      {k.lastUsedAt ? <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span> : <span>Never used</span>}
                      {k.expiresAt && <span>Expires {new Date(k.expiresAt).toLocaleDateString()}</span>}
                      <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => setDeleteKeyTarget(k)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Webhooks ─────────────────────────────────────── */}
        <section className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Webhook className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Webhooks</h2>
                <p className="text-xs text-slate-400 dark:text-white/30">Deliver platform events to your endpoints</p>
              </div>
            </div>
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreateHook}>
              New Webhook
            </Button>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {Array.from({ length: 2 }).map((_, i) => <TableRowSkeleton key={i} columns={3} />)}
            </div>
          ) : webhooks.length === 0 ? (
            <EmptyState
              icon={<Webhook className="w-10 h-10 text-slate-300 dark:text-white/20" />}
              title="No webhooks"
              description="Forward platform events to your own infrastructure"
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {webhooks.map((w) => (
                <div key={w.id} className="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{w.name}</span>
                        <Badge variant={w.isActive ? "success" : "gray"} size="sm" dot>{w.isActive ? "Active" : "Paused"}</Badge>
                        {w.failCount > 0 && <Badge variant="error" size="sm">{w.failCount} failures</Badge>}
                      </div>
                      <p className="text-sm font-mono text-slate-500 dark:text-white/50 mt-1 break-all">{w.url}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {w.events.map((ev) => (
                          <span key={ev} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/40">{ev}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button variant="ghost" size="sm" loading={testingId === w.id} icon={<Radio className="w-3.5 h-3.5" />} onClick={() => handleTestHook(w)}>
                        Test
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleHook(w)}>{w.isActive ? "Pause" : "Activate"}</Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditHook(w)}>Edit</Button>
                      <button onClick={() => setDeleteHookTarget(w)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Create API key modal ─────────────────────────── */}
        <Modal
          open={keyModal}
          onClose={() => { if (!savingKey) setKeyModal(false); }}
          title="New API Key"
          description="The key is shown once after creation"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setKeyModal(false)} disabled={savingKey}>Cancel</Button>
              <Button size="sm" onClick={handleCreateKey} loading={savingKey}>Create Key</Button>
            </>
          }
        >
          {revealedKey ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-4">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Your API key — copy it now, it won&apos;t be shown again</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-800 dark:text-white break-all">{revealedKey}</code>
                  <Button variant="outline" size="sm" onClick={copyKey} icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}>
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => { setRevealedKey(null); setKeyModal(false); }}>
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {keyFormError && (
                <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">{keyFormError}</div>
              )}
              <Input
                label="Key Name"
                placeholder="e.g. Production Integration"
                value={keyForm.name}
                onChange={(e) => setKeyForm({ name: e.target.value })}
              />
            </div>
          )}
        </Modal>

        {/* ── Webhook create/edit modal ────────────────────── */}
        <Modal
          open={hookModal}
          onClose={() => { if (!savingHook) setHookModal(false); }}
          title={editingHook ? "Edit Webhook" : "New Webhook"}
          description="Deliver platform events to your endpoint"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setHookModal(false)} disabled={savingHook}>Cancel</Button>
              <Button size="sm" onClick={handleSaveHook} loading={savingHook}>{editingHook ? "Save Changes" : "Create Webhook"}</Button>
            </>
          }
        >
          <div className="space-y-4">
            {hookFormError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">{hookFormError}</div>
            )}
            <Input
              label="Name"
              placeholder="e.g. CRM sync"
              value={hookForm.name}
              onChange={(e) => setHookForm({ ...hookForm, name: e.target.value })}
            />
            <Input
              label="URL"
              placeholder="https://example.com/hooks/agentcall"
              value={hookForm.url}
              onChange={(e) => setHookForm({ ...hookForm, url: e.target.value })}
            />
            {!editingHook && (
              <Input
                label="Secret (optional — signatures use this)"
                placeholder="Leave blank to auto-generate"
                value={hookForm.secret}
                onChange={(e) => setHookForm({ ...hookForm, secret: e.target.value })}
              />
            )}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-white/60 mb-1.5 block">Events</label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleEvent(ev)}
                    className={cn(
                      "text-left text-xs px-3 py-2 rounded-lg border transition-all",
                      hookForm.events.includes(ev)
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 font-medium"
                        : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40"
                    )}
                  >
                    {ev}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setHookForm({ ...hookForm, isActive: !hookForm.isActive })}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                hookForm.isActive
                  ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10"
                  : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04]"
              )}
            >
              <span className="text-sm font-medium text-slate-700 dark:text-white/70">Active</span>
              <span className={cn("relative w-10 h-5 rounded-full transition-colors", hookForm.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/15")}>
                <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", hookForm.isActive ? "left-[22px]" : "left-0.5")} />
              </span>
            </button>
          </div>
        </Modal>

        <ConfirmDialog
          open={!!deleteKeyTarget}
          onClose={() => setDeleteKeyTarget(null)}
          onConfirm={handleDeleteKey}
          title="Revoke API Key"
          message={`Revoke "${deleteKeyTarget?.name}"? Clients using this key will lose access immediately.`}
          confirmLabel="Revoke"
          variant="danger"
          loading={deletingKey}
        />

        <ConfirmDialog
          open={!!deleteHookTarget}
          onClose={() => setDeleteHookTarget(null)}
          onConfirm={handleDeleteHook}
          title="Delete Webhook"
          message={`Delete "${deleteHookTarget?.name}"? Events will stop being delivered.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deletingHook}
        />
      </div>
    </AdminLayout>
  );
}