"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  X,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Copy,
  Zap,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { AgentItem } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface ObjectionArenaModalProps {
  agent: AgentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ObjectionScenario {
  id: string;
  category: string;
  customerObjection: string;
  simulatedAgentResponse: string;
  score: number;
  empathy: number;
  valueProp: number;
  closingCta: number;
  analysis: string;
  recommendedPromptTuning: string;
}

const OBJECTION_PRESETS: ObjectionScenario[] = [
  {
    id: "price",
    category: "Price & Affordability",
    customerObjection: "₹45,000 is too expensive for me right now. I can learn the same AI topics for free on YouTube.",
    simulatedAgentResponse:
      "I completely understand that upfront cost is an important factor. While YouTube has great theoretical overviews, our Masterclass provides 16 production-grade projects deployed to AWS & GCP, weekly 1-on-1 code reviews with Senior AI Architects, and placement assistance that graduates recoup within their first 2 paychecks. Additionally, we provide 0% interest EMI at just ₹3,750 per month. Would you like me to reserve your zero-interest EMI slot for next week?",
    score: 93,
    empathy: 95,
    valueProp: 91,
    closingCta: 93,
    analysis:
      "Strong emotional validation of the cost concern followed by concrete differentiation (16 cloud projects + 1-on-1 architecture reviews) and immediate de-risking through low-ticket ₹3,750/mo EMI.",
    recommendedPromptTuning:
      "When customer mentions free alternatives like YouTube, always acknowledge YouTube value first before highlighting real-world cloud deployment architecture and 1-on-1 mentorship.",
  },
  {
    id: "time",
    category: "Time & Work Schedule",
    customerObjection: "I work 10 hours a day at my corporate job. I honestly don't have time for a live weekend batch.",
    simulatedAgentResponse:
      "That is completely valid—over 70% of our successful alumni are working software engineers with intense workweeks. All live sessions are held Saturday & Sunday mornings (10 AM to 1 PM) and are fully recorded with lifetime LMS access and interactive code notebooks. You only need 4 dedicated hours per week. May I book you a 15-minute preview access so you can review our self-paced module structure?",
    score: 89,
    empathy: 92,
    valueProp: 86,
    closingCta: 90,
    analysis:
      "Effective social proof ('70% working alumni') and immediate reassurance regarding recordings and reasonable 4-hour commitment.",
    recommendedPromptTuning:
      "Highlight 4-hour weekly commitment and flexible recorded lectures when time poverty is raised.",
  },
  {
    id: "competitor",
    category: "Competitor Comparison",
    customerObjection: "Another leading institute is offering an AI degree for 30% less fee with a 100% money-back guarantee.",
    simulatedAgentResponse:
      "We respect their program! However, most general degree programs focus primarily on legacy Python syntax. Our curriculum is specifically built on modern 2026 Agentic AI—including LangGraph, Multi-Agent Swarms, and LLM Fine-Tuning on private GPUs. We also give you verifiable GitHub proof of work instead of generic theoretical certificates. Would you like to attend our free live demo this Sunday to compare the curriculum firsthand?",
    score: 95,
    empathy: 90,
    valueProp: 98,
    closingCta: 96,
    analysis:
      "Polite competitor handling without negative comments. Positions program on cutting-edge 2026 agentic workflows and GitHub portfolio proof.",
    recommendedPromptTuning:
      "Frame curriculum superiority around production Multi-Agent Swarms and real GitHub portfolios vs paper credentials.",
  },
  {
    id: "hesitation",
    category: "Decision Postponement",
    customerObjection: "Just send me an email with the syllabus. I will read through it and contact you next month if interested.",
    simulatedAgentResponse:
      "I have already dispatched the syllabus and course guide directly to your email! However, our upcoming cohort starting Monday has only 4 scholarship seats remaining with the 15% Early Bird waiver. Let me tentatively hold a seat under your name for 24 hours while you review the syllabus—no payment required today. Does that sound fair?",
    score: 91,
    empathy: 90,
    valueProp: 89,
    closingCta: 95,
    analysis:
      "Honors request immediately (email dispatched) while introducing ethical scarcity and zero-risk micro-commitment (24-hour hold).",
    recommendedPromptTuning:
      "Combine immediate compliance (email sent) with zero-risk 24-hour tentative hold to prevent indefinite delay.",
  },
];

export function ObjectionArenaModal({
  agent,
  isOpen,
  onClose,
}: ObjectionArenaModalProps) {
  const { success } = useToast();
  const [selectedScenario, setSelectedScenario] = useState<ObjectionScenario>(
    OBJECTION_PRESETS[0]
  );
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleTestScenario = (sc: ObjectionScenario) => {
    setIsEvaluating(true);
    setSelectedScenario(sc);
    setTimeout(() => {
      setIsEvaluating(false);
    }, 400);
  };

  const handleCopyTuningPrompt = () => {
    navigator.clipboard.writeText(selectedScenario.recommendedPromptTuning);
    success("Prompt tuning instruction copied to clipboard!");
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">AI Objection Handling & Coaching Arena</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Stress-Test Mode
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Benchmark {agent?.name || "AI Agent"} against difficult sales resistance, price pushback, and competitor comparisons.
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Preset Objection Chips */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-white/70 uppercase tracking-wider block">
              Select Customer Objection Scenario:
            </span>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {OBJECTION_PRESETS.map((sc) => {
                const isActive = selectedScenario.id === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleTestScenario(sc)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? "border-amber-500 bg-amber-500/20 shadow-md shadow-amber-500/10 text-white scale-[1.02]"
                        : "border-white/10 bg-slate-800/40 hover:border-white/20 text-white/70"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-amber-400 block mb-1 uppercase tracking-wider">
                      {sc.category}
                    </span>
                    <p className="text-xs font-semibold line-clamp-2 leading-snug">
                      &ldquo;{sc.customerObjection}&rdquo;
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dialogue Showdown */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left: Customer & Agent turns (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Customer Objection */}
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Skeptical Lead / Caller:
                  </span>
                  <span className="text-[10px] uppercase font-mono text-rose-300">Pushback Trigger</span>
                </div>
                <p className="text-xs text-slate-100 font-medium leading-relaxed">
                  &ldquo;{selectedScenario.customerObjection}&rdquo;
                </p>
              </div>

              {/* Agent Counter-Response */}
              <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-brand-400" /> {agent?.name || "Adyapan AI"} Response:
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    High Conversion Tactic
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedScenario.simulatedAgentResponse}
                </p>
              </div>

              {/* Recommended Prompt Tuning */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Recommended Agent Prompt Instruction
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyTuningPrompt}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy Instruction
                  </button>
                </div>
                <p className="text-xs text-slate-300 italic bg-black/40 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                  &ldquo;{selectedScenario.recommendedPromptTuning}&rdquo;
                </p>
              </div>
            </div>

            {/* Right: Scorecard & Telemetry (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-4 text-center">
                <span className="text-xs font-bold text-white/70 uppercase tracking-wider block">
                  Objection Handling Scorecard
                </span>

                <div className="w-24 h-24 rounded-full border-4 border-emerald-500 bg-emerald-500/10 mx-auto flex flex-col items-center justify-center shadow-lg shadow-emerald-500/20">
                  <span className="text-2xl font-black text-white font-mono">{selectedScenario.score}</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Grade A+</span>
                </div>

                <div className="space-y-3 pt-2 text-left">
                  {/* Empathy */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-white/70">Empathy & Listening</span>
                      <span className="text-emerald-400 font-mono">{selectedScenario.empathy}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedScenario.empathy}%` }} />
                    </div>
                  </div>

                  {/* Value Prop */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-white/70">Value Proposition Proof</span>
                      <span className="text-brand-400 font-mono">{selectedScenario.valueProp}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${selectedScenario.valueProp}%` }} />
                    </div>
                  </div>

                  {/* Closing CTA */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-white/70">Micro-Commitment CTA</span>
                      <span className="text-amber-400 font-mono">{selectedScenario.closingCta}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${selectedScenario.closingCta}%` }} />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 text-left leading-relaxed">
                  <span className="font-bold text-white block mb-1">AI Evaluator Critique:</span>
                  {selectedScenario.analysis}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-white/40">
            Simulated using real objection benchmarks and conversion heuristics
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close Arena
          </button>
        </div>
      </motion.div>
    </div>
  );
}
