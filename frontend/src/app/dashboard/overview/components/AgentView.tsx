"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Headphones,
  Phone,
  PhoneCall,
  Target,
  Zap,
  UserCheck,
  Mic,
  MicOff,
  Volume2,
  ArrowUpRight,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { WaveAnimation } from "@/components/ui/WaveAnimation";
import { useToast } from "@/components/ui/Toast";
import { leadsApi, LeadItem } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

interface AgentViewProps {
  agentName: string;
  totalCallsCount: number;
  qualifiedLeadsCount: number;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const STATUS_MAP: Record<LeadItem["status"], { label: string; classes: string }> = {
  new: { label: "New Lead", classes: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  contacted: { label: "Contacted", classes: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  interested: { label: "Interested", classes: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  qualified: { label: "Qualified", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  appointment: { label: "Appointment", classes: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  closed_won: { label: "Won", classes: "bg-green-500/10 text-green-400 border-green-500/20" },
  closed_lost: { label: "Lost", classes: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

export function AgentView({
  agentName,
  totalCallsCount,
  qualifiedLeadsCount,
  isLoading,
  onRefresh,
  isRefreshing,
}: AgentViewProps) {
  const { success, info, warning } = useToast();
  const user = useAuthStore((s) => s.user);

  const [agentStatus, setAgentStatus] = useState<"available" | "break" | "busy">("available");
  const [queueLeads, setQueueLeads] = useState<LeadItem[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [quickPhone, setQuickPhone] = useState("");
  const [callingState, setCallingState] = useState<string | null>(null);

  const prevLoadingRef = useRef(isLoading);
  const hasFetchedRef = useRef(false);

  const fetchQueue = useCallback(async () => {
    if (!user?.id) return;
    setQueueLoading(true);
    setQueueError(null);
    try {
      const res = await leadsApi.list({ assignedTo: user.id, limit: 50 });
      setQueueLeads(res.items);
      setQueueTotal(res.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setQueueError(msg);
    } finally {
      setQueueLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchQueue();
    }
  }, [user?.id, fetchQueue]);

  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && user?.id) {
      fetchQueue();
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, user?.id, fetchQueue]);

  const avgScore = queueLeads.length
    ? Math.round(queueLeads.reduce((a, l) => a + (l.score || 0), 0) / queueLeads.length)
    : 0;

  const handleSetStatus = (status: "available" | "break" | "busy") => {
    setAgentStatus(status);
    if (status === "available") success("Workstation status: Available. Ready for incoming calls.");
    if (status === "break") info("Workstation status: On Break. Queue routing paused.");
    if (status === "busy") warning("Workstation status: On Call / DND.");
  };

  const handleRefreshQueue = () => {
    onRefresh();
    fetchQueue();
    success("Refreshed assigned lead queue!");
  };

  const handleDial = (lead: LeadItem) => {
    setCallingState(lead.name);
    success(`Dialing ${lead.name} (${lead.phone})...`);
    setTimeout(() => {
      window.location.href = `/dashboard/calls?leadPhone=${encodeURIComponent(lead.phone)}`;
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Caller Workstation Banner ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 border border-emerald-500/30 shadow-2xl bg-gradient-to-r from-[#03170a] via-[#021208] to-[#0c0102]"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 20% 0%, rgba(16,185,129,0.18) 0%, rgba(18,2,4,0.95) 75%)",
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-brand-700 flex items-center justify-center p-3.5 shadow-xl shadow-emerald-500/20 flex-shrink-0">
              <Headphones className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Welcome to Your Calling Station, {agentName}!
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  WebRTC Media Ready · HD Audio
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-1.5 max-w-2xl leading-relaxed">
                Your personalized caller workstation: Review warm leads transferred by autonomous AI bots,
                place instant 1-click dials, and fulfill scheduled appointment callbacks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-1">
              <button
                onClick={() => handleSetStatus("available")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  agentStatus === "available"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-900/40"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Available
              </button>
              <button
                onClick={() => handleSetStatus("break")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  agentStatus === "break"
                    ? "bg-amber-500 text-white shadow-md shadow-amber-900/40"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Break
              </button>
              <button
                onClick={() => handleSetStatus("busy")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  agentStatus === "busy"
                    ? "bg-rose-500 text-white shadow-md shadow-rose-900/40"
                    : "text-white/50 hover:text-white"
                }`}
              >
                On Call
              </button>
            </div>

            <button
              onClick={handleRefreshQueue}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
              Refresh Queue
            </button>

            <Link
              href="/dashboard/calls"
              className="btn-red text-xs py-2 px-4 h-9 shadow-md shadow-brand-500/25 flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              Full Call Console
            </Link>
          </div>
        </div>

        {/* Real Daily Call Volume Stats */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Today&apos;s Call Volume: <span className="text-emerald-300 font-mono">{totalCallsCount} calls placed today</span>
              </p>
              <p className="text-[11px] text-white/40">Qualified prospects: {qualifiedLeadsCount}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Personal Desk KPIs (4 Cards) ─────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            title: "My Assigned Leads",
            value: queueLoading ? "—" : String(queueTotal),
            subtext: "Assigned to you",
            icon: <UserCheck className="w-5 h-5 text-blue-400" />,
            color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
          },
          {
            title: "Outbound Calls Today",
            value: totalCallsCount.toLocaleString(),
            subtext: "Across tenant today",
            icon: <PhoneCall className="w-5 h-5 text-emerald-400" />,
            color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
          },
          {
            title: "Qualified Prospects",
            value: qualifiedLeadsCount.toLocaleString(),
            subtext: "High-intent leads",
            icon: <Target className="w-5 h-5 text-amber-400" />,
            color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
          },
          {
            title: "In-Queue Lead Score Avg",
            value: queueLoading ? "—" : String(avgScore),
            subtext: `Top ${queueLeads.length} assigned`,
            icon: <Zap className="w-5 h-5 text-purple-400" />,
            color: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
          },
        ].map((k, idx) => (
          <motion.div
            key={k.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            className="relative group overflow-hidden rounded-2xl p-4 sm:p-5 panel-card border border-white/[0.08] hover:border-emerald-500/40 transition-all duration-300 shadow-xl"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${k.color}`}>
                {k.icon}
              </div>
              <span className="text-[11px] font-medium text-white/40 font-mono">
                {k.subtext}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
              {k.value}
            </p>
            <p className="text-xs text-white/50 mt-1 font-medium">{k.title}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Section 1: Priority Dialing Queue (Calling Deck) ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl p-5 sm:p-6 panel-card border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                Priority Calling Queue (Next Assigned Leads)
              </h3>
              <p className="text-xs text-white/40 mt-0.5">
                Pre-qualified warm leads assigned to your queue. Click Call Customer Now to initiate WebRTC dial
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-300 font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              {queueTotal} Ready in Queue · Assigned to you
            </span>
          </div>

          <div className="space-y-4">
            {queueLoading && (
              <div className="flex items-center justify-center py-10 gap-2 text-white/50 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                Loading assigned leads…
              </div>
            )}

            {!queueLoading && queueError && (
              <div className="text-center py-10 space-y-3">
                <p className="text-sm text-rose-400">Couldn&apos;t load your assigned leads. {queueError}</p>
                <button
                  onClick={fetchQueue}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white transition-all"
                >
                  Retry
                </button>
              </div>
            )}

            {!queueLoading && !queueError && queueLeads.length === 0 && (
              <div className="text-center py-10 space-y-2">
                <p className="text-sm text-white/50">No leads assigned to you yet. Leads assigned by your team will appear here.</p>
                <Link
                  href="/dashboard/crm"
                  className="inline-block text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Open My Full Leads CRM →
                </Link>
              </div>
            )}

            {!queueLoading && !queueError && queueLeads.map((lead) => {
              const st = STATUS_MAP[lead.status];
              return (
                <div
                  key={lead.id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300 flex-shrink-0 mt-0.5">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white">{lead.name}</p>
                        <span className="text-xs text-white/40 font-medium">({lead.company || "—"})</span>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${st.classes}`}>
                          {st.label}
                        </span>
                        {lead.score > 0 && (
                          <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.2 rounded border border-purple-500/20">
                            Score {lead.score}
                          </span>
                        )}
                      </div>
                      {lead.notes && (
                        <p className="text-xs text-white/70 mt-1 leading-relaxed">{lead.notes}</p>
                      )}
                      <p className="text-xs font-mono text-white/40 mt-1">Phone: {lead.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDial(lead)}
                      disabled={callingState === lead.name}
                      className="btn-red text-xs py-2 px-4 h-9 shadow-md shadow-brand-500/25 flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 fill-white" />
                      {callingState === lead.name ? "Connecting WebRTC..." : "Call Customer Now"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick WebRTC Direct Dial Pad & Callback Timeline */}
        <div className="rounded-2xl p-5 sm:p-6 panel-card border border-white/[0.08] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              Quick WebRTC Direct Dial
            </h3>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="+91 or E.164 Number..."
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <button
                onClick={() => {
                  if (quickPhone) {
                    success(`Starting WebRTC call to ${quickPhone}...`);
                    window.location.href = `/dashboard/calls?leadPhone=${encodeURIComponent(quickPhone)}`;
                  }
                }}
                disabled={!quickPhone}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
              >
                <Phone className="w-3.5 h-3.5" />
                Start Instant WebRTC Call
              </button>
            </div>

            <div className="pt-6 border-t border-white/[0.06] mt-6">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                Today&apos;s Callback Schedule
              </h4>
              <p className="text-xs text-white/40 leading-relaxed">
                No appointment callbacks are tracked in this view. Open a lead in the CRM to schedule follow-ups.
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/crm"
            className="mt-6 block text-center text-xs font-semibold py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/80 hover:text-white transition-all"
          >
            Open My Full Leads CRM →
          </Link>
        </div>
      </div>
    </div>
  );
}
