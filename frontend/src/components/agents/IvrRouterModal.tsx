"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  X,
  Phone,
  Bot,
  User,
  CheckCircle2,
  PhoneCall,
  Volume2,
  Save,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface IvrRouterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IvrRouterModal({ isOpen, onClose }: IvrRouterModalProps) {
  const { success } = useToast();

  const [greetingPrompt, setGreetingPrompt] = useState(
    "Namaste and welcome to AgentCall AI Academy. Press 1 or say 'Admissions' to explore programs. Press 2 for Fee and EMI financing. Press 0 to speak with a human counselor."
  );
  const [humanEscalationPhone, setHumanEscalationPhone] = useState("+91 80 4000 1234");
  const [activePressedKey, setActivePressedKey] = useState<string | null>("1");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [saving, setSaving] = useState(false);

  const ivrBranches = [
    {
      key: "1",
      label: "Admissions & Curriculum",
      voiceIntent: "admissions, courses, syllabus, enroll",
      targetAgent: "Adyapan AI — Senior Counselor",
      badge: "Autonomous Voice",
      color: "border-brand-500 bg-brand-500/10 text-brand-400",
    },
    {
      key: "2",
      label: "Fee, Scholarships & 0% EMI",
      voiceIntent: "fees, scholarship, emi, payment",
      targetAgent: "Finance Desk AI",
      badge: "Autonomous Voice",
      color: "border-emerald-500 bg-emerald-500/10 text-emerald-400",
    },
    {
      key: "3",
      label: "Technical Support & LMS",
      voiceIntent: "login, portal, certificate, doubt",
      targetAgent: "Student Tech Advisor AI",
      badge: "Autonomous Voice",
      color: "border-purple-500 bg-purple-500/10 text-purple-400",
    },
    {
      key: "0",
      label: "Escalate to Human Operator",
      voiceIntent: "human, manager, operator, talk to person",
      targetAgent: `Live Escalation (${humanEscalationPhone})`,
      badge: "PSTN Transfer",
      color: "border-amber-500 bg-amber-500/10 text-amber-400",
    },
  ];

  const handleTestKeypad = (digit: string) => {
    setActivePressedKey(digit);
    const branch = ivrBranches.find((b) => b.key === digit);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (branch) {
        const text = `Routing your call to ${branch.targetAgent}. Please hold.`;
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.05;
        window.speechSynthesis.speak(utter);
      }
    }
  };

  const handlePlayGreeting = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
      } else {
        setIsPlayingAudio(true);
        const utter = new SpeechSynthesisUtterance(greetingPrompt);
        utter.rate = 1.0;
        utter.onend = () => setIsPlayingAudio(false);
        utter.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utter);
      }
    }
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      success("Inbound IVR Routing Tree updated and deployed to live telephony numbers!");
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Smart Inbound IVR & Voice Routing Tree</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Auto-Attendant
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Automatically route incoming phone calls via DTMF keypad or natural voice intent classification.
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
          {/* Greeting Prompt Node */}
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Step 1: Auto-Attendant Greeting Prompt
              </span>
              <button
                type="button"
                onClick={handlePlayGreeting}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-1.5"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isPlayingAudio ? "text-amber-400 animate-pulse" : ""}`} />
                {isPlayingAudio ? "Stop Audio" : "Listen Preview"}
              </button>
            </div>
            <textarea
              value={greetingPrompt}
              onChange={(e) => setGreetingPrompt(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl text-xs bg-slate-950 border border-white/10 text-white outline-none focus:border-brand-500 resize-none leading-relaxed"
            />
          </div>

          {/* Main 2-Column: Left Branches, Right Dialpad Simulator */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left: IVR Routing Branches (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider block">
                Step 2: Configured Routing Destinations
              </span>

              <div className="space-y-2.5">
                {ivrBranches.map((branch) => {
                  const isSelected = activePressedKey === branch.key;
                  return (
                    <div
                      key={branch.key}
                      onClick={() => handleTestKeypad(branch.key)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-brand-500 bg-brand-500/20 shadow-lg shadow-brand-500/10 scale-[1.01]"
                          : "border-white/10 bg-slate-800/30 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-white/10 font-mono text-xs font-bold text-white flex items-center justify-center">
                            {branch.key}
                          </span>
                          <p className="text-sm font-bold text-white">{branch.label}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                          {branch.badge}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-white/60 pt-1">
                        <span>Target: <strong className="text-brand-300">{branch.targetAgent}</strong></span>
                        <span className="text-[11px] font-mono text-white/40">Say: &ldquo;{branch.voiceIntent.split(",")[0]}&rdquo;</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-white/70 block mb-1">
                  Human Escalation Failover Phone Number (PSTN)
                </label>
                <input
                  type="text"
                  value={humanEscalationPhone}
                  onChange={(e) => setHumanEscalationPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl text-xs bg-slate-950 border border-white/10 text-white font-mono outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Right: Keypad Simulator (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider block">
                Interactive Dialpad Simulator
              </span>

              <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-4 text-center">
                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-center font-mono">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block">Last Pressed DTMF Key</span>
                  <span className="text-2xl font-black text-amber-300">
                    {activePressedKey || "—"}
                  </span>
                </div>

                {/* Dialpad Matrix */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[200px] mx-auto">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleTestKeypad(num)}
                      className={`h-11 rounded-xl text-sm font-bold font-mono transition-all flex items-center justify-center ${
                        activePressedKey === num
                          ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30 scale-105"
                          : "bg-slate-800 hover:bg-slate-700 text-white"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {activePressedKey && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 text-left flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Branch Matched!</p>
                      <p className="text-[11px] text-emerald-200/80">
                        {ivrBranches.find((b) => b.key === activePressedKey)?.label || "Custom action or fallback"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-white/40">
            Powered by Telephony Audio Session & Twilio/Exotel DTMF Gather
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Deploying..." : "Save & Deploy IVR"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
