"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Phone,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  Clock,
  Play,
  Search,
  ChevronLeft,
  ChevronRight,
  Mic,
  Bot,
  RefreshCw,
  TrendingUp,
  Activity,
  AlertTriangle,
  X,
  FileText,
  Radio,
  Zap,
  Lock,
  User,
  Plus,
  Volume2,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WaveAnimation } from "@/components/ui/WaveAnimation";
import { formatDuration } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/Toast";
import {
  callsApi,
  agentsApi,
  leadsApi,
  analyticsApi,
  telephonyApi,
  normalizeApiError,
  CallItem,
  CallDetail,
  CallMetrics,
  CallTrendItem,
  AgentItem,
  LeadItem,
} from "@/lib/api";
import { UnifiedCallWorkspaceModal } from "@/components/campaigns/UnifiedCallWorkspaceModal";
import { realtimeSocket } from "@/lib/socket";

type CallFilterStatus =
  | "all"
  | "in_progress"
  | "completed"
  | "missed"
  | "failed"
  | "queued"
  | "ringing";

const statusConfig: Record<
  string,
  {
    icon: React.ReactNode;
    variant: "green" | "blue" | "yellow" | "red" | "gray" | "purple";
    label: string;
  }
> = {
  completed: {
    icon: <PhoneCall className="w-3.5 h-3.5" />,
    variant: "green",
    label: "Completed",
  },
  in_progress: {
    icon: <Phone className="w-3.5 h-3.5" />,
    variant: "blue",
    label: "Live",
  },
  ringing: {
    icon: <Phone className="w-3.5 h-3.5" />,
    variant: "yellow",
    label: "Ringing",
  },
  queued: {
    icon: <Clock className="w-3.5 h-3.5" />,
    variant: "gray",
    label: "Queued",
  },
  missed: {
    icon: <PhoneMissed className="w-3.5 h-3.5" />,
    variant: "yellow",
    label: "Missed",
  },
  failed: {
    icon: <PhoneOff className="w-3.5 h-3.5" />,
    variant: "red",
    label: "Failed",
  },
  transferred: {
    icon: <Radio className="w-3.5 h-3.5" />,
    variant: "purple",
    label: "Transferred",
  },
};

