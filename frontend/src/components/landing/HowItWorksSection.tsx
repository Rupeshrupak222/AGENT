"use client";
import { motion } from "framer-motion";
import { UserPlus, Upload, Rocket, Bot, BarChart3 } from "lucide-react";

const R = "#D42027";

const steps = [
  { n:"01", icon:<UserPlus className="w-6 h-6"/>,  title:"Create AI Agent",          desc:"Pick a role, set the language, upload your knowledge base and configure the voice — no coding needed." },
  { n:"02", icon:<Upload className="w-6 h-6"/>,    title:"Upload Leads",             desc:"Import your lead list via CSV, Google Sheets or CRM sync. AgentCall AI maps fields automatically." },
  { n:"03", icon:<Rocket className="w-6 h-6"/>,    title:"Launch Calls",             desc:"Set a schedule or launch immediately. The platform dials leads in the optimal time window." },
  { n:"04", icon:<Bot className="w-6 h-6"/>,       title:"AI Talks Automatically",   desc:"Your AI agent handles the full conversation — qualifying, pitching, objection handling and booking." },
  { n:"05", icon:<BarChart3 className="w-6 h-6"/>, title:"Get Analytics",            desc:"Real-time dashboard shows conversions, sentiment scores, call quality and revenue generated." },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 relative overflow-hidden bg-surface"
      style={{
        backgroundImage: "url('/howitworks-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "scroll"
      }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{ background:"radial-gradient(ellipse,rgba(212,32,39,0.04),transparent 70%)" }}/>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold mb-5 border backdrop-blur-sm"
            style={{ background: "#F5EDE4", color: "#6F4428", borderColor: "#DDB892" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#8B5A2B" }}/>Simple Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight" style={{ color: "#000" }}>
            Live in <span style={{ color: "#7F5539" }}>5 Steps</span>
          </h2>
          <p className="text-base sm:text-lg max-w-xl mx-auto" style={{ color: "#333" }}>
            From zero to a fully operational AI call center in under 30 minutes.
          </p>
        </motion.div>

        {/* Connector line */}
        <div className="relative">
          <div className="absolute top-9 left-0 right-0 h-px hidden lg:block"
            style={{ background:"linear-gradient(90deg,transparent,rgba(176,137,104,0.4),rgba(176,137,104,0.4),transparent)" }}/>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {steps.map((s,i)=>(
              <motion.div key={s.n}
                initial={{ opacity:0,y:30 }} whileInView={{ opacity:1,y:0 }}
                viewport={{ once:true }} transition={{ delay:i*0.12, duration:0.5 }}
                className="relative text-center group"
              >
                <div className="flex justify-center mb-5">
                  <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110 shadow-md shadow-[#8B5A2B]/25"
                    style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
                  >
                    {s.icon}
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border shadow-xs"
                      style={{ background: "#F5EDE4", color: "#6F4428", borderColor: "#DDB892" }}
                    >
                      {s.n}
                    </span>
                  </div>
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: "#000" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#333" }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
