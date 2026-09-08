"use client";
import { motion } from "framer-motion";
import { Phone, Users, HeadphonesIcon, DollarSign, TrendingUp, Calendar, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

const agents = [
  { icon:<Phone className="w-6 h-6"/>,         title:"AI Telecaller",       badge:"Most Popular",
    desc:"Outbound calling AI that qualifies leads, follows up automatically and syncs with your CRM.",
    features:["Outbound Calling","Lead Qualification","Follow-up Automation","Sales Scripts","CRM Sync"] },
  { icon:<Users className="w-6 h-6"/>,          title:"AI Recruiter",         badge:"New",
    desc:"Screen candidates at scale, schedule interviews and shortlist top talent without human effort.",
    features:["Candidate Screening","Interview Scheduling","Resume Analysis","Skill Assessment","Auto Shortlisting"] },
  { icon:<HeadphonesIcon className="w-6 h-6"/>, title:"AI Receptionist",      badge:null,
    desc:"Handle incoming calls 24/7, answer FAQs, book appointments and route to the right agent.",
    features:["Incoming Call Handling","FAQ Responses","Appointment Booking","Human Transfer"] },
  { icon:<DollarSign className="w-6 h-6"/>,     title:"AI Collection Agent",  badge:null,
    desc:"Automate EMI reminders, payment recovery and invoice follow-up politely and persistently.",
    features:["EMI Reminders","Payment Recovery","Invoice Follow-up"] },
  { icon:<TrendingUp className="w-6 h-6"/>,     title:"AI Sales Agent",       badge:"High ROI",
    desc:"Nurture leads, pitch products, set appointments and qualify prospects — fully automated.",
    features:["Lead Nurturing","Product Pitching","Appointment Setting","Sales Qualification"] },
  { icon:<Calendar className="w-6 h-6"/>,       title:"AI Appointment Setter",badge:null,
    desc:"Book meetings directly into Google Calendar or Outlook with zero manual effort.",
    features:["Calendar Integration","Slot Detection","Reminder Calls","Reschedule Handling"] },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-24 bg-page border-t border-slate-200 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"/>Autonomous Agents
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Specialized Voice Agents for Every Role
          </h2>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed text-slate-600 dark:text-slate-400">
            Deploy production-grade voice agents for mission-critical workflows. Each agent is pre-configured with custom tools, latency guarantees, and CRM synchronization.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {agents.map((a,i)=>(
            <motion.div key={a.title}
              initial={{ opacity:0,y:30 }} whileInView={{ opacity:1,y:0 }}
              viewport={{ once:true }} transition={{ delay:i*0.08, duration:0.5 }}
              className="rounded-xl p-5 sm:p-6 group cursor-pointer transition-all duration-200 hover:-translate-y-0.5 bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5"
            >
              {/* Icon + badge */}
              <div className="flex items-start justify-between mb-5">
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                  {a.icon}
                </div>
                {a.badge && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {a.badge}
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{a.title}</h3>
              <p className="text-sm leading-relaxed mb-4 text-slate-600 dark:text-slate-400">{a.desc}</p>
              <ul className="space-y-2 mb-5">
                {a.features.map(f=>(
                  <li key={f} className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"/>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="flex items-center gap-1.5 text-xs font-semibold transition-colors text-blue-600 dark:text-blue-400 hover:text-blue-700 group-hover:gap-2"
              >
                Configure agent <ArrowRight className="w-3.5 h-3.5 transition-all"/>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
