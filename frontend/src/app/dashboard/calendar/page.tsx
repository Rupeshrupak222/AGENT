"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon, Clock, Plus,
  CheckCircle2, Phone, AlertCircle, Loader2,
  Trash2, Repeat, CalendarClock, ExternalLink,
} from "lucide-react";
import {
  appointmentsApi,
  Appointment, AppointmentOverview, AppointmentStatus,
  AppointmentSlot, CalendarProviderStatus,
} from "@/lib/api";
import { ProviderModeBadge, deriveCalendarProviderMode } from "@/components/ui/ProviderModeBadge";

const STATUS_STYLES: Record<AppointmentStatus, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-slate-500/15 text-slate-500 dark:text-slate-300 border border-slate-500/30" },
  pending:   { label: "Pending",   cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" },
  completed: { label: "Completed", cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30" },
  cancelled: { label: "Cancelled", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30" },
  no_show:   { label: "No Show",   cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" },
  rescheduled: { label: "Rescheduled", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30" },
  failed:    { label: "Failed",    cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30" },
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "rescheduled", label: "Rescheduled" },
  { key: "cancelled", label: "Cancelled" },
  { key: "failed", label: "Failed" },
];

const INPUT_CLS =
  "w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500";

const DEFAULT_TIMEZONE = "Asia/Kolkata";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function localMidnight(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

type ReminderChip = { kind: "24h" | "1h"; state: "sent" | "passed" | "scheduled" };

function reminderChips(app: Appointment): ReminderChip[] {
  const startAt = app.startAt ?? app.date;
  if (!startAt || !(app.status === "confirmed" || app.status === "scheduled" || app.status === "pending" || app.status === "rescheduled")) {
    return [];
  }
  const start = new Date(startAt).getTime();
  return (["24h", "1h"] as const).map((kind) => {
    const offset = kind === "24h" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
    const sentAt = kind === "24h" ? app.reminder24hSentAt : app.reminder1hSentAt;
    const state: ReminderChip["state"] = sentAt
      ? "sent"
      : start - offset <= Date.now()
        ? "passed"
        : "scheduled";
    return { kind, state };
  });
}

export default function CalendarPage() {
  const [filter, setFilter] = useState<string>("all");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [overview, setOverview] = useState<AppointmentOverview | null>(null);
  const [providerStatus, setProviderStatus] = useState<CalendarProviderStatus | null>(null);
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
    timezone: DEFAULT_TIMEZONE,
  });
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "10:00", reason: "" });
  const [rescheduleSlots, setRescheduleSlots] = useState<AppointmentSlot[]>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduleSlotsError, setRescheduleSlotsError] = useState<string | null>(null);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<string | null>(null);
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, ov, prov] = await Promise.all([
        appointmentsApi.list(filter === "all" ? undefined : { status: filter }),
        appointmentsApi.overview({}),
        appointmentsApi.providerStatus(),
      ]);
      setAppointments(list);
      setOverview(ov);
      setProviderStatus(prov);
    } catch {
      setError("Could not load appointments. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const fetchSlots = useCallback(async (
    date: string,
    duration: number,
    timezone: string,
    setter: (s: AppointmentSlot[]) => void,
    setLoading: (b: boolean) => void,
    setError: (e: string | null) => void,
  ) => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const from = localMidnight(date);
      const to = new Date(from.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
      const res = await appointmentsApi.availability({
        from: from.toISOString(),
        to: to.toISOString(),
        duration,
        timezone,
      });
      setter(res.slots.filter((s) => s.available));
      if (!res.authenticated) {
        setError("Calendar provider not authenticated — live slots unavailable.");
      }
    } catch {
      setter([]);
      setError("Could not load live availability.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showForm || !form.date) return;
    setSelectedSlot(null);
    fetchSlots(form.date, form.duration, form.timezone, setSlots, setSlotsLoading, setSlotsError);
  }, [showForm, form.date, form.duration, form.timezone, fetchSlots]);

  useEffect(() => {
    if (!rescheduleTarget || !rescheduleForm.date) return;
    setSelectedRescheduleSlot(null);
    fetchSlots(
      rescheduleForm.date,
      rescheduleTarget.duration || 30,
      rescheduleTarget.timezone || DEFAULT_TIMEZONE,
      setRescheduleSlots, setRescheduleSlotsLoading, setRescheduleSlotsError,
    );
  }, [rescheduleTarget, rescheduleForm.date, fetchSlots]);

  const openReschedule = (app: Appointment) => {
    const start = new Date(app.startAt ?? app.date);
    const local = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString();
    setRescheduleTarget(app);
    setRescheduleForm({
      date: local.slice(0, 10),
      time: local.slice(11, 16),
      reason: "",
    });
    setSelectedRescheduleSlot(null);
    setRescheduleSlots([]);
    setRescheduleSlotsError(null);
  };

  const handleCreate = async () => {
    if (!form.leadName || !form.phone || !form.date) return;
    setSaving(true);
    try {
      const startMs = selectedSlot
        ? new Date(selectedSlot).getTime()
        : new Date(`${form.date}T${form.time}`).getTime();
      const res = await appointmentsApi.create({
        leadName: form.leadName,
        phone: form.phone,
        email: form.email || undefined,
        topic: form.topic || undefined,
        startAt: new Date(startMs).toISOString(),
        duration: form.duration,
        timezone: form.timezone,
        source: "manual",
        idempotencyKey: crypto.randomUUID(),
      });
      setShowForm(false);
      setForm({ leadName: "", phone: "", email: "", topic: "", date: "", time: "10:00", duration: 30, timezone: DEFAULT_TIMEZONE });
      setSelectedSlot(null);
      setSlots([]);
      void res;
      await load();
    } catch {
      setError("Could not book the appointment. The slot may have been taken — refresh availability and retry.");
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget) return;
    const startMs = selectedRescheduleSlot
      ? new Date(selectedRescheduleSlot).getTime()
      : new Date(`${rescheduleForm.date}T${rescheduleForm.time}`).getTime();
    setRescheduleSaving(true);
    try {
      await appointmentsApi.reschedule(rescheduleTarget.id, {
        startAt: new Date(startMs).toISOString(),
        timezone: rescheduleTarget.timezone || DEFAULT_TIMEZONE,
        reason: rescheduleForm.reason || undefined,
      });
      setRescheduleTarget(null);
      await load();
    } catch {
      setError("Could not reschedule the appointment. The new slot may be unavailable.");
    } finally {
      setRescheduleSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    const reason = window.prompt("Reason for cancellation (optional):");
    if (reason === null) return;
    setCancellingId(id);
    try {
      await appointmentsApi.cancel(id, { reason: reason.trim() || undefined });
      await load();
    } catch {
      setError("Could not cancel the appointment.");
    } finally {
      setCancellingId(null);
    }
  };

  const stats = overview
    ? [
        { label: "Total Appointments", value: String(overview.total), color: "text-brand-600 dark:text-brand-400" },
        { label: "Confirmed", value: String(overview.confirmed), color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Pending", value: String(overview.pending), color: "text-sky-600 dark:text-sky-400" },
        { label: "Show-Up Ratio", value: `${overview.showUpRatio}%`, color: "text-cyan-600 dark:text-cyan-400" },
      ]
    : [];

  const providerBadge = (() => {
    if (!providerStatus) {
      return null;
    }
    const mode = deriveCalendarProviderMode(providerStatus);
    return (
      <ProviderModeBadge
        mode={mode}
        provider={providerStatus.provider}
        withDot
      />
    );
  })();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">AI Booked Appointments</h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Live availability, provider synced bookings and automatic WhatsApp reminders.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Appointment
          </button>
          <span className="hidden lg:inline-flex">
            {providerBadge ?? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50">
                <CalendarClock className="w-3.5 h-3.5" /> Checking provider…
              </span>
            )}
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl p-5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Schedule New Appointment</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="apt-leadname" className="sr-only">Lead name</label>
              <input
                id="apt-leadname"
                value={form.leadName}
                onChange={(e) => setForm({ ...form, leadName: e.target.value })}
                placeholder="Lead name *"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="apt-phone" className="sr-only">Phone</label>
              <input
                id="apt-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone *"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="apt-email" className="sr-only">Email</label>
              <input
                id="apt-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="apt-topic" className="sr-only">Topic</label>
              <input
                id="apt-topic"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="Topic (optional)"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="apt-date" className="sr-only">Date</label>
              <input
                id="apt-date"
                type="date"
                value={form.date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="apt-duration" className="sr-only">Duration</label>
              <select
                id="apt-duration"
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
            <div>
              <label htmlFor="apt-tz" className="sr-only">Timezone</label>
              <input
                id="apt-tz"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="Timezone e.g. Asia/Kolkata"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="apt-time" className="sr-only">Custom time</label>
              <input
                id="apt-time"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Live availability slots */}
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-white/50 mb-2">
              Live availability {slotsLoading && <Loader2 className="w-3 h-3 inline animate-spin" />}
              {!slotsLoading && slots.length > 0 && `— ${slots.length} open slot${slots.length === 1 ? "" : "s"}`}
            </p>
            {slotsError && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {slotsError}
              </p>
            )}
            {!slotsLoading && slots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    key={s.startAt}
                    onClick={() => setSelectedSlot(selectedSlot === s.startAt ? null : s.startAt)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedSlot === s.startAt
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/15 text-slate-900 dark:text-white hover:border-brand-500"
                    }`}
                  >
                    {fmtTime(s.startAt)}
                  </button>
                ))}
              </div>
            )}
            {!slotsLoading && !slotsError && slots.length === 0 && form.date && (
              <p className="text-xs text-slate-500 dark:text-white/40">
                No open slots that day within business hours — use the custom time above to book manually.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving || !form.leadName || !form.phone || !form.date}
              className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? "Booking…" : "Book Appointment"}
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
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                  filter === f.key
                    ? "bg-brand-600 text-white"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f.label}
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
            const startAt = item.startAt ?? item.date;
            const chips = reminderChips(item);
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
                      {item.rescheduledAt && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30 flex items-center gap-1">
                          <Repeat className="w-2.5 h-2.5" /> MOVED
                        </span>
                      )}
                      {chips.map((c) => (
                        <span
                          key={c.kind}
                          title={`${c.kind} reminder — ${c.state}`}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            c.state === "sent"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : c.state === "passed"
                                ? "bg-slate-500/10 text-slate-500 dark:text-white/40 border border-slate-500/30"
                                : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5" /> {c.kind} reminder
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-1 flex items-center gap-2 flex-wrap">
                      <span>Lead: <strong className="text-slate-900 dark:text-white">{item.leadName}</strong> ({item.phone})</span>
                      {item.email && <><span className="text-slate-300 dark:text-white/30">|</span><span>{item.email}</span></>}
                      {item.calendarProvider && (
                        <>
                          <span className="text-slate-300 dark:text-white/30">|</span>
                          <span className="capitalize">{item.calendarProvider}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-white/[0.05] w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" /> {fmtDate(startAt)} at {fmtTime(startAt)}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-white/40 mt-0.5">
                      {item.duration} mins
                      {item.timezone && ` · ${item.timezone}`}
                    </p>
                    {item.providerBookingUrl && (
                      <a
                        href={item.providerBookingUrl}
                        target="_blank" rel="noreferrer"
                        className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1 justify-end"
                      >
                        <ExternalLink className="w-2.5 h-2.5" /> View booking
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`tel:${item.phone}`}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.12] text-xs font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                    {item.status !== "cancelled" && item.status !== "failed" && (
                      <button
                        onClick={() => openReschedule(item)}
                        aria-label={`Reschedule appointment with ${item.leadName}`}
                        className="px-2.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center transition-colors"
                        title="Reschedule"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {item.status !== "cancelled" && (
                      <button
                        onClick={() => handleCancel(item.id)}
                        disabled={cancellingId === item.id}
                        aria-label={`Cancel appointment with ${item.leadName}`}
                        className="px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
                        title="Cancel (idempotent — reminders & provider booking released)"
                      >
                        {cancellingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reschedule modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Reschedule appointment</h3>
            <p className="text-xs text-slate-500 dark:text-white/50 mb-4">
              <strong className="text-slate-900 dark:text-white">{rescheduleTarget.leadName}</strong> · currently {fmtDate(rescheduleTarget.startAt ?? rescheduleTarget.date)} at {fmtTime(rescheduleTarget.startAt ?? rescheduleTarget.date)}
              {rescheduleTarget.rescheduleReason && <span className="block mt-1 text-[10px]">Last change: {rescheduleTarget.rescheduleReason}</span>}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="rs-date" className="sr-only">New date</label>
                <input
                  id="rs-date"
                  type="date"
                  value={rescheduleForm.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label htmlFor="rs-time" className="sr-only">Custom time</label>
                <input
                  id="rs-time"
                  type="time"
                  value={rescheduleForm.time}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, time: e.target.value })}
                  className={INPUT_CLS}
                />
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-500 dark:text-white/50 mt-4 mb-2">
              Live availability {rescheduleSlotsLoading && <Loader2 className="w-3 h-3 inline animate-spin" />}
              {!rescheduleSlotsLoading && rescheduleSlots.length > 0 && `— ${rescheduleSlots.length} open slot${rescheduleSlots.length === 1 ? "" : "s"}`}
            </p>
            {rescheduleSlotsError && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {rescheduleSlotsError}
              </p>
            )}
            {rescheduleSlots.length > 0 && (
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {rescheduleSlots.map((s) => (
                  <button
                    key={s.startAt}
                    onClick={() => setSelectedRescheduleSlot(selectedRescheduleSlot === s.startAt ? null : s.startAt)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedRescheduleSlot === s.startAt
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/15 text-slate-900 dark:text-white hover:border-brand-500"
                    }`}
                  >
                    {fmtTime(s.startAt)}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3">
              <label htmlFor="rs-reason" className="sr-only">Reason</label>
              <input
                id="rs-reason"
                value={rescheduleForm.reason}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                placeholder="Reason (optional)"
                className={INPUT_CLS}
              />
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={handleReschedule}
                disabled={rescheduleSaving || !rescheduleForm.date}
                className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rescheduleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
                {rescheduleSaving ? "Rescheduling…" : "Confirm Reschedule"}
              </button>
              <button
                onClick={() => setRescheduleTarget(null)}
                className="px-4 h-10 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}