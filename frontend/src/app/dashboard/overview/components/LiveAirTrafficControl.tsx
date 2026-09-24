"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Volume2,
  Mic,
  PhoneForwarded,
  UserCheck,
  AlertCircle,
  X,
  Send,
  Sparkles,
  Bot,
  Activity,
  Headphones,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { LiveIndicator } from "@/components/ui/motion";
import { CallItem, AgentItem } from "@/lib/api";

interface LiveCall {
  id: string;
  leadName: string;
  phone: string;
  agentName: string;
  agentLanguage: string;
  durationSeconds: number;
  sentiment: "positive" | "neutral" | "escalating";
  topic: string;
  transcriptSnippet: string;
}

interface LiveAirTrafficControlProps {
  recentCalls: CallItem[];
  agents?: AgentItem[];
}

export function LiveAirTrafficControl({ recentCalls, agents = [] }: LiveAirTrafficControlProps) {
  const { success, info, warning } = useToast();

  // Selected call for supervisor inspection
  const [selectedCall, setSelectedCall] = useState<LiveCall | null>(null);
  const [isListenModalOpen, setIsListenModalOpen] = useState(false);
  const [whisperInput, setWhisperInput] = useState("");
  const [whisperSuccess, setWhisperSuccess] = useState(false);
  const [takeoverSuccess, setTakeoverSuccess] = useState(false);

  // Simulated active in-flight calls based on recent activity and active agents
  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);

  useEffect(() => {
    // Generate 2-3 realistic active in-flight calls based on real agent and call data
    const activeList: LiveCall[] = [
      {
        id: "call-live-101",
        leadName: recentCalls[0]?.lead?.name || "Rohan Sharma",
        phone: recentCalls[0]?.phone || "+91 98201 44521",
        agentName: agents[0]?.name || "Priya Sharma (Hinglish Telecaller)",
        agentLanguage: agents[0]?.language || "hindi",
        durationSeconds: 94,
        sentiment: "positive",
        topic: "Solar Installation Enterprise Quote",
        transcriptSnippet:
          "AI: 'Certainly! We have zero upfront down payment options for commercial installations across Mumbai and Pune...'",
      },
      {
        id: "call-live-102",
        leadName: recentCalls[1]?.lead?.name || "Dr. Anita Desai",
        phone: recentCalls[1]?.phone || "+91 98450 12890",
        agentName: agents[1]?.name || "Kavya Reddy (Telugu Telecaller)",
        agentLanguage: agents[1]?.language || "telugu",
        durationSeconds: 142,
        sentiment: "neutral",
        topic: "Medical Equipment Leasing Inquiry",
        transcriptSnippet:
          "AI: 'మీరు కోరిన 3-సంవత్సరాల లీజింగ్ ప్లాన్ వివరణను మీ వాట్సాప్‌కి వెంటనే పంపుతున్నాను...'",
      },
      {
        id: "call-live-103",
        leadName: recentCalls[2]?.lead?.name || "Vikram Patel",
        phone: recentCalls[2]?.phone || "+91 99099 78210",
        agentName: agents[2]?.name || "Alex Chen (Outbound Sales)",
        agentLanguage: agents[2]?.language || "english",
        durationSeconds: 47,
        sentiment: "escalating",
        topic: "Overdue Invoice Reconciliation",
        transcriptSnippet:
          "Customer: 'I already paid through NEFT yesterday morning! Why are you still calling me about this?'",
      },
    ];

    setLiveCalls(activeList);

    // Live duration timer tick every second
    const interval = setInterval(() => {
      setLiveCalls((prev) =>
        prev.map((c) => ({
          ...c,
          durationSeconds: c.durationSeconds + 1,
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [recentCalls, agents]);

  const handleListenIn = (call: LiveCall) => {
    setSelectedCall(call);
    setIsListenModalOpen(true);
    setWhisperSuccess(false);
    setTakeoverSuccess(false);
    info(`Connected to live audio stream for ${call.leadName}`);
  };

  const handleSendWhisper = () => {
    if (!whisperInput.trim() || !selectedCall) return;
    setWhisperSuccess(true);
    success(`Whisper sent to ${selectedCall.agentName}: "${whisperInput}"`);
    setWhisperInput("");
    setTimeout(() => setWhisperSuccess(false), 4000);
  };

  const handleTakeover = () => {
    if (!selectedCall) return;
    setTakeoverSuccess(true);
    warning(`Human takeover triggered. Warm transferring ${selectedCall.leadName} to supervisor line (+91 80 4719 2300)...`);
    setTimeout(() => {
      // Remove call from live calls to reflect human takeover
      setLiveCalls((prev) => prev.filter((c) => c.id !== selectedCall.id));
      setIsListenModalOpen(false);
      setSelectedCall(null);
    }, 2500);
  };

  const fmtDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="rounded-2xl p-5 bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xl relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-80 h-32 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center shadow-lg shadow-brand-500/10">
            <Radio className="w-5 h-5 text-brand-600 dark:text-brand-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Live Air Traffic Control
              </h3>
              <LiveIndicator label={`${liveCalls.length} IN-FLIGHT`} color="emerald" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time voice stream monitoring, live waveform DSP & supervisor barge-in intervention
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <Headphones className="w-3.5 h-3.5" /> Supervisor Standby Active
          </span>
        </div>
      </div>

      {/* Live Calls Waveform Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4 relative z-10">
        {liveCalls.map((call) => {
          const isEscalating = call.sentiment === "escalating";
          const isPositive = call.sentiment === "positive";

          return (
            <motion.div
              key={call.id}
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className={`rounded-xl p-4 border transition-all flex flex-col justify-between gap-3 relative overflow-hidden ${
                isEscalating
                  ? "bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40 shadow-lg shadow-rose-950/20"
                  : "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 hover:border-brand-500/40"
              }`}
            >
              {/* Header Info */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      {call.leadName}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {call.phone}
                    </span>
                  </div>

                  {/* Sentiment Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                      isEscalating
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30 animate-pulse"
                        : isPositive
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {isEscalating && <AlertCircle className="w-3 h-3 text-rose-500 dark:text-rose-400" />}
                    {call.sentiment}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  <span className="flex items-center gap-1 truncate text-slate-700 dark:text-slate-300">
                    <Bot className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    {call.agentName}
                  </span>
                  <span className="text-slate-900 dark:text-white font-bold bg-slate-200/80 dark:bg-white/10 px-2 py-0.5 rounded-md">
                    {fmtDuration(call.durationSeconds)}
                  </span>
                </div>
              </div>

              {/* Animated Audio Waveform */}
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 truncate">
                    <Activity className="w-3 h-3 text-brand-600 dark:text-brand-400" /> {call.topic}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">142ms</span>
                </div>

                {/* Waveform bars */}
                <div className="flex items-center gap-1 h-7 px-1 pt-1 justify-between">
                  {[40, 75, 55, 90, 60, 100, 70, 85, 45, 95, 65, 80, 50, 70, 95, 60, 85, 40].map(
                    (height, i) => (
                      <motion.div
                        key={i}
                        className={`w-1 rounded-full ${
                          isEscalating
                            ? "bg-gradient-to-t from-rose-600 to-amber-400"
                            : "bg-gradient-to-t from-brand-500 to-emerald-400"
                        }`}
                        animate={{
                          height: [`${Math.max(15, height * 0.3)}%`, `${height}%`, `${Math.max(20, height * 0.5)}%`],
                        }}
                        transition={{
                          repeat: Infinity,
                          repeatType: "reverse",
                          duration: 0.6 + (i % 5) * 0.12,
                          ease: "easeInOut",
                        }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Live Transcript Snippet */}
              <p className="text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-2 px-1">
                {call.transcriptSnippet}
              </p>

              {/* Supervisor Actions Button */}
              <button
                onClick={() => handleListenIn(call)}
                className={`w-full flex items-center justify-center gap-2 h-8.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  isEscalating
                    ? "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-900/30 font-bold"
                    : "bg-slate-200/80 hover:bg-slate-300/80 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white border border-slate-200 dark:border-white/15"
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                {isEscalating ? "Barge-in / Intervene Now" : "Listen & Supervise"}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Supervisor Listening & Takeover Modal */}
      <AnimatePresence>
        {isListenModalOpen && selectedCall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-slate-900 dark:text-white relative space-y-5"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsListenModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    Supervisor Console: {selectedCall.leadName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {selectedCall.phone} · Agent: {selectedCall.agentName} · Time: {fmtDuration(selectedCall.durationSeconds)}
                  </p>
                </div>
              </div>

              {/* Audio Visualizer & Channel Status */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    LIVE AUDIO STREAM (FULL DUPLEX)
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">Opus 48kHz · Jitter 4ms</span>
                </div>

                {/* Big live waveform */}
                <div className="flex items-center justify-center gap-1.5 h-16 py-2">
                  {[20, 45, 70, 95, 60, 85, 100, 75, 90, 50, 80, 65, 95, 40, 85, 70, 90, 60, 40, 80, 55, 90].map(
                    (h, i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 rounded-full bg-gradient-to-t from-brand-600 via-amber-400 to-emerald-400"
                        animate={{
                          height: [`${Math.max(10, h * 0.25)}%`, `${h}%`, `${Math.max(15, h * 0.4)}%`],
                        }}
                        transition={{
                          repeat: Infinity,
                          repeatType: "reverse",
                          duration: 0.5 + (i % 6) * 0.1,
                          ease: "easeInOut",
                        }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Live Transcript Stream */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  <span>Live Speech-to-Text Transcription</span>
                  <span className="text-brand-600 dark:text-brand-400 font-bold">Latency: 280ms</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto font-sans leading-relaxed text-slate-800 dark:text-slate-200">
                  <p>
                    <span className="font-bold text-brand-600 dark:text-brand-400">AI:</span> &ldquo;Thank you for holding, Mr. Sharma. I have retrieved your commercial roof dimensions.&rdquo;
                  </p>
                  <p>
                    <span className="font-bold text-sky-600 dark:text-sky-400">Customer:</span> &ldquo;Does this quote include the net metering approval from MSEDCL?&rdquo;
                  </p>
                  <p className="bg-brand-500/10 p-2 rounded-lg border border-brand-500/20 text-slate-900 dark:text-white font-medium">
                    <span className="font-bold text-brand-600 dark:text-brand-400">AI (speaking now):</span> &ldquo;Yes, exactly! All state grid permissions and subsidy filing are handled end-to-end by our authorized liaison team.&rdquo;
                  </p>
                </div>
              </div>

              {/* AI Whisper Injection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  AI Whisper Note (Injected silently into agent prompt mid-call)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={whisperInput}
                    onChange={(e) => setWhisperInput(e.target.value)}
                    placeholder="e.g. Offer 12% discount if approved by end of this week..."
                    className="flex-1 h-9 px-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendWhisper();
                    }}
                  />
                  <button
                    onClick={handleSendWhisper}
                    disabled={!whisperInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Whisper
                  </button>
                </div>

                {/* Quick Whisper Suggestion Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[
                    "Offer 10% Early Bird Discount",
                    "Confirm WhatsApp Brochure Sent",
                    "Book Callback for Tomorrow 3 PM",
                    "Verify Decision Maker Authority",
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setWhisperInput(chip)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                {whisperSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Whisper prompt successfully injected into active agent context.
                  </motion.div>
                )}
              </div>

              {/* Action Buttons: Takeover vs Mute */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  onClick={() => setIsListenModalOpen(false)}
                  className="px-4 h-9 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Close Monitor
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTakeover}
                    disabled={takeoverSuccess}
                    className="inline-flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50"
                  >
                    <PhoneForwarded className="w-3.5 h-3.5" />
                    {takeoverSuccess ? "Transferring to Supervisor..." : "1-Click Human Takeover"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
