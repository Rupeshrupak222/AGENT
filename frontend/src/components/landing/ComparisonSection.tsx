"use client";
import { motion } from "framer-motion";
import { Check, X, Scale, Sparkles } from "lucide-react";

interface ComparisonRow {
  feature: string;
  agentCallAI: string;
  humanCenter: string;
}

const comparisons: ComparisonRow[] = [
  {
    feature: "Working Hours & Availability",
    agentCallAI: "24/7/365 Non-stop (Holidays & Nights)",
    humanCenter: "8 Hours/Day (Weekdays only, High penalty on overtime)"
  },
  {
    feature: "Cost Per Qualified Call",
    agentCallAI: "₹1.50 / call (Save up to 90% on op-ex)",
    humanCenter: "₹18 – ₹25 / call (Salary + desks + telephony overhead)"
  },
  {
    feature: "Concurrent Call Capacity",
    agentCallAI: "10,000+ simultaneous calls instantaneously",
    humanCenter: "1 agent = 1 call (Leads wait in queue or drop off)"
  },
  {
    feature: "Ramp-up & Training Time",
    agentCallAI: "5 Minutes (Upload script & knowledge base)",
    humanCenter: "3 – 4 Weeks of training, shadowing & mock calls"
  },
  {
    feature: "Language & Regional Fluency",
    agentCallAI: "10+ Indian Languages & Hinglish natively",
    humanCenter: "Requires hiring specific regional bilingual reps"
  },
  {
    feature: "Turnover & Absenteeism",
    agentCallAI: "0% Turnover (Never calls in sick or burns out)",
    humanCenter: "35% - 45% annual attrition (Continuous re-hiring)"
  },
  {
    feature: "CRM Data & Call Summaries",
    agentCallAI: "100% automated notes, sentiment & fields sync",
    humanCenter: "Manual, incomplete or delayed spreadsheet logging"
  },
  {
    feature: "Script & Tone Consistency",
    agentCallAI: "100% polite, brand-safe & compliant every call",
    humanCenter: "Varies heavily with mood, fatigue & agent experience"
  }
];

export function ComparisonSection() {
  return (
    <section id="comparison" className="py-16 sm:py-24 relative overflow-hidden border-t border-[#DDB892]/40"
      style={{
        backgroundImage: "url('/howitworks-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#F5F0E8"
      }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold mb-5 border backdrop-blur-sm"
            style={{ background: "#F5EDE4", color: "#6F4428", borderColor: "#DDB892" }}>
            <Scale className="w-3.5 h-3.5" style={{ color: "#8B5A2B" }}/>Head-to-Head Comparison
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight" style={{ color: "#1a1a1a" }}>
            AgentCall AI vs <span style={{ color: "#7F5539" }}>Human Call Centers</span>
          </h2>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "#4A5568" }}>
            Compare the operational efficiency, scale, and economics of an autonomous AI voice workforce.
          </p>
        </motion.div>

        {/* Comparison Table Container */}
        <div
          className="rounded-3xl border shadow-xl overflow-hidden backdrop-blur-sm"
          style={{
            background: "rgba(255, 255, 255, 0.88)",
            borderColor: "rgba(221, 184, 146, 0.6)",
            boxShadow: "0 12px 40px 0 rgba(140, 90, 50, 0.08)"
          }}
        >
          {/* Table Header */}
          <div className="grid grid-cols-12 bg-slate-50/80 border-b border-slate-200/80 p-4 sm:p-6 text-xs sm:text-sm font-bold">
            <div className="col-span-4 sm:col-span-4 text-slate-600 uppercase tracking-wider text-xs">
              Operational Criteria
            </div>
            <div className="col-span-4 sm:col-span-4 text-center sm:text-left text-[#7F5539] flex items-center gap-1.5 justify-center sm:justify-start">
              <Sparkles className="w-4 h-4 text-[#8B5A2B]" />
              <span className="font-extrabold text-sm sm:text-base">AgentCall AI</span>
            </div>
            <div className="col-span-4 sm:col-span-4 text-center sm:text-left text-slate-500 uppercase tracking-wider text-xs">
              Traditional Center
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-200/70">
            {comparisons.map((row, idx) => (
              <div
                key={row.feature}
                className={`grid grid-cols-12 p-4 sm:p-5 items-center text-xs sm:text-sm transition-colors hover:bg-[#F5EDE4]/30 ${
                  idx % 2 === 0 ? "bg-white/50" : "bg-transparent"
                }`}
              >
                {/* Feature Column */}
                <div className="col-span-12 sm:col-span-4 font-bold text-slate-900 mb-2 sm:mb-0">
                  {row.feature}
                </div>

                {/* AgentCall AI Column */}
                <div className="col-span-6 sm:col-span-4 flex items-start gap-2 text-emerald-950 font-semibold pr-2">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-100 text-emerald-700 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>{row.agentCallAI}</span>
                </div>

                {/* Traditional Human Column */}
                <div className="col-span-6 sm:col-span-4 flex items-start gap-2 text-slate-600 pl-2 border-l sm:border-l-0 border-slate-200">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center bg-rose-100 text-rose-700 mt-0.5">
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span>{row.humanCenter}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
