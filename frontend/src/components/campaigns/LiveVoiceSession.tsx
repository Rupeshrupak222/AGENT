"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Send,
  Bot,
  User,
  Activity,
  AlertCircle,
  Zap,
  Headphones,
  ShieldAlert,
  RotateCcw,
  Volume1,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type SupervisorMode = "caller" | "listen" | "whisper" | "barge_in";

interface LiveVoiceSessionProps {
  callId: string;
  agentName?: string;
  customerName?: string;
  customerPhone?: string;
  initialSupervisorMode?: SupervisorMode;
  onCallEnded?: () => void;
}

interface TranscriptTurn {
  id: string;
  speaker: "user" | "agent";
  text: string;
  timestamp: number;
}

// ITU-T G.711 mu-law decoding to Linear PCM [-1.0, 1.0]
function muLawToFloat32(mulawByte: number): number {
  const complement = ~mulawByte & 0xff;
  const sign = complement & 0x80 ? -1 : 1;
  const exponent = (complement >> 4) & 0x07;
  const mantissa = complement & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample -= 0x84;
  return (sign * sample) / 32768;
}

// Linear PCM to ITU-T G.711 mu-law encoding
function float32ToMuLawByte(pcm: number): number {
  let sample = Math.max(-1, Math.min(1, pcm)) * 32767;
  let sign = 0;
  if (sample < 0) {
    sign = 0x80;
    sample = -sample;
  }
  if (sample > 32635) sample = 32635;
  sample += 0x84;

  let exponent = 7;
  for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; expMask >>= 1) {
    exponent--;
  }

  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  return ~(sign | (exponent << 4) | mantissa) & 0xff;
}

