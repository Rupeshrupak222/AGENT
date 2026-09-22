"use client";

import { useState, useEffect, useCallback } from "react";
import { UserCog, Plus, Shield, Power, PowerOff, KeyRound } from "lucide-react";
import { superAdminApi, GovernanceAdmin, normalizeApiError } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button, Badge, EmptyState, TableRowSkeleton, Modal, Input, Skeleton } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export default function AdminsPage() {
  const { success, error: toastError } = useToast();
  const [admins, setAdmins] = useState<GovernanceAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.listAdmins();
      setAdmins(res.items);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    setFormError(null);
    setCreated(null);
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError("All fields are required");
      return;
    }
    setCreating(true);
    try {
      const res = await superAdminApi.createAdmin(form);
      setCreated({ email: res.email, password: (res as any).tempPassword || form.password });
      success("Super admin created");
      fetchData();
    } catch (e) {
      setFormError(normalizeApiError(e));
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (a: GovernanceAdmin) => {
    setTogglingId(a.id);
    try {
      await superAdminApi.updateAdminStatus(a.id, !a.isActive);
      success(a.isActive ? "Admin deactivated" : "Admin activated");
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Super Admins</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Manage Super Admin accounts
            </p>
          </div>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setForm({ name: "", email: "", password: "" }); setFormError(null); setCreated(null); setCreateOpen(true); }}>
            Add Super Admin
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
          ) : admins.length === 0 ? (
            <EmptyState
              icon={<UserCog className="w-10 h-10 text-slate-300 dark:text-white/20" />}
              title="No super admins"
              description="Create the first Super Admin account"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Admin</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Email</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Role</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Status</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {admins.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-brand-700 flex-shrink-0">
                            {a.name?.[0]?.toUpperCase() ?? "A"}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">{a.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-white/40">{a.email}</td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge variant="brand" size="sm"><Shield className="w-3 h-3 inline mr-1" />Super Admin</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge variant={a.isActive ? "success" : "error"} dot size="sm">{a.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          loading={togglingId === a.id}
                          icon={a.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          onClick={() => handleToggle(a)}
                        >
                          {a.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal
          open={createOpen}
          onClose={() => { if (!creating) setCreateOpen(false); }}
          title="Add Super Admin"
          description="Create a new Super Admin account"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)} disabled={creating}>
                {created ? "Close" : "Cancel"}
              </Button>
              {!created && <Button size="sm" onClick={handleCreate} loading={creating} disabled={!form.name.trim() || !form.email.trim() || !form.password.trim()}>
                Create Admin
              </Button>}
            </>
          }
        >
          {created ? (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4 text-center">
              <KeyRound className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Super admin created</p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70 mt-1 break-all">{created.email}</p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70 mt-0.5">Temporary password: <code className="font-mono font-bold">{created.password}</code></p>
            </div>
          ) : (
            <div className="space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">{formError}</div>
              )}
              <Input label="Full Name" placeholder="Enter name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="Email" type="email" placeholder="admin@agentcall.ai" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="Temporary Password" type="text" placeholder="Create a strong password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}