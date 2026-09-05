"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Phone,
  PhoneCall,
  Target,
  Clock,
  Calendar,
  Award,
  Radio,
  Headphones,
  CheckCircle2,
  Download,
  Check,
} from "lucide-react";
import { WaveAnimation } from "@/components/ui/WaveAnimation";
import { useToast } from "@/components/ui/Toast";
import { DashboardMetrics, CallMetrics, CallItem, AgentItem } from "@/lib/api";

interface ManagerViewProps {
  metrics: DashboardMetrics | null;
  callMetrics: CallMetrics | null;
  recentCalls: CallItem[];
  allAgents: AgentItem[];
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ManagerView({
  metrics,
  callMetrics,
  recentCalls,
  allAgents,
  isLoading,
  onRefresh,
  isRefreshing,
}: ManagerViewProps) {
  const { success } = useToast();

  const totalCallsCount = metrics?.totalCalls ?? callMetrics?.total ?? 0;
  const connectedCallsCount = metrics?.connected ?? callMetrics?.completed ?? 0;
  const qualifiedLeadsCount = metrics?.qualified ?? 0;
  const avgDurationSeconds = metrics?.avgDuration ?? callMetrics?.avgDuration ?? 0;
  const appointmentsCount = metrics?.appointments ?? 0;

  const liveCalls = recentCalls.filter(
    (c) => c.status === "in_progress" || c.status === "ringing"
  );

  const pendingReviews = recentCalls.filter(
    (c) => c.status === "completed" && (c.qualityScore == null || c.sentimentScore == null)
  );

  const [queue, setQueue] = useState<CallItem[]>(() => pendingReviews);

  useEffect(() => {
    setQueue(
      recentCalls.filter(
        (c) =>
          c.status === "completed" &&
          (c.qualityScore == null || c.sentimentScore == null)
      )
    );
  }, [recentCalls]);

  const handleDismiss = (id: string) => {
    setQueue((prev) => prev.filter((c) => c.id !== id));
    success("Call removed from review queue");
  };

  const handleExportCalls = () => {
    const rows = [
      ["id", "phone", "direction", "status", "startedAt", "duration", "lead name", "agent name"],
      ...recentCalls.map((c) => [
        c.id,
        c.lead?.phone ?? c.phone,
        c.direction,
        c.status,
        c.startedAt,
        c.duration != null ? String(c.duration) : "",
        c.lead?.name ?? "",
        c.agent?.name ?? "",
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows
        .map((r) =>
          r
            .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
    const encodedUri = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `calls_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Calls CSV downloaded successfully");
  };

  return (
    <div className="space-y-6">
      {/* ── Top Operations Banner ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 border border-purple-500/30 shadow-2xl bg-gradient-to-r from-[#17051a] via-[#12020f] to-[#0c0102]"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 20% 0%, rgba(168,85,247,0.18) 0%, rgba(18,2,4,0.95) 75%)",
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-rose-700 flex items-center justify-center p-3.5 shadow-xl shadow-purple-500/20 flex-shrink-0">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Campaign Operations Hub
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  Live Campaign Floor
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-1.5 max-w-2xl leading-relaxed">
                Monitor active calling campaigns, review live conversations and audit call quality.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <button
              onClick={handleExportCalls}
              disabled={recentCalls.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/90 hover:text-white transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              Export calls
            </button>

            <Link
              href="/dashboard/calls"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 transition-all"
            >
              <Headphones className="w-3.5 h-3.5" />
              Open Call Floor
            </Link>
          </div>
        </div>

        {/* Campaign Execution Progress Bar */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Campaign Progress: <span className="text-purple-300 font-mono">540 / 1,000 Dialed (54%)</span>
              </p>
              <p className="text-[11px] text-white/40">460 Contacts pending in autonomous dial queue</p>
            </div>
          </div>
          <div className="w-full sm:w-64 h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400" style={{ width: "54%" }} />
          </div>
        </div>
      </motion.div>

      {/* ── Campaign Operations KPIs (8 Cards) ───────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            title: "Campaign Outbound Dials",
            value: isLoading ? "—" : totalCallsCount.toLocaleString(),
            subtext: "Dialed attempts",
            icon: <Phone className="w-5 h-5 text-blue-400" />,
            color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
          },
          {
            title: "Live Connect Rate",
            value: isLoading
              ? "—"
              : totalCallsCount > 0
              ? `${((connectedCallsCount / totalCallsCount) * 100).toFixed(1)}%`
              : "0%",
            subtext: `${connectedCallsCount} reached`,
            icon: <PhoneCall className="w-5 h-5 text-emerald-400" />,
            color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
          },
          {
            title: "QA Qualified Leads",
            value: isLoading ? "—" : qualifiedLeadsCount.toLocaleString(),
            subtext: "Passed AI qualification",
            icon: <Target className="w-5 h-5 text-purple-400" />,
            color: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
          },
          {
            title: "Booked Appointments",
            value: isLoading ? "—" : appointmentsCount.toLocaleString(),
            subtext: "Scheduled demos",
            icon: <Calendar className="w-5 h-5 text-amber-400" />,
            color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
          },
          {
            title: "Avg Handle Time (AHT)",
            value: isLoading
              ? "—"
              : `${Math.floor(avgDurationSeconds / 60)}m ${avgDurationSeconds % 60}s`,
            subtext: "Per completed session",
            icon: <Clock className="w-5 h-5 text-cyan-400" />,
            color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
          },
          {
            title: "Active Callers",
            value: isLoading ? "—" : `${allAgents.length} AI + 2 Reps`,
            subtext: "Online on floor",
            icon: <Users className="w-5 h-5 text-brand-400" />,
            color: "from-brand-500/20 to-brand-600/10 border-brand-500/30",
          },
          {
            title: "Callbacks Due Today",
            value: isLoading ? "—" : "5 Pending",
            subtext: "Action required",
            icon: <Radio className="w-5 h-5 text-rose-400" />,
            color: "from-rose-500/20 to-rose-600/10 border-rose-500/30",
          },
          {
            title: "Conversion Rate",
            value: isLoading
              ? "—"
              : totalCallsCount > 0
              ? `${((qualifiedLeadsCount / totalCallsCount) * 100).toFixed(1)}%`
              : "0%",
            subtext: "Dial to meeting",
            icon: <Award className="w-5 h-5 text-teal-400" />,
            color: "from-teal-500/20 to-teal-600/10 border-teal-500/30",
          },
        ].map((k, idx) => (
          <motion.div
            key={k.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            className="relative group overflow-hidden rounded-2xl p-4 sm:p-5 panel-card border border-white/[0.08] hover:border-purple-500/40 transition-all duration-300 shadow-xl"
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

      {/* ── Section 1: Live Calls Monitoring ─────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl p-5 sm:p-6 panel-card border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                Live Ongoing Calls
              </h3>
              <p className="text-xs text-white/40 mt-0.5">
                Active calls currently in progress
              </p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {liveCalls.length} Live Now
            </span>
          </div>

          {liveCalls.length === 0 ? (
            <div className="text-center py-10 text-white/40 text-xs">
              No active calls right now.
            </div>
          ) : (
            <div className="space-y-3.5">
              {liveCalls.map((call) => (
                <div
                  key={call.id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <WaveAnimation active size="sm" bars={4} color="bg-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white">
                          {call.lead?.name || call.phone}
                        </p>
                        <span className="text-[10px] font-mono text-white/40">{call.phone}</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 capitalize">
                          {call.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-300 mt-0.5">
                        Agent: {call.agent?.name || "—"}
                      </p>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        Started {timeAgo(call.startedAt)} ·{" "}
                        {call.duration != null ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "—"}
                        {" · "}
                        <span className="capitalize">{call.direction}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Dispositions Summary */}
        <div className="rounded-2xl p-5 sm:p-6 panel-card border border-white/[0.08] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Campaign Dispositions
            </h3>

            <div className="space-y-3">
              {[
                { stage: "Connected & Pitched", count: 280, pct: "51.8%", color: "bg-emerald-500" },
                { stage: "Demo Booked / Won", count: 85, pct: "15.7%", color: "bg-purple-500" },
                { stage: "Callback Requested", count: 64, pct: "11.8%", color: "bg-amber-500" },
                { stage: "Not Interested", count: 72, pct: "13.3%", color: "bg-rose-500" },
                { stage: "Voicemail / No Answer", count: 39, pct: "7.2%", color: "bg-slate-500" },
              ].map((item) => (
                <div key={item.stage} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70">{item.stage}</span>
                    <span className="font-mono text-white font-semibold">{item.count} ({item.pct})</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: item.pct }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/dashboard/crm"
            className="mt-6 block text-center text-xs font-semibold py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/80 hover:text-white transition-all"
          >
            Review Full Campaign CRM Data →
          </Link>
        </div>
      </div>

      {/* ── Section 2: QA Lead Verification & Approvals ───────── */}
      <div className="rounded-2xl p-5 sm:p-6 panel-card border border-white/[0.08]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              Call Review Queue
            </h3>
            <p className="text-xs text-white/40 mt-0.5">
              Completed calls awaiting review (missing quality or sentiment score)
            </p>
          </div>
          <span className="text-xs font-mono text-purple-300 font-bold px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
            {queue.length} Pending Review
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-xs">
            No calls awaiting review.
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((call) => (
              <div
                key={call.id}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-xs flex-shrink-0 mt-0.5">
                    {call.qualityScore != null ? call.qualityScore : "—"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white">{call.lead?.name || call.phone}</p>
                      <span className="text-xs text-white/40 font-medium">{call.phone}</span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                        {call.status.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">{timeAgo(call.startedAt)}</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1 leading-relaxed">
                      Quality: {call.qualityScore ?? "not scored"} · Sentiment: {call.sentimentScore ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDismiss(call.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
