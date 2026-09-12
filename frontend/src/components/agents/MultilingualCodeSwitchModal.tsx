"use client";

import React, { useState } from "react";
import {
  Globe, Languages, Sparkles, Sliders, Volume2, Play, Pause,
  CheckCircle2, X, ArrowRight, ShieldCheck, Zap, Layers, RefreshCw,
  MessageSquare, BookOpen, Plus, Trash2
} from "lucide-react";

interface MultilingualCodeSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MultilingualCodeSwitchModal: React.FC<MultilingualCodeSwitchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeScenario, setActiveScenario] = useState<"hinglish" | "spanglish" | "telugu">("hinglish");
  const [detectionLatency, setDetectionLatency] = useState(110);
  const [switchingMode, setSwitchingMode] = useState<"conservative" | "balanced" | "instant">("balanced");
  const [primaryLang, setPrimaryLang] = useState("English (India)");
  const [secondaryLang, setSecondaryLang] = useState("Hindi (हिन्दी)");
  const [isPlayingSim, setIsPlayingSim] = useState(false);

  // Glossary replacements
  const [glossary, setGlossary] = useState([
    { source: "Lakhs", target: "Hundred Thousand (USD Equivalent)", dialect: "Corporate IN" },
    { source: "EMI", target: "Monthly Financing Installment", dialect: "Banking" },
    { source: "OTP", target: "One-Time Security Passcode", dialect: "Telecom" },
    { source: "Chai-pe-Charcha", target: "Informal Strategic Sync", dialect: "Hinglish Slang" },
  ]);
  const [newSource, setNewSource] = useState("");
  const [newTarget, setNewTarget] = useState("");

  if (!isOpen) return null;

  const scenarios = {
    hinglish: {
      title: "Hinglish Blend (English ⇄ Hindi)",
      turns: [
        { speaker: "Customer", lang: "English", text: "Hi, I saw your enterprise AI voice platform on LinkedIn. Quick question..." },
        { speaker: "AI Agent", lang: "English", text: "Hello! Absolutely, I'd love to help. Are you looking to automate inbound support or outbound sales calls?" },
        { speaker: "Customer", lang: "Hindi", text: "Actually dono, lekin humare 60% customers Hindi mein baat karte hain. Toh kya aapka AI agent beech mein bhasha badal sakta hai?" },
        { speaker: "AI Agent", lang: "Hindi", text: "Haan bilkul! Humara agent real-time mein English aur Hindi seamlessly switch karta hai bina kisi pause ke. Aap khud abhi sun sakte hain!" },
        { speaker: "Customer", lang: "Hinglish", text: "That is amazing yaar! Can we schedule a quick demo for tomorrow?" },
        { speaker: "AI Agent", lang: "Hinglish", text: "Done deal! Kal dopahar 3:30 baje aapka calendar invite book kar diya hai. See you then!" },
      ],
    },
    spanglish: {
      title: "Spanglish Transition (English ⇄ Spanish)",
      turns: [
        { speaker: "Customer", lang: "English", text: "Good afternoon, I am calling regarding my invoice balance for this month." },
        { speaker: "AI Agent", lang: "English", text: "Certainly! I have your account open. I see an active balance of $240." },
        { speaker: "Customer", lang: "Spanish", text: "Perfecto, ¿puedo pagarlo en dos cuotas con mi tarjeta registrada?" },
        { speaker: "AI Agent", lang: "Spanish", text: "¡Claro que sí! Puedo procesar la primera cuota de $120 hoy mismo y la segunda en quince días." },
      ],
    },
    telugu: {
      title: "Telugu Enterprise Blend (English ⇄ Telugu)",
      turns: [
        { speaker: "Customer", lang: "English", text: "Hi, I am interested in your admission counseling support services." },
        { speaker: "AI Agent", lang: "English", text: "Welcome! We assist over 5,000 students annually with university admissions." },
        { speaker: "Customer", lang: "Telugu", text: "Chala santosham! Hyderabad campus lo seat availability gurinchi cheppagalara?" },
        { speaker: "AI Agent", lang: "Telugu", text: "Tappakunda andi! Hyderabad campus lo Computer Science mariyu AI engineering seats inka available ga unnai." },
      ],
    },
  };

  const handlePlayDialogue = () => {
    if (isPlayingSim) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingSim(false);
      return;
    }

    setIsPlayingSim(true);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const turns = scenarios[activeScenario].turns;
      let idx = 0;
      const playNext = () => {
        if (idx >= turns.length) {
          setIsPlayingSim(false);
          return;
        }
        const t = turns[idx];
        const u = new SpeechSynthesisUtterance(t.text);
        u.rate = 1.05;
        u.pitch = t.speaker.includes("AI") ? 1.05 : 0.95;
        u.onend = () => {
          idx++;
          playNext();
        };
        u.onerror = () => setIsPlayingSim(false);
        window.speechSynthesis.speak(u);
      };
      playNext();
    } else {
      setTimeout(() => setIsPlayingSim(false), 5000);
    }
  };

  const handleAddGlossary = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSource.trim() || !newTarget.trim()) return;
    setGlossary((prev) => [
      ...prev,
      { source: newSource.trim(), target: newTarget.trim(), dialect: "Custom Rule" },
    ]);
    setNewSource("");
    setNewTarget("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-900/30 via-slate-900 to-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">Real-Time Multilingual Code-Switching & Dialect Engine</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Zero-Latency Polyglot
                </span>
              </div>
              <p className="text-xs text-white/50">
                Allows voice agents to detect and mirror mid-sentence language switches with cultural nuance and vernacular fidelity.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Section 1: Live Code-Switching Dialogue Simulator */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Bilingual Dialogue Simulator
                </h3>
                <p className="text-xs text-white/50">
                  Observe how the AI agent smoothly transitions languages without restarting session context.
                </p>
              </div>

              {/* Scenario Toggle */}
              <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
                {(["hinglish", "spanglish", "telugu"] as const).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => {
                      if (isPlayingSim && typeof window !== "undefined" && "speechSynthesis" in window) {
                        window.speechSynthesis.cancel();
                        setIsPlayingSim(false);
                      }
                      setActiveScenario(sc);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                      activeScenario === sc
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            </div>

            {/* Dialogue Stream */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3 max-h-56 overflow-y-auto">
              {scenarios[activeScenario].turns.map((t, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    t.speaker.includes("AI") ? "items-start" : "items-end"
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      t.speaker.includes("AI")
                        ? "bg-blue-950/40 border border-blue-500/20 text-blue-100 rounded-tl-none"
                        : "bg-white/10 text-white rounded-tr-none"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
                      <span className="font-bold text-blue-400">{t.speaker}</span>
                      <span className="font-mono px-1.5 py-0.5 rounded bg-white/5">{t.lang}</span>
                    </div>
                    <p>{t.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Synthesis audio trigger */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-white/40">
                Language Shift Latency: <strong className="text-emerald-400 font-mono">92ms Detection</strong>
              </span>
              <button
                type="button"
                onClick={handlePlayDialogue}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
              >
                {isPlayingSim ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlayingSim ? "Pause Simulation" : "Listen to Bilingual Audio"}
              </button>
            </div>
          </div>

          {/* Section 2: Tuning Sliders & Dialects */}
          <div className="grid md:grid-cols-2 gap-4">
            
            {/* Sensitivity & Latency */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                Detection & Sensitivity Controls
              </h4>

              <div>
                <div className="flex justify-between text-xs font-semibold text-white mb-1.5">
                  <span>Language Shift Detection Window</span>
                  <span className="font-mono text-blue-400">{detectionLatency}ms</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="240"
                  step="10"
                  value={detectionLatency}
                  onChange={(e) => setDetectionLatency(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/40 mt-1">
                  <span>Ultra-Aggressive (60ms)</span>
                  <span>Balanced (110ms)</span>
                  <span>Context-First (240ms)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5">Switching Cadence Policy</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "conservative", label: "Full Sentence" },
                    { id: "balanced", label: "Phrase Break" },
                    { id: "instant", label: "Token Mirror" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSwitchingMode(m.id as any)}
                      className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                        switchingMode === m.id
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                          : "bg-black/30 text-white/50 border-white/10 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary & Secondary Dialects */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Regional Accent & Colloquialisms
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-white/60 block mb-1">Primary Base Language</label>
                  <select
                    value={primaryLang}
                    onChange={(e) => setPrimaryLang(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                  >
                    <option value="English (India)">English (Indian Corporate)</option>
                    <option value="English (US)">English (US West Coast)</option>
                    <option value="English (UK)">English (British Received)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-white/60 block mb-1">Secondary Fallback / Blend</label>
                  <select
                    value={secondaryLang}
                    onChange={(e) => setSecondaryLang(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                  >
                    <option value="Hindi (हिन्दी)">Hindi (हिन्दी)</option>
                    <option value="Spanish (Español)">Spanish (Español)</option>
                    <option value="Telugu (తెలుగు)">Telugu (తెలుగు)</option>
                    <option value="German (Deutsch)">German (Deutsch)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 leading-relaxed">
                When callers use colloquial phrases (e.g. &ldquo;yaar&rdquo;, &ldquo;arrey&rdquo;, &ldquo;achha&rdquo;), the AI naturally reciprocates with conversational warmth instead of stiff translation.
              </div>
            </div>
          </div>

          {/* Section 3: Localized Terminology & Glossary Mappings */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  Localized Terminology & Substitution Glossary
                </h4>
                <p className="text-[11px] text-white/40">
                  Custom term overrides ensure financial, technical, or cultural phrases are interpreted accurately.
                </p>
              </div>
            </div>

            {/* Quick add row */}
            <form onSubmit={handleAddGlossary} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Source vernacular (e.g. Crores)"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Target definition (e.g. 10 Million)"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
              />
              <button
                type="submit"
                disabled={!newSource.trim() || !newTarget.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Rule
              </button>
            </form>

            {/* Table */}
            <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-white/60 border-b border-white/10 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Vernacular Term</th>
                    <th className="py-2.5 px-3">Normalized Semantic Interpretation</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {glossary.map((g, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-300">{g.source}</td>
                      <td className="py-2.5 px-3 text-slate-200">{g.target}</td>
                      <td className="py-2.5 px-3 text-white/40 text-[11px]">{g.dialect}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setGlossary(glossary.filter((_, idx) => idx !== i))}
                          className="text-white/40 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Polyglot Voice AI Model v2.4 • Continuous Acoustic Phoneme Mapping</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Save Code-Switching Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
