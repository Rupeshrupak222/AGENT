"use client";
import { motion } from "framer-motion";
import { Phone, Users, HeadphonesIcon, DollarSign, TrendingUp, Calendar, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

const R = "#D42027";

const agents = [
  { icon:<Phone className="w-7 h-7"/>,         title:"AI Telecaller",       badge:"Most Popular",
    desc:"Outbound calling AI that qualifies leads, follows up automatically and syncs with your CRM.",
    features:["Outbound Calling","Lead Qualification","Follow-up Automation","Sales Scripts","CRM Sync"] },
  { icon:<Users className="w-7 h-7"/>,          title:"AI Recruiter",         badge:"New",
    desc:"Screen candidates at scale, schedule interviews and shortlist top talent without human effort.",
    features:["Candidate Screening","Interview Scheduling","Resume Analysis","Skill Assessment","Auto Shortlisting"] },
  { icon:<HeadphonesIcon className="w-7 h-7"/>, title:"AI Receptionist",      badge:null,
    desc:"Handle incoming calls 24/7, answer FAQs, book appointments and route to the right agent.",
    features:["Incoming Call Handling","FAQ Responses","Appointment Booking","Human Transfer"] },
  { icon:<DollarSign className="w-7 h-7"/>,     title:"AI Collection Agent",  badge:null,
    desc:"Automate EMI reminders, payment recovery and invoice follow-up politely and persistently.",
    features:["EMI Reminders","Payment Recovery","Invoice Follow-up"] },
  { icon:<TrendingUp className="w-7 h-7"/>,     title:"AI Sales Agent",       badge:"High ROI",
    desc:"Nurture leads, pitch products, set appointments and qualify prospects — fully automated.",
    features:["Lead Nurturing","Product Pitching","Appointment Setting","Sales Qualification"] },
  { icon:<Calendar className="w-7 h-7"/>,       title:"AI Appointment Setter",badge:null,
    desc:"Book meetings directly into Google Calendar or Outlook with zero manual effort.",
    features:["Calendar Integration","Slot Detection","Reminder Calls","Reschedule Handling"] },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-24 bg-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5 bg-brand-500/10 text-brand-500 dark:text-brand-400 border border-brand-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-current"/>AI Agent Types
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
            One Platform,{" "}<span className="gradient-text">Every Agent You Need</span>
          </h2>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed text-gray-500 dark:text-white/60">
            Deploy specialised AI employees for every business function. Each agent is trained, voice-cloned and optimised for its role.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {agents.map((a,i)=>(
            <motion.div key={a.title}
              initial={{ opacity:0,y:30 }} whileInView={{ opacity:1,y:0 }}
              viewport={{ once:true }} transition={{ delay:i*0.08, duration:0.5 }}
              className="rounded-2xl p-5 sm:p-6 group cursor-pointer transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm hover:border-brand-500/30 hover:shadow-xl hover:shadow-brand-500/10"
            >
              {/* Icon + badge */}
              <div className="flex items-start justify-between mb-5">
                <div className="p-3 rounded-2xl text-white bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-500/25">
                  {a.icon}
                </div>
                {a.badge && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-500 dark:text-brand-400 border border-brand-500/20">
                    {a.badge}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{a.title}</h3>
              <p className="text-sm leading-relaxed mb-4 text-gray-500 dark:text-white/60">{a.desc}</p>
              <ul className="space-y-2 mb-5">
                {a.features.map(f=>(
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/65">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0"/>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="flex items-center gap-1.5 text-sm font-semibold transition-colors text-brand-500 dark:text-brand-400 hover:text-brand-600"
              >
                Get started <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
