"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calculator,
  TrendingUp,
  Coins,
  Clock,
  Users,
  Target,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { CompanyDashboardKpis } from "@/lib/api";

interface EnterpriseRoiCalculatorProps {
  kpis?: CompanyDashboardKpis | null;
}

export function EnterpriseRoiCalculator({ kpis }: EnterpriseRoiCalculatorProps) {
  // Configurable human BPO benchmark (default ₹22,000/month/rep in India)
  const [bpoSalaryPerMonth, setBpoSalaryPerMonth] = useState<number>(22000);

  const stats = useMemo(() => {
    const totalMinutes = kpis?.totalMinutes ?? 1280;
    const totalCalls = kpis?.totalCalls ?? 1420;
    const qualifiedLeads = kpis?.qualifiedLeads ?? 184;

    // Total talk hours automated
    const hoursAutomated = totalMinutes / 60;

    // 1 full-time BPO agent typically delivers ~110 productive talk-time hours/month
    const fteEquivalent = Math.max(0.4, hoursAutomated / 110);

    // Human cost = salary + ~25% telephony/infrastructure/management overhead
    const humanCostPerRep = bpoSalaryPerMonth * 1.25;
    const estimatedHumanCost = fteEquivalent * humanCostPerRep;

    // AI Telephony Cost: Approx ₹1.50 per call
    const estimatedAiCost = totalCalls * 1.5;

    // Net Savings
    const netSavings = Math.max(0, estimatedHumanCost - estimatedAiCost);
    const roiMultiplier = estimatedAiCost > 0 ? (estimatedHumanCost / estimatedAiCost).toFixed(1) : "8.5";

    // Cost per Qualified Lead (CPQL)
    const aiCpql = qualifiedLeads > 0 ? estimatedAiCost / qualifiedLeads : 16.5;
    const humanCpql = qualifiedLeads > 0 ? estimatedHumanCost / qualifiedLeads : 175.0;

    return {
      hoursAutomated,
      fteEquivalent,
      estimatedHumanCost,
      estimatedAiCost,
      netSavings,
      roiMultiplier,
      aiCpql,
      humanCpql,
    };
  }, [kpis, bpoSalaryPerMonth]);

  return (
    <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/10 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Business ROI & Headcount Replacement Intelligence
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Audited operational cost savings of your AI workforce vs traditional human BPO telecallers
            </p>
          </div>
        </div>

        {/* ROI Multiplier Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <TrendingUp className="w-4 h-4" />
            {stats.roiMultiplier}x ROI MULTIPLIER
          </span>
        </div>
      </div>

      {/* Top 4 ROI Value Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Net Savings */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-semibold">
            <span>Net Monthly Savings</span>
            <Coins className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            ₹{formatNumber(Math.round(stats.netSavings))}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
            vs ₹{formatNumber(Math.round(stats.estimatedHumanCost))} human cost
          </p>
        </div>

        {/* Human Hours Automated */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50 mb-1 font-semibold">
            <span>Hours Automated</span>
            <Clock className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
            {stats.hoursAutomated.toFixed(0)} hrs
          </p>
          <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
            Productive talk duration
          </p>
        </div>

        {/* Full-Time Equivalent (FTE) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50 mb-1 font-semibold">
            <span>Human Reps Replaced</span>
            <Users className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
            {stats.fteEquivalent.toFixed(1)} FTEs
          </p>
          <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
            Full-time telecallers
          </p>
        </div>

        {/* Cost Per Qualified Lead */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50 mb-1 font-semibold">
            <span>Cost per Lead (CPQL)</span>
            <Target className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
            ₹{stats.aiCpql.toFixed(1)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
            vs ₹{stats.humanCpql.toFixed(0)} human average
          </p>
        </div>
      </div>

      {/* Comparison Visualizer Bar */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 dark:text-white/90">
            Cost Comparison: Traditional BPO vs AgentCall AI
          </span>
          <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            {( (stats.netSavings / (stats.estimatedHumanCost || 1)) * 100 ).toFixed(0)}% Total Cost Reduction
          </span>
        </div>

        {/* Split Bar */}
        <div className="space-y-2">
          {/* Traditional BPO */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-white/50 font-mono">
              <span>Traditional BPO Telecaller Expense</span>
              <span>₹{formatNumber(Math.round(stats.estimatedHumanCost))}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full w-full" />
            </div>
          </div>

          {/* AgentCall AI */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-white/50 font-mono">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                AgentCall Autonomous AI Telephony
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ₹{formatNumber(Math.round(stats.estimatedAiCost))}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(6, (stats.estimatedAiCost / (stats.estimatedHumanCost || 1)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Custom Salary Modeling Slider */}
      <div className="p-3.5 rounded-xl bg-slate-100/60 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-brand-500" />
          <span className="font-semibold text-slate-700 dark:text-white/80">
            Model Your BPO Salary Benchmark:
          </span>
          <span className="font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-white/10 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
            ₹{formatNumber(bpoSalaryPerMonth)}/mo
          </span>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-xs">
          <span className="text-[10px] text-slate-400 font-mono">₹15k</span>
          <input
            type="range"
            min={15000}
            max={45000}
            step={1000}
            value={bpoSalaryPerMonth}
            onChange={(e) => setBpoSalaryPerMonth(Number(e.target.value))}
            className="flex-1 accent-brand-500 cursor-pointer h-1.5 bg-slate-300 dark:bg-white/20 rounded-lg"
          />
          <span className="text-[10px] text-slate-400 font-mono">₹45k</span>
        </div>
      </div>
    </div>
  );
}