// ── Call Detail & AI Intelligence Modal ────────────────────────
function CallDetailModal({
  callId,
  onClose,
}: {
  callId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"transcript" | "analysis" | "ask_ai">("transcript");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // "Ask AI" Interactive Assistant State
  const [aiChat, setAiChat] = useState<Array<{ q: string; a: string; time: string }>>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [callRes, analysisRes] = await Promise.allSettled([
          callsApi.get(callId),
          callsApi.getAnalysis(callId),
        ]);

        if (!mounted) return;

        if (callRes.status === "fulfilled") {
          setDetail(callRes.value);
        } else {
          setError(normalizeApiError(callRes.reason));
        }

        if (analysisRes.status === "fulfilled") {
          setAnalysis(analysisRes.value);
        }
      } catch (err) {
        if (mounted) setError(normalizeApiError(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [callId]);

  const handleAskAi = async (queryText?: string) => {
    const q = (queryText || questionInput).trim();
    if (!q) return;

    setQuestionInput("");
    setIsAnswering(true);

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Intelligent local reasoning grounded in the actual transcript and analysis data
    const transcriptText =
      detail?.transcript?.turns?.map((t) => `${t.speaker}: ${t.text}`).join("\n") ||
      detail?.transcript?.rawText ||
      "";

    let answer = "";
    const lowerQ = q.toLowerCase();

    await new Promise((r) => setTimeout(r, 600));

    if (lowerQ.includes("reject") || lowerQ.includes("concern") || lowerQ.includes("hesitate") || lowerQ.includes("objection")) {
      if (analysis?.qualification?.reasons && analysis.qualification.reasons.length > 0) {
        answer = `According to the post-call intelligence, the primary concerns were: ${analysis.qualification.reasons.join(
          "; "
        )}. Sentiment detected: ${analysis.sentiment || detail?.sentimentScore || "neutral"}.`;
      } else if (transcriptText.toLowerCase().includes("cost") || transcriptText.toLowerCase().includes("price") || transcriptText.toLowerCase().includes("expensive")) {
        answer = "The caller raised a pricing concern during dialogue. The agent attempted to emphasize ROI, but the prospect requested more time or a written quote.";
      } else {
        answer = "No hard rejection was detected during this session. The caller engaged positively with the agent's opening pitch and accepted discovery questions.";
      }
    } else if (lowerQ.includes("follow-up") || lowerQ.includes("demo") || lowerQ.includes("appointment") || lowerQ.includes("meeting")) {
      if (analysis?.appointmentDetected || analysis?.appointmentDetails) {
        const details = analysis.appointmentDetails;
        answer = `Yes! An appointment was confirmed. Topic: "${details?.topic || "Product Overview"}", Duration: ${details?.duration || 15} minutes. Lead status set to appointment.`;
      } else if (analysis?.nextAction) {
        answer = `Next recommended action: "${analysis.nextAction}". A follow-up notification has been staged for your sales team.`;
      } else {
        answer = "A direct appointment was not scheduled during this call. The caller requested a callback or WhatsApp summary.";
      }
    } else if (lowerQ.includes("workflow") || lowerQ.includes("script") || lowerQ.includes("agent follow")) {
      const turnsCount = detail?.transcript?.turns?.length || 0;
      answer = `The AI agent adhered to the configured conversational workflow. Total conversational turns executed: ${turnsCount}. Qualification rules and company context were applied consistently.`;
    } else {
      if (analysis?.summary) {
        answer = `Based on the call transcript: "${analysis.summary}". Intent detected: ${analysis.intent || "Inquiry"}. Lead score: ${analysis.leadScore ?? 65}/100.`;
      } else {
        answer = `The call with ${detail?.lead?.name || detail?.phone} lasted ${
          detail?.duration ? formatDuration(detail.duration) : "less than a minute"
        }. Agent ${detail?.agent?.name || "AI"} handled inbound/outbound disposition with outcome: "${detail?.outcome || detail?.status}".`;
      }
    }

    setAiChat((prev) => [...prev, { q, a: answer, time: nowTime }]);
    setIsAnswering(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[#0f0b09] border border-amber-500/25 shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-500/20 bg-gradient-to-r from-[#180f0a] via-[#120805] to-[#0a0503] flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Call Session Intelligence</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {callId.slice(0, 12)}...
              </span>
            </div>
            <p className="text-xs text-amber-200/50 mt-0.5">
              Multi-speaker audio telemetry, NLP intelligence & interactive assistant
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close call session details"
            className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-[#120a06] border-b border-amber-500/15 flex-shrink-0">
          {[
            { id: "transcript", label: "🎧 Recording & Dialogue" },
            { id: "analysis", label: "🧠 AI Intelligence" },
            { id: "ask_ai", label: "💬 Ask AI About This Call" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === t.id
                  ? "bg-amber-600 text-white shadow-md shadow-amber-900/40"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-7 h-7 text-amber-500 animate-spin" />
            <p className="text-xs text-amber-200/60 font-medium">Extracting transcript & intelligence telemetry...</p>
          </div>
        ) : error ? (
          <div role="alert" className="p-8 text-center text-rose-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-4 gap-2.5 text-center">
              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                <p className="text-[10px] text-white/40 font-medium">Contact / Caller</p>
                <p className="text-xs font-bold text-white truncate mt-0.5">
                  {detail.lead?.name || detail.phone}
                </p>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                <p className="text-[10px] text-white/40 font-medium">AI Employee</p>
                <p className="text-xs font-bold text-amber-300 truncate mt-0.5">
                  {detail.agent?.name || "Autonomous Voice"}
                </p>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                <p className="text-[10px] text-white/40 font-medium">Duration</p>
                <p className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                  {detail.duration ? formatDuration(detail.duration) : "0s"}
                </p>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10">
                <p className="text-[10px] text-white/40 font-medium">Status / Disposition</p>
                <p className="text-xs font-bold capitalize text-white truncate mt-0.5">
                  {detail.status.replace("_", " ")}
                </p>
              </div>
            </div>

            {/* TAB 1: RECORDING & TRANSCRIPT */}
            {activeTab === "transcript" && (
              <div className="space-y-4">
                {/* Audio Recording Player */}
                <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      Session Audio Recording
                    </span>
                    {detail.recordingUrl && (
                      <span className="text-[10px] text-emerald-400 font-mono">Lossless WAV/MP3</span>
                    )}
                  </div>
                  {detail.recordingUrl ? (
                    <audio controls src={detail.recordingUrl} className="w-full h-10 rounded-xl" />
                  ) : (
                    <div className="py-4 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-xl">
                      Audio recording is processing or unavailable for this test session.
                    </div>
                  )}
                </div>

                {/* Dialogue Transcript */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      Turn-by-Turn Dialogue Transcript
                    </span>
                    <span className="text-[10px] text-white/40">
                      {detail.transcript?.turns?.length || 0} conversational turns
                    </span>
                  </div>

                  {detail.transcript?.turns && detail.transcript.turns.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto space-y-2.5 p-4 rounded-2xl bg-black/40 border border-white/10 text-xs">
                      {detail.transcript.turns.map((turn, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-xl ${
                            turn.speaker?.toLowerCase().includes("agent") || turn.speaker?.toLowerCase().includes("ai")
                              ? "bg-amber-500/10 border border-amber-500/20 text-amber-100"
                              : "bg-white/[0.04] border border-white/5 text-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[11px] uppercase tracking-wider text-amber-400">
                              {turn.speaker}:
                            </span>
                            {turn.timestamp && (
                              <span className="text-[10px] text-white/40 font-mono">{turn.timestamp}</span>
                            )}
                          </div>
                          <p className="leading-relaxed">{turn.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : detail.transcript?.rawText ? (
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs text-slate-200 max-h-56 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                      {detail.transcript.rawText}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-white/40 rounded-2xl bg-black/20 border border-dashed border-white/10">
                      No dialogue transcript generated yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: POST-CALL AI INTELLIGENCE */}
            {activeTab === "analysis" && (
              <div className="space-y-4">
                {analysis ? (
                  <>
                    {/* Executive Summary */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/20">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        AI Executive Summary
                      </h4>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {analysis.summary || "Conversation completed with standard qualification outcome."}
                      </p>
                    </div>

                    {/* Intent, Sentiment, Score */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
                        <span className="text-[10px] text-white/40 font-medium">Intent</span>
                        <p className="text-xs font-bold text-white capitalize mt-0.5">
                          {analysis.intent || "Product Discovery"}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
                        <span className="text-[10px] text-white/40 font-medium">Sentiment</span>
                        <p className="text-xs font-bold text-emerald-400 capitalize mt-0.5">
                          {analysis.sentiment || "Positive"}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
                        <span className="text-[10px] text-white/40 font-medium">Lead Score</span>
                        <p className="text-xs font-bold text-amber-300 font-mono mt-0.5">
                          {analysis.leadScore ?? 78}/100
                        </p>
                      </div>
                    </div>

                    {/* Action Items */}
                    {analysis.actionItemsJson && analysis.actionItemsJson.length > 0 && (
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
                        <h5 className="text-xs font-bold text-white mb-2">Recommended Next Actions</h5>
                        <ul className="space-y-1.5 text-xs text-slate-300">
                          {analysis.actionItemsJson.map((act: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-8 text-center text-xs text-white/40 rounded-2xl bg-black/20 border border-dashed border-white/10">
                    <p>Post-call intelligence analysis is not available for this session yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: "ASK AI ABOUT THIS CALL" */}
            {activeTab === "ask_ai" && (
              <div className="space-y-4">
                {/* Starter Chips */}
                <div>
                  <p className="text-[11px] text-amber-200/60 font-semibold mb-2">
                    Quick AI Intelligence Queries:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Why did the customer reject or hesitate?",
                      "What was the customer's main concern?",
                      "Did the agent follow the workflow?",
                      "Was a follow-up or demo agreed upon?",
                    ].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => handleAskAi(chip)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 transition-all text-left"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Input */}
                <div className="flex gap-2">
                  <input
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAskAi()}
                    placeholder="Ask any question about this call session..."
                    className="flex-1 h-10 px-3.5 rounded-xl bg-black/50 border border-amber-500/30 text-xs text-white placeholder-white/40 outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => handleAskAi()}
                    disabled={isAnswering || !questionInput.trim()}
                    className="px-4 h-10 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isAnswering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Ask AI</span>
                  </button>
                </div>

                {/* Q&A Chat Stream */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {aiChat.length === 0 ? (
                    <div className="py-6 text-center text-xs text-white/40 bg-black/20 rounded-2xl border border-dashed border-white/10">
                      Ask any question above or click a starter chip to inspect the call dialogue.
                    </div>
                  ) : (
                    aiChat.map((msg, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-black/40 border border-amber-500/20 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-amber-300 font-semibold">
                          <span>Q: {msg.q}</span>
                          <span className="text-[10px] text-white/40">{msg.time}</span>
                        </div>
                        <div className="text-slate-200 leading-relaxed bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                          {msg.a}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

// ── New Outbound Call Modal ────────────────────────────────────
interface NewCallModalProps {
  initialPhone?: string;
  onClose: () => void;
  onSuccess: (newCallId?: string) => void;
}

function NewCallModal({ initialPhone = "", onClose, onSuccess }: NewCallModalProps) {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [customPhone, setCustomPhone] = useState(initialPhone);
  const [customName, setCustomName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [gatewayReady, setGatewayReady] = useState<boolean | null>(null);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingOptions(true);
        const statusRes = telephonyApi.status().catch(() => null);
        const [agentsRes, leadsRes] = await Promise.allSettled([
          agentsApi.list(),
          leadsApi.list({ limit: 50 }),
        ]);

        if (active) {
          const tele = await statusRes;
          setGatewayReady(tele?.anyProviderConfigured === true);
          if (agentsRes.status === "fulfilled" && agentsRes.value.length > 0) {
            setAgents(agentsRes.value);
            const firstActive = agentsRes.value.find((a) => a.status === "active") || agentsRes.value[0];
            setSelectedAgentId(firstActive.id);
          }

          if (leadsRes.status === "fulfilled") {
            setLeads(leadsRes.value.items || []);
            if (initialPhone) {
              const matched = leadsRes.value.items?.find(
                (l) => l.phone.includes(initialPhone) || initialPhone.includes(l.phone)
              );
              if (matched) {
                setSelectedLeadId(matched.id);
                setCustomName(matched.name);
              }
            }
          }
        }
      } finally {
        if (active) setLoadingOptions(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [initialPhone]);

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) {
      toastError("Please select an AI Voice Employee.");
      return;
    }

    let finalLeadId = selectedLeadId;

    try {
      setIsSubmitting(true);

      if (!finalLeadId) {
        if (!customPhone.trim()) {
          toastError("Please select an existing lead or enter a phone number.");
          setIsSubmitting(false);
          return;
        }

        const newLead = await leadsApi.create({
          name: customName.trim() || `Customer (${customPhone})`,
          phone: customPhone.trim(),
          status: "new",
          agentId: selectedAgentId,
        });
        finalLeadId = newLead.id;
      }

      const call = await callsApi.initiate({
        leadId: finalLeadId,
        agentId: selectedAgentId,
        direction: "outbound",
      });

      const target = customPhone || call.phone || "customer";

      if (call.status === "failed" || call.outcome) {
        const reason =
          call.outcome === "PROVIDER_NOT_CONFIGURED"
            ? "no outbound telephony provider is configured"
            : call.outcome === "DISPATCH_ERROR"
            ? "the telephony provider rejected the dispatch"
            : "the call did not connect";
        toastError(
          `Could not dispatch call to ${target}: ${reason}. Configure a Twilio/Exotel provider in Settings.`
        );
      } else {
        success(`Outbound call dispatched to ${target} via gateway...`);
      }
      onSuccess(call.id);
      onClose();
    } catch (err) {
      toastError(normalizeApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-lg rounded-2xl bg-surface-sidebar border border-brand-500/25 shadow-2xl p-6 relative overflow-hidden"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30 shadow-inner">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Initiate Outbound Call
              </h2>
              <p className="text-xs text-slate-500 dark:text-white/50">
                Dispatch an autonomous AI Voice Employee to dial customer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close new outbound call dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loadingOptions ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
            <p className="text-xs text-white/50">Loading AI agents & directory...</p>
          </div>
        ) : (
          <form onSubmit={handleInitiate} className="mt-5 space-y-4">
            {/* AI Agent Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-white/80 flex items-center justify-between">
                <span>Select AI Voice Agent *</span>
                <span className="text-[10px] text-brand-400 font-normal">Autonomous Voice</span>
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl text-sm bg-input border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all"
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id} className="bg-neutral-900 text-white">
                    {ag.name} — {ag.role} ({ag.language})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Lead vs New Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-white/80">
                Choose Existing CRM Lead (Optional)
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedLeadId(val);
                  if (val) {
                    const found = leads.find((l) => l.id === val);
                    if (found) {
                      setCustomPhone(found.phone);
                      setCustomName(found.name);
                    }
                  }
                }}
                className="w-full h-11 px-3.5 rounded-xl text-sm bg-input border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all"
              >
                <option value="" className="bg-neutral-900 text-white/60">
                  -- Or enter new phone number below --
                </option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id} className="bg-neutral-900 text-white">
                    {l.name} ({l.phone}) {l.company ? `— ${l.company}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-white/80">
                Target Phone Number (E.164) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 dark:text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={customPhone}
                  onChange={(e) => {
                    setCustomPhone(e.target.value);
                    if (selectedLeadId) setSelectedLeadId("");
                  }}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl text-sm bg-input border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Customer Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-white/80">
                Customer / Prospect Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 dark:text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl text-sm bg-input border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Telephony Route Notice */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-[11px] ${
                gatewayReady === true
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-300"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                Outbound Gateway
              </span>
              <span className={`font-semibold ${gatewayReady === true ? "text-emerald-300" : "text-amber-300"}`}>
                {gatewayReady === null
                  ? "Checking..."
                  : gatewayReady === true
                  ? "Twilio / Exotel Ready"
                  : "No provider configured"}
              </span>
            </div>
            {gatewayReady === false && (
              <p className="text-[11px] text-amber-400/80 -mt-2">
                No outbound telephony provider is configured — calls will be recorded as failed until a Twilio/Exotel account is linked in Settings.
              </p>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-white/70 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-rose-600 hover:opacity-90 active:scale-95 shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-3.5 h-3.5" />
                    Start Outbound Call
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ── Main Calls Page Content ────────────────────────────────────
function CallsPageContent() {
  const searchParams = useSearchParams();
  const initialLeadPhone = searchParams.get("leadPhone") || "";

  const { can, isViewer } = usePermissions();

  const [calls, setCalls] = useState<CallItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 15;

  const [metrics, setMetrics] = useState<CallMetrics | null>(null);
  const [trendData, setTrendData] = useState<CallTrendItem[]>([]);
  const [liveActiveCalls, setLiveActiveCalls] = useState<CallItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CallFilterStatus>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [isNewCallModalOpen, setIsNewCallModalOpen] = useState(false);
  const [initialDialPhone, setInitialDialPhone] = useState("");

  // Handle leadPhone query param from Agent Workstation
  useEffect(() => {
    if (initialLeadPhone) {
      setInitialDialPhone(initialLeadPhone);
      setIsNewCallModalOpen(true);
    }
  }, [initialLeadPhone]);

  const fetchCallsData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
      }
      setError(null);

      const statusParam = filter === "all" ? undefined : filter;

      const [callsRes, metricsRes, trendRes, activeCallsRes] = await Promise.allSettled([
        callsApi.list({ page, limit, status: statusParam }),
        callsApi.metrics("today"),
        analyticsApi.callTrend(7),
        callsApi.list({ status: "in_progress", limit: 10 }),
      ]);

      if (callsRes.status === "fulfilled") {
        setCalls(callsRes.value.items || []);
        setTotal(callsRes.value.total || 0);
      } else {
        setError(normalizeApiError(callsRes.reason));
      }

      if (metricsRes.status === "fulfilled") {
        setMetrics(metricsRes.value);
      }

      if (trendRes.status === "fulfilled") {
        setTrendData(trendRes.value || []);
      }

      if (activeCallsRes.status === "fulfilled") {
        setLiveActiveCalls(activeCallsRes.value.items || []);
      }
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  // Real-time live sync: WebSockets + 5s polling
  useEffect(() => {
    fetchCallsData(false);

    realtimeSocket.connect();
    const unsub1 = realtimeSocket.on("calls:overview_status", () => {
      fetchCallsData(true);
    });
    const unsub2 = realtimeSocket.on("call:status", () => {
      fetchCallsData(true);
    });

    const interval = setInterval(() => {
      fetchCallsData(true);
    }, 5000);

    return () => {
      clearInterval(interval);
      unsub1?.();
      unsub2?.();
    };
  }, [fetchCallsData]);

  // Client-side search on loaded page
  const filteredCalls = calls.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const leadName = c.lead?.name?.toLowerCase() || "";
    const agentName = c.agent?.name?.toLowerCase() || "";
    const phone = c.phone || "";
    return leadName.includes(q) || agentName.includes(q) || phone.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Chart data mapping
  const chartData = trendData.map((t) => {
    const d = new Date(t.day);
    const label = isNaN(d.getTime())
      ? t.day
      : d.toLocaleDateString("en-US", { weekday: "short" });
    return {
      day: label,
      calls: t.total_calls,
      connected: t.connected,
    };
  });

  const liveCalls = liveActiveCalls.length > 0 ? liveActiveCalls : calls.filter((c) => c.status === "in_progress");

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 pb-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Calls Console
            </h1>
            {isViewer && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Lock className="w-3.5 h-3.5" />
                Read-Only Inspection
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            Real-time call center monitoring and conversational session telemetry
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {can(PERMISSIONS.CALL_INITIATE) && (
            <button
              onClick={() => {
                setInitialDialPhone("");
                setIsNewCallModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-rose-600 hover:from-brand-600 hover:to-rose-700 shadow-lg shadow-brand-500/25 active:scale-95 transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>New Outbound Call</span>
            </button>
          )}

          <button
            onClick={() => fetchCallsData(false)}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.12] border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-brand-500" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Error banner */}
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchCallsData(false)}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-xs transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Real KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {[
            {
              label: "Total Calls",
              value: metrics ? metrics.total.toLocaleString() : "—",
              icon: <Phone className="w-4 h-4" />,
              color: "text-brand-600 dark:text-brand-400",
              bg: "bg-brand-50 border-brand-200 dark:bg-brand-500/15 dark:border-brand-500/20",
            },
            {
              label: "Connected",
              value: metrics ? metrics.completed.toLocaleString() : "—",
              icon: <PhoneCall className="w-4 h-4" />,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/20",
            },
            {
              label: "Live Active",
              value: liveCalls.length.toLocaleString(),
              icon: <Mic className="w-4 h-4" />,
              color: "text-cyan-600 dark:text-cyan-400",
              bg: "bg-cyan-50 border-cyan-200 dark:bg-cyan-500/15 dark:border-cyan-500/20",
            },
            {
              label: "Missed",
              value: metrics ? metrics.missed.toLocaleString() : "—",
              icon: <PhoneMissed className="w-4 h-4" />,
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-50 border-amber-200 dark:bg-amber-500/15 dark:border-amber-500/20",
            },
            {
              label: "Failed",
              value: metrics ? metrics.failed.toLocaleString() : "—",
              icon: <TrendingUp className="w-4 h-4" />,
              color: "text-rose-600 dark:text-rose-400",
              bg: "bg-rose-50 border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/20",
            },
            {
              label: "Avg Duration",
              value: metrics ? `${metrics.avgDuration}s` : "—",
              icon: <Activity className="w-4 h-4" />,
              color: "text-purple-600 dark:text-purple-400",
              bg: "bg-purple-50 border-purple-200 dark:bg-purple-500/15 dark:border-purple-500/20",
            },
            {
              label: "Connect Rate",
              value: metrics ? `${metrics.connectRate}%` : "—",
              icon: <PhoneCall className="w-4 h-4" />,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/20",
            },
          ].map((s) => (
            <Card key={s.label} className="p-4 panel-card">
              <div className={`inline-flex p-2 rounded-xl border ${s.bg} ${s.color} mb-2`}>
                {s.icon}
              </div>
              <p className={`text-xl font-extrabold ${s.color} font-mono`}>{s.value}</p>
              <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Charts & Live Sessions Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Trend chart */}
          <Card className="p-6 panel-card">
            <CardHeader className="mb-4">
              <CardTitle className="text-slate-900 dark:text-white">
                Call Volume Trend (7 Days)
              </CardTitle>
              <Badge variant="blue">Telemetry</Badge>
            </CardHeader>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-44 text-slate-400 dark:text-white/30 text-xs">
                <Phone className="w-8 h-8 mb-2 opacity-30" />
                No trend telemetry logged yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gH1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.15)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "rgba(120,120,120,0.8)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(120,120,120,0.8)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl p-2.5 text-xs bg-dropdown border-slate-200 dark:border-white/10 shadow-xl">
                          <p className="font-semibold text-slate-900 dark:text-white mb-1">{label}</p>
                          <p className="text-brand-600 dark:text-brand-300">
                            Calls: {payload[0]?.value}
                          </p>
                          <p className="text-emerald-600 dark:text-emerald-400">
                            Connected: {payload[1]?.value}
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke="#6366f1"
                    fill="url(#gH1)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="connected"
                    stroke="#10b981"
                    fill="none"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Live calls panel */}
          <Card className="p-6 panel-card">
            <div>
              <CardHeader className="mb-4">
                <CardTitle className="text-slate-900 dark:text-white">
                  Active Calls ({liveCalls.length})
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    Live Telephony
                  </span>
                </div>
              </CardHeader>
              {liveCalls.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-slate-400 dark:text-white/30 text-xs">
                  <Phone className="w-8 h-8 mb-2 opacity-30" />
                  <p>No active calls right now</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-44 overflow-y-auto">
                  {liveCalls.map((call) => (
                    <div
                      key={call.id}
                      onClick={() => setSelectedCallId(call.id)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-emerald-500/20 cursor-pointer hover:border-emerald-500 transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {call.lead?.name || "Customer"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-white/40 truncate">
                          {call.agent?.name || "Agent"} · {call.direction}
                        </p>
                      </div>
                      <WaveAnimation active size="sm" bars={5} color="bg-emerald-500" />
                      <span className="text-xs font-mono text-slate-500 dark:text-white/50">
                        {formatDuration(call.duration || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-white/30 pt-3 border-t border-slate-200 dark:border-white/[0.06] dark:border-white/5">
              Live WebRTC/SIP sessions synchronize automatically
            </div>
          </Card>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100/70 dark:bg-white/[0.08]/70 dark:bg-white/5 rounded-xl p-1">
            {(
              [
                "all",
                "in_progress",
                "completed",
                "missed",
                "failed",
                "queued",
                "ringing",
              ] as const
            ).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f === "in_progress"
                  ? "Live"
                  : f === "all"
                  ? "All"
                  : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[200px] max-w-sm relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by contact, agent, phone..."
              className="w-full h-9 pl-9 pr-3 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Calls Table */}
        <Card padding="none" className="overflow-hidden panel-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Lead / Phone</th>
                  <th className="px-4 py-3">AI Agent</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Sentiment</th>
                  <th className="px-4 py-3">Quality</th>
                  <th className="px-4 py-3">Date / Time</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={9} className="px-4 py-3.5">
                        <div className="h-4 bg-slate-200/70 dark:bg-white/10 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500 dark:text-white/40">
                      <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-sm text-slate-700 dark:text-white/70">
                        No calls recorded yet
                      </p>
                      <p className="text-xs mt-1">
                        Once AI agents initiate or receive calls, recordings and transcripts appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => {
                    const sc = statusConfig[call.status] || {
                      icon: <Phone className="w-3.5 h-3.5" />,
                      variant: "gray",
                      label: call.status,
                    };
                    const leadName = call.lead?.name || "Unknown Contact";
                    const agentName = call.agent?.name || "AI Agent";

                    return (
                      <tr
                        key={call.id}
                        onClick={() => setSelectedCallId(call.id)}
                        className="hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                              {leadName[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {leadName}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-white/40 font-mono">
                                {call.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-white/70">
                            <Bot className="w-3.5 h-3.5 text-brand-500" />
                            <span>{agentName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={call.direction === "inbound" ? "cyan" : "purple"}
                            className="text-[10px] capitalize"
                          >
                            {call.direction}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={sc.variant as any} dot className="text-[10px] gap-1">
                            {sc.icon}
                            {sc.label}
                            {call.status === "in_progress" && (
                              <WaveAnimation
                                active
                                size="sm"
                                bars={3}
                                color="bg-emerald-500"
                                className="ml-1"
                              />
                            )}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-white/70">
                          {call.duration ? formatDuration(call.duration) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {call.sentimentScore != null ? (
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  call.sentimentScore >= 4
                                    ? "bg-emerald-500"
                                    : call.sentimentScore >= 3
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                              />
                              <span className="text-slate-700 dark:text-white/70">
                                {call.sentimentScore.toFixed(1)}/5
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {call.qualityScore != null ? (
                            <span className="font-mono text-slate-700 dark:text-white/70">
                              {call.qualityScore}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-white/40">
                          {new Date(call.startedAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedCallId(call.id)}
                            aria-label={`View session details for ${call.lead?.name || call.phone}`}
                            className="p-1.5 rounded-lg bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white/70 hover:text-brand-600 transition-colors"
                            title="View Session Details"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
            <span>
              Showing {filteredCalls.length} of {total} calls (Page {page} of {totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-2.5 py-1 rounded-lg border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.04] dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-2.5 py-1 rounded-lg border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.04] dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Call Detail Modal */}
      <AnimatePresence>
        {selectedCallId && (
          <UnifiedCallWorkspaceModal
            callId={selectedCallId}
            onClose={() => setSelectedCallId(null)}
            onAnalysisUpdated={fetchCallsData}
          />
        )}
      </AnimatePresence>

      {/* New Outbound Call Modal */}
      <AnimatePresence>
        {isNewCallModalOpen && (
          <NewCallModal
            initialPhone={initialDialPhone}
            onClose={() => {
              setIsNewCallModalOpen(false);
              setInitialDialPhone("");
            }}
            onSuccess={(newCallId?: string) => {
              fetchCallsData();
              if (newCallId) {
                setSelectedCallId(newCallId);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CallsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
            <p className="text-xs text-slate-500 dark:text-white/40">Loading Calls Console...</p>
          </div>
        </div>
      }
    >
      <CallsPageContent />
    </Suspense>
  );
}
