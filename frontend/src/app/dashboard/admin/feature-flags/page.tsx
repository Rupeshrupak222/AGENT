"use client";

import { useState, useEffect, useCallback } from "react";
import { Flag, Plus, Trash2, Power, PowerOff, SlidersHorizontal } from "lucide-react";
import { superAdminApi, FeatureFlagItem, normalizeApiError } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button, Badge, EmptyState, TableRowSkeleton, Modal, Input, ConfirmDialog } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const EMPTY_FORM = { key: "", description: "", isEnabled: false, rollout: 100 };

export default function FeatureFlagsPage() {
  const { success, error: toastError } = useToast();
  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureFlagItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<FeatureFlagItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.listFeatureFlags();
      setFlags(res.items);
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

  const openEdit = (f: FeatureFlagItem) => {
    setEditing(f);
    setForm({ key: f.key, description: f.description || "", isEnabled: f.isEnabled, rollout: f.rollout });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.key.trim()) {
      setFormError("Flag key is required");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        key: form.key.trim().toLowerCase(),
        description: form.description.trim() || undefined,
        isEnabled: form.isEnabled,
        rollout: form.rollout,
      };
      if (editing) {
        await superAdminApi.updateFeatureFlag(editing.id, payload);
        success("Feature flag updated");
      } else {
        await superAdminApi.createFeatureFlag(payload);
        success("Feature flag created");
      }
      setModalOpen(false);
      fetchData();
    } catch (e) {
      setFormError(normalizeApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (f: FeatureFlagItem) => {
    setTogglingId(f.id);
    try {
      await superAdminApi.updateFeatureFlag(f.id, { isEnabled: !f.isEnabled });
      success(f.isEnabled ? "Feature disabled" : "Feature enabled");
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await superAdminApi.deleteFeatureFlag(deleteTarget.id);
      success("Feature flag deleted");
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Feature Flags</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Toggle platform-wide capabilities for all tenants
            </p>
          </div>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            New Flag
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={4} />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
            </div>
          ) : flags.length === 0 ? (
            <EmptyState
              icon={<Flag className="w-10 h-10 text-slate-300 dark:text-white/20" />}
              title="No feature flags"
              description="Create a flag to enable or disable a platform capability"
              action={<Button size="sm" onClick={openCreate}>New Flag</Button>}
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {flags.map((f) => (
                <div key={f.id} className="p-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{f.key}</h3>
                        <Badge variant={f.isEnabled ? "success" : "gray"} size="sm" dot>{f.isEnabled ? "Enabled" : "Disabled"}</Badge>
                      </div>
                      {f.description && (
                        <p className="text-sm text-slate-600 dark:text-white/60 mt-1">{f.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-white/30">
                        <span>Rollout: {f.rollout}%</span>
                        <span>{f.defaultEnabled ? "Default on" : "Default off"}</span>
                        {Object.keys(f.tenantOverride || {}).length > 0 && (
                          <span>{Object.keys(f.tenantOverride).length} overrides</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button variant="ghost" size="sm" loading={togglingId === f.id} icon={f.isEnabled ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />} onClick={() => handleToggle(f)}>
                        {f.isEnabled ? "Disable" : "Enable"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(f)}>Edit</Button>
                      <button onClick={() => setDeleteTarget(f)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal
          open={modalOpen}
          onClose={() => { if (!saving) setModalOpen(false); }}
          title={editing ? "Edit Feature Flag" : "New Feature Flag"}
          description="Changes apply platform-wide"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={handleSave} loading={saving}>{editing ? "Save Changes" : "Create Flag"}</Button>
            </>
          }
        >
          <div className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">{formError}</div>
            )}
            <Input
              label="Flag Key"
              placeholder="e.g. voice_ai, whatsapp_automation"
              disabled={!!editing}
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
            />
            <Input
              label="Description"
              placeholder="What this flag controls"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-white/60 mb-1.5 block">Rollout (%)</label>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={form.rollout}
                    onChange={(e) => setForm({ ...form, rollout: Number(e.target.value) })}
                    className="flex-1 accent-brand-500"
                  />
                  <span className="w-10 text-right text-sm font-bold text-slate-900 dark:text-white">{form.rollout}%</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isEnabled: !form.isEnabled })}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                form.isEnabled
                  ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10"
                  : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04]"
              )}
            >
              <span className="text-sm font-medium text-slate-700 dark:text-white/70">Enabled</span>
              <span className={cn(
                "relative w-10 h-5 rounded-full transition-colors",
                form.isEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/15"
              )}>
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                  form.isEnabled ? "left-[22px]" : "left-0.5"
                )} />
              </span>
            </button>
          </div>
        </Modal>

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Feature Flag"
          message={`Are you sure you want to delete "${deleteTarget?.key}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
        />
      </div>
    </AdminLayout>
  );
}