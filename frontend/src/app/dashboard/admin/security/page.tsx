"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Plus, Trash2, Globe, Lock, ShieldAlert, Activity } from "lucide-react";
import { superAdminApi, SecurityOverview, GovernanceAdmin, PlatformAuditEntry, normalizeApiError } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button, Badge, EmptyState, TableRowSkeleton, Modal, Input, ConfirmDialog, Skeleton } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export default function SecurityPage() {
  const { success, error: toastError } = useToast();
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [admins, setAdmins] = useState<GovernanceAdmin[]>([]);
  const [audit, setAudit] = useState<PlatformAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allowlistOpen, setAllowlistOpen] = useState(false);
  const [allowlistForm, setAllowlistForm] = useState({ cidr: "", label: "" });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [togglingMfa, setTogglingMfa] = useState<string | null>(null);
  const [requireMfaBusy, setRequireMfaBusy] = useState(false);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; cidr: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, ad, au] = await Promise.all([
        superAdminApi.getSecurityOverview(),
        superAdminApi.listAdmins(),
        superAdminApi.listPlatformAudit({ limit: 10 }),
      ]);
      setOverview(ov);
      setAdmins(ad.items);
      setAudit(au.items);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    setAddError(null);
    if (!allowlistForm.cidr.trim()) {
      setAddError("CIDR is required (e.g. 203.0.113.5 or 10.0.0.0/8)");
      return;
    }
    setAdding(true);
    try {
      await superAdminApi.addAllowlist({ cidr: allowlistForm.cidr.trim(), label: allowlistForm.label.trim() || undefined });
      success("IP added to allowlist");
      setAllowlistOpen(false);
      fetchData();
    } catch (e) {
      setAddError(normalizeApiError(e));
    } finally {
      setAdding(false);
    }
  };

  const handleToggleAllowlist = async (id: string, isActive: boolean) => {
    try {
      await superAdminApi.toggleAllowlist(id, !isActive);
      success(isActive ? "Entry deactivated" : "Entry activated");
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    }
  };

  const handleDeleteAllowlist = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await superAdminApi.deleteAllowlist(deleteTarget.id);
      success("Entry removed");
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleMfa = async (a: GovernanceAdmin) => {
    setTogglingMfa(a.id);
    try {
      await superAdminApi.setUserMfa(a.id, !a.mfaEnabled);
      success(`${a.name}: MFA ${a.mfaEnabled ? "disabled" : "enabled"}`);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setTogglingMfa(null);
    }
  };

  const handleRequireMfa = async () => {
    if (!overview) return;
    setRequireMfaBusy(true);
    try {
      await superAdminApi.setRequireMfa(!overview.requireMfa);
      success(!overview.requireMfa ? "MFA enforcement enabled for super admins" : "MFA enforcement disabled");
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setRequireMfaBusy(false);
    }
  };

  const handleMaintenance = async () => {
    if (!overview) return;
    setMaintenanceBusy(true);
    try {
      const res = await superAdminApi.setMaintenanceMode(!overview.maintenanceMode);
      success(res.maintenanceMode ? "Maintenance mode enabled — tenant access paused" : "Maintenance mode disabled");
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setMaintenanceBusy(false);
    }
  };

  const stats = [
    { label: "Allowlisted IPs", value: overview?.allowlistCount ?? 0, icon: Globe, color: "bg-sky-50 dark:bg-sky-500/10 text-sky-500" },
    { label: "Admins with MFA", value: overview?.mfaEnabledCount ?? 0, icon: Lock, color: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" },
    { label: "Super Admins", value: overview?.superAdmins ?? 0, icon: ShieldCheck, color: "bg-amber-50 dark:bg-amber-500/10 text-amber-500" },
    { label: "Require MFA", value: overview?.requireMfa ? "On" : "Off", icon: ShieldAlert, color: "bg-violet-50 dark:bg-violet-500/10 text-violet-500" },
  ];

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Security</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              IP allowlist, MFA policy, and admin access control
            </p>
          </div>
          <Button
            size="sm"
            loading={requireMfaBusy}
            variant={overview?.requireMfa ? "outline" : undefined}
            icon={<Lock className="w-4 h-4" />}
            onClick={handleRequireMfa}
          >
            {overview?.requireMfa ? "Disable MFA Enforcement" : "Enforce MFA for Admins"}
          </Button>
          <Button
            size="sm"
            loading={maintenanceBusy}
            variant={overview?.maintenanceMode ? "danger" : "outline"}
            icon={<ShieldAlert className="w-4 h-4" />}
            onClick={handleMaintenance}
          >
            {overview?.maintenanceMode ? "Exit Maintenance Mode" : "Enable Maintenance Mode"}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="p-5 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm">
                  <div className={cn("p-2.5 rounded-xl inline-flex mb-3", s.color)}>
                    <s.icon className="w-4.5 h-4.5" />
                  </div>
                  <p className={cn("text-2xl font-extrabold tracking-tight", s.label === "Require MFA" && overview?.requireMfa ? "text-emerald-500" : "text-slate-900 dark:text-white")}>
                    {s.value}
                  </p>
                  <p className="text-xs mt-1 font-medium text-slate-500 dark:text-white/40">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* IP Allowlist */}
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">IP Allowlist</h3>
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                      Only these IPs can access platform administration when non-empty
                    </p>
                  </div>
                  <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setAllowlistForm({ cidr: "", label: "" }); setAddError(null); setAllowlistOpen(true); }}>
                    Add IP
                  </Button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {(overview?.allowlist || []).length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-white/40">
                      Allowlist is empty — platform admin access is unrestricted.
                    </p>
                  ) : (
                    overview!.allowlist.map((entry) => (
                      <div key={entry.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">{entry.cidr}</p>
                          {entry.label && <p className="text-xs text-slate-500 dark:text-white/40 truncate">{entry.label}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleToggleAllowlist(entry.id, entry.isActive)}
                            className={cn(
                              "relative w-10 h-5.5 rounded-full transition-colors",
                              entry.isActive ? "bg-brand-500" : "bg-slate-300 dark:bg-white/15"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform",
                                entry.isActive ? "translate-x-5" : "translate-x-0.5"
                              )}
                            />
                          </button>
                          <button onClick={() => setDeleteTarget({ id: entry.id, cidr: entry.cidr })} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Admin MFA */}
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.06]">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Super Admin MFA</h3>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                    Toggle two-factor authentication per administrator
                  </p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {admins.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-white/40">No super admins found.</p>
                  ) : (
                    admins.map((a) => (
                      <div key={a.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-brand-700 flex-shrink-0">
                            {a.name?.[0]?.toUpperCase() ?? "A"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.name}</p>
                            <p className="text-xs text-slate-500 dark:text-white/40 truncate">{a.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={a.mfaEnabled ? "success" : "warning"} size="sm">{a.mfaEnabled ? "MFA On" : "No MFA"}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            loading={togglingMfa === a.id}
                            onClick={() => handleToggleMfa(a)}
                          >
                            {a.mfaEnabled ? "Disable" : "Enable"}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Recent platform audit */}
            <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.06]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Platform Actions</h3>
              </div>
              {audit.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-white/40">
                  No platform admin actions yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {audit.map((a) => (
                    <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-white/[0.04] flex-shrink-0">
                        <Activity className="w-4 h-4 text-slate-400 dark:text-white/30" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{a.action}</p>
                        <p className="text-xs text-slate-500 dark:text-white/40 truncate">
                          {a.resource}{a.resourceId ? ` · ${a.resourceId}` : ""} · {a.userEmail || "unknown"}
                        </p>
                      </div>
                      <span className="ml-auto text-[10px] text-slate-400 dark:text-white/30 flex-shrink-0">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <Modal
          open={allowlistOpen}
          onClose={() => { if (!adding) setAllowlistOpen(false); }}
          title="Add IP to Allowlist"
          description="Restrict platform administration to trusted IPs"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setAllowlistOpen(false)} disabled={adding}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} loading={adding} disabled={!allowlistForm.cidr.trim()}>Add to Allowlist</Button>
            </>
          }
        >
          <div className="space-y-4">
            {addError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">{addError}</div>
            )}
            <Input label="IP / CIDR" placeholder="203.0.113.5 or 10.0.0.0/8" value={allowlistForm.cidr} onChange={(e) => setAllowlistForm({ ...allowlistForm, cidr: e.target.value })} />
            <Input label="Label (optional)" placeholder="Office IP" value={allowlistForm.label} onChange={(e) => setAllowlistForm({ ...allowlistForm, label: e.target.value })} />
          </div>
        </Modal>

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteAllowlist}
          title="Remove Allowlist Entry"
          message={`Remove ${deleteTarget?.cidr} from the IP allowlist?`}
          confirmLabel="Remove"
          variant="danger"
          loading={deleting}
        />
      </div>
    </AdminLayout>
  );
}