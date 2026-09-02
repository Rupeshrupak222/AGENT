"use client";
import { useState } from "react";
import {
  Calendar as CalendarIcon, Clock, Users, Video,
  CheckCircle2, Plus, ChevronLeft, ChevronRight,
  Phone, User, Filter, AlertCircle
} from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface ScheduledAppointment {
  id: string;
  leadName: string;
  phone: string;
  agentName: string;
  time: string;
  date: string;
  duration: string;
  status: "confirmed" | "pending" | "completed";
  topic: string;
}

const APPOINTMENTS: ScheduledAppointment[] = [
  {
    id: "app-1",
    leadName: "Rahul Sharma",
    phone: "+91 98765 43210",
    agentName: "Priya AI",
    date: "Today, 02 Sept",
    time: "4:30 PM",
    duration: "30 mins",
    status: "confirmed",
    topic: "Enterprise Voice Automation Demo (Infosys)",
  },
  {
    id: "app-2",
    leadName: "Anita Patel",
    phone: "+91 98234 56789",
    agentName: "Arjun AI",
    date: "Tomorrow, 03 Sept",
    time: "11:00 AM",
    duration: "45 mins",
    status: "confirmed",
    topic: "Pricing & SIP Trunking Integration",
  },
  {
    id: "app-3",
    leadName: "Vikram Singh",
    phone: "+91 97112 34567",
    agentName: "Meera AI",
    date: "Thursday, 04 Sept",
    time: "2:00 PM",
    duration: "30 mins",
    status: "pending",
    topic: "Recruiter AI Screening Walkthrough",
  },
  {
    id: "app-4",
    leadName: "Priya Nair",
    phone: "+91 96543 21098",
    agentName: "Anjali AI",
    date: "Friday, 05 Sept",
    time: "5:00 PM",
    duration: "20 mins",
    status: "confirmed",
    topic: "Contract Signing & Onboarding",
  },
];

export default function CalendarPage() {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? APPOINTMENTS : APPOINTMENTS.filter(a => a.status === filter);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">AI Booked Appointments</h1>
          <p className="text-sm text-white/50 mt-1">Calendar events automatically scheduled by your voice employees during phone calls.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Google Calendar & Outlook Synced
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Bookings This Week", value: "24 Demos", color: "text-emerald-400" },
          { label: "Scheduled Tomorrow", value: "6 Calls", color: "text-brand-400" },
          { label: "Show-Up Ratio", value: "88.5%", color: "text-cyan-400" },
          { label: "Avg Booking Call Time", value: "2m 14s", color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-lg">
            <p className={`text-2xl font-mono font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Calendar List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white uppercase tracking-wider">Upcoming Schedule</h2>
          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-1">
            {["all", "confirmed", "pending"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? "bg-brand-600 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl p-5 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] hover:border-brand-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex flex-col items-center justify-center flex-shrink-0">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">{item.topic}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.status === "confirmed"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mt-1 flex items-center gap-2 flex-wrap">
                    <span>Lead: <strong className="text-white">{item.leadName}</strong> ({item.phone})</span>
                    <span>·</span>
                    <span>Booked by: <strong className="text-brand-300">{item.agentName}</strong></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/[0.05] w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <p className="text-xs font-mono font-bold text-white flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-400" /> {item.date} at {item.time}
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5">{item.duration} video demo</p>
                </div>
                <a
                  href={`tel:${item.phone}`}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white border border-white/10 flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
