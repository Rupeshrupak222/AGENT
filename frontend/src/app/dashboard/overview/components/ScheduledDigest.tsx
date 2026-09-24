"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Send, CalendarClock, Check, Database } from "lucide-react";
import { companyReportApi, CompanyDigestSetting } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

const FREQ_OPTIONS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

export function ScheduledDigest() {
  const { success, error } = useToast();
  const [setting, setSetting] = useState<CompanyDigestSetting | null>(null);
  const [frequency, setFrequency] = useState<string>("weekly");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await companyReportApi.getDigest();
        setSetting(res);
        setFrequency(res.frequency);
        setEnabled(res.enabled);
      } catch {
        // endpoint requires export permission — default off
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await companyReportApi.setDigest({
        enabled,
        frequency,
        recipients: setting?.recipients && setting.recipients.length ? setting.recipients : undefined,
      });
      setSetting(res);
      success(enabled ? "Email digest scheduled. Check your inbox at the next run." : "Email digest turned off.");
    } catch (err: any) {
      error(err?.message || "Could not update digest schedule.");
    } finally {
      setSaving(false);
    }
  };

  const nextRun = setting?.nextRunAt ? new Date(setting.nextRunAt).toLocaleString() : "—";

  return (
    <div className="rounded-2xl p-5 panel-card min-w-0">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <Mail className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Scheduled Email Digest</h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Automated ops summary emailed to company admins
            </p>
          </div>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          aria-label="Toggle email digest"
          className={`relative w-11 h-6 rounded-full transition-colors ${
            enabled ? "bg-brand-600" : "bg-slate-300 dark:bg-white/15"
          }`}
        >
          <motion.span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center"
            animate={{ left: enabled ? 22 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {enabled && <Check className="w-3 h-3 text-brand-600" />}
          </motion.span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 mt-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/40 mb-2">
              Delivery cadence
            </p>
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 w-fit">
              {FREQ_OPTIONS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFrequency(f.key)}
                  disabled={!enabled}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${
                    frequency === f.key
                      ? "bg-gradient-to-r from-brand-600 to-amber-600 text-white shadow-md"
                      : "text-slate-600 dark:text-white/60 hover:bg-slate-200/60 dark:hover:bg-white/5"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
              <p className="text-[10px] text-slate-400 dark:text-white/40 flex items-center gap-1">
                <CalendarClock className="w-3 h-3" /> Next run
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">{nextRun}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
              <p className="text-[10px] text-slate-400 dark:text-white/40 flex items-center gap-1">
                <Database className="w-3 h-3" /> Last run
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {setting?.lastRunAt ? new Date(setting.lastRunAt).toLocaleString() : "—"}
              </p>
              {setting?.lastStatus && (
                <span
                  className={`text-[10px] font-mono mt-0.5 inline-block px-1.5 py-0.5 rounded ${
                    setting.lastStatus === "sent"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {setting.lastStatus}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !enabled}
            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            {saving ? "Saving…" : enabled ? "Save digest schedule" : "Toggle on to schedule"}
          </button>
        </div>
      )}
    </div>
  );
}