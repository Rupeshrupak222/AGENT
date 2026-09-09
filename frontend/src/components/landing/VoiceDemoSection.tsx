"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, Sparkles, PhoneCall, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  industry: string;
  language: string;
  agentName: string;
  latency: string;
  outcome: string;
  transcript: {
    speaker: "ai" | "user";
    text: string;
    time: string;
  }[];
}

const scenarios: Scenario[] = [
  {
    id: "realestate",
    title: "Property Visit Booking",
    industry: "Real Estate",
    language: "Hinglish / Hindi",
    agentName: "Aarav (Sales Agent)",
    latency: "280ms",
    outcome: "Site Visit Confirmed for Sunday 4 PM",
    transcript: [
      { speaker: "ai", text: "Namaste Vikram ji! Main AgentCall Realty se Aarav bol raha hoon. Aapne Godrej Woods ke 3BHK project me interest show kiya tha?", time: "0:02" },
      { speaker: "user", text: "Haan ji, brochure dekha tha maine. Approximate pricing kya chal rahi hai?", time: "0:06" },
      { speaker: "ai", text: "Ji, 3BHK premium towers 1.85 Cr se start ho rahe hain with exclusive modular kitchen. Kya main is Sunday 4 PM aapke liye site visit aur sample flat tour schedule kar doon?", time: "0:12" },
      { speaker: "user", text: "Sunday 4 baje theek rahega. Location WhatsApp pe send kar dena.", time: "0:18" },
      { speaker: "ai", text: "Bilkul! Confirmation aur location aapke WhatsApp pe share kar di hai. Have a wonderful day!", time: "0:23" }
    ]
  },
  {
    id: "healthcare",
    title: "Doctor Consultation Booking",
    industry: "Healthcare",
    language: "Indian English",
    agentName: "Dr. Maya Assistant",
    latency: "240ms",
    outcome: "Cardiology Slot Reserved with Dr. Rao",
    transcript: [
      { speaker: "ai", text: "Hello! This is CareClinic's AI receptionist. How can I help you book your appointment today?", time: "0:02" },
      { speaker: "user", text: "Hi, I need a follow-up consultation with Dr. Rao for cardiology this Thursday.", time: "0:07" },
      { speaker: "ai", text: "Dr. Rao has two open slots this Thursday: 11:30 AM and 3:00 PM. Which one fits your schedule better?", time: "0:13" },
      { speaker: "user", text: "Let's do 3:00 PM please.", time: "0:17" },
      { speaker: "ai", text: "You're all set for Thursday at 3:00 PM. Please carry your previous ECG reports. We have sent the calendar invite to your email.", time: "0:23" }
    ]
  },
  {
    id: "fintech",
    title: "EMI Payment Follow-up",
    industry: "Fintech & Loans",
    language: "Hindi",
    agentName: "Riya (Collections AI)",
    latency: "260ms",
    outcome: "Payment Link Sent via WhatsApp & UPI",
    transcript: [
      { speaker: "ai", text: "Namaskar Rajesh ji, main FinEasy se Riya bol rahi hoon. Aapka personal loan EMI ₹8,450 kal due hai.", time: "0:03" },
      { speaker: "user", text: "Haan Riya ji, yaad hai. Main abhi travel kar raha hoon, evening tak kar dunga.", time: "0:08" },
      { speaker: "ai", text: "Koi baat nahi sir! Maine 1-click UPI payment link aapke WhatsApp aur SMS par bhej di hai taaki koi bounce charge na lage.", time: "0:15" },
      { speaker: "user", text: "Bahut badhiya, thank you link bhejne ke liye!", time: "0:20" },
      { speaker: "ai", text: "Aapka swagat hai sir. Shubh yatra!", time: "0:23" }
    ]
  },
  {
    id: "ecommerce",
    title: "COD Order Verification",
    industry: "E-Commerce",
    language: "Hinglish",
    agentName: "Kavya (Operations AI)",
    latency: "250ms",
    outcome: "Order #84920 Dispatched with Express Courier",
    transcript: [
      { speaker: "ai", text: "Hi Ananya! UrbanStyle se Kavya bol rahi hoon. Aapka ₹2,499 ka Sneaker order confirm karne ke liye call kiya hai.", time: "0:03" },
      { speaker: "user", text: "Haan maine order place kiya tha, size 8 UK.", time: "0:07" },
      { speaker: "ai", text: "Perfect! Delivery address Sector 62, Noida confirm hai na? Aur payment COD rahegi?", time: "0:13" },
      { speaker: "user", text: "Haan address sahi hai, main cash de dungi.", time: "0:17" },
      { speaker: "ai", text: "Shukriya Ananya! Order dispatch kar diya gaya hai, kal sham tak deliver ho jayega. Happy shopping!", time: "0:22" }
    ]
  }
];

