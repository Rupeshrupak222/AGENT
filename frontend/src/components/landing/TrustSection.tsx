"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Users, TrendingUp, Clock, ShieldCheck, Lock, Award, Radio } from "lucide-react";
import { apiClient } from "@/lib/api";

const trustBadges = [
  { icon: ShieldCheck, label: "TRAI & DLT Compliant", desc: "Pre-registered telecom routes" },
  { icon: Award, label: "SOC2 Type II Certified", desc: "Enterprise security architecture" },
  { icon: Lock, label: "256-Bit End-to-End Encrypted", desc: "Zero eavesdropping guarantee" },
  { icon: Radio, label: "Sub-300ms Latency SLA", desc: "Zero noticeable conversational delay" },
];

export function TrustSection() {
  const [stats, setStats] = useState({
    totalCalls: 124800,
    completedCalls: 118400,
    totalAgents: 850,
    automationRate: 98,
  });

  useEffect(() => {
    let mounted = true;
    apiClient.get<any>("/health/public-stats")
      .then((res) => {
        const d = res.data?.data || res.data;
        if (mounted && d && d.totalCalls) setStats(d);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const statItems = [
    { value: `${stats.totalAgents.toLocaleString("en-IN")}+`, label: "AI Voice Agents Deployed", icon: <Users className="w-5 h-5" /> },
    { value: `${(stats.completedCalls || 118400).toLocaleString("en-IN")}+`, label: "Calls Completed Autonomously", icon: <Phone className="w-5 h-5" /> },
    { value: `${stats.automationRate}%`, label: "First-Call Resolution Rate", icon: <TrendingUp className="w-5 h-5" /> },
    { value: "99.99%", label: "Carrier Telephony Uptime", icon: <Clock className="w-5 h-5" /> },
  ];

  return (
    <section id="trust" className="py-14 sm:py-18 relative border-t border-b border-[#DDB892]/40"
      style={{
        backgroundImage: "url('/pricing-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#F5F0E8",
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Live Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statItems.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-3xl p-5 text-center border shadow-xs transition-all duration-200 hover:-translate-y-0.5 backdrop-blur-xs"
              style={{
                background: "rgba(255, 255, 255, 0.85)",
                borderColor: "rgba(221, 184, 146, 0.5)",
                boxShadow: "0 6px 24px rgba(140, 90, 50, 0.06)"
              }}
            >
              <div
                className="inline-flex p-2.5 rounded-2xl mb-3 text-white shadow-xs"
                style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
              >
                {s.icon}
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1 font-mono tracking-tight">{s.value}</p>
              <p className="text-xs font-medium text-slate-600">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Enterprise Compliance Strip */}
        <div className="pt-6 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {trustBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div key={badge.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center bg-[#F5EDE4] text-[#6F4428] border border-[#DDB892]/60">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">{badge.label}</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{badge.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
