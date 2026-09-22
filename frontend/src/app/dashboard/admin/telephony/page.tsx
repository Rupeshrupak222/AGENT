"use client";

import { useState, useEffect, useCallback } from "react";
import { RadioTower, Plus, Activity, Trash2, PhoneCall } from "lucide-react";
import { superAdminApi, TelephonyGatewayItem, NumberPoolItem, normalizeApiError } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button, Badge, EmptyState, TableRowSkeleton, Modal, Input, Select, TextArea, ConfirmDialog, Tabs } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const HEALTH_BADGE: Record<string, any> = {
  healthy: "success",
  degraded: "warning",
  down: "error",
  unknown: "gray",
};

const EMPTY_FORM = { name: "", provider: "", settings: "" };

export default function TelephonyPage() {
  const { success, error: toastError } = useToast();
  const [gateways, setGateways] = useState<TelephonyGatewayItem[]>([]);
  const [numbers, setNumbers] = useState<{ items: NumberPoolItem[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("gateways");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TelephonyGatewayItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [probingId, setProbingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TelephonyGatewayItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, n] = await Promise.all([superAdminApi.listGateways(), superAdminApi.listNumberPool()]);
      setGateways(g);
      setNumbers(n);
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
    setModalOpen(true);
  };

  const openEdit = (gw: TelephonyGatewayItem) => {
    setEditing(gw);
    const settings = (gw.settings && typeof gw.settings === "object" ? gw.settings : {}) as Record<string, any>;
    setForm({
      name: gw.name,
      provider: gw.provider,
      settings: Object.entries(settings).map(([k, v]) => `${k}: ${v}`).join("\n"),
    });
    setFormError(null);
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
      const settings: Record<string, string> = {};
      form.settings.split("\n").map((l) => l.trim()).filter(Boolean).forEach((l) => {
        const idx = l.indexOf(":");
        if (idx > 0) settings[l.slice(0, idx).trim()] = l.slice(idx + 1).trim();
      });
      const payload: any = { name: form.name.trim(), provider: form.provider.trim().toLowerCase().replace(/\s+/g, "_"), settings };
      if (editing) {
        await superAdminApi.updateGateway(editing.id, payload);
        success("Gateway updated");
      } else {
        await superAdminApi.createGateway(payload);
        success("Gateway registered");
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
    try {
      const res = await superAdminApi.probeGateway(id);
      success(`Gateway health: ${res.healthStatus}`);
      fetchData();
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
      await superAdminApi.deleteGateway(deleteTarget.id);
      success("Gateway removed");
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Telephony & Numbers</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Manage telephony gateways and the platform number pool
            </p>
          </div>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Register Gateway
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          <Tabs
            tabs={[
              { id: "gateways", label: "Gateways", count: gateways.length },
              { id: "numbers", label: "Number Pool", count: numbers.total },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

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
          ) : activeTab === "gateways" ? (
            gateways.length === 0 ? (
              <EmptyState
                icon={<RadioTower className="w-10 h-10 text-slate-300 dark:text-white/20" />}
                title="No telephony gateways"
                description="Register a gateway to route calls through the platform"
                action={<Button size="sm" onClick={openCreate}>Register Gateway</Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Gateway</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Base URL</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Health</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Enabled</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Last Checked</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {gateways.map((gw) => (
                      <tr key={gw.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-50 dark:bg-brand-500/10">
                              <RadioTower className="w-4 h-4 text-brand-500" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white capitalize">{gw.name}</p>
                              <p className="text-xs text-slate-500 dark:text-white/40 font-mono">{gw.provider}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-slate-600 dark:text-white/60 truncate max-w-[220px] block">
                            {(gw.settings as any)?.baseUrl || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <Badge variant={HEALTH_BADGE[gw.healthStatus] || "gray"} dot size="sm">{gw.healthStatus}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <Badge variant={gw.isEnabled ? "success" : "gray"} size="sm">{gw.isEnabled ? "Enabled" : "Disabled"}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-center text-xs text-slate-500 dark:text-white/40">
                          {gw.lastCheckedAt ? new Date(gw.lastCheckedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="ghost" size="sm" loading={probingId === gw.id} icon={<Activity className="w-3.5 h-3.5" />} onClick={() => handleProbe(gw.id)}>
                              Probe
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(gw)}>Edit</Button>
                            <button onClick={() => setDeleteTarget(gw)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : numbers.items.length === 0 ? (
            <EmptyState
              icon={<PhoneCall className="w-10 h-10 text-slate-300 dark:text-white/20" />}
              title="No numbers in the pool"
              description="Numbers allocated to tenants will appear here"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Number</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Tenant</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Assigned Agent</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Status</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Allocated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {numbers.items.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 font-mono text-sm text-slate-900 dark:text-white">{n.number}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-white/40">{n.tenant?.name || "—"}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-white/40">{n.assignedAgent?.name || "—"}</td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge variant={n.isActive ? "success" : "gray"} dot size="sm">{n.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-white/40">
                        {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal
          open={modalOpen}
          onClose={() => { if (!saving) setModalOpen(false); }}
          title={editing ? "Edit Gateway" : "Register Gateway"}
          description="Configure a telephony provider gateway"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={handleSave} loading={saving}>Save Gateway</Button>
            </>
          }
        >
          <div className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">{formError}</div>
            )}
            <Input label="Display Name" placeholder="Twilio" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Provider Slug" placeholder="twilio" disabled={!!editing} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
            <TextArea
              label="Settings (key: value per line)"
              placeholder={"baseUrl: https://voice.twilio.com\napiKey: xxx\nsecret: xxx"}
              value={form.settings}
              onChange={(e) => setForm({ ...form, settings: e.target.value })}
            />
          </div>
        </Modal>

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Remove Gateway"
          message={`Are you sure you want to remove "${deleteTarget?.name}"? Calls routed through this gateway may fail.`}
          confirmLabel="Remove"
          variant="danger"
          loading={deleting}
        />
      </div>
    </AdminLayout>
  );
}