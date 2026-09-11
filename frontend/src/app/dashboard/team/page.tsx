"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Plus,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  UserPlus,
  Shield,
  ShieldCheck,
  Trash2,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { teamApi, normalizeApiError, TeamMember } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useToast } from "@/components/ui/Toast";

const ROLE_META: Record<string, { label: string; cls: string; icon: any; blurb: string }> = {
  company_admin: { label: "Company Admin", cls: "bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30", icon: Crown, blurb: "Full workspace access" },
  manager: { label: "Manager", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30", icon: ShieldCheck, blurb: "Operates calls, teams, campaigns" },
  agent: { label: "Agent", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30", icon: Shield, blurb: "Handles assigned leads & calls" },
  viewer: { label: "Viewer", cls: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/30", icon: Shield, blurb: "Read-only access" },
  super_admin: { label: "Platform Owner", cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30", icon: Crown, blurb: "Platform-wide ownership" },
};

const INVITE_ROLES = ["viewer", "agent", "manager"];

export default function TeamPage() {
  const { can } = usePermissions();
  const currentUser = useAuthStore((s) => s.user);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", role: "agent" });
  const [inviting, setInviting] = useState(false);
  const [tempPwd, setTempPwd] = useState<string | null>(null);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { success, error: toastError } = useToast();

  const canInvite = can(PERMISSIONS.TEAM_INVITE);
  const canChangeRole = can(PERMISSIONS.TEAM_UPDATE_ROLE);
  const canRevoke = can(PERMISSIONS.TEAM_REVOKE);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setMembers(await teamApi.list());
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async () => {
    if (!invite.name.trim() || !invite.email.trim()) {
      toastError("Name and email are required.");
      return;
    }
    setInviting(true);
    setTempPwd(null);
    try {
      const res = await teamApi.invite({
        name: invite.name.trim(),
        email: invite.email.trim(),
        role: invite.role,
      });
      setShowInvite(false);
      setInvite({ name: "", email: "", role: "agent" });
      setTempPwd((res as any)?.tempPassword ?? null);
      await load();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (m: TeamMember, role: string) => {
    if (m.id === currentUser?.id) return;
    setChangingId(m.id);
    try {
      await teamApi.updateRole(m.id, role);
      success(`${m.name}'s role updated to ${ROLE_META[role]?.label ?? role}.`);
      await load();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setChangingId(null);
    }
  };

  const handleRemove = async (m: TeamMember) => {
    if (m.id === currentUser?.id) return;
    if (!window.confirm(`Remove ${m.name} from the workspace? They will no longer be able to sign in.`)) return;
    setRemovingId(m.id);
    try {
      await teamApi.remove(m.id);
      success(`${m.name} removed from the workspace.`);
      await load();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setRemovingId(null);
    }
  };

  if (!can(PERMISSIONS.TEAM_VIEW)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="rounded-2xl p-8 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Access Restricted</p>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">You do not have permission to view the team.</p>
        </div>
      </div>
    );
  }

  const isActive = (m: TeamMember) => (m as any).isActive !== false;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-brand-500 dark:text-brand-400" /> Team
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            Manage who can access this workspace and the roles they hold.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-brand-500 dark:text-brand-400" : ""}`} />
            Refresh
          </button>
          {canInvite && (
            <button
              onClick={() => setShowInvite(true)}
              className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Invite Member
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {tempPwd && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Invite sent!</p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
            Share the temporary password with the member so they can sign in:
            <span className="ml-2 font-mono font-bold bg-white dark:bg-black/30 px-2 py-0.5 rounded">{tempPwd}</span>
          </p>
        </div>
      )}

      {/* Member list */}
      {loading && members.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-200/60 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
          <Users className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white/70">No team members yet</p>
          <p className="text-xs text-slate-400 dark:text-white/40 mt-1">Invite your first teammate to collaborate.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const rm = ROLE_META[m.role] ?? ROLE_META.viewer;
            const RoleIcon = rm.icon;
            const isSelf = m.id === currentUser?.id;
            const initials = m.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <div
                key={m.id}
                className={cn(
                  "rounded-2xl p-4 panel-card flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4",
                  !isActive(m) && "opacity-60"
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {initials}
                    {isActive(m) && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#150305]" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{m.name}</p>
                      {isSelf && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/25">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-white/40 truncate">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
                  {m.lastLoginAt && (
                    <span className="text-[10px] text-slate-400 dark:text-white/40 whitespace-nowrap" title="Last sign-in">
                      Active {new Date(m.lastLoginAt).toLocaleDateString()}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 dark:text-white/40 hidden md:inline">{rm.blurb}</span>

                  <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold", rm.cls)}>
                    <RoleIcon className="w-3 h-3" /> {rm.label}
                  </span>

                  {!isSelf && canChangeRole && (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m, e.target.value)}
                      disabled={changingId === m.id}
                      aria-label={`Change role for ${m.name}`}
                      className="h-8 rounded-lg px-2 text-[11px] font-semibold bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/70 outline-none focus:border-brand-500 disabled:opacity-50"
                    >
                      {["viewer", "agent", "manager"].map((r) => (
                        <option key={r} value={r}>{ROLE_META[r].label}</option>
                      ))}
                    </select>
                  )}

                  {!isSelf && canRevoke && (
                    <button
                      onClick={() => handleRemove(m)}
                      disabled={removingId === m.id}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-500 dark:text-white/60 hover:text-rose-500 disabled:opacity-50 transition-colors"
                      aria-label={`Remove ${m.name}`}
                    >
                      {removingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite modal */}
      {showInvite && canInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 bg-white dark:bg-[#1a0405] border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Invite Team Member</h3>
              <button onClick={() => setShowInvite(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="inv-name" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Full name *</label>
                <input
                  id="inv-name"
                  value={invite.name}
                  onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label htmlFor="inv-email" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Work email *</label>
                <input
                  id="inv-email"
                  type="email"
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                  placeholder="priya@company.com"
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label htmlFor="inv-role" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Role</label>
                <select
                  id="inv-role"
                  value={invite.role}
                  onChange={(e) => setInvite({ ...invite, role: e.target.value })}
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                >
                  {INVITE_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_META[r].label} — {ROLE_META[r].blurb}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 justify-end pt-2">
                <button onClick={() => setShowInvite(false)} className="h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-600 dark:text-white/70">
                  Cancel
                </button>
                <button onClick={handleInvite} disabled={inviting} className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2 disabled:opacity-50">
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}