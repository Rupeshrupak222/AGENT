"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Send,
  X,
  Sparkles,
  Zap,
  Bot,
  User,
  Radio,
  Clock,
  CheckCircle2,
  Copy,
  AlertCircle,
  Play,
  Pause,
} from "lucide-react";
import { AgentItem, agentsApi, TestChatResponse, normalizeApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface AgentVoiceSimulatorModalProps {
  agent: AgentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  audioBase64?: string | null;
  latencyMs?: number;
  timestamp: Date;
}

export function AgentVoiceSimulatorModal({
  agent,
  isOpen,
  onClose,
}: AgentVoiceSimulatorModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lastMetrics, setLastMetrics] = useState<{
    totalMs: number;
    llmMs: number;
    ttsMs: number;
  } | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const [handsFree, setHandsFree] = useState(false);
  const handsFreeRef = useRef(false);
  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const { success, error: toastError } = useToast();

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // Stop audio and recognition when modal is closed or agent changes
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecording(false);
      setIsPlayingAudio(false);
      setIsProcessing(false);
      setMessages([]);
      setLastMetrics(null);
      setSpeechError(null);
    } else if (agent) {
      // Seed initial opening greeting if defined
      if (agent.openingScript) {
        setMessages([
          {
            id: "initial-greeting",
            role: "assistant",
            content: agent.openingScript,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages([
          {
            id: "initial-greeting",
            role: "assistant",
            content: `Hello! I am ${agent.name}. How can I assist you today?`,
            timestamp: new Date(),
          },
        ]);
      }
    }
  }, [isOpen, agent]);

  // Initialize Speech Recognition if supported
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        "Browser Speech Recognition is not supported in this browser. You can type in the box below to test."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      // Select language for speech recognition
      const lang = (agent?.language || "english").toLowerCase();
      if (lang.includes("hindi") || lang.includes("hinglish")) {
        recognition.lang = "hi-IN";
      } else if (lang.includes("telugu")) {
        recognition.lang = "te-IN";
      } else if (lang.includes("tamil")) {
        recognition.lang = "ta-IN";
      } else if (lang.includes("bengali")) {
        recognition.lang = "bn-IN";
      } else if (lang.includes("gujarati")) {
        recognition.lang = "gu-IN";
      } else if (lang.includes("marathi")) {
        recognition.lang = "mr-IN";
      } else {
        recognition.lang = "en-IN";
      }

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      let finalRecognized = "";
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        finalRecognized = transcript;
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setSpeechError("Microphone access was denied. Please allow microphone permissions or type below.");
        } else if (event.error !== "no-speech") {
          setSpeechError(`Speech recognition: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        // In hands-free mode, if we captured text, automatically submit turn
        if (handsFreeRef.current && finalRecognized.trim()) {
          handleSendTurn(finalRecognized.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setSpeechError("Could not access microphone. Please type your message.");
      setIsRecording(false);
    }
  }, [agent]);

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const playAgentAudio = (audioBase64?: string | null, textContent?: string) => {
    if (isMuted) return;

    // 1. If audioBase64 provided by server TTS
    if (audioBase64) {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
        }

        const audio = new Audio(audioBase64);
        audioRef.current = audio;
        setIsPlayingAudio(true);

        audio.onended = () => {
          setIsPlayingAudio(false);
          if (handsFreeRef.current) {
            setTimeout(() => startSpeechRecognition(), 400);
          }
        };
        audio.onerror = (e) => {
          console.warn("Audio playback error:", e);
          setIsPlayingAudio(false);
        };

        audio.play().catch((err) => {
          console.warn("Audio auto-play prevented:", err);
          setIsPlayingAudio(false);
        });
        return;
      } catch (err) {
        console.warn("Failed to play audio:", err);
        setIsPlayingAudio(false);
      }
    }

    // 2. High-Fidelity Web SpeechSynthesis fallback
    if (textContent && typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textContent);
        const lang = (agent?.language || "english").toLowerCase();

        if (lang.includes("hindi") || lang.includes("hinglish")) {
          utterance.lang = "hi-IN";
        } else if (lang.includes("telugu")) {
          utterance.lang = "te-IN";
        } else if (lang.includes("tamil")) {
          utterance.lang = "ta-IN";
        } else {
          utterance.lang = "en-IN";
        }

        // Voice matching if available
        const voices = window.speechSynthesis.getVoices();
        const matchedVoice = voices.find((v) =>
          v.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2).toLowerCase())
        );
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }

        utterance.rate = 1.02;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsPlayingAudio(true);
        utterance.onend = () => {
          setIsPlayingAudio(false);
          if (handsFreeRef.current) {
            setTimeout(() => startSpeechRecognition(), 400);
          }
        };
        utterance.onerror = (e) => {
          console.warn("Speech synthesis error:", e);
          setIsPlayingAudio(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("SpeechSynthesis error:", e);
        setIsPlayingAudio(false);
      }
    }
  };

  const stopAudioPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  const handleSendTurn = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !agent || isProcessing) return;

    stopSpeechRecognition();
    setInputText("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsProcessing(true);

    try {
      // Build history for backend turn
      const historyPayload = nextMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res: TestChatResponse = await agentsApi.testChat(agent.id, {
        userMessage: text,
        history: historyPayload,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.replyText,
        audioBase64: res.audioBase64,
        latencyMs: res.totalLatencyMs,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setLastMetrics({
        totalMs: res.totalLatencyMs,
        llmMs: res.metrics?.llmLatencyMs || 0,
        ttsMs: res.metrics?.ttsLatencyMs || 0,
      });

      // Play synthesized audio (Edge-TTS base64 or browser SpeechSynthesis)
      playAgentAudio(res.audioBase64, res.replyText);
    } catch (err) {
      toastError(normalizeApiError(err));
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "I apologize, I could not process your query right now. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestart = () => {
    stopAudioPlayback();
    stopSpeechRecognition();
    setLastMetrics(null);
    setInputText("");
    if (agent?.openingScript) {
      setMessages([
        {
          id: `initial-greeting-${Date.now()}`,
          role: "assistant",
          content: agent.openingScript,
          timestamp: new Date(),
        },
      ]);
      // Also speak the initial greeting if not muted
      playAgentAudio(null, agent.openingScript);
    } else {
      const greeting = `Hello! I am ${agent?.name || "AI Agent"}. How can I assist you?`;
      setMessages([
        {
          id: `initial-greeting-${Date.now()}`,
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ]);
      playAgentAudio(null, greeting);
    }
    success("Conversation restarted.");
  };

  const handleCopyTranscript = () => {
    if (messages.length === 0) return;
    const text = messages
      .map(
        (m) =>
          `[${m.timestamp.toLocaleTimeString()}] ${
            m.role === "assistant" ? agent?.name || "AI Agent" : "You"
          }: ${m.content}`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    success("Conversation transcript copied to clipboard!");
  };

  if (!isOpen || !agent) return null;

  // Dynamic language & role-specific prompt chips
  const agentName = agent.name.toLowerCase();
  const agentLang = (agent.language || "english").toLowerCase();

  let quickPrompts: string[] = [];
  if (agentName.includes("adyapan") || agent.role.includes("counselor") || agentName.includes("edutech")) {
    quickPrompts = [
      "Tell me about Full Stack AI Masterclass",
      "What is the course fee and EMI plan?",
      "Book a free counseling demo class",
      "Do you provide placement guarantee?",
      "Can I get the ADYAPAN15 discount code?",
    ];
  } else if (agentLang.includes("hindi") || agentLang.includes("hinglish")) {
    quickPrompts = [
      "मुझे कोर्स की फीस और सिलेबस बताएं",
      "क्या वीकेंड पर लाइव क्लास होती है?",
      "डेमो क्लास कैसे बुक करूँ?",
      "कोर्स के बाद प्लेसमेंट सपोर्ट कैसा है?",
    ];
  } else if (agentLang.includes("telugu")) {
    quickPrompts = [
      "కోర్సు ఫీజు మరియు డ్యూరేషన్ ఎంత?",
      "డెమో క్లాస్ ఎప్పుడు షెడ్యూల్ చేయవచ్చు?",
      "ప్లేస్‌మెంట్ అసిస్టెన్స్ ఇస్తారా?",
      "వీకెండ్ బ్యాచ్ అందుబాటులో ఉందా?",
    ];
  } else {
    quickPrompts = [
      "What courses & enterprise solutions do you offer?",
      "How much does your full program cost?",
      "I'd like to schedule a 1-on-1 counseling demo",
      "Can you explain your 0% EMI financing options?",
    ];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl h-[90vh] max-h-[780px] flex flex-col rounded-2xl bg-[#140b08] border border-[#8B5A2B]/40 shadow-2xl overflow-hidden"
      >
        {/* ── Modal Header ────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-gradient-to-r from-[#20100a] via-[#1a0c07] to-[#120704] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8B5A2B] to-[#5c3817] flex items-center justify-center text-white font-bold text-base shadow-lg shadow-[#8B5A2B]/20">
                <Bot className="w-6 h-6 text-amber-200" />
              </div>
              {isPlayingAudio && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {agent.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {agent.role.replace(/_/g, " ")}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-white/70 border border-white/10 capitalize">
                  {agent.language}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400" />
                Live Two-Way Voice Simulator · Multi-lingual Speech-to-Speech
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Hands-Free Voice Conversation Mode Toggle */}
            <button
              onClick={() => {
                const next = !handsFree;
                setHandsFree(next);
                if (next) {
                  success("Hands-free continuous conversation mode enabled!");
                  startSpeechRecognition();
                } else {
                  stopSpeechRecognition();
                }
              }}
              title={handsFree ? "Disable Hands-Free Mode" : "Enable Hands-Free Voice Mode"}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                handsFree
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20 animate-pulse"
                  : "bg-white/[0.06] text-white/60 hover:text-white border border-white/10"
              }`}
            >
              <Mic className={`w-3.5 h-3.5 ${handsFree ? "text-emerald-300" : ""}`} />
              <span className="hidden sm:inline">Hands-Free</span>
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
              className={`p-2 rounded-xl text-xs font-semibold transition-colors ${
                isMuted
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "bg-white/[0.06] text-white/70 hover:text-white border border-white/10"
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleRestart}
              title="Restart Conversation"
              className="p-2 rounded-xl text-xs font-semibold bg-white/[0.06] text-white/70 hover:text-white hover:bg-white/[0.12] border border-white/10 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopyTranscript}
              title="Copy Transcript"
              className="p-2 rounded-xl text-xs font-semibold bg-white/[0.06] text-white/70 hover:text-white hover:bg-white/[0.12] border border-white/10 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Sub-header Telemetry Strip ──────────────────────── */}
        <div className="px-4 py-2 bg-black/40 border-b border-white/[0.06] flex items-center justify-between text-[11px] font-mono flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-white/40 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              Round-Trip:
            </span>
            <span className="text-amber-300 font-bold">
              {lastMetrics ? `${lastMetrics.totalMs}ms` : "Sub-second (<600ms)"}
            </span>
            {lastMetrics && (
              <span className="text-white/40 hidden sm:inline">
                (LLM: {lastMetrics.llmMs}ms · TTS: {lastMetrics.ttsMs}ms)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-semibold">Ready for Voice Input</span>
          </div>
        </div>

        {/* ── Active Talking Wave Banner ───────────────────────── */}
        <AnimatePresence>
          {isPlayingAudio && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gradient-to-r from-amber-500/10 via-amber-600/20 to-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between overflow-hidden"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                <Volume2 className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>{agent.name} is speaking now...</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1 h-3 bg-amber-400 rounded-full animate-pulse" />
                <span className="w-1 h-5 bg-amber-300 rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="w-1 h-4 bg-amber-400 rounded-full animate-pulse [animation-delay:300ms]" />
                <span className="w-1 h-6 bg-amber-200 rounded-full animate-pulse [animation-delay:75ms]" />
                <button
                  onClick={stopAudioPlayback}
                  className="ml-3 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border border-amber-500/40 transition-colors"
                >
                  Stop Audio
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Speech Error Alert ───────────────────────────────── */}
        {speechError && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{speechError}</span>
          </div>
        )}

        {/* ── Chat Messages Stream ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
          {messages.map((m) => {
            const isAgent = m.role === "assistant";
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isAgent ? "justify-start" : "justify-end"}`}
              >
                {isAgent && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8B5A2B] to-[#4a2b12] flex items-center justify-center text-amber-200 flex-shrink-0 mt-0.5 border border-amber-500/30 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-3.5 leading-relaxed ${
                    isAgent
                      ? "bg-white/[0.04] border border-white/10 text-white/90 shadow-sm"
                      : "bg-gradient-to-r from-[#8B5A2B] to-[#71441c] text-white shadow-md shadow-[#8B5A2B]/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                      {isAgent ? agent.name : "You"}
                    </span>
                    <span className="text-[10px] opacity-40 font-mono">
                      {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-sm font-normal text-slate-100 whitespace-pre-wrap">
                    {m.content}
                  </p>

                  {isAgent && m.audioBase64 && (
                    <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between">
                      <button
                        onClick={() => playAgentAudio(m.audioBase64)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-amber-200" />
                        Play Voice
                      </button>
                      {m.latencyMs && (
                        <span className="text-[10px] font-mono text-white/40">
                          ⚡ {m.latencyMs}ms
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {!isAgent && (
                  <div className="w-8 h-8 rounded-xl bg-white/[0.08] flex items-center justify-center text-white/80 flex-shrink-0 mt-0.5 border border-white/15">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8B5A2B] to-[#4a2b12] flex items-center justify-center text-amber-200 flex-shrink-0 mt-0.5 border border-amber-500/30">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="rounded-2xl p-3.5 bg-white/[0.04] border border-white/10 text-white/70 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
                <span className="text-xs font-mono ml-1 text-white/50">
                  Synthesizing vocal response...
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ── Quick Prompt Starters ────────────────────────────── */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-black/20 flex items-center gap-1.5 overflow-x-auto flex-shrink-0 scrollbar-none">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider whitespace-nowrap mr-1">
            Test Starters:
          </span>
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => handleSendTurn(q)}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-white/70 hover:text-white whitespace-nowrap transition-colors disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>

        {/* ── Voice & Text Input Controls ──────────────────────── */}
        <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-[#1a0e0a] flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendTurn();
            }}
            className="flex items-center gap-2"
          >
            {/* Microphone Button */}
            <button
              type="button"
              onClick={isRecording ? stopSpeechRecognition : startSpeechRecognition}
              disabled={isProcessing}
              title={isRecording ? "Stop Recording" : "Speak via Microphone"}
              className={`relative p-3 rounded-xl font-bold flex items-center justify-center transition-all flex-shrink-0 ${
                isRecording
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/40 animate-pulse scale-105"
                  : "bg-gradient-to-r from-amber-500 to-[#8B5A2B] hover:from-amber-400 hover:to-amber-600 text-slate-950 shadow-md shadow-[#8B5A2B]/20"
              }`}
            >
              {isRecording ? (
                <MicOff className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              )}
            </button>

            {/* Input Box */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isRecording
                  ? "🎙️ Listening to your microphone... speak now"
                  : "Speak into mic or type a test message to agent..."
              }
              disabled={isProcessing}
              className="flex-1 h-11 px-4 rounded-xl text-xs sm:text-sm bg-white/[0.05] border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-amber-500/60 transition-colors"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className="h-11 px-4 rounded-xl font-bold text-xs text-white bg-[#8B5A2B] hover:bg-[#a36b33] disabled:opacity-40 transition-colors flex items-center gap-1.5 flex-shrink-0 shadow-md shadow-[#8B5A2B]/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-white/40 mt-2 px-1">
            <span>Click the microphone to talk naturally or type your prompt</span>
            <span>Edge-TTS Neural Voice · Sub-second roundtrip</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
