"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Phone,
  PhoneCall,
  Clock,
  Mic,
  FileText,
  Brain,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  ListTodo,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  TrendingUp,
  ShieldCheck,
  Award,
  Radio,
  Download,
} from "lucide-react";
import {
  callsApi,
  CallDetail,
  CallAnalysisData,
  CallRecordingData,
  normalizeApiError,
} from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { LiveVoiceSession } from "./LiveVoiceSession";

interface UnifiedCallWorkspaceModalProps {
  callId: string;
  onClose: () => void;
  onAnalysisUpdated?: () => void;
}

export function UnifiedCallWorkspaceModal({
  callId,
  onClose,
  onAnalysisUpdated,
}: UnifiedCallWorkspaceModalProps) {
  const { success, error: toastError } = useToast();
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [analysis, setAnalysis] = useState<CallAnalysisData | null>(null);
  const [recording, setRecording] = useState<CallRecordingData | null>(null);
  const [mode, setMode] = useState<"live" | "intelligence">("intelligence");

  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [retryingAnalysis, setRetryingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Call Details
        const callData = await callsApi.get(callId);
        if (!mounted) return;
        setDetail(callData);
        if (callData.status === "in_progress" || callData.status === "ringing") {
          setMode("live");
        }

        // 2. Fetch Recording URL
        try {
          const recData = await callsApi.getRecording(callId);
          if (mounted && recData) setRecording(recData);
        } catch {
          // Recording may not exist yet if call is in progress or failed
          if (mounted && callData.recordingUrl) {
            setRecording({
              callId,
              recordingId: `rec-${callId}`,
              url: callData.recordingUrl,
              duration: callData.duration ?? undefined,
            });
          }
        }

        // 3. Fetch Post-Call Analysis
        try {
          setLoadingAnalysis(true);
          const analysisData = await callsApi.getAnalysis(callId);
          if (mounted) setAnalysis(analysisData);
        } catch {
          // Analysis may be queued or not started yet
          if (mounted) setAnalysis(null);
        } finally {
          if (mounted) setLoadingAnalysis(false);
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

  // Audio Controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setPlaybackError(true));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!duration && audioRef.current.duration) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Manual Retry Handler
  const handleRetryAnalysis = async () => {
    try {
      setRetryingAnalysis(true);
      const res = await callsApi.retryAnalysis(callId);
      success(res.message || "Post-call intelligence has been queued for execution.");
      // Poll analysis once after 2 seconds
      setTimeout(async () => {
        try {
          const fresh = await callsApi.getAnalysis(callId);
          setAnalysis(fresh);
          onAnalysisUpdated?.();
        } catch {}
      }, 2500);
    } catch (err) {
      toastError(`Retry Failed: ${normalizeApiError(err)}`);
    } finally {
      setRetryingAnalysis(false);
    }
  };

  const audioUrl = recording?.url || detail?.recordingUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden text-slate-900 dark:text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                Call Intelligence Workspace
                <span className="text-xs font-mono text-slate-400 font-normal">
                  ({callId})
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/40">
                Synchronized PSTN audio, dialogue transcript & post-call AI analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-xs">
              <button
                type="button"
                onClick={() => setMode("live")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  mode === "live"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Radio className="w-3.5 h-3.5" /> Live Voice Studio
              </button>
              <button
                type="button"
                onClick={() => setMode("intelligence")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  mode === "intelligence"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Brain className="w-3.5 h-3.5" /> Intelligence & Analytics
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-7 h-7 text-brand-500 animate-spin" />
              <p className="text-xs text-slate-500 dark:text-white/50">
                Retrieving call audio & post-call intelligence...
              </p>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-rose-500 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : detail ? (
            mode === "live" ? (
              <LiveVoiceSession
                callId={callId}
                agentName={detail.agent?.name}
                customerName={detail.lead?.name}
                customerPhone={detail.phone}
                onCallEnded={async () => {
                  setMode("intelligence");
                  try {
                    const updated = await callsApi.get(callId);
                    setDetail(updated);
                    onAnalysisUpdated?.();
                  } catch {}
                }}
              />
            ) : (
              <>
                {/* Top Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                  <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium">Customer / Lead</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                    {detail.lead?.name || "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50 font-mono mt-0.5">
                    {detail.phone}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                  <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium">Assigned AI Agent</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                    {detail.agent?.name || "Autonomous Agent"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50 capitalize mt-0.5">
                    {detail.agent?.role || "Telecaller"}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                  <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium">Telephony Status</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        detail.status === "completed"
                          ? "bg-emerald-500"
                          : detail.status === "in_progress"
                          ? "bg-amber-500 animate-pulse"
                          : "bg-rose-500"
                      }`}
                    />
                    <span className="text-xs font-bold capitalize text-slate-900 dark:text-white">
                      {detail.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                    {detail.duration ? formatDuration(detail.duration) : "0s"}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                  <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium">Post-Call Analysis</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge
                      variant={
                        analysis?.processingStatus === "completed"
                          ? "green"
                          : analysis?.processingStatus === "processing"
                          ? "blue"
                          : analysis?.processingStatus === "failed"
                          ? "red"
                          : "gray"
                      }
                      className="text-[10px] capitalize"
                    >
                      {analysis?.processingStatus || (loadingAnalysis ? "processing" : "pending")}
                    </Badge>
                  </div>
                  {detail.status === "completed" && (
                    <button
                      onClick={handleRetryAnalysis}
                      disabled={retryingAnalysis}
                      className="mt-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${retryingAnalysis ? "animate-spin" : ""}`} />
                      {retryingAnalysis ? "Retrying..." : "Rerun AI"}
                    </button>
                  )}
                </div>
              </div>

              {/* Audio Recording Player */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-brand-500" />
                    <span className="text-xs font-semibold">Call Audio Recording (Cloudflare R2)</span>
                  </div>
                  {recording?.expiresInSeconds && (
                    <span className="text-[10px] text-slate-400">
                      Signed URL expires in {Math.round(recording.expiresInSeconds / 60)}m
                    </span>
                  )}
                </div>

                {audioUrl ? (
                  <div className="space-y-2">
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleTimeUpdate}
                      onEnded={() => setIsPlaying(false)}
                      onError={() => setPlaybackError(true)}
                      className="hidden"
                    />

                    {playbackError ? (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Playback stream unavailable or expired. Please refresh.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlay}
                          className="w-9 h-9 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center shadow-md transition-all active:scale-95 shrink-0"
                          aria-label={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>

                        <div className="flex-1 space-y-1.5">
                          {/* Stitch Autonomous Voice Telemetry: Dual-Tone Waveform Visualizer */}
                          <div className="flex items-end gap-[3px] h-9 px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#0b1120] border border-slate-200/60 dark:border-white/10 overflow-hidden cursor-pointer">
                            {Array.from({ length: 42 }).map((_, idx) => {
                              const progressRatio = (duration || detail.duration || 1) > 0 ? currentTime / (duration || detail.duration || 1) : 0;
                              const isPast = idx / 42 <= progressRatio;
                              const baseH = Math.round(((Math.sin(idx * 0.48) * 0.5 + 0.5) * 65 + 25));
                              const liveH = isPlaying ? Math.min(95, Math.max(15, baseH + Math.sin(idx + currentTime * 6) * 20)) : baseH;
                              return (
                                <div
                                  key={idx}
                                  style={{ height: `${liveH}%` }}
                                  className={`flex-1 rounded-full transition-all duration-100 ${
                                    isPast
                                      ? "bg-gradient-to-t from-[#6366f1] to-[#8b5cf6] shadow-[0_0_6px_rgba(99,102,241,0.4)]"
                                      : "bg-slate-300 dark:bg-[#1e293b]"
                                  }`}
                                />
                              );
                            })}
                          </div>
                          <input
                            type="range"
                            min="0"
                            max={duration || detail.duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                          <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                              {formatDuration(Math.floor(currentTime))}
                            </span>
                            <span>{formatDuration(Math.floor(duration || detail.duration || 0))}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-white/5 p-0.5 rounded-lg text-[10px] font-semibold">
                          {[1, 1.25, 1.5, 2].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => handlePlaybackRateChange(rate)}
                              className={`px-1.5 py-0.5 rounded transition-all ${
                                playbackRate === rate
                                  ? "bg-brand-600 text-white shadow-sm"
                                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={toggleMute}
                          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          aria-label="Toggle Mute"
                        >
                          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>

                        <a
                          href={audioUrl}
                          download={`call-${callId}.wav`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          title="Download Call Recording"
                          aria-label="Download Recording"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400 dark:text-white/30 border border-dashed border-slate-200 dark:border-white/10 rounded-lg">
                    {detail.status === "completed"
                      ? "Recording audio is being uploaded to Cloudflare R2..."
                      : "Recording available once call completes."}
                  </div>
                )}
              </div>

              {/* Grid: Transcript (Left) + Post-Call AI Intelligence (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Transcript Section */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-500" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/60">
                        Conversation Transcript
                      </h4>
                    </div>
                    {detail.transcript?.turns && (
                      <span className="text-[11px] text-slate-400">
                        {detail.transcript.turns.length} turns
                      </span>
                    )}
                  </div>

                  <div className="h-[340px] overflow-y-auto p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-3 text-xs">
                    {detail.transcript?.turns && detail.transcript.turns.length > 0 ? (
                      detail.transcript.turns.map((turn, i) => {
                        const isAgent = turn.speaker?.toLowerCase().includes("agent") || turn.speaker?.toLowerCase().includes("assistant") || turn.speaker?.toLowerCase().includes("ai");
                        return (
                          <div
                            key={i}
                            className={`p-2.5 rounded-xl ${
                              isAgent
                                ? "bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 mr-4"
                                : "bg-white dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/5 ml-4"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`font-bold text-[11px] ${
                                    isAgent
                                      ? "text-indigo-600 dark:text-indigo-400"
                                      : "text-slate-800 dark:text-white/90"
                                  }`}
                                >
                                  {isAgent ? detail.agent?.name || "AI Agent" : detail.lead?.name || "Caller"}
                                </span>
                                {isAgent && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                                    AI Voice • ~180ms
                                  </span>
                                )}
                              </div>
                              {turn.timestamp && (
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {new Date(turn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-700 dark:text-white/80 leading-relaxed">
                              {turn.text}
                            </p>
                          </div>
                        );
                      })
                    ) : detail.transcript?.rawText ? (
                      <div className="p-3 text-slate-700 dark:text-white/80 leading-relaxed whitespace-pre-wrap">
                        {detail.transcript.rawText}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
                        <FileText className="w-8 h-8 mb-2 opacity-30" />
                        <p>No dialogue transcript recorded for this session.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Intelligence Workspace Section */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/60">
                        Post-Call AI Intelligence (Gemini)
                      </h4>
                    </div>
                    {analysis?.model && (
                      <span className="text-[10px] text-purple-400 font-mono">
                        {analysis.model}
                      </span>
                    )}
                  </div>

                  <div className="h-[340px] overflow-y-auto p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-4 text-xs">
                    {loadingAnalysis ? (
                      <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                        <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
                        <p className="text-xs">Generating post-call insights...</p>
                      </div>
                    ) : analysis ? (
                      <>
                        {/* Score & Sentiment Bar */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-center">
                            <span className="text-[10px] text-slate-400 font-medium">AI Lead Score</span>
                            <div className="mt-1 flex items-center justify-center gap-1 font-bold">
                              <span
                                className={`text-base font-extrabold ${
                                  (analysis.leadScore ?? 0) >= 70
                                    ? "text-emerald-500"
                                    : (analysis.leadScore ?? 0) >= 40
                                    ? "text-amber-500"
                                    : "text-rose-500"
                                }`}
                              >
                                {analysis.leadScore ?? "—"}
                              </span>
                              <span className="text-[10px] text-slate-400">/ 100</span>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-center">
                            <span className="text-[10px] text-slate-400 font-medium">Customer Intent</span>
                            <div className="mt-1 font-semibold capitalize truncate text-slate-900 dark:text-white">
                              {analysis.intent?.replace("_", " ") || "Unclear"}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-center">
                            <span className="text-[10px] text-slate-400 font-medium">Sentiment</span>
                            <div className="mt-1">
                              <Badge
                                variant={
                                  analysis.sentiment === "positive"
                                    ? "green"
                                    : analysis.sentiment === "negative"
                                    ? "red"
                                    : "blue"
                                }
                                className="text-[10px] capitalize"
                              >
                                {analysis.sentiment || "neutral"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Executive Summary */}
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-white/60">
                            Executive Synthesis
                          </p>
                          <p className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-white/80 leading-relaxed">
                            {analysis.summary || "Summary generation in progress."}
                          </p>
                        </div>

                        {/* Qualification BANT Card */}
                        {analysis.qualification && (
                          <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-brand-500" />
                                Lead Qualification Status
                              </span>
                              <Badge
                                variant={analysis.qualification.qualified ? "green" : "red"}
                                className="text-[10px]"
                              >
                                {analysis.qualification.qualified ? "QUALIFIED" : "DISQUALIFIED"}
                              </Badge>
                            </div>

                            {analysis.qualification.reasons && analysis.qualification.reasons.length > 0 && (
                              <ul className="space-y-1 pl-4 list-disc text-slate-600 dark:text-white/70 text-[11px]">
                                {analysis.qualification.reasons.map((r, idx) => (
                                  <li key={idx}>{r}</li>
                                ))}
                              </ul>
                            )}

                            {analysis.qualification.metCriteria && analysis.qualification.metCriteria.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {analysis.qualification.metCriteria.map((m, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-medium flex items-center gap-0.5">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> {m}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Appointment Detected Card */}
                        {analysis.appointmentDetected && (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Appointment Scheduled</span>
                            </div>
                            <div className="text-[11px] grid grid-cols-2 gap-2 text-slate-600 dark:text-emerald-100/90">
                              {analysis.appointmentDetails?.date && (
                                <div>
                                  <span className="font-semibold text-slate-500 dark:text-white/40">Time:</span>{" "}
                                  {analysis.appointmentDetails.date}
                                </div>
                              )}
                              {analysis.appointmentDetails?.topic && (
                                <div>
                                  <span className="font-semibold text-slate-500 dark:text-white/40">Topic:</span>{" "}
                                  {analysis.appointmentDetails.topic}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Items */}
                        {analysis.actionItemsJson && analysis.actionItemsJson.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-white/60 flex items-center gap-1">
                              <ListTodo className="w-3.5 h-3.5 text-blue-500" />
                              Action Items
                            </p>
                            <ul className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1 text-[11px]">
                              {analysis.actionItemsJson.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-1.5 text-slate-700 dark:text-white/80">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4 space-y-3">
                        <Brain className="w-8 h-8 opacity-30 text-purple-400" />
                        <div>
                          <p className="font-medium text-slate-600 dark:text-white/60">
                            No AI analysis generated yet.
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Analysis triggers automatically when the call transcript is processed.
                          </p>
                        </div>
                        {detail.status === "completed" && (
                          <button
                            onClick={handleRetryAnalysis}
                            disabled={retryingAnalysis}
                            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Analyze Now with Gemini</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )) : null}
        </div>
      </motion.div>
    </div>
  );
}
