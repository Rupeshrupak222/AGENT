"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  User,
  Building2,
  Bot,
  Calendar,
  FileText,
  Brain,
  RefreshCw,
  ExternalLink,
  Mic,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { callsApi, CallDetail as CallDetailType, CallAnalysisData } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  missed: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  failed: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  transferred: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  in_progress: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  queued: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/50",
  ringing: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
};

const SENTIMENT_CONFIG: Record<string, { icon: any; color: string; label: string; bg: string }> = {
  positive: { icon: ThumbsUp, color: "text-emerald-500", label: "Positive", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  neutral: { icon: Minus, color: "text-slate-400", label: "Neutral", bg: "bg-slate-50 dark:bg-white/[0.04]" },
  negative: { icon: ThumbsDown, color: "text-red-500", label: "Negative", bg: "bg-red-50 dark:bg-red-500/10" },
  mixed: { icon: AlertCircle, color: "text-amber-500", label: "Mixed", bg: "bg-amber-50 dark:bg-amber-500/10" },
};

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function InfoCard({ icon: Icon, label, value, iconColor }: { icon: any; label: string; value: string; iconColor: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
      <div className={cn("p-2 rounded-lg", iconColor)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/25">{label}</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{value}</p>
      </div>
    </div>
  );
}

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [call, setCall] = useState<CallDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    callsApi.get(id)
      .then(setCall)
      .catch(() => setError("Failed to load call details"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
          <div className="h-8 w-32 rounded bg-slate-100 dark:bg-white/5 animate-pulse" />
          <div className="h-48 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse" />
          <div className="h-64 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !call) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
          <button onClick={() => router.push("/dashboard/admin/calls")} className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white mb-6 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Calls
          </button>
          <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80">
            <Phone className="w-12 h-12 mb-3 text-slate-300 dark:text-white/15" />
            <p className="text-sm font-medium text-slate-500 dark:text-white/40">{error || "Call not found"}</p>
            <button onClick={() => router.push("/dashboard/admin/calls")} className="mt-4 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-all">
              Back to Calls
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const sentiment = call.analysis?.sentiment ? SENTIMENT_CONFIG[call.analysis.sentiment] : null;
  const SentimentIcon = sentiment?.icon || Minus;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
        {/* Back */}
        <button
          onClick={() => router.push("/dashboard/admin/calls")}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Calls
        </button>

        {/* Header Card */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={cn("p-3 rounded-xl", call.direction === "inbound" ? "bg-blue-50 dark:bg-blue-500/10" : "bg-emerald-50 dark:bg-emerald-500/10")}>
                {call.direction === "inbound" ? (
                  <PhoneIncoming className="w-5 h-5 text-blue-500" />
                ) : (
                  <PhoneOutgoing className="w-5 h-5 text-emerald-500" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{call.lead?.name || "Unknown Caller"}</h1>
                <p className="text-sm text-slate-500 dark:text-white/40 font-mono mt-0.5">{call.phone}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold capitalize", STATUS_COLORS[call.status] || "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/50")}>
                    {call.status.replace("_", " ")}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize",
                    call.direction === "inbound" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                  )}>
                    {call.direction}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 dark:text-white/25">{formatDateTime(call.startedAt)}</p>
              {call.recordingUrl && (
                <a
                  href={call.recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-600 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-all"
                >
                  <Mic className="w-3.5 h-3.5" /> Recording <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <InfoCard icon={User} label="Company" value={call.lead?.company || call.lead?.name || "—"} iconColor="bg-blue-50 dark:bg-blue-500/10 text-blue-500" />
            <InfoCard icon={Bot} label="Agent" value={call.agent?.name || "—"} iconColor="bg-purple-50 dark:bg-purple-500/10 text-purple-500" />
            <InfoCard icon={Clock} label="Duration" value={formatDuration(call.duration)} iconColor="bg-amber-50 dark:bg-amber-500/10 text-amber-500" />
            <InfoCard icon={Calendar} label="Timestamp" value={formatDateTime(call.startedAt)} iconColor="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" />
          </div>

          {/* Outcome & Sentiment Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {/* Outcome */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/25 mb-1">Outcome</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{call.outcome || "No outcome recorded"}</p>
            </div>
            {/* Sentiment */}
            <div className={cn("p-3 rounded-xl border border-slate-100 dark:border-white/[0.05]", sentiment?.bg || "bg-slate-50 dark:bg-white/[0.03]")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/25 mb-1">Sentiment</p>
              <div className="flex items-center gap-2">
                {sentiment && <SentimentIcon className={cn("w-4 h-4", sentiment.color)} />}
                <p className={cn("text-sm font-semibold", sentiment?.color || "text-slate-500 dark:text-white/40")}>
                  {sentiment?.label || "—"}
                </p>
                {call.sentimentScore != null && (
                  <span className="text-xs text-slate-400 dark:text-white/25 font-mono">
                    ({(call.sentimentScore * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transcript Section */}
        {call.transcript && (call.transcript.rawText || (call.transcript.turns && call.transcript.turns.length > 0)) && (
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-white/[0.06]">
              <FileText className="w-4 h-4 text-slate-400 dark:text-white/30" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Transcript</h2>
              {call.transcript.summary && (
                <span className="ml-auto text-[10px] font-medium text-slate-400 dark:text-white/25">AI Summary Available</span>
              )}
            </div>
            <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
              {call.transcript.turns && call.transcript.turns.length > 0 ? (
                call.transcript.turns.map((turn, i) => (
                  <div key={i} className={cn("flex gap-3", turn.speaker === "agent" || turn.speaker === "ai" ? "flex-row-reverse" : "")}>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                      turn.speaker === "agent" || turn.speaker === "ai"
                        ? "bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400"
                        : "bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    )}>
                      {turn.speaker === "agent" || turn.speaker === "ai" ? "AI" : "U"}
                    </div>
                    <div className={cn("max-w-[75%] p-3 rounded-xl text-sm leading-relaxed",
                      turn.speaker === "agent" || turn.speaker === "ai"
                        ? "bg-purple-50 dark:bg-purple-500/10 text-slate-800 dark:text-white/80"
                        : "bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-white/70"
                    )}>
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-white/25 mb-1">
                        {turn.speaker === "agent" || turn.speaker === "ai" ? "AI Agent" : "Caller"}
                        {turn.timestamp && <span className="ml-2 font-mono">{turn.timestamp}</span>}
                      </p>
                      <p>{turn.text}</p>
                    </div>
                  </div>
                ))
              ) : call.transcript.rawText ? (
                <div className="text-sm text-slate-700 dark:text-white/70 leading-relaxed whitespace-pre-wrap">
                  {call.transcript.rawText}
                </div>
              ) : null}

              {call.transcript.summary && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.05]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/25 mb-2">AI Summary</p>
                  <p className="text-sm text-slate-600 dark:text-white/50 leading-relaxed">{call.transcript.summary}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Analysis Section */}
        {call.analysis && call.analysis.processingStatus === "completed" && (
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-white/[0.06]">
              <Brain className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">AI Analysis</h2>
              {call.analysis.provider && (
                <span className="ml-auto text-[10px] font-medium text-slate-400 dark:text-white/25">via {call.analysis.provider}</span>
              )}
            </div>
            <div className="p-5 space-y-4">
              {/* Summary */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/25 mb-1.5">Summary</p>
                <p className="text-sm text-slate-700 dark:text-white/70 leading-relaxed">{call.analysis.summary}</p>
              </div>

              {/* Analysis Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {call.analysis.leadScore != null && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/25">Lead Score</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{call.analysis.leadScore}<span className="text-xs text-slate-400 dark:text-white/25">/10</span></p>
                  </div>
                )}
                {call.analysis.intent && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/25">Intent</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{call.analysis.intent}</p>
                  </div>
                )}
                {call.analysis.qualificationOutcome && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/25">Qualification</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{call.analysis.qualificationOutcome}</p>
                  </div>
                )}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/25">Appointment</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {call.analysis.appointmentDetected ? (
                      <span className="text-emerald-500">Detected</span>
                    ) : (
                      <span className="text-slate-400 dark:text-white/30">None</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Qualification Details */}
              {call.analysis.qualification && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/25 mb-2">Qualification Details</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-2 h-2 rounded-full", call.analysis.qualification.qualified ? "bg-emerald-500" : "bg-red-500")} />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {call.analysis.qualification.qualified ? "Qualified" : "Not Qualified"}
                    </span>
                  </div>
                  {call.analysis.qualification.reasons.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {call.analysis.qualification.reasons.map((r, i) => (
                        <li key={i} className="text-xs text-slate-500 dark:text-white/40 flex items-start gap-2">
                          <span className="text-slate-300 dark:text-white/15 mt-0.5">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Topics & Action Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {call.analysis.topicsJson && call.analysis.topicsJson.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/25 mb-2">Topics</p>
                    <div className="flex flex-wrap gap-1.5">
                      {call.analysis.topicsJson.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-[11px] font-medium text-slate-600 dark:text-white/50">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {call.analysis.actionItemsJson && call.analysis.actionItemsJson.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/25 mb-2">Action Items</p>
                    <ul className="space-y-1">
                      {call.analysis.actionItemsJson.map((item, i) => (
                        <li key={i} className="text-xs text-slate-500 dark:text-white/40 flex items-start gap-2">
                          <span className="text-brand-500 mt-0.5">→</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Cost & Latency */}
              {(call.analysis.costUsd != null || call.analysis.latencyMs != null) && (
                <div className="flex items-center gap-4 pt-3 border-t border-slate-100 dark:border-white/[0.05]">
                  {call.analysis.costUsd != null && (
                    <span className="text-[11px] text-slate-400 dark:text-white/25">Cost: <span className="font-mono text-slate-600 dark:text-white/50">${call.analysis.costUsd.toFixed(4)}</span></span>
                  )}
                  {call.analysis.latencyMs != null && (
                    <span className="text-[11px] text-slate-400 dark:text-white/25">Latency: <span className="font-mono text-slate-600 dark:text-white/50">{call.analysis.latencyMs}ms</span></span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analysis Pending */}
        {call.analysis && call.analysis.processingStatus !== "completed" && (
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Analysis {call.analysis.processingStatus}</p>
                <p className="text-xs text-slate-400 dark:text-white/25">AI analysis is currently being processed</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
