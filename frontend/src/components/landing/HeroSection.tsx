"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

const R = "#D42027";

export function HeroSection() {
  function scroll(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
  }
  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-24 sm:pt-28 pb-16 overflow-hidden"
      style={{
        background: "#000",
      }}>

      {/* Video Background */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="flex items-center justify-center">
          {/* Copy */}
          <div className="space-y-7 text-center max-w-2xl">
            <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1,duration:0.7 }}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-balance mb-6">
                <span style={{
                  color: "#000000",
                  display: "block"
                }}>Meet the AI Workforce</span>
                <span style={{ 
                  color: "#7F5539",
                  display: "block"
                }}>Built for the Way<br/>Business Moves Now</span>
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto text-gray-700 mb-8">
                Deploy AI Telecallers, Recruiters, Receptionists and Sales Agents in minutes. Reduce costs, increase conversions and automate operations.
              </p>
            </motion.div>

            <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.25,duration:0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full text-white font-bold text-base group transition-all duration-200 active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)", boxShadow:"0 0 24px rgba(139,90,43,0.30), 0 4px 14px rgba(0,0,0,0.12)" }}
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
              </Link>
              <button onClick={()=>scroll("how-it-works")}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full font-bold text-base transition-all duration-200 active:scale-[0.97] text-gray-700 bg-white/80 hover:bg-white"
              >
                <Play className="w-4 h-4 fill-current" /> See How It Works
              </button>
            </motion.div>

            {/* Social proof */}
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
              className="flex items-center gap-6 justify-center flex-wrap pt-4">
              <div className="flex -space-x-2">
                {["#B08968","#9C6644","#8B5A2B","#6F4428","#522610"].map((c,i)=>(
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white" style={{ background:c }}/>
                ))}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-800">1,000+ businesses</p>
                <p className="text-xs text-gray-600">already using AI agents</p>
              </div>
              <div className="h-10 w-px hidden sm:block bg-gray-300"/>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i=>(
                  <svg key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
                <span className="text-sm font-bold text-gray-800 ml-2">4.9/5</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
