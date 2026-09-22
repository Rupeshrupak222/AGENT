"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  MessageSquareWarning,
  BookOpen,
  Plus,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  X,
  Send,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface KbGap {
  id: string;
  question: string;
  frequency: number;
  lastAsked: string;
  category: string;
}

export function ObjectionMatrix() {
  const { success } = useToast();

  const [kbGaps, setKbGaps] = useState<KbGap[]>([
    {
      id: "gap-1",
      question: "Do you offer SOC-2 Type II audit reports for enterprise banking clients?",
      frequency: 18,
      lastAsked: "2 hours ago",
      category: "Security & Compliance",
    },
    {
      id: "gap-2",
      question: "Can commercial solar installations be financed via 5-year zero-cost EMI?",
      frequency: 14,
      lastAsked: "Yesterday",
      category: "Commercial Terms",
    },
    {
      id: "gap-3",
      question: "What is the policy for unused calling quota rollover at the end of billing cycle?",
      frequency: 9,
      lastAsked: "2 days ago",
      category: "Billing & Plans",
    },
  ]);

  // Modal for adding quick resolution to KB
  const [activeGap, setActiveGap] = useState<KbGap | null>(null);
  const [answerInput, setAnswerInput] = useState("");

  const handleResolveGap = () => {
    if (!activeGap || !answerInput.trim()) return;
    success(`Added "${activeGap.question}" to company Knowledge Base! All calling agents will now use this response.`);
    setKbGaps((prev) => prev.filter((g) => g.id !== activeGap.id));
    setActiveGap(null);
    setAnswerInput("");
  };

  const OBJECTIONS = [
    {
      title: "Pricing & Budget Constraints",
      pct: 34,
      calls: 128,
      handledRate: 62,
      color: "from-brand-500 to-amber-600",
    },
    {
      title: "Already using existing vendor / competitor",
      pct: 26,
      calls: 98,
      handledRate: 54,
      color: "from-sky-500 to-blue-600",
    },
    {
      title: "Requested details / brochure on WhatsApp first",
      pct: 22,
      calls: 83,
      handledRate: 91,
      color: "from-emerald-500 to-teal-600",
    },
    {
      title: "Not the designated decision maker",
      pct: 18,
      calls: 68,
      handledRate: 74,
      color: "from-purple-500 to-violet-600",
    },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
      {/* 1. Objection Breakdown */}
      <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/10 space-y-4 min-w-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <MessageSquareWarning className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Customer Objection Radar
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/40">
                Top friction points identified during voice interactions
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-500 dark:text-white/40">
            377 Objections Analyzed
          </span>
        </div>

        <div className="space-y-3">
          {OBJECTIONS.map((obj) => (
            <div
              key={obj.title}
              className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-white/90 truncate pr-2">
                  {obj.title}
                </span>
                <span className="font-mono text-slate-500 dark:text-white/40 text-[11px] flex-shrink-0">
                  {obj.calls} calls ({obj.pct}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${obj.color}`}
                  style={{ width: `${obj.pct * 2}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-white/40 font-mono pt-0.5">
                <span>AI Overcome Rate: <strong className="text-emerald-600 dark:text-emerald-400">{obj.handledRate}%</strong></span>
                <span>Auto-followup triggered</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Knowledge Base Defect Finder */}
      <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/10 space-y-4 min-w-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Brain className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Knowledge Base Gap Finder
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/40">
                Customer questions where calling agents lacked pre-approved answers
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/knowledge"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            All KB <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Gap items */}
        <div className="space-y-2.5">
          {kbGaps.length === 0 ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
              All customer questions covered in Knowledge Base!
            </div>
          ) : (
            kbGaps.map((gap) => (
              <div
                key={gap.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] flex items-start justify-between gap-3 hover:border-brand-500/30 transition-all"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {gap.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Asked {gap.frequency} times · {gap.lastAsked}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 dark:text-white/90">
                    &ldquo;{gap.question}&rdquo;
                  </p>
                </div>

                <button
                  onClick={() => {
                    setActiveGap(gap);
                    setAnswerInput("");
                  }}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition-colors flex-shrink-0"
                >
                  <Plus className="w-3 h-3" /> Add to KB
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Add Answer to KB Modal */}
      <AnimatePresence>
        {activeGap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-5 space-y-4 text-slate-900 dark:text-white relative"
            >
              <button
                onClick={() => setActiveGap(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm">Add Solution to Knowledge Base</h4>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-xs font-medium text-slate-700 dark:text-white/80">
                &ldquo;{activeGap.question}&rdquo;
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-white/70">
                  Approved Agent Answer:
                </label>
                <textarea
                  rows={4}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Enter the factual statement for your AI calling agents to recite when asked this question..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  onClick={() => setActiveGap(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/70"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveGap}
                  disabled={!answerInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Save to Agent Knowledge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
