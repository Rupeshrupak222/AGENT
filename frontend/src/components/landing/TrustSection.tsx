"use client";
import { motion } from "framer-motion";
import { Phone, Building2, TrendingUp, Clock } from "lucide-react";

const R = "#D42027";

const stats = [
  { value:"1,000+", label:"Businesses Onboarded", icon:<Building2 className="w-5 h-5"/> },
  { value:"10M+",   label:"Calls Completed",       icon:<Phone className="w-5 h-5"/>    },
  { value:"95%",    label:"Automation Rate",        icon:<TrendingUp className="w-5 h-5"/> },
  { value:"24/7",   label:"Always Available",       icon:<Clock className="w-5 h-5"/>   },
];
const logos = ["Infosys","HDFC Bank","Flipkart","Zomato","Byju's","OYO","PhonePe","Nykaa"];

export function TrustSection() {
  return (
    <section id="trust" className="py-16 sm:py-20 bg-gray-50"
      style={{ borderTop:"1px solid rgba(0,0,0,0.07)", borderBottom:"1px solid rgba(0,0,0,0.07)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map((s,i)=>(
            <motion.div key={s.label}
              initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }}
              viewport={{ once:true }} transition={{ delay:i*0.1 }}
              className="rounded-2xl p-5 text-center bg-white"
              style={{
                border:"1px solid rgba(0,0,0,0.08)",
                boxShadow:"0 4px 16px rgba(0,0,0,0.05)",
              }}
            >
              <div className="inline-flex p-2.5 rounded-xl mb-3"
                style={{ background:"rgba(212,32,39,0.09)", color:R }}>
                {s.icon}
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mb-1">{s.value}</p>
              <p className="text-sm text-gray-400">{s.label}</p>
            </motion.div>
          ))}
        </div>
        <p className="text-xs uppercase tracking-widest font-semibold text-center mb-6 text-gray-400">
          Trusted by India&apos;s fastest-growing companies
        </p>
        <div className="flex flex-wrap justify-center gap-x-7 gap-y-3">
          {logos.map((l,i)=>(
            <motion.span key={l} initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }}
              transition={{ delay:i*0.05 }}
              className="text-base font-bold cursor-default transition-colors text-gray-300"
              onMouseEnter={e=>(e.currentTarget.style.color=R)}
              onMouseLeave={e=>(e.currentTarget.style.color="")}
            >{l}</motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
