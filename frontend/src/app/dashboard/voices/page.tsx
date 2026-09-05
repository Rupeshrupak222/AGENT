"use client";
import { useState, useEffect } from "react";
import {
  Mic2, Play, Pause, Volume2, Sliders, Globe2,
  Sparkles, Check, ArrowRight, Radio, Loader2
} from "lucide-react";
import { WaveAnimation } from "@/components/ui/WaveAnimation";
import { voicesApi, VoiceProfile as ApiVoiceProfile } from "@/lib/api";

interface PreviewVoice {
  id: string;
  name: string;
  gender: "Female" | "Male";
  languages: string[];
  accent: string;
  tone: string;
  sampleAudio: string;
  avatarColor: string;
}

const GRADIENTS: Record<string, string> = {
  "6366f1": "from-rose-500 to-brand-600",
  "22c55e": "from-blue-600 to-indigo-700",
  a855f7: "from-purple-500 to-pink-600",
  f97316: "from-amber-500 to-orange-600",
  "06b6d4": "from-teal-500 to-emerald-600",
  eab308: "from-cyan-500 to-blue-600",
  "0ea5e9": "from-sky-500 to-indigo-600",
  "8b5cf6": "from-violet-500 to-fuchsia-600",
};

const SAMPLES: Record<string, string> = {
  "priya-warm":         "Namaste! Main Acme Corp se Priya bol rahi hoon. Kya meri baat Rahul ji se ho rahi hai?",
  "arjun-professional": "Hello! Arjun here from AgentCall AI. I noticed your team is scaling outbound outreach this quarter.",
  "meera-soft":         "Hi! Main Meera baat kar rahi hoon hiring team se. Humne aapka profile review kiya tha.",
  "kavya-crisp":        "Tandriga! Kavya matladutunnanu. Mee company kosam oka important update undi.",
  "ravi-energetic":     "Namaste sir, Ravi yahan se bol raha hoon. Kya main aapke liye kuch madad kar sakta hoon?",
  "anjali-confident":   "Good morning! Thank you for calling Acme Headquarters. How may I direct your call today?",
  "natasha-usa":        "Hi there! I'm Natasha from AgentCall. Got a quick minute to go over your account?",
  "daniel-british":     "Good afternoon. Daniel here from AgentCall AI. I'd love to walk you through our solution.",
};

function toPreview(v: ApiVoiceProfile): PreviewVoice {
  return {
    id: v.id,
    name: v.name,
    gender: v.gender,
    languages: v.languages,
    accent: v.accent,
    tone: v.tone,
    sampleAudio: SAMPLES[v.id] || "",
    avatarColor: GRADIENTS[v.avatarColor.replace("#", "").toLowerCase()] || "from-brand-600 to-purple-600",
  };
}

export default function VoicesPage() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [voices, setVoices] = useState<PreviewVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<PreviewVoice | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await voicesApi.list();
        if (cancelled) return;
        const previews = data.map(toPreview);
        setVoices(previews);
        setSelectedVoice(previews[0] ?? null);
      } catch {
        if (!cancelled) setError("Could not load voices. Please check your connection and retry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const togglePlay = (id: string) => {
    const voice = voices.find(v => v.id === id) ?? selectedVoice;
    if (!voice) return;
    if (playingId === id) {
      setPlayingId(null);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      return;
    }
    setPlayingId(id);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(voice.sampleAudio);
      utterance.rate = speed;
      utterance.pitch = pitch;
      utterance.onend = () => setPlayingId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Voice Studio & Accents</h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Ultra-realistic ElevenLabs neural voices tuned for Indian languages, accents, and tones.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            ElevenLabs High-Speed Flash Latency (150ms)
          </span>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Voices List */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Available Voice Personas</h2>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-white/50">
              <Loader2 className="w-6 h-6 animate-spin mb-3" />
              <p className="text-sm">Loading voice personas&hellip;</p>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-16">
              <p className="text-sm text-brand-600 dark:text-brand-400 font-semibold mb-2">{error}</p>
              <p className="text-xs text-slate-500 dark:text-white/50">No voices were loaded.</p>
            </div>
          )}

          {!loading && !error && voices.length === 0 && (
            <div className="text-center py-16">
              <Radio className="w-8 h-8 text-slate-500 dark:text-white/40 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-white/50">No voice personas available.</p>
            </div>
          )}

          {!loading && !error && voices.map((v) => {
            const isPlaying = playingId === v.id;
            const isSelected = selectedVoice?.id === v.id;

            return (
              <div
                key={v.id}
                onClick={() => setSelectedVoice(v)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl ${
                  isSelected
                    ? "bg-slate-100 dark:bg-white/[0.07] border-brand-500/50 shadow-brand-950/40"
                    : "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${v.avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0`}>
                    {v.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{v.name}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/60">
                        {v.gender}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-500/15 text-brand-600 dark:text-brand-300 border border-brand-500/30">
                        {v.accent}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-1">{v.tone}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {v.languages.map((l) => (
                        <span key={l} className="text-[10px] text-slate-500 dark:text-white/40 font-mono">
                          • {l}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                  {isPlaying && <WaveAnimation active size="sm" bars={5} color="bg-brand-400" />}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay(v.id);
                    }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isPlaying
                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/40"
                        : "bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.15] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10"
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Voice Customizer Sidebar */}
        <div className="rounded-2xl p-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-2xl h-fit space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-white/[0.06]">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedVoice?.avatarColor ?? "from-brand-600 to-purple-600"} flex items-center justify-center text-white font-bold`}>
              {selectedVoice?.name[0] ?? "V"}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedVoice?.name ?? "Voice"} (Customizer)</h3>
              <p className="text-xs text-slate-500 dark:text-white/40">{selectedVoice?.accent ?? ""}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-white/60 mb-2">
                <span>Speaking Rate (Speed)</span>
                <span className="font-mono text-slate-900 dark:text-white">{speed}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-white/60 mb-2">
                <span>Vocal Pitch</span>
                <span className="font-mono text-slate-900 dark:text-white">{pitch}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.25"
                step="0.05"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-white/[0.06]">
              <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-2">Sample Sentence</label>
              <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-white/80 leading-relaxed font-mono">
                &ldquo;{selectedVoice?.sampleAudio ?? ""}&rdquo;
              </div>
            </div>

            <button
              onClick={() => selectedVoice && togglePlay(selectedVoice.id)}
              disabled={!selectedVoice}
              className="btn-red w-full text-xs h-10 shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Volume2 className="w-4 h-4" />
              {playingId === selectedVoice?.id ? "Stop Sample" : "Test Live Speech"}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
