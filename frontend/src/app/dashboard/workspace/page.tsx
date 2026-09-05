"use client";
import { useState, useEffect } from "react";
import {
  Users, Trash2, UserPlus, Loader2
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { teamApi, TeamMember } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

function formatJoined(iso?: string | null): string {
  if (!iso) return "Recently";
  try {
    const d = new Date(iso);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "Recently";
  }
}

export default function WorkspacePage() {
  const currentUser = useAuthStore((s) => s.user);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<any>("agent");
  const { success: toastSuccess, error: toastError } = useToast();

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamApi.list();
      setMembers(data);
    } catch (err) {
      setError("Could not load team members. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    setInviting(true);
    try {
      const created = await teamApi.invite({
        name: email.split("@")[0],
        email,
        role: inviteRole,
      });
      setMembers(prev => [...prev, created]);
      setShowInviteModal(false);
      setInviteEmail("");
      toastSuccess(`Invitation sent to ${email}${created && (created as any).tempPassword ? ` — Temp password: ${(created as any).tempPassword}` : ""}`);
    } catch (err) {
      toastError("Failed to send invitation. Please try again.");
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (id: string) => {
    setRemovingId(id);
    try {
      await teamApi.remove(id);
      setMembers(prev => prev.filter(m => m.id !== id));
      toastSuccess("Member removed from workspace.");
    } catch {
      toastError("Failed to remove member. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Workspace & Team Members</h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Manage team access, RBAC permissions, and organization seats.</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-red text-xs py-2 px-4 h-9 shadow-lg shadow-brand-500/25 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Invite Colleague
        </button>
      </div>

      {/* Workspace overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Seats", value: `${members.length}`, color: "text-slate-900 dark:text-white" },
          { label: "Admins", value: members.filter(m => m.role === "company_admin").length, color: "text-brand-600 dark:text-brand-400" },
          { label: "Managers", value: members.filter(m => m.role === "manager").length, color: "text-purple-600 dark:text-purple-400" },
          { label: "Agents", value: members.filter(m => m.role === "agent").length, color: "text-emerald-600 dark:text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-2xl panel-card border border-slate-200 dark:border-white/[0.08] shadow-lg">
            <p className={`text-2xl font-mono font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Team table */}
      <div className="rounded-2xl p-6 panel-card border border-slate-200 dark:border-white/[0.08] shadow-2xl space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Members Directory</h2>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-500 dark:text-white/40 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading team members…
          </div>
        ) : error ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-white/50">{error}</p>
            <button onClick={loadMembers} className="btn-red text-xs py-2 px-4 h-9">Retry</button>
          </div>
        ) : members.length === 0 ? (
          <div className="py-10 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-white/20" />
            <p className="text-sm text-slate-500 dark:text-white/50">No team members yet. Invite your first colleague.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center font-bold text-sm text-white">
                    {member.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{member.name}</p>
                    <p className="text-xs text-slate-500 dark:text-white/40 font-mono">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                    member.role === "company_admin"
                      ? "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30"
                      : member.role === "manager"
                      ? "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30"
                      : member.role === "viewer"
                      ? "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/60 border border-slate-200 dark:border-white/15"
                      : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                  }`}>
                    {member.role.replace("_", " ")}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-white/30 hidden sm:block">Joined {formatJoined(member.createdAt)}</span>
                  {member.role !== "company_admin" && member.id !== currentUser?.id && (
                    <button
                      onClick={() => removeMember(member.id)}
                      disabled={removingId === member.id}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/30 hover:text-rose-500 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                    >
                      {removingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { if (!inviting) setShowInviteModal(false); }} />
          <div className="relative w-full max-w-md bg-modal border border-slate-200 dark:border-white/15 rounded-3xl p-6 shadow-2xl z-10 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Invite Team Member</h3>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">Colleague Email</label>
                <input
                  type="email"
                  required
                  disabled={inviting}
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">Role Permission</label>
                <select
                  value={inviteRole}
                  disabled={inviting}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full h-10 rounded-xl px-3 text-xs bg-input border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                >
                  <option value="manager">Manager (Can manage agents & campaigns)</option>
                  <option value="agent">Agent (Can review calls & leads)</option>
                  <option value="viewer">Viewer (Read-only analytics access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { if (!inviting) setShowInviteModal(false); }}
                  disabled={inviting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100/80 dark:bg-white/[0.05] text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="btn-red text-xs py-2 px-5 h-9 flex items-center gap-2 disabled:opacity-60"
                >
                  {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {inviting ? "Sending…" : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
