"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Users, TrendingUp, Clock } from "lucide-react";
import { apiClient } from "@/lib/api";

export function TrustSection() {
  const [stats, setStats] = useState({
    totalCalls: 0,
    completedCalls: 0,
    totalAgents: 0,
    automationRate: 100,
  });

  useEffect(() => {
    let mounted = true;
    apiClient.get<any>("/health/public-stats")
      .then((res) => {
        const d = res.data?.data || res.data;
        if (mounted && d) setStats(d);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const statItems = [
    { value: `${stats.totalAgents}`, label: "AI Voice Agents Deployed", icon: <Users className="w-5 h-5" /> },
    { value: `${stats.completedCalls}`, label: "Completed Call Sessions", icon: <Phone className="w-5 h-5" /> },
    { value: `${stats.automationRate}%`, label: "Voice Automation Rate", icon: <TrendingUp className="w-5 h-5" /> },
    { value: "24/7", label: "Autonomous Telephony Uptime", icon: <Clock className="w-5 h-5" /> },
  ];

  return (
    <section id="trust" className="py-16 sm:py-20 bg-surface border-t border-b border-slate-200 dark:border-brand-500/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {statItems.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="rounded-2xl p-5 text-center bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm"
            >
              <div className="inline-flex p-2.5 rounded-xl mb-3 bg-brand-500/10 text-brand-500 dark:text-brand-400">
                {s.icon}
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1 font-mono">{s.value}</p>
              <p className="text-sm text-gray-400 dark:text-white/40">{s.label}</p>
            </motion.div>
          ))}
        </div>
        <p className="text-xs uppercase tracking-widest font-semibold text-center text-gray-400 dark:text-white/40">
          Enterprise Voice Automation Telemetry
        </p>
      </div>
    </section>
  );
}
