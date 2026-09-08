"use client";
import { motion } from "framer-motion";
import { UserPlus, Upload, Rocket, Bot, BarChart3 } from "lucide-react";

const steps = [
  { n:"01", icon:<UserPlus className="w-5 h-5"/>,  title:"Configure Agent",          desc:"Define system prompts, upload PDF/docs knowledge base, and select an ultra-low latency neural voice." },
  { n:"02", icon:<Upload className="w-5 h-5"/>,    title:"Import Telephony & Leads", desc:"Connect your Twilio / Telnyx SIP trunks and import target cohorts via CSV or live REST webhook." },
  { n:"03", icon:<Rocket className="w-5 h-5"/>,    title:"Launch Campaign",          desc:"Trigger autonomous dialing queues with concurrency throttling and timezone compliance." },
  { n:"04", icon:<Bot className="w-5 h-5"/>,       title:"Conversational Execution", desc:"Neural agent conducts sub-350ms multi-turn dialogues with dynamic objection routing." },
  { n:"05", icon:<BarChart3 className="w-5 h-5"/>, title:"Real-Time Telemetry",      desc:"Inspect live transcripts, disposition codes, audio recordings, and CRM sync payloads." },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 relative overflow-hidden bg-surface border-t border-slate-200 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"/>Deployment Lifecycle
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            How It Works in Production
          </h2>
          <p className="text-base sm:text-lg max-w-xl mx-auto text-slate-600 dark:text-slate-400">
            From architecture to automated calls in under 5 minutes with zero telephony headaches.
          </p>
        </motion.div>

        {/* Connector line */}
        <div className="relative">
          <div className="absolute top-8 left-12 right-12 h-px hidden lg:block bg-slate-200 dark:bg-slate-800" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {steps.map((s,i)=>(
              <motion.div key={s.n}
                initial={{ opacity:0,y:30 }} whileInView={{ opacity:1,y:0 }}
                viewport={{ once:true }} transition={{ delay:i*0.1, duration:0.5 }}
                className="relative text-center group"
              >
                <div className="flex justify-center mb-5">
                  <div className="relative w-16 h-16 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200 group-hover:border-blue-500/40 group-hover:shadow-md">
                    {s.icon}
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold bg-blue-600 text-white shadow-xs">
                      {s.n}
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">{s.title}</h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
