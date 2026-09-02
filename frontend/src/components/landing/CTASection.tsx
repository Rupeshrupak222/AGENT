"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const R = "#D42027";

export function CTASection() {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden bg-white">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background:"radial-gradient(ellipse 80% 60% at 50% 50%,rgba(212,32,39,0.05),transparent 65%)" }}/>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        <motion.div initial={{ opacity:0,y:30 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight text-balance">
              Ready to Deploy Your{" "}<span className="gradient-text">AI Workforce?</span>
            </h2>
            <p className="text-lg sm:text-xl max-w-xl mx-auto leading-relaxed text-gray-500">
              Join 1,000+ businesses that have replaced manual calling with AI agents.
              14-day free trial, no credit card required.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 rounded-xl text-white font-semibold text-base group transition-all duration-200 active:scale-[0.97]"
              style={{ background:`linear-gradient(135deg,${R} 0%,#9b1219 100%)`, boxShadow:"0 0 32px rgba(212,32,39,0.30), 0 4px 16px rgba(0,0,0,0.10)" }}
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
            </Link>
            <Link href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 rounded-xl font-semibold text-base transition-all duration-200 active:scale-[0.97] text-gray-700"
              style={{ border:"1px solid rgba(212,32,39,0.28)", background:"rgba(212,32,39,0.05)" }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(212,32,39,0.09)";e.currentTarget.style.borderColor="rgba(212,32,39,0.45)"}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(212,32,39,0.05)";e.currentTarget.style.borderColor="rgba(212,32,39,0.28)"}}
            >
              Sign In to Dashboard
            </Link>
          </div>

          <p className="text-sm text-gray-400">
            Setup in 5 minutes · Cancel anytime · GDPR compliant · SOC2 ready
          </p>
        </motion.div>
      </div>
    </section>
  );
}
