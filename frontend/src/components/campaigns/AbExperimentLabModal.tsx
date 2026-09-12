"use client";

import React, { useState } from "react";
import {
  FlaskConical, Sparkles, TrendingUp, CheckCircle2, ArrowRight,
  Sliders, Trophy, RefreshCw, X, ShieldCheck, Zap, BarChart3, Bot
} from "lucide-react";

interface AbExperimentLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName?: string;
}

export const AbExperimentLabModal: React.FC<AbExperimentLabModalProps> = ({
  isOpen,
  onClose,
  campaignName = "Enterprise B2B Outbound Q3",
}) => {
  const [trafficSplit, setTrafficSplit] = useState(50);
  const [championPromoted, setChampionPromoted] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  if (!isOpen) return null;

  const handlePromoteChampion = () => {
    setIsPromoting(true);
    setTimeout(() => {
      setIsPromoting(false);
      setChampionPromoted(true);
      setTrafficSplit(0);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/30 via-slate-900 to-brand-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">A/B Voice & Script Experimentation Lab</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Bayesian Significance Engine
                </span>
              </div>
              <p className="text-xs text-white/50">
                Split test voice personas, pitch hooks, and objection handling workflows with live traffic routing.
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

          {/* Statistical Significance Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-brand-500/10 to-transparent border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Statistical Significance Achieved: 98.2% Confidence</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/30 text-emerald-300">
                    p = 0.018
                  </span>
                </div>
                <p className="text-xs text-white/70 mt-0.5">
                  Variant B (High-Urgency ROI) generated <strong>+83.8% higher meeting bookings</strong> across 992 dialed calls.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePromoteChampion}
              disabled={isPromoting || championPromoted}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              {isPromoting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {championPromoted ? "Champion Deployed (100%)" : "Promote Variant B to Champion"}
            </button>
          </div>

          {/* Traffic Allocation Slider */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span>Traffic Split Allocation</span>
              <span className="font-mono text-purple-300">
                Variant A: {trafficSplit}% &bull; Variant B: {100 - trafficSplit}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={trafficSplit}
              onChange={(e) => setTrafficSplit(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>100% Variant A (Control)</span>
              <span>50 / 50 Equal Split</span>
              <span>100% Variant B (Challenger)</span>
            </div>
          </div>

          {/* Side-by-Side Variant Comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            
            {/* Variant A (Control) */}
            <div className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Variant A (Control)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/60">
                  {trafficSplit}% Traffic
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">Elena — Consultative Concierge</h4>
                <p className="text-xs text-white/40 mt-0.5">Gentle discovery inquiry opening pitch.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 italic leading-relaxed">
                &ldquo;Hello Mr. Sharma, this is Elena from Nexus Wealth. I was reviewing your portfolio diversification request. Am I catching you at a good time?&rdquo;
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                <div>
                  <p className="text-[10px] text-white/40">Pickup Rate</p>
                  <p className="text-xs font-mono font-bold text-white mt-0.5">46.2%</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40">Avg Duration</p>
                  <p className="text-xs font-mono font-bold text-white mt-0.5">2m 14s</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40">Booking Rate</p>
                  <p className="text-xs font-mono font-bold text-white mt-0.5">12.4%</p>
                </div>
              </div>
            </div>

            {/* Variant B (Challenger / Winner) */}
            <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/40 space-y-4 shadow-lg shadow-purple-500/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" /> Variant B (Champion Winner)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  {100 - trafficSplit}% Traffic
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">Maya — High-Urgency Value Proposition</h4>
                <p className="text-xs text-purple-300/60 mt-0.5">Benchmark statistics hook with immediate ROI framing.</p>
              </div>

              <div className="p-3 rounded-xl bg-purple-900/30 border border-purple-500/20 text-xs text-purple-100 italic leading-relaxed">
                &ldquo;Hello Vikram! This is Maya from Nexus. We recently helped a peer wealth fund boost annualized yield by 2.4% with zero upfront cost. Have you considered this tier?&rdquo;
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-500/20 text-center">
                <div>
                  <p className="text-[10px] text-purple-300/60">Pickup Rate</p>
                  <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">54.8% (+18%)</p>
                </div>
                <div>
                  <p className="text-[10px] text-purple-300/60">Avg Duration</p>
                  <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">3m 48s (+70%)</p>
                </div>
                <div>
                  <p className="text-[10px] text-purple-300/60">Booking Rate</p>
                  <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">22.8% (+83%)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Bayesian Multi-Armed Bandit Auto-Optimization Active</span>
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/30 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Experiment Config
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
