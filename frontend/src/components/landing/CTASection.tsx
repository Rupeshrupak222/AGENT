"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden bg-surface border-t border-slate-200 dark:border-slate-800/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="rounded-2xl bg-slate-950 dark:bg-slate-900/90 border border-slate-800 p-8 sm:p-14 text-center shadow-xl relative overflow-hidden">
          
          <div className="relative z-10 space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>Production-Ready Telephony
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight text-balance">
              Deploy Your Voice Infrastructure Today
            </h2>
            <p className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed text-slate-400">
              Join forward-thinking enterprises automating outbound calls, recruitment screening, and customer support with sub-second latency.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white bg-blue-600 hover:bg-blue-500 font-medium text-sm transition-colors shadow-sm"
              >
                Start 14-Day Free Trial
                <ArrowRight className="w-4 h-4"/>
              </Link>
              <Link href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700"
              >
                Sign In to Console
              </Link>
            </div>

            <p className="text-xs text-slate-500 pt-2">
              Setup in 5 minutes · No credit card required · SOC2 Type II & GDPR Compliant
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
