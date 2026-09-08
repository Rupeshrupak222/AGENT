"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play, Phone, PhoneCall, TrendingUp, Users } from "lucide-react";
import { WaveAnimation, LiveCallIndicator } from "@/components/ui/WaveAnimation";
import { Badge } from "@/components/ui/Badge";
import { formatDuration } from "@/lib/utils";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

function LiveDashboard() {
  const [stats, setStats] = useState<{
    totalCalls: number;
    activeCalls: number;
    totalAgents: number;
    completedCalls: number;
    automationRate: number;
    activeCallsList: Array<{
      id: string;
      agent: string;
      lead: string;
      duration: number;
      status: string;
    }>;
  }>({
    totalCalls: 0,
    activeCalls: 0,
    totalAgents: 0,
    completedCalls: 0,
    automationRate: 100,
    activeCallsList: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchLive = async () => {
      try {
        const res = await apiClient.get<any>("/health/public-stats");
        const data = res.data?.data || res.data;
        if (mounted && data) {
          setStats(data);
        }
      } catch {
        // graceful fallback
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchLive();
    const interval = setInterval(fetchLive, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const hasActive = stats.activeCallsList && stats.activeCallsList.length > 0;

  return (
    <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
      transition={{ delay:0.2, duration:0.6, ease:"easeOut" }}
      className="w-full max-w-[440px] mx-auto lg:mx-0"
    >
      <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-2xl relative overflow-hidden">
        {/* Subtle highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-400">Live Telephony Hub</p>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">Real-Time Activity</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
              {stats.activeCalls > 0 ? `${stats.activeCalls} Live Now` : "System Live"}
            </span>
          </div>
        </div>

        {/* Real Metrics */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { label:"Total Calls", value: loading ? "—" : stats.totalCalls.toLocaleString(), icon:<Phone className="w-3.5 h-3.5"/> },
            { label:"Completed",   value: loading ? "—" : stats.completedCalls.toLocaleString(), icon:<TrendingUp className="w-3.5 h-3.5"/> },
            { label:"AI Agents",   value: loading ? "—" : stats.totalAgents.toLocaleString(), icon:<Users className="w-3.5 h-3.5"/> },
          ].map(m=>(
            <div key={m.label} className="rounded-xl p-2.5 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
              <div className="flex justify-center mb-1 text-blue-600 dark:text-blue-400">{m.icon}</div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">{m.value}</p>
              <p className="text-[10px] mt-0.5 text-slate-400 dark:text-slate-400">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Active calls feed */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-400">Live Telephony Feed</p>
            <span className="text-[10px] text-slate-400 font-mono">PostgreSQL Sync</span>
          </div>

          {hasActive ? (
            stats.activeCallsList.map(c=>(
              <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{c.lead}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{c.agent}</p>
                </div>
                <WaveAnimation active size="sm" bars={4} color="#2563eb" />
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-300">{formatDuration(c.duration)}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{c.status}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 px-3 rounded-xl text-center bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Autonomous Dispatch Ready</p>
              <p className="text-[10px] text-slate-400 mt-0.5">All AI Voice Employees online and standby</p>
            </div>
          )}
        </div>

        {/* Automation rate bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">Platform Automation Rate</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.automationRate}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10">
            <motion.div initial={{ width:0 }} animate={{ width:`${stats.automationRate}%` }} transition={{ delay:0.4, duration:0.8, ease:"easeOut" }}
              className="h-full rounded-full bg-blue-600"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function HeroSection() {
  function scroll(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
  }
  return (
    <section id="hero" className="relative min-h-[90vh] flex items-center pt-24 pb-16 overflow-hidden bg-page">
      {/* Subtle modern enterprise grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage:`linear-gradient(rgba(148,163,184,1) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,1) 1px,transparent 1px)`, backgroundSize:"48px 48px" }}/>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Copy */}
          <div className="space-y-6 text-center lg:text-left">
            <motion.div initial={{ opacity:0,y:-10 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.4 }}
              className="flex justify-center lg:justify-start">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                Autonomous Voice Telephony Infrastructure
              </span>
            </motion.div>

            <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1,duration:0.6 }}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-[1.08] tracking-tight text-balance mb-4">
                Enterprise AI Telephony{" "}
                <span className="text-blue-600 dark:text-blue-400">Engineered for Scale</span>
              </h1>
              <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 text-slate-600 dark:text-slate-300">
                Deploy autonomous voice employees that dial, converse, qualify leads, and synchronize with your CRM 24/7 with zero latency.
              </p>
            </motion.div>

            <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.2,duration:0.5 }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium text-sm bg-blue-600 hover:bg-blue-500 transition-all shadow-sm active:scale-[0.99]"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4"/>
              </Link>
              <button onClick={()=>scroll("how-it-works")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.08]"
              >
                <Play className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Documentation & Tour
              </button>
            </motion.div>

            {/* Social proof */}
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}
              className="flex items-center gap-4 justify-center lg:justify-start flex-wrap pt-2">
              <div className="flex -space-x-2">
                {["#2563eb","#3b82f6","#60a5fa","#475569","#64748b"].map((c,i)=>(
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900" style={{ background:c }}/>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Production-Ready Telecom</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Integrated with Twilio, Exotel & WebSockets</p>
              </div>
            </motion.div>
          </div>

          {/* Dashboard */}
          <div className="relative flex justify-center lg:justify-end">
            <LiveDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}
