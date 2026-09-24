"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarClock, Radio, CalendarCheck, ChevronRight } from "lucide-react";
import { campaignsApi, appointmentsApi, CampaignItem, Appointment } from "@/lib/api";

interface ScheduleEntry {
  id: string;
  kind: "campaign" | "appointment";
  title: string;
  subtitle: string;
  when: Date;
  status: string;
  href: string;
}

export function UpcomingSchedule() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [campRes, apptRes] = await Promise.allSettled([
          campaignsApi.list({ limit: 12 }),
          appointmentsApi.list({ upcoming: true }),
        ]);
        if (!mounted) return;
        if (campRes.status === "fulfilled") setCampaigns(campRes.value.items || []);
        if (apptRes.status === "fulfilled") setAppointments(apptRes.value || []);
      } catch {
        // backend offline
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const entries = useMemo<ScheduleEntry[]>(() => {
    const list: ScheduleEntry[] = [];

    campaigns
      .filter((c) => c.status === "scheduled" || c.status === "running")
      .forEach((c) => {
        const whenRaw = c.startTime || c.createdAt;
        list.push({
          id: `camp-${c.id}`,
          kind: "campaign",
          title: c.name,
          subtitle: `${c.status} · ${c._count?.leads ?? 0} leads${c.agent?.name ? ` · ${c.agent.name}` : ""}`,
          when: new Date(whenRaw),
          status: c.status,
          href: `/dashboard/campaigns?campaignId=${c.id}`,
        });
      });

    appointments
      .filter((a) => a.status !== "cancelled" && a.status !== "failed")
      .forEach((a) => {
        const whenRaw = a.startAt || a.date;
        list.push({
          id: `appt-${a.id}`,
          kind: "appointment",
          title: a.leadName,
          subtitle: a.topic || a.title || (a.status ?? "appointment"),
          when: new Date(whenRaw),
          status: a.status,
          href: `/dashboard/calendar`,
        });
      });

    return list
      .filter((e) => !isNaN(e.when.getTime()))
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, 6);
  }, [campaigns, appointments]);

  const fmtWhen = (d: Date) => {
    const now = new Date();
    const day = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);
    const prefix = diffDays < 1 ? "Today" : diffDays === 1 ? "Tomrw" : day;
    return { day: prefix, time };
  };

  return (
    <div className="rounded-2xl p-5 panel-card min-w-0">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <CalendarClock className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upcoming Schedule</h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Next campaign launches & customer appointments
            </p>
          </div>
        </div>
        <Link href="/dashboard/calendar" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
          Calendar <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-2 mt-3">
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
            <CalendarClock className="w-7 h-7 text-slate-300 dark:text-white/20 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-white/70">Nothing scheduled ahead</p>
            <p className="text-[11px] text-slate-400 dark:text-white/40 mt-1 max-w-xs">
              Schedule a campaign or an AI-booked appointment to see it here.
            </p>
          </div>
        ) : (
          entries.map((e) => {
            const { day, time } = fmtWhen(e.when);
            return (
              <Link
                key={e.id}
                href={e.href}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] hover:border-brand-500/40 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-200 group"
              >
                <div className="w-12 h-11 rounded-xl bg-brand-500/10 border border-brand-500/20 flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-brand-500/20 transition-colors">
                  <span className="text-[9px] font-mono font-bold text-brand-600 dark:text-brand-400 uppercase">{day}</span>
                  <span className="text-[10px] font-bold font-mono text-slate-800 dark:text-white">{time}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                    {e.kind === "appointment" ? (
                      <CalendarCheck className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                    ) : (
                      <Radio className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                    )}
                    {e.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-white/40 truncate capitalize">{e.subtitle}</p>
                </div>
                {e.kind === "appointment" && e.status === "confirmed" && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex-shrink-0">
                    Confirmed
                  </span>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}