export function VoiceDemoSection() {
  const [activeTab, setActiveTab] = useState<string>("realestate");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeLine, setActiveLine] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentScenario = scenarios.find((s) => s.id === activeTab) || scenarios[0];

  useEffect(() => {
    // Reset playback on tab change
    setIsPlaying(false);
    setActiveLine(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [activeTab]);

  function togglePlay() {
    if (isPlaying) {
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setIsPlaying(true);
      // Play simulated speech progression
      let current = activeLine >= currentScenario.transcript.length - 1 ? 0 : activeLine;
      setActiveLine(current);

      timerRef.current = setInterval(() => {
        current += 1;
        if (current < currentScenario.transcript.length) {
          setActiveLine(current);
        } else {
          setIsPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 3200);
    }
  }

  return (
    <section id="demo" className="py-16 sm:py-24 relative overflow-hidden border-t border-[#DDB892]/40"
      style={{
        backgroundImage: "url('/integrations-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#F5F0E8"
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

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
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#8B5A2B" }}/>Interactive Audio Player
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight" style={{ color: "#1a1a1a" }}>
            Listen to Our AI in <span style={{ color: "#7F5539" }}>Real Conversations</span>
          </h2>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "#4A5568" }}>
            Hear how naturally AgentCall AI talks, understands Indian nuances, and closes outcomes under 300ms.
          </p>
        </motion.div>

        {/* Industry Tabs */}
        <div className="flex justify-center flex-wrap gap-2.5 mb-8 sm:mb-12">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-[0.97] flex items-center gap-2 ${
                activeTab === s.id
                  ? "text-white shadow-md shadow-[#8B5A2B]/25"
                  : "bg-white/80 text-slate-700 hover:bg-white hover:text-black border border-slate-200"
              }`}
              style={
                activeTab === s.id
                  ? { background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }
                  : {}
              }
            >
              <span>{s.industry}</span>
              <span className="text-[11px] opacity-80">({s.language.split("/")[0].trim()})</span>
            </button>
          ))}
        </div>

        {/* Interactive Audio Console Card */}
        <div
          className="max-w-4xl mx-auto rounded-3xl p-6 sm:p-8 border shadow-xl transition-all duration-300 backdrop-blur-sm"
          style={{
            background: "rgba(255, 255, 255, 0.88)",
            borderColor: "rgba(221, 184, 146, 0.6)",
            boxShadow: "0 12px 40px 0 rgba(140, 90, 50, 0.08)"
          }}
        >
          {/* Top Player Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)",
                  boxShadow: "0 6px 20px rgba(139, 90, 43, 0.35)"
                }}
                aria-label={isPlaying ? "Pause call audio" : "Play call audio"}
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{currentScenario.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-[#F5EDE4] text-[#6F4428] border-[#DDB892]">
                    {currentScenario.industry}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Caller: <strong className="text-slate-800">{currentScenario.agentName}</strong> · Latency: <strong className="text-emerald-700">{currentScenario.latency}</strong>
                </p>
              </div>
            </div>

            {/* Dynamic Soundwave Visualizer */}
            <div className="flex items-center gap-1.5 h-8 px-4 py-2 rounded-2xl bg-[#F5EDE4]/70 border border-[#DDB892]/40">
              <Volume2 className="w-4 h-4 text-[#8B5A2B] mr-1" />
              {[40, 75, 55, 90, 65, 80, 45, 95, 60, 70, 85, 50, 65].map((h, i) => (
                <motion.div
                  key={i}
                  animate={
                    isPlaying
                      ? {
                          height: [`${Math.max(15, (h * 0.3))}px`, `${Math.min(26, (h * 0.35))}px`, `${Math.max(10, (h * 0.2))}px`]
                        }
                      : { height: "6px" }
                  }
                  transition={{
                    duration: 0.6,
                    repeat: isPlaying ? Infinity : 0,
                    delay: i * 0.05,
                    ease: "easeInOut"
                  }}
                  className="w-1 rounded-full"
                  style={{ background: isPlaying ? "#8B5A2B" : "#B08968" }}
                />
              ))}
              <span className="text-[11px] font-mono text-[#6F4428] font-bold ml-1.5">
                {isPlaying ? "LIVE" : "READY"}
              </span>
            </div>
          </div>

          {/* Live Transcript Dialogue Stream */}
          <div className="py-6 space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {currentScenario.transcript.map((line, idx) => {
              const isAI = line.speaker === "ai";
              const isCurrent = idx === activeLine && isPlaying;
              const hasPassed = idx <= activeLine;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: hasPassed ? 1 : 0.4, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${isAI ? "justify-start" : "justify-end"}`}
                >
                  {isAI && (
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-xs mt-1"
                      style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
                    >
                      AI
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed transition-all duration-200 border ${
                      isAI
                        ? isCurrent
                          ? "bg-[#F5EDE4] text-slate-900 border-[#8B5A2B] shadow-md ring-2 ring-[#8B5A2B]/20"
                          : "bg-white text-slate-800 border-slate-200/80 shadow-xs"
                        : "bg-slate-900 text-white border-slate-900 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-70">
                      <span className="font-semibold">{isAI ? currentScenario.agentName : "Customer (Prospect)"}</span>
                      <span>{line.time}</span>
                    </div>
                    <p>{line.text}</p>
                  </div>

                  {!isAI && (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-slate-800 text-white text-xs font-bold shadow-xs mt-1">
                      User
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Outcome & Metrics Bar */}
          <div className="pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Result: {currentScenario.outcome}</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#8B5A2B]" /> Sub-300ms Turnaround
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% CRM Synced
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