export function LiveVoiceSession({
  callId,
  agentName = "AI Voice Agent",
  customerName = "Customer",
  customerPhone,
  initialSupervisorMode = "caller",
  onCallEnded,
}: LiveVoiceSessionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [supervisorMode, setSupervisorMode] = useState<SupervisorMode>(initialSupervisorMode);
  const [isBargedIn, setIsBargedIn] = useState(false);
  const [supervisorNotice, setSupervisorNotice] = useState<string | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptTurn[]>([]);
  const [manualText, setManualText] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scheduledTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript list
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Duration Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize Web Audio Context
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass({ sampleRate: 8000 });
      scheduledTimeRef.current = audioCtxRef.current.currentTime;
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Play incoming mu-law audio chunk from AI Agent
  const playIncomingMuLaw = useCallback(
    (base64Data: string) => {
      try {
        const audioCtx = getAudioContext();
        const binary = atob(base64Data);
        const len = binary.length;
        const float32 = new Float32Array(len);

        let energy = 0;
        for (let i = 0; i < len; i++) {
          const sample = muLawToFloat32(binary.charCodeAt(i));
          float32[i] = sample;
          energy += Math.abs(sample);
        }

        const avgVolume = Math.min(100, Math.round((energy / len) * 300));
        setAiVolume(avgVolume);
        setIsAISpeaking(true);

        const audioBuffer = audioCtx.createBuffer(1, len, 8000);
        audioBuffer.getChannelData(0).set(float32);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        const startTime = Math.max(audioCtx.currentTime, scheduledTimeRef.current);
        source.start(startTime);
        scheduledTimeRef.current = startTime + audioBuffer.duration;

        activeSourcesRef.current.push(source);
        source.onended = () => {
          activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
          if (activeSourcesRef.current.length === 0) {
            setIsAISpeaking(false);
            setAiVolume(0);
          }
        };
      } catch (err: any) {
        console.warn("Failed to schedule audio playback chunk:", err);
      }
    },
    [getAudioContext]
  );

  // Clear queued audio when user interrupts (barge-in)
  const stopAllAIAudio = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    });
    activeSourcesRef.current = [];
    if (audioCtxRef.current) {
      scheduledTimeRef.current = audioCtxRef.current.currentTime;
    }
    setIsAISpeaking(false);
    setAiVolume(0);
  }, []);

  // Connect to Telephony WebSocket Gateway
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "")
      : "http://localhost:3001";

    const socket = io(`${wsUrl}/telephony/stream`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      if (supervisorMode === "caller") {
        // Send stream initiation handshake for direct caller testing
        const streamSid = `browser-${callId}`;
        socket.emit("start", {
          streamSid,
          callSid: callId,
          start: {
            streamSid,
            callSid: callId,
            customParameters: {
              callId,
              tenantId: "default-tenant",
            },
          },
        });
      } else {
        // Join call room as supervisor
        socket.emit("supervisor:join", {
          callId,
          mode: supervisorMode,
          name: "Supervisor (Portal)",
        });
      }
    });

    socket.on("transcript", (data: any) => {
      const item = data.transcript || data;
      if (item && item.text) {
        setTranscripts((prev) => {
          // If turn is non-final and last item is from same speaker, update it; otherwise append
          const last = prev[prev.length - 1];
          if (last && last.speaker === item.speaker && !item.isFinal) {
            return [...prev.slice(0, -1), { ...last, text: item.text }];
          }
          return [
            ...prev,
            {
              id: `${item.speaker}-${Date.now()}-${Math.random()}`,
              speaker: item.speaker,
              text: item.text,
              timestamp: item.timestamp || Date.now(),
            },
          ];
        });
      }
    });

    socket.on("media", (payload: any) => {
      const base64Audio = payload?.media?.payload || payload?.payload;
      if (base64Audio) {
        playIncomingMuLaw(base64Audio);
      }
    });

    // Supervisor monitoring audio channels (caller + agent streams)
    socket.on("supervisor:caller_audio", (payload: any) => {
      if (supervisorMode !== "caller" && payload?.payload) {
        playIncomingMuLaw(payload.payload);
      }
    });

    socket.on("supervisor:agent_audio", (payload: any) => {
      if (supervisorMode !== "caller" && payload?.payload) {
        playIncomingMuLaw(payload.payload);
      }
    });

    socket.on("supervisor:status", (data: any) => {
      if (data?.barged !== undefined) {
        setIsBargedIn(data.barged);
      }
      if (data?.mode) {
        setSupervisorMode(data.mode);
      }
    });

    socket.on("supervisor:released", (data: any) => {
      setIsBargedIn(false);
      setSupervisorNotice(data?.message || "Autonomous AI resumed dialogue control");
      setTimeout(() => setSupervisorNotice(null), 4000);
    });

    socket.on("clear", () => {
      stopAllAIAudio();
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      if (supervisorMode === "caller") {
        socket.emit("stop", { callSid: callId });
      }
      socket.disconnect();
      stopAllAIAudio();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [callId, supervisorMode, playIncomingMuLaw, stopAllAIAudio]);

  // Microphone capture and streaming
  const startMicrophone = async () => {
    try {
      setAudioError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 8000,
          channelCount: 1,
        },
      });

      mediaStreamRef.current = stream;
      const audioCtx = getAudioContext();
      const source = audioCtx.createMediaStreamSource(stream);

      // 2048 samples buffer @ 8000Hz = ~256ms frames
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted) {
          setMicVolume(0);
          return;
        }

        const channelData = e.inputBuffer.getChannelData(0);
        const len = channelData.length;
        const mulawBytes = new Uint8Array(len);

        let sumSquare = 0;
        for (let i = 0; i < len; i++) {
          const sample = channelData[i];
          mulawBytes[i] = float32ToMuLawByte(sample);
          sumSquare += sample * sample;
        }

        const rms = Math.sqrt(sumSquare / len);
        const vol = Math.min(100, Math.round(rms * 400));
        setMicVolume(vol);

        // Convert Uint8Array to base64
        let binary = "";
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(mulawBytes[i]);
        }
        const base64Payload = btoa(binary);

        if (socketRef.current && socketRef.current.connected) {
          if (supervisorMode === "caller") {
            socketRef.current.emit("media", {
              event: "media",
              streamSid: `browser-${callId}`,
              media: {
                payload: base64Payload,
                timestamp: Date.now().toString(),
              },
            });
          } else if (supervisorMode === "barge_in" || supervisorMode === "whisper") {
            socketRef.current.emit("supervisor:audio", {
              callId,
              payload: base64Payload,
            });
          }
        }
      };

      source.connect(processor);
      // Route to silent destination to keep ScriptProcessor running without loopback feedback
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      processor.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      setIsMicActive(true);
    } catch (err: any) {
      setAudioError(`Microphone access error: ${err.message}. You can still use the text simulation bar.`);
      setIsMicActive(false);
    }
  };

  const stopMicrophone = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    setIsMicActive(false);
    setMicVolume(0);
  };

  // Send simulated text turn into conversational loop
  const handleSendManualText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim() || !socketRef.current) return;

    socketRef.current.emit("user_text", { text: manualText.trim() });
    setManualText("");
  };

  const handleSetSupervisorMode = (newMode: SupervisorMode) => {
    setSupervisorMode(newMode);
    if (!socketRef.current) return;

    if (newMode === "caller") {
      setIsBargedIn(false);
      return;
    }

    socketRef.current.emit("supervisor:join", {
      callId,
      mode: newMode,
      name: "Supervisor (Portal)",
    });

    socketRef.current.emit("supervisor:set_mode", {
      callId,
      mode: newMode,
    });

    if (newMode === "barge_in") {
      setIsBargedIn(true);
      stopAllAIAudio();
    } else {
      setIsBargedIn(false);
    }
  };

  const handleReleaseTakeover = () => {
    if (socketRef.current) {
      socketRef.current.emit("supervisor:release", { callId });
    }
    setIsBargedIn(false);
    setSupervisorMode("listen");
  };

  const handleEndCall = () => {
    if (socketRef.current) {
      socketRef.current.emit("stop", { callSid: callId });
    }
    stopMicrophone();
    stopAllAIAudio();
    onCallEnded?.();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Banner: Call Status & Telephony Carrier Info */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{agentName}</span>
              {isBargedIn ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/40 flex items-center gap-1 animate-pulse">
                  <ShieldAlert className="w-3 h-3" /> Live Takeover Active
                </span>
              ) : supervisorMode === "whisper" ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/40 flex items-center gap-1">
                  <Volume1 className="w-3 h-3" /> Whisper Coaching
                </span>
              ) : supervisorMode === "listen" ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 flex items-center gap-1">
                  <Headphones className="w-3 h-3" /> Silent Monitoring
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" /> Live Telephony Sandbox
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Customer: <span className="text-slate-200 font-medium">{customerName}</span>{" "}
              {customerPhone ? `(${customerPhone})` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right font-mono">
            <span className="text-lg font-extrabold text-emerald-400 tracking-wider">
              {formatTimer(callDuration)}
            </span>
            <p className="text-[10px] text-slate-400">Duration</p>
          </div>
          <button
            onClick={handleEndCall}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-rose-600/30"
          >
            <PhoneOff className="w-4 h-4" /> End Call
          </button>
        </div>
      </div>

      {supervisorNotice && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span>{supervisorNotice}</span>
        </div>
      )}

      {/* Supervisor Live Coaching & Monitoring Bar */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-semibold text-slate-200">
              Live Supervisor Coaching & Takeover Station
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Real-time audio injection & autonomous AI arbitration
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleSetSupervisorMode("caller")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              supervisorMode === "caller"
                ? "bg-slate-700 text-white border border-slate-600 shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <User className="w-3.5 h-3.5" /> Caller Simulation
          </button>

          <button
            type="button"
            onClick={() => handleSetSupervisorMode("listen")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              supervisorMode === "listen"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Headphones className="w-3.5 h-3.5" /> Silent Listen
          </button>

          <button
            type="button"
            onClick={() => handleSetSupervisorMode("whisper")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              supervisorMode === "whisper"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Volume1 className="w-3.5 h-3.5" /> Whisper Coach
          </button>

          <button
            type="button"
            onClick={() => handleSetSupervisorMode("barge_in")}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              supervisorMode === "barge_in" || isBargedIn
                ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30 animate-pulse"
                : "bg-slate-800/60 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Barge-in Takeover
          </button>
        </div>

        {/* Active Mode Explanation & Takeover Release */}
        {isBargedIn && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-300 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 animate-bounce" />
              <span>
                <strong>Takeover Active:</strong> AI audio output is immediately silenced. Your microphone streams directly to the caller.
              </span>
            </div>
            <button
              onClick={handleReleaseTakeover}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 transition-colors shadow"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Release Control to AI
            </button>
          </div>
        )}

        {supervisorMode === "whisper" && !isBargedIn && (
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
            <Volume1 className="w-4 h-4 shrink-0" />
            <span>
              <strong>Whisper Coaching:</strong> Your voice is routed exclusively to the agent/telecaller channel. The caller cannot hear you.
            </span>
          </div>
        )}

        {supervisorMode === "listen" && !isBargedIn && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Headphones className="w-4 h-4 shrink-0" />
            <span>
              <strong>Silent Listening:</strong> Both caller and agent audio streams are monitored in real-time with zero interference.
            </span>
          </div>
        )}
      </div>

      {audioError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{audioError}</span>
        </div>
      )}

      {/* Dual Waveform Visualizer */}
      <div className="grid grid-cols-2 gap-3">
        {/* User Microphone Status & Wave */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isMicActive
              ? "bg-brand-950/30 border-brand-500/40 shadow-inner"
              : "bg-slate-900/40 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isMicActive ? "bg-brand-400 animate-ping" : "bg-slate-500"
                }`}
              />
              <span className="text-xs font-semibold text-slate-200">Your Voice (Mic)</span>
            </div>
            <span className="text-[11px] font-mono text-brand-300">
              {isMicActive ? `${micVolume}%` : "Inactive"}
            </span>
          </div>
          {/* Animated equalizer bars */}
          <div className="flex items-center justify-center gap-1.5 h-10 px-2 bg-black/40 rounded-lg overflow-hidden">
            {Array.from({ length: 16 }).map((_, i) => {
              const heightMultiplier = isMicActive
                ? Math.min(100, Math.max(15, micVolume * (0.5 + Math.sin(i * 0.8) * 0.5)))
                : 10;
              return (
                <div
                  key={i}
                  style={{ height: `${heightMultiplier}%` }}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isMicActive ? "bg-gradient-to-t from-brand-500 to-indigo-300" : "bg-slate-700"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* AI Agent Voice Output Wave */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isAISpeaking
              ? "bg-emerald-950/30 border-emerald-500/40 shadow-inner"
              : "bg-slate-900/40 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isAISpeaking ? "bg-emerald-400 animate-ping" : "bg-slate-500"
                }`}
              />
              <span className="text-xs font-semibold text-slate-200">{agentName} (Speaker)</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-300">
              {isAISpeaking ? "Speaking..." : "Listening"}
            </span>
          </div>
          {/* Animated equalizer bars */}
          <div className="flex items-center justify-center gap-1.5 h-10 px-2 bg-black/40 rounded-lg overflow-hidden">
            {Array.from({ length: 16 }).map((_, i) => {
              const heightMultiplier = isAISpeaking
                ? Math.min(100, Math.max(15, aiVolume * (0.5 + Math.cos(i * 0.8) * 0.5)))
                : 10;
              return (
                <div
                  key={i}
                  style={{ height: `${heightMultiplier}%` }}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isAISpeaking ? "bg-gradient-to-t from-emerald-500 to-teal-300" : "bg-slate-700"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-time Dialogue Transcript Stream */}
      <div className="flex-1 flex flex-col rounded-xl bg-slate-950/70 border border-slate-800/80 p-3 min-h-[260px] max-h-[340px]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-xs text-slate-400 font-semibold">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-brand-400" /> Real-Time Telephony Transcripts
          </span>
          <span className="text-[11px] font-normal text-slate-500">
            Deepgram Nova-2 STT ➔ Groq LPU ➔ Edge-TTS
          </span>
        </div>

        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-800"
        >
          {transcripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs text-center p-6">
              <Zap className="w-6 h-6 mb-2 text-brand-400 opacity-60" />
              <p className="font-semibold text-slate-300">Voice pipeline initialized & ready</p>
              <p className="text-[11px] mt-1 text-slate-500">
                Click &quot;Start Microphone&quot; below to speak with your AI agent, or send a test
                message.
              </p>
            </div>
          ) : (
            transcripts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2.5 ${t.speaker === "user" ? "justify-end" : "justify-start"}`}
              >
                {t.speaker === "agent" && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                    t.speaker === "user"
                      ? "bg-brand-600 text-white shadow-md rounded-br-none"
                      : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
                  }`}
                >
                  <p>{t.text}</p>
                  <span className="block text-[9px] text-right mt-1 opacity-60">
                    {new Date(t.timestamp).toLocaleTimeString([], {
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                {t.speaker === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Audio Controls & Interactive Simulation Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isMicActive ? (
              <button
                onClick={startMicrophone}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/30 transition-all"
              >
                <Mic className="w-4 h-4" /> Start Microphone
              </button>
            ) : (
              <>
                <button
                  onClick={stopMicrophone}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
                >
                  <MicOff className="w-4 h-4 text-rose-400" /> Stop Mic
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    isMuted
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-slate-800/80 border-slate-700 text-slate-300"
                  }`}
                >
                  {isMuted ? "Unmute" : "Mute"}
                </button>
              </>
            )}

            {isAISpeaking && (
              <button
                onClick={stopAllAIAudio}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/20 border border-amber-500/40 hover:bg-amber-600/30 text-amber-300 font-semibold text-xs transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" /> Interrupt AI (Barge-in)
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> WebRTC Audio Stream Active
          </div>
        </div>

        {/* Text Simulation Input */}
        <form onSubmit={handleSendManualText} className="flex gap-2">
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Type a customer message to test speech synthesis and conversational brain..."
            className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!manualText.trim()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-brand-400 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> Send Turn
          </button>
        </form>
      </div>
    </div>
  );
}
