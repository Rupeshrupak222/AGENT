"use client";
import { useState } from "react";
import {
  Mic2, Play, Pause, Volume2, Sliders, Globe2,
  Sparkles, Check, ArrowRight, Radio
} from "lucide-react";
import { WaveAnimation } from "@/components/ui/WaveAnimation";

interface VoiceProfile {
  id: string;
  name: string;
  gender: "Female" | "Male";
  languages: string[];
  accent: string;
  tone: string;
  sampleAudio: string;
  avatarColor: string;
}

const VOICES: VoiceProfile[] = [
  {
    id: "priya",
    name: "Priya",
    gender: "Female",
    languages: ["Hindi", "English", "Hinglish"],
    accent: "Urban Indian (Natural)",
    tone: "Warm, empathetic & professional telecaller",
    sampleAudio: "Namaste! Main Acme Corp se Priya bol rahi hoon. Kya meri baat Rahul ji se ho rahi hai?",
    avatarColor: "from-rose-500 to-brand-600",
  },
  {
    id: "arjun",
    name: "Arjun",
    gender: "Male",
    languages: ["English", "Hindi"],
    accent: "Corporate Indian (Clear)",
    tone: "Authoritative, confident enterprise closer",
    sampleAudio: "Hello! Arjun here from AgentCall AI. I noticed your team is scaling outbound outreach this quarter.",
    avatarColor: "from-blue-600 to-indigo-700",
  },
  {
    id: "meera",
    name: "Meera",
    gender: "Female",
    languages: ["Hindi", "Marathi"],
    accent: "Friendly Conversational",
    tone: "Patient, screening specialist & recruiter",
    sampleAudio: "Hi! Main Meera baat kar rahi hoon hiring team se. Humne aapka profile review kiya tha.",
    avatarColor: "from-purple-500 to-pink-600",
  },
  {
    id: "ravi",
    name: "Ravi",
    gender: "Male",
    languages: ["Hindi", "Gujarati"],
    accent: "Firm & Respectful",
    tone: "Collections & polite reminder specialist",
    sampleAudio: "Namaste sir, Ravi calling regarding your pending account verification and invoice clearance.",
    avatarColor: "from-amber-500 to-orange-600",
  },
  {
    id: "anjali",
    name: "Anjali",
    gender: "Female",
    languages: ["English", "Tamil"],
    accent: "Neutral Executive",
    tone: "Polished front-desk receptionist",
    sampleAudio: "Good morning! Thank you for calling Acme Headquarters. How may I direct your call today?",
    avatarColor: "from-teal-500 to-emerald-600",
  },
  {
    id: "dev",
    name: "Dev",
    gender: "Male",
    languages: ["Hinglish", "Punjabi"],
    accent: "Casual & Upbeat",
    tone: "SaaS SDR & appointment setter",
    sampleAudio: "Hey! Dev here. Just wanted to quickly share how we cut calling overhead by 80%. Have 2 minutes?",
    avatarColor: "from-cyan-500 to-blue-600",
  },
];

export default function VoicesPage() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile>(VOICES[0]);

  const togglePlay = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
      // Optional browser speech synthesis preview for local audio
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const voice = VOICES.find(v => v.id === id);
        if (voice) {
          const utterance = new SpeechSynthesisUtterance(voice.sampleAudio);
          utterance.rate = speed;
          utterance.pitch = pitch;
          utterance.onend = () => setPlayingId(null);
          window.speechSynthesis.speak(utterance);
        }
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Voice Studio & Accents</h1>
          <p className="text-sm text-white/50 mt-1">Ultra-realistic ElevenLabs neural voices tuned for Indian languages, accents, and tones.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            ElevenLabs High-Speed Flash Latency (150ms)
          </span>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Voices List */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-bold text-white uppercase tracking-wider mb-2">Available Voice Personas</h2>
          {VOICES.map((v) => {
            const isPlaying = playingId === v.id;
            const isSelected = selectedVoice.id === v.id;

            return (
              <div
                key={v.id}
                onClick={() => setSelectedVoice(v)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl ${
                  isSelected
                    ? "bg-white/[0.07] border-brand-500/50 shadow-brand-950/40"
                    : "bg-white/[0.03] border-white/[0.08] hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${v.avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0`}>
                    {v.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{v.name}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/[0.06] text-white/60">
                        {v.gender}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-500/15 text-brand-300 border border-brand-500/30">
                        {v.accent}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-1">{v.tone}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {v.languages.map((l) => (
                        <span key={l} className="text-[10px] text-white/40 font-mono">
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
                        : "bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/10"
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
        <div className="rounded-2xl p-6 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-2xl h-fit space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedVoice.avatarColor} flex items-center justify-center text-white font-bold`}>
              {selectedVoice.name[0]}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{selectedVoice.name} (Customizer)</h3>
              <p className="text-xs text-white/40">{selectedVoice.accent}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-white/60 mb-2">
                <span>Speaking Rate (Speed)</span>
                <span className="font-mono text-white">{speed}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-[#D42027]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-white/60 mb-2">
                <span>Vocal Pitch</span>
                <span className="font-mono text-white">{pitch}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.25"
                step="0.05"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-[#D42027]"
              />
            </div>

            <div className="pt-4 border-t border-white/[0.06]">
              <label className="text-xs font-semibold text-white/70 block mb-2">Sample Sentence</label>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/80 leading-relaxed font-mono">
                &ldquo;{selectedVoice.sampleAudio}&rdquo;
              </div>
            </div>

            <button
              onClick={() => togglePlay(selectedVoice.id)}
              className="btn-red w-full text-xs h-10 shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
            >
              <Volume2 className="w-4 h-4" />
              {playingId === selectedVoice.id ? "Stop Sample" : "Test Live Speech"}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
