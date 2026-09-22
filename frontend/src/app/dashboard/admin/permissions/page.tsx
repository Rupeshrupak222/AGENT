"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings2, Save, RotateCcw, ShieldAlert } from "lucide-react";
import { superAdminApi, RoleMatrixData, normalizeApiError } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button, Badge, EmptyState, TableRowSkeleton, ConfirmDialog } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export default function PermissionsPage() {
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<RoleMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, Set<string>>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<{ role: string; label: string } | null>(null);
  const [resetting, setResetting] = useState(false);

  const editableRoles = ["company_admin", "manager", "agent", "viewer"];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.getRoleMatrix();
      setData(res);
      const nextDrafts: Record<string, Set<string>> = {};
      res.roles.forEach((r) => { nextDrafts[r.role] = new Set(r.permissions); });
      setDrafts(nextDrafts);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggle = (role: string, perm: string) => {
    setDrafts((prev) => {
      const next = new Set(prev[role] || []);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return { ...prev, [role]: next };
    });
  };

  const handleSave = async (role: string) => {
    setSavingRole(role);
    try {
      await superAdminApi.updateRolePermissions(role, Array.from(drafts[role] || []));
      success("Permissions updated");
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setSavingRole(null);
    }
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      await superAdminApi.resetRolePermissions(resetTarget.role);
      success(`${resetTarget.label} restored to defaults`);
      setResetTarget(null);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setResetting(false);
    }
  };

  const original = (role: string) => data?.roles.find((r) => r.role === role)?.permissions || [];
  const isDirty = (role: string) => {
    const a = Array.from(drafts[role] || []).sort().join(",");
    const b = [...original(role)].sort().join(",");
    return a !== b;
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Role Permissions Matrix</h1>
          <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
            Grant or revoke workspace permissions per role. Super admin always retains full access.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.04]">
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={5} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
          </div>
        ) : !data ? (
          <EmptyState
            icon={<Settings2 className="w-10 h-10 text-slate-300 dark:text-white/20" />}
            title="No permission data"
            description="The permission matrix could not be loaded"
          />
        ) : (
          <div className="space-y-6">
            {data.groups.map((group) => (
              <div key={group.group} className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{group.label}</h3>
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">{group.permissions.length} permissions</p>
                  </div>
                  <div className="hidden md:flex items-center gap-4 pr-1">
                    {editableRoles.map((r) => (
                      <span key={r} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/30 w-24 text-center">
                        {r.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {group.permissions.map((perm) => (
                    <div key={perm.value} className="px-5 py-3 flex flex-col md:flex-row md:items-center gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{perm.label}</p>
                        <p className="text-xs font-mono text-slate-400 dark:text-white/25">{perm.value}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {editableRoles.map((r) => {
                          const checked = drafts[r]?.has(perm.value) ?? false;
                          return (
                            <button
                              key={r}
                              onClick={() => toggle(r, perm.value)}
                              title={`${perm.label} for ${r}`}
                              className="flex items-center justify-center w-24"
                            >
                              <span
                                className={cn(
                                  "w-6 h-6 rounded-lg border-2 transition-all grid place-items-center",
                                  checked
                                    ? "bg-brand-500 border-brand-500 text-white shadow-sm shadow-brand-500/30"
                                    : "border-slate-300 dark:border-white/15 text-transparent hover:border-brand-400"
                                )}
                              >
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Per-role actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.roles.filter((r) => editableRoles.includes(r.role)).map((r) => {
                const dirty = isDirty(r.role);
                return (
                  <div key={r.role} className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{r.label}</h4>
                        <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">{r.description}</p>
                      </div>
                      {r.isOverridden ? (
                        <Badge variant="warning" size="sm">Custom</Badge>
                      ) : (
                        <Badge variant="gray" size="sm">Default</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        icon={<Save className="w-3.5 h-3.5" />}
                        disabled={!dirty}
                        loading={savingRole === r.role}
                        onClick={() => handleSave(r.role)}
                      >
                        {dirty ? "Save Changes" : "Up to date"}
                      </Button>
                      {r.isOverridden && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<RotateCcw className="w-3.5 h-3.5" />}
                          onClick={() => setResetTarget({ role: r.role, label: r.label })}
                        >
                          Reset to Defaults
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-5 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Super Admin</p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5">
                    The super admin role always retains full platform and tenant access and cannot be customized.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!resetTarget}
          onClose={() => setResetTarget(null)}
          onConfirm={handleReset}
          title="Reset Role Permissions"
          message={`Restore the default permission set for "${resetTarget?.label}"? Any custom grants will be removed.`}
          confirmLabel="Reset"
          variant="warning"
          loading={resetting}
        />
      </div>
    </AdminLayout>
  );
}