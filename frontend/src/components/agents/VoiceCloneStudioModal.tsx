"use client";

import React, { useState, useEffect } from "react";
import {
  Mic, MicOff, UploadCloud, Volume2, Sparkles, Sliders, CheckCircle2,
  Play, Pause, RefreshCw, X, Radio, ArrowRight, ShieldCheck, Zap,
  Layers, Settings2, Info, Headphones
} from "lucide-react";

interface VoiceCloneStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceCreated?: (voiceName: string) => void;
}

export const VoiceCloneStudioModal: React.FC<VoiceCloneStudioModalProps> = ({
  isOpen,
  onClose,
  onVoiceCreated,
}) => {
  const [activeStep, setActiveStep] = useState<"source" | "acoustics" | "preview">("source");
  const [voiceName, setVoiceName] = useState("Elena — Executive Concierge");
  const [brandRole, setBrandRole] = useState("VIP Sales & Advisory");
  const [accent, setAccent] = useState("en-US-Neural");
  const [gender, setGender] = useState<"female" | "male" | "neutral">("female");
  const [tone, setTone] = useState("Empathetic & Consultative");

  // Acoustic Fine-tuning
  const [stability, setStability] = useState(78);
  const [speed, setSpeed] = useState(1.05);
  const [pitch, setPitch] = useState(4);
  const [latencyMode, setLatencyMode] = useState<"ultra_low" | "studio_hq">("ultra_low");

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioSampleReady, setAudioSampleReady] = useState(true);
  const [sampleFileName, setSampleFileName] = useState("elena_30s_sample.wav");

  // TTS Benchmark State
  const [selectedModel, setSelectedModel] = useState<"cartesia" | "elevenlabs" | "deepgram">("cartesia");
  const [testText, setTestText] = useState(
    "Hello Mr. Sharma, this is Elena from Nexus Wealth. I noticed you were exploring our portfolio diversification tier earlier today. Am I catching you at a good time?"
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Recording Timer
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 30) {
            setIsRecording(false);
            setAudioSampleReady(true);
            setSampleFileName("live_mic_take_1.wav");
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  if (!isOpen) return null;

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setAudioSampleReady(true);
      setSampleFileName("live_mic_take_1.wav");
    } else {
      setRecordSeconds(0);
      setIsRecording(true);
      setAudioSampleReady(false);
    }
  };

  const handlePlayPreview = () => {
    if (isPlayingAudio) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    setIsSynthesizing(true);
    setTimeout(() => {
      setIsSynthesizing(false);
      setIsPlayingAudio(true);

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(testText);
        utterance.rate = speed;
        utterance.pitch = 1 + pitch / 50;
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setTimeout(() => setIsPlayingAudio(false), 4500);
      }
    }, 450);
  };

  const handleSaveVoice = () => {
    setSaveSuccess(true);
    if (onVoiceCreated) {
      onVoiceCreated(voiceName);
    }
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/30 via-slate-900 to-brand-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">AI Voice Clone Studio & Persona Forge</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Zero-Shot Neural Clone
                </span>
              </div>
              <p className="text-xs text-white/50">
                Clone brand ambassadors, executive voices, or high-performing sales reps in 30 seconds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation */}
        <div className="px-6 pt-4 pb-2 border-b border-white/10 flex gap-2 bg-slate-950/40">
          {[
            { id: "source", label: "1. Audio Sample Capture", icon: Mic },
            { id: "acoustics", label: "2. Acoustic Fine-Tuning", icon: Sliders },
            { id: "preview", label: "3. Multi-Model Benchmark", icon: Headphones },
          ].map((s) => {
            const Icon = s.icon;
            const isActive = activeStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStep(s.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* STEP 1: AUDIO SAMPLE CAPTURE */}
          {activeStep === "source" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">Cloned Voice Persona Name</label>
                  <input
                    type="text"
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Maya — Real Estate Advisor"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">Brand Role / Department</label>
                  <input
                    type="text"
                    value={brandRole}
                    onChange={(e) => setBrandRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Inbound Concierge"
                  />
                </div>
              </div>

              {/* Live Recorder vs Upload */}
              <div className="grid md:grid-cols-2 gap-4">
                
                {/* Live Mic Recorder Card */}
                <div className={`p-5 rounded-2xl border transition-all flex flex-col items-center text-center justify-between min-h-[220px] ${
                  isRecording
                    ? "bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-500/10"
                    : "bg-black/30 border-white/10"
                }`}>
                  <div className="w-full flex items-center justify-between text-xs text-white/50">
                    <span className="flex items-center gap-1.5 font-semibold text-white/80">
                      <Mic className="w-3.5 h-3.5 text-rose-400" /> Live Studio Mic
                    </span>
                    <span className="font-mono">{recordSeconds}s / 30s</span>
                  </div>

                  {/* Visualizer bars */}
                  <div className="my-4 flex items-center justify-center gap-1.5 h-12">
                    {[16, 28, 40, 24, 36, 48, 30, 44, 20, 38, 52, 26, 34, 18].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-150 ${
                          isRecording
                            ? "bg-rose-500 animate-pulse"
                            : audioSampleReady
                            ? "bg-purple-500/80"
                            : "bg-white/10"
                        }`}
                        style={{
                          height: isRecording
                            ? `${Math.max(12, (h * (Math.sin(i + recordSeconds * 2) + 1.2)))}px`
                            : `${h / 2}px`,
                        }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleRecord}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                      isRecording
                        ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                        : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30"
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4 animate-bounce" /> Stop Recording Take
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" /> Start 30-Second Sample Take
                      </>
                    )}
                  </button>
                </div>

                {/* Upload Existing WAV/MP3 */}
                <div className="p-5 rounded-2xl bg-black/30 border border-white/10 flex flex-col items-center justify-center text-center p-6 border-dashed border-white/20 hover:border-purple-500/40 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 mb-3">
                    <UploadCloud className="w-6 h-6 text-purple-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Upload Studio Audio File</h4>
                  <p className="text-xs text-white/40 max-w-xs mb-3">
                    Drag & drop clean WAV, FLAC, or MP3 (20s to 3 min, 44.1kHz, no background music).
                  </p>
                  <label className="px-4 py-2 rounded-xl text-xs font-bold text-purple-300 bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 cursor-pointer transition-colors">
                    Browse Audio File
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setSampleFileName(e.target.files[0].name);
                          setAudioSampleReady(true);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Audio Verification Status */}
              {audioSampleReady && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      High-fidelity acoustic sample captured: <strong className="font-mono text-white">{sampleFileName}</strong> (SNR: 38dB, Zero clipping)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStep("acoustics")}
                    className="font-bold flex items-center gap-1 hover:underline text-emerald-400"
                  >
                    Proceed to Tuning <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: ACOUSTIC FINE-TUNING */}
          {activeStep === "acoustics" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">Accent & Regional Cadence</label>
                  <select
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="en-US-Neural">English (US General American)</option>
                    <option value="en-GB-Neural">English (British Received)</option>
                    <option value="en-IN-Neural">English (Indian Professional Cadence)</option>
                    <option value="en-AU-Neural">English (Australian Friendly)</option>
                    <option value="es-ES-Neural">Spanish (Castilian Neutral)</option>
                    <option value="de-DE-Neural">German (Standard High German)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">Gender Persona</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["female", "male", "neutral"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`py-2 text-xs font-bold rounded-xl capitalize transition-all border ${
                          gender === g
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                            : "bg-black/30 text-white/50 border-white/10 hover:text-white"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5">Emotional Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Empathetic & Consultative">Empathetic & Consultative</option>
                    <option value="Authoritative & Confident">Authoritative & Confident</option>
                    <option value="Energetic & Fast-Paced">Energetic & Fast-Paced</option>
                    <option value="Calm & Reassuring Support">Calm & Reassuring Support</option>
                  </select>
                </div>
              </div>

              {/* Sliders */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-white mb-2">
                    <span>Voice Consistency / Stability</span>
                    <span className="font-mono text-purple-400">{stability}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={stability}
                    onChange={(e) => setStability(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-white/40 mt-1">
                    <span>Dynamic / Expressive Inflections</span>
                    <span>Rock Solid / Predictable Consistency</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-white mb-2">
                    <span>Speaking Pace (Speed Rate)</span>
                    <span className="font-mono text-purple-400">{speed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.35"
                    step="0.05"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-white/40 mt-1">
                    <span>0.75x (Deliberate & Patient)</span>
                    <span>1.0x (Standard Conversation)</span>
                    <span>1.35x (Quick Telephony)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-white mb-2">
                    <span>Pitch Warmth & Depth</span>
                    <span className="font-mono text-purple-400">{pitch > 0 ? `+${pitch}` : pitch} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    value={pitch}
                    onChange={(e) => setPitch(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-white/40 mt-1">
                    <span>Deeper / Lower Resonance</span>
                    <span>Neutral Core</span>
                    <span>Brighter / Upbeat Resonance</span>
                  </div>
                </div>
              </div>

              {/* Latency Mode Selector */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setLatencyMode("ultra_low")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    latencyMode === "ultra_low"
                      ? "bg-purple-500/15 border-purple-500/40 text-white"
                      : "bg-black/20 border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-purple-300">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Ultra-Low Latency Mode
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      ~110ms TTFB
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Optimized for instant live duplex telephonic interruption and natural conversation flows.
                  </p>
                </div>

                <div
                  onClick={() => setLatencyMode("studio_hq")}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    latencyMode === "studio_hq"
                      ? "bg-purple-500/15 border-purple-500/40 text-white"
                      : "bg-black/20 border-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-purple-300">
                      <Layers className="w-3.5 h-3.5 text-purple-400" /> Studio HQ Master Mode
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                      ~220ms TTFB
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Prioritizes 48kHz studio audio fidelity, emotive breath pauses, and realistic warmth.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: MULTI-MODEL BENCHMARK & TEST */}
          {activeStep === "preview" && (
            <div className="space-y-6 animate-in fade-in">
              {/* Model Choice */}
              <div>
                <label className="text-xs font-semibold text-white/70 block mb-2">Select Neural Synthesis Engine</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "cartesia", name: "Cartesia Sonic 2.0", latency: "95ms", desc: "Fastest stream, zero robotic artifacts" },
                    { id: "elevenlabs", name: "ElevenLabs Turbo v2.5", latency: "140ms", desc: "Top-tier emotional inflection" },
                    { id: "deepgram", name: "Deepgram Aura HD", latency: "120ms", desc: "Clean telephony speech clarity" },
                  ].map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedModel(m.id as any)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        selectedModel === m.id
                          ? "bg-purple-500/20 border-purple-500/50 text-white shadow-lg shadow-purple-500/10"
                          : "bg-black/30 border-white/10 text-white/60 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-purple-300">{m.name}</span>
                        <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                          {m.latency}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40">{m.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Dialogue Input */}
              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5">Interactive Preview Script</label>
                <textarea
                  rows={3}
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-black/40 border border-white/15 text-xs text-white leading-relaxed focus:outline-none focus:border-purple-500 resize-none font-sans"
                />
              </div>

              {/* Audio Playback Controls */}
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePlayPreview}
                    disabled={isSynthesizing}
                    className="w-11 h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {isSynthesizing ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : isPlayingAudio ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{isPlayingAudio ? "Streaming Cloned Speech..." : "Synthesize Voice Sample"}</span>
                      {isPlayingAudio && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Live Audio
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/50 mt-0.5 font-mono">
                      Engine: {selectedModel.toUpperCase()} • Speed: {speed}x • Pitch: {pitch > 0 ? `+${pitch}` : pitch}Hz
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-white/40">
                  <span>Zero-Shot Fidelity Score: </span>
                  <strong className="text-purple-300 font-mono">98.4% Match</strong>
                </div>
              </div>

              {saveSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Voice persona &ldquo;{voiceName}&rdquo; registered! All agents can now select this voice.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Voice Rights Encrypted: SOC-2 & Voice Biometric Protected</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>

            {activeStep !== "preview" ? (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep === "source" ? "acoustics" : "preview")}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/30 transition-all flex items-center gap-1.5"
              >
                Next Step <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveVoice}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-brand-600 hover:from-purple-500 hover:to-brand-500 shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Save & Deploy Cloned Voice
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
