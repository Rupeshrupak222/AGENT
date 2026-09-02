"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play, Phone, PhoneCall, TrendingUp, Users } from "lucide-react";
import { WaveAnimation, LiveCallIndicator } from "@/components/ui/WaveAnimation";
import { Badge } from "@/components/ui/Badge";
import { formatDuration } from "@/lib/utils";

const R = "#D42027";

function LiveDashboard() {
  const feed = [
    { agent:"Priya AI",  lead:"Rahul Sharma",  duration:154, status:"Qualifying" },
    { agent:"Arjun AI",  lead:"Anita Patel",   duration:72,  status:"Pitching"   },
    { agent:"Meera AI",  lead:"Vikram Singh",  duration:48,  status:"Closing"    },
  ];
  return (
    <motion.div initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }}
      transition={{ delay:0.4, duration:0.8, ease:"easeOut" }}
      className="w-full max-w-[420px] mx-auto lg:mx-0"
    >
      <div className="rounded-3xl p-5 sm:p-6 relative"
        style={{
          background:"#ffffff",
          border:"1px solid rgba(0,0,0,0.09)",
          boxShadow:"0 0 40px rgba(212,32,39,0.10), 0 24px 48px rgba(0,0,0,0.10)",
        }}>

        {/* Subtle top glow */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ background:"radial-gradient(ellipse at 50% 0%,rgba(212,32,39,0.05),transparent 60%)" }}/>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Live Call Center</p>
            <p className="text-base font-bold text-gray-900 mt-0.5">Today&apos;s Performance</p>
          </div>
          <LiveCallIndicator active />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { label:"Total Calls", value:"2,847", icon:<Phone className="w-3.5 h-3.5"/> },
            { label:"Qualified",   value:"847",   icon:<TrendingUp className="w-3.5 h-3.5"/> },
            { label:"Agents",      value:"12",    icon:<Users className="w-3.5 h-3.5"/> },
          ].map(m=>(
            <div key={m.label} className="rounded-xl p-2.5 text-center"
              style={{ background:"rgba(212,32,39,0.06)", border:"1px solid rgba(212,32,39,0.14)" }}>
              <div className="flex justify-center mb-1" style={{ color:R }}>{m.icon}</div>
              <p className="text-base font-extrabold text-gray-900">{m.value}</p>
              <p className="text-[10px] mt-0.5 text-gray-400">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Live calls */}
        <div className="space-y-2 mb-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Active Calls</p>
          {feed.map(c=>(
            <div key={c.lead} className="flex items-center gap-3 p-2.5 rounded-xl"
              style={{ background:"rgba(0,0,0,0.025)", border:"1px solid rgba(0,0,0,0.06)" }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background:"rgba(212,32,39,0.10)" }}>
                <PhoneCall className="w-3.5 h-3.5" style={{ color:R }}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{c.lead}</p>
                <p className="text-[10px] text-gray-400">{c.agent}</p>
              </div>
              <WaveAnimation active size="sm" bars={4} color="#16a34a" />
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono text-gray-500">{formatDuration(c.duration)}</p>
                <p className="text-[10px] text-green-600">{c.status}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Conv bar */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-400">Conversion Rate</span>
            <span className="font-bold text-green-600">29.7%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
            <motion.div initial={{ width:0 }} animate={{ width:"29.7%" }} transition={{ delay:1.2, duration:1.4, ease:"easeOut" }}
              className="h-full rounded-full"
              style={{ background:`linear-gradient(90deg,${R},#ff6464)` }}
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
    <section id="hero" className="relative min-h-screen flex items-center pt-16 overflow-hidden"
      style={{
        background:`radial-gradient(ellipse 85% 55% at 50% -15%,rgba(212,32,39,0.08),transparent),
                   radial-gradient(ellipse 50% 40% at 85% 65%,rgba(180,20,26,0.04),transparent),
                   #ffffff`,
      }}>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage:`linear-gradient(rgba(212,32,39,1) 1px,transparent 1px),linear-gradient(90deg,rgba(212,32,39,1) 1px,transparent 1px)`, backgroundSize:"55px 55px" }}/>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Copy */}
          <div className="space-y-7 text-center lg:text-left">
            <motion.div initial={{ opacity:0,y:-10 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.5 }}
              className="flex justify-center lg:justify-start">
              <Badge variant="red" dot className="text-sm py-1.5 px-4">
                🚀 Now with ElevenLabs Voice AI — hyper-realistic agents
              </Badge>
            </motion.div>

            <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1,duration:0.7 }}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-gray-900 leading-[1.05] tracking-tight text-balance mb-4">
                Hire AI Employees{" "}
                <span className="gradient-text">That Work 24/7</span>
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed max-w-xl mx-auto lg:mx-0 text-gray-500">
                Deploy AI Telecallers, Recruiters, Receptionists and Sales Agents in minutes.
                Reduce costs, increase conversions and automate operations.
              </p>
            </motion.div>

            <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.25,duration:0.6 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Link href="/signup"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-white font-semibold text-base group transition-all duration-200 active:scale-[0.97]"
                style={{ background:`linear-gradient(135deg,${R} 0%,#9b1219 100%)`, boxShadow:"0 0 24px rgba(212,32,39,0.30), 0 4px 14px rgba(0,0,0,0.12)" }}
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
              </Link>
              <button onClick={()=>scroll("how-it-works")}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 active:scale-[0.97] text-gray-700"
                style={{ border:"1px solid rgba(212,32,39,0.28)", background:"rgba(212,32,39,0.05)" }}
              >
                <Play className="w-4 h-4 fill-current" style={{ color:R }}/> See How It Works
              </button>
            </motion.div>

            {/* Social proof */}
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
              className="flex items-center gap-5 justify-center lg:justify-start flex-wrap">
              <div className="flex -space-x-2">
                {[R,"#e53e3e","#c53030","#9b2c2c","#742a2a"].map((c,i)=>(
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white" style={{ background:c }}/>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">1,000+ businesses</p>
                <p className="text-xs text-gray-400">already using AgentCall AI</p>
              </div>
              <div className="h-8 w-px hidden sm:block bg-gray-200"/>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i=>(
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
                <span className="text-xs ml-1 text-gray-400">4.9/5</span>
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
