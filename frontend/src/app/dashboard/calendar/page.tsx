"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon, Clock, Plus,
  CheckCircle2, Phone, AlertCircle, Loader2,
  Trash2
} from "lucide-react";
import { calendarApi, Appointment, AppointmentOverview, AppointmentStatus } from "@/lib/api";

const STATUS_STYLES: Record<AppointmentStatus, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-slate-500/15 text-slate-500 dark:text-slate-300 border border-slate-500/30" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" },
  completed: { label: "Completed", cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30" },
  cancelled: { label: "Cancelled", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30" },
  no_show:   { label: "No Show",   cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" },
};

const INPUT_CLS =
  "w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function CalendarPage() {
  const [filter, setFilter] = useState<string>("all");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [overview, setOverview] = useState<AppointmentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    leadName: "",
    phone: "",
    email: "",
    topic: "",
    date: "",
    time: "10:00",
    duration: 30,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, ov] = await Promise.all([
        calendarApi.list(filter === "all" ? undefined : { status: filter }),
        calendarApi.overview({}),
      ]);
      setAppointments(list);
      setOverview(ov);
    } catch {
      setError("Could not load appointments. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.leadName || !form.phone || !form.date) return;
    setSaving(true);
    try {
      const date = new Date(`${form.date}T${form.time}`);
      await calendarApi.create({
        leadName: form.leadName,
        phone: form.phone,
        email: form.email || undefined,
        topic: form.topic || undefined,
        date: date.toISOString(),
        duration: form.duration,
      });
      setShowForm(false);
      setForm({ leadName: "", phone: "", email: "", topic: "", date: "", time: "10:00", duration: 30 });
      await load();
    } catch {
      setError("Could not create the appointment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id: string, status: AppointmentStatus) => {
    try {
      await calendarApi.update(id, { status });
      await load();
    } catch {
      setError("Could not update the appointment.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await calendarApi.remove(id);
      await load();
    } catch {
      setError("Could not delete the appointment.");
    }
  };

  const stats = overview
    ? [
        { label: "Total Appointments", value: String(overview.total), color: "text-brand-600 dark:text-brand-400" },
        { label: "Confirmed", value: String(overview.confirmed), color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Show-Up Ratio", value: `${overview.showUpRatio}%`, color: "text-cyan-600 dark:text-cyan-400" },
        { label: "Avg Duration", value: `${overview.avgDurationMins}m`, color: "text-purple-600 dark:text-purple-400" },
      ]
    : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">AI Booked Appointments</h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Calendar events automatically scheduled by your voice employees during phone calls.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Appointment
          </button>
          <span className="hidden lg:flex text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Google Calendar &amp; Outlook Synced
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl p-5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Schedule New Appointment</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              value={form.leadName}
              onChange={(e) => setForm({ ...form, leadName: e.target.value })}
              placeholder="Lead name *"
              className={INPUT_CLS}
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone *"
              className={INPUT_CLS}
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className={INPUT_CLS}
            />
            <input
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="Topic (optional)"
              className={INPUT_CLS}
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={INPUT_CLS}
            />
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className={INPUT_CLS}
            />
            <select
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              className={INPUT_CLS}
            >
              <option value={15}>15 mins</option>
              <option value={30}>30 mins</option>
              <option value={45}>45 mins</option>
              <option value={60}>60 mins</option>
            </select>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving || !form.leadName || !form.phone || !form.date}
              className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Appointment"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 h-10 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm">
            <p className={`text-2xl font-mono font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Calendar List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Upcoming Schedule</h2>
          <div className="flex items-center bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-1 overflow-x-auto">
            {["all", "scheduled", "confirmed", "completed", "cancelled"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                  filter === f
                    ? "bg-brand-600 text-white"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-white/50">
            <Loader2 className="w-6 h-6 animate-spin mb-3" />
            <p className="text-sm">Loading appointments&hellip;</p>
          </div>
        )}

        {!loading && !error && appointments.length === 0 && (
          <div className="text-center py-16">
            <CalendarIcon className="w-8 h-8 text-slate-500 dark:text-white/40 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-white/50">No {filter === "all" ? "" : filter} appointments found.</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-xs font-semibold text-brand-600 dark:text-brand-400 underline">
              Book your first appointment
            </button>
          </div>
        )}

        <div className="space-y-3">
          {!loading && appointments.map((item) => {
            const st = STATUS_STYLES[item.status] ?? STATUS_STYLES.scheduled;
            return (
              <div
                key={item.id}
                className="rounded-2xl p-5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] hover:border-brand-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex flex-col items-center justify-center flex-shrink-0">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.topic || "Appointment"}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>
                        {st.label.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-1 flex items-center gap-2 flex-wrap">
                      <span>Lead: <strong className="text-slate-900 dark:text-white">{item.leadName}</strong> ({item.phone})</span>
                      {item.email && <><span className="text-slate-300 dark:text-white/30">|</span><span>{item.email}</span></>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-white/[0.05] w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" /> {fmtDate(item.date)} at {fmtTime(item.date)}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-white/40 mt-0.5">{item.duration} mins</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatus(item.id, e.target.value as AppointmentStatus)}
                      className="h-8 rounded-lg px-2 text-[10px] font-semibold w-28 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                    >
                      {Object.keys(STATUS_STYLES).map((k) => (
                        <option key={k} value={k}>{STATUS_STYLES[k as AppointmentStatus].label}</option>
                      ))}
                    </select>
                    <a
                      href={`tel:${item.phone}`}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.12] text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center transition-colors"
                      title="Delete appointment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
