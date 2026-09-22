"use client";

import { motion } from "framer-motion";
import {
  MessageSquare,
  Smartphone,
  CalendarCheck,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  Send,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface MultiChannelDispatchProps {
  totalCalls?: number;
  appointments?: number;
}

export function MultiChannelDispatch({ totalCalls = 1420, appointments = 48 }: MultiChannelDispatchProps) {
  const whatsappSent = Math.round(totalCalls * 0.88);
  const smsSent = Math.round(totalCalls * 0.45);

  return (
    <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/10 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Zap className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Post-Call Omnichannel Dispatch & Automations
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Immediate WhatsApp brochures, SMS confirmation links & calendar invites triggered post-conversation
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/automations"
          className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
        >
          Automations Studio <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 3 Channel Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* WhatsApp Dispatch */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-500" /> WhatsApp Business API
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              98.2% Delivered
            </span>
          </div>
          <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
            {whatsappSent}
          </p>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-[98%]" />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-white/40 flex justify-between font-mono">
            <span>Read rate: 74.2%</span>
            <span>Brochure & Quotes</span>
          </p>
        </div>

        {/* SMS Dispatch */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-sky-500" /> DLT Transactional SMS
            </span>
            <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 font-bold">
              99.8% Delivered
            </span>
          </div>
          <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
            {smsSent}
          </p>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full w-[99%]" />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-white/40 flex justify-between font-mono">
            <span>Payment link click: 41%</span>
            <span>AGTCAL Header</span>
          </p>
        </div>

        {/* Calendar Bookings */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-amber-500" /> Calendar Invites
            </span>
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
              Google & Outlook
            </span>
          </div>
          <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
            {appointments}
          </p>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full w-[85%]" />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-white/40 flex justify-between font-mono">
            <span>Direct booking sync</span>
            <span>Zero conflict</span>
          </p>
        </div>
      </div>
    </div>
  );
}
