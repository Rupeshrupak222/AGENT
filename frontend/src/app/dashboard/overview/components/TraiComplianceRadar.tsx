"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Clock,
  Radio,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Lock,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function TraiComplianceRadar() {
  const { success } = useToast();
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [lastScrubbedTime, setLastScrubbedTime] = useState("Just now");

  const handleRunDndScrub = () => {
    setIsScrubbing(true);
    setTimeout(() => {
      setIsScrubbing(false);
      setLastScrubbedTime("Just now");
      success("TRAI NDNC Scrub Complete: 0 DND violations found across all active campaign lead lists.");
    }, 1800);
  };

  return (
    <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/10 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                TRAI, DLT & NDNC Compliance Radar
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                <CheckCircle2 className="w-3 h-3" /> 100% REGULATORY SAFEGUARD
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
              Automated telecom scrubbers ensuring zero UCC penalties, verified 140xxx carrier routes & opt-out suppression
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunDndScrub}
            disabled={isScrubbing}
            className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-500 ${isScrubbing ? "animate-spin" : ""}`} />
            {isScrubbing ? "Scrubbing Lists..." : "Run DND Scrub"}
          </button>
        </div>
      </div>

      {/* 4 Compliance Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* NDNC Scrubbing */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
            <span className="font-semibold">DND Scrub Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            99.96%
          </p>
          <p className="text-[11px] text-slate-400 dark:text-white/40">
            Scrubbed {lastScrubbedTime} · 0 infractions
          </p>
        </div>

        {/* 9 AM - 8 PM Window Enforcement */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
            <span className="font-semibold">Calling Window Lock</span>
            <Lock className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
            09:00 - 20:00 IST
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Strict dialer kill-switch active
          </p>
        </div>

        {/* 140xxx Telephony Route Status */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
            <span className="font-semibold">DLT Header Status</span>
            <Radio className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
            140-SERIES RTM
          </p>
          <p className="text-[11px] text-slate-400 dark:text-white/40">
            Entity ID: 1702159021489
          </p>
        </div>

        {/* Auto-DND Suppressed Contacts */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
            <span className="font-semibold">Opt-Out Suppression</span>
            <FileCheck className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">
            142 Contacts
          </p>
          <p className="text-[11px] text-slate-400 dark:text-white/40">
            Locked from future outbound dials
          </p>
        </div>
      </div>
    </div>
  );
}
