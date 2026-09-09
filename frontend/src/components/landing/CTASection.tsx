"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const R = "#D42027";

export function CTASection() {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden"
      style={{
        backgroundImage: "url('/cta-bg.mp4')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "scroll"
      }}>
      <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        style={{ opacity: 1 }}>
        <source src="/cta-bg.mp4" type="video/mp4"/>
      </video>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background:"radial-gradient(ellipse 80% 60% at 50% 50%,rgba(212,32,39,0.05),transparent 65%)" }}/>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        <motion.div initial={{ opacity:0,y:30 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance" style={{ color: "#000" }}>
              Ready to Deploy Your{" "}<span style={{ color: "#7F5539" }}>AI Workforce?</span>
            </h2>
            <p className="text-lg sm:text-xl max-w-xl mx-auto leading-relaxed" style={{ color: "#333" }}>
              Join 1,000+ businesses that have replaced manual calling with AI agents.
              14-day free trial, no credit card required.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 rounded-xl text-white font-semibold text-base group transition-all duration-200 active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)", boxShadow: "0 0 32px rgba(139, 90, 43, 0.30), 0 4px 16px rgba(0,0,0,0.10)" }}
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
            </Link>
            <Link href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 rounded-xl font-semibold text-base transition-all duration-200 active:scale-[0.97] border"
              style={{ background: "#F5EDE4", color: "#6F4428", borderColor: "#DDB892" }}
            >
              Sign In to Dashboard
            </Link>
          </div>

          <p className="text-sm" style={{ color: "#333" }}>
            Setup in 5 minutes · Cancel anytime · GDPR compliant · SOC2 ready
          </p>
        </motion.div>
      </div>
    </section>
  );
}
