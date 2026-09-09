"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, ArrowRight, TrendingDown, DollarSign, Clock, Users } from "lucide-react";
import Link from "next/link";

export function RoiCalculatorSection() {
  const [callers, setCallers] = useState<number>(5);
  const [salary, setSalary] = useState<number>(25000);
  const [callsPerDay, setCallsPerDay] = useState<number>(100);

  // Calculations (26 working days)
  const workingDays = 26;
  const humanMonthlyCost = callers * salary;
  const totalMonthlyCalls = callers * callsPerDay * workingDays;
  // AI estimated cost: ~₹1.50 per call
  const aiMonthlyCost = Math.round(totalMonthlyCalls * 1.5);
  const monthlySavings = Math.max(0, humanMonthlyCost - aiMonthlyCost);
  const annualSavings = monthlySavings * 12;
  const savingsPercent = humanMonthlyCost > 0 ? Math.round((monthlySavings / humanMonthlyCost) * 100) : 0;

  return (
    <section id="calculator" className="py-16 sm:py-24 relative overflow-hidden border-t border-[#DDB892]/40"
      style={{
        backgroundImage: "url('/pricing-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#F5F0E8"
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold mb-5 border backdrop-blur-sm"
            style={{ background: "#F5EDE4", color: "#6F4428", borderColor: "#DDB892" }}>
            <Calculator className="w-3.5 h-3.5" style={{ color: "#8B5A2B" }}/>ROI & Savings Calculator
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight" style={{ color: "#1a1a1a" }}>
            Calculate Your <span style={{ color: "#7F5539" }}>Monthly Savings</span>
          </h2>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "#4A5568" }}>
            See exactly how much your business saves by switching manual calling teams to autonomous AI voice agents.
          </p>
        </motion.div>

        {/* Interactive Calculator Container */}
        <div className="max-w-5xl mx-auto grid lg:grid-cols-12 gap-8 items-center">

          {/* Left Sliders Controls */}
          <div
            className="lg:col-span-7 rounded-3xl p-6 sm:p-8 border shadow-lg space-y-6"
            style={{
              background: "rgba(255, 255, 255, 0.88)",
              borderColor: "rgba(221, 184, 146, 0.6)",
              boxShadow: "0 10px 36px 0 rgba(140, 90, 50, 0.07)"
            }}
          >
            {/* Slider 1: Number of Callers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#8B5A2B]" /> Number of Human Telecallers
                </label>
                <span className="text-base font-extrabold text-[#7F5539] font-mono bg-[#F5EDE4] px-3 py-0.5 rounded-lg border border-[#DDB892]/60">
                  {callers} callers
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={callers}
                onChange={(e) => setCallers(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#8B5A2B] bg-slate-200"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>1 caller</span>
                <span>25 callers</span>
                <span>50 callers</span>
              </div>
            </div>

            {/* Slider 2: Average Salary */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#8B5A2B]" /> Avg. Monthly Salary per Caller
                </label>
                <span className="text-base font-extrabold text-[#7F5539] font-mono bg-[#F5EDE4] px-3 py-0.5 rounded-lg border border-[#DDB892]/60">
                  ₹{salary.toLocaleString("en-IN")}/mo
                </span>
              </div>
              <input
                type="range"
                min="15000"
                max="60000"
                step="1000"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#8B5A2B] bg-slate-200"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>₹15,000</span>
                <span>₹35,000</span>
                <span>₹60,000</span>
              </div>
            </div>

            {/* Slider 3: Daily Calls */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#8B5A2B]" /> Daily Calls per Agent
                </label>
                <span className="text-base font-extrabold text-[#7F5539] font-mono bg-[#F5EDE4] px-3 py-0.5 rounded-lg border border-[#DDB892]/60">
                  {callsPerDay} calls/day
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="250"
                step="10"
                value={callsPerDay}
                onChange={(e) => setCallsPerDay(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#8B5A2B] bg-slate-200"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>40 calls</span>
                <span>120 calls</span>
                <span>250 calls</span>
              </div>
            </div>

            {/* Micro Breakdown */}
            <div className="pt-4 border-t border-slate-200/80 grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-slate-500 block mb-1">Human Call Center Cost</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  ₹{humanMonthlyCost.toLocaleString("en-IN")}<span className="text-xs font-normal text-slate-500">/mo</span>
                </span>
              </div>
              <div className="bg-[#F5EDE4]/60 p-3 rounded-2xl border border-[#DDB892]/60">
                <span className="text-[#6F4428] block mb-1">AgentCall AI Cost</span>
                <span className="text-base font-bold text-[#7F5539] font-mono">
                  ₹{aiMonthlyCost.toLocaleString("en-IN")}<span className="text-xs font-normal text-[#8B5A2B]">/mo</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Results Hero Card */}
          <div
            className="lg:col-span-5 rounded-3xl p-7 sm:p-8 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between"
            style={{
              background: "linear-gradient(145deg, #2B1810 0%, #1A0D08 100%)",
              border: "1px solid rgba(221, 184, 146, 0.35)",
              boxShadow: "0 20px 50px -10px rgba(111, 68, 40, 0.4)"
            }}
          >
            {/* Background Glow */}
            <div
              className="absolute -top-24 -right-24 w-60 h-60 rounded-full pointer-events-none opacity-25"
              style={{ background: "radial-gradient(circle, #DDB892 0%, transparent 70%)" }}
            />

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <TrendingDown className="w-3.5 h-3.5" /> Save {savingsPercent}% Monthly
              </div>

              <p className="text-sm font-medium text-slate-300 mb-1">Your Monthly Savings</p>
              <h3 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-emerald-400 mb-4">
                ₹{monthlySavings.toLocaleString("en-IN")}
              </h3>

              <div className="space-y-3 mb-8 pt-4 border-t border-white/10 text-xs text-slate-300">
                <div className="flex justify-between items-center">
                  <span>Annual Net Savings:</span>
                  <span className="font-bold text-white font-mono text-sm">
                    ₹{annualSavings.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Monthly Dial Capacity:</span>
                  <span className="font-bold text-white font-mono text-sm">
                    {totalMonthlyCalls.toLocaleString("en-IN")} calls
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cost per Call:</span>
                  <span className="font-bold text-emerald-300 font-mono text-sm">
                    ₹1.50 <span className="line-through text-slate-500 text-xs">₹22.00</span>
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/signup"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-lg transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
            >
              Start Saving Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
