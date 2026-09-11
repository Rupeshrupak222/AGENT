"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  Phone,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCheck,
  X,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { companyDashboardApi, callsApi, CallItem, CompanyAlert } from "@/lib/api";
import { computeRange } from "@/lib/dashboard-range";

const SEV_STYLE: Record<CompanyAlert["severity"], { dot: string; text: string; cls: string; icon: any }> = {
  critical: {
    dot: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    cls: "border-rose-500/30 bg-rose-500/[0.06]",
    icon: AlertOctagon,
  },
  warning: {
    dot: "bg-amber-400",
    text: "text-amber-600 dark:text-amber-300",
    cls: "border-amber-500/30 bg-amber-500/[0.06]",
    icon: AlertTriangle,
  },
  info: {
    dot: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-300",
    cls: "border-sky-500/30 bg-sky-500/[0.06]",
    icon: Info,
  },
};

const CALL_STATUS_STYLE: Record<CallItem["status"], string> = {
  queued: "bg-slate-400",
  ringing: "bg-amber-400",
  in_progress: "bg-amber-400",
  completed: "bg-emerald-500",
  missed: "bg-rose-500",
  failed: "bg-rose-500",
  transferred: "bg-sky-500",
};

const FAILED = new Set(["failed", "missed"]);

const DISMISS_KEY = "dashboard_notifications_dismissed_v1";

function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

type Tab = "all" | "alerts" | "calls";

export default function NotificationsPage() {
  const [alerts, setAlerts] = useState<CompanyAlert[]>([]);
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<Tab>("all");
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) setDismissed(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const range = computeRange("last30");
      const [dash, callsRes] = await Promise.all([
        companyDashboardApi.get({ from: range.from, to: range.to }),
        callsApi.list({ limit: 25 }),
      ]);
      setAlerts(dash.alerts || []);
      setCalls(callsRes.items || []);
    } catch (e: any) {
      setError(e?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persistDismiss = (next: Record<string, boolean>) => {
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const dismissAlert = (a: CompanyAlert) =>
    persistDismiss({ ...dismissed, [a.id]: true });

  const dismissAll = () => {
    const next: Record<string, boolean> = { ...dismissed };
    alerts.forEach((a) => {
      next[a.id] = true;
    });
    persistDismiss(next);
  };

  const visibleAlerts = useMemo(
    () => alerts.filter((a) => !dismissed[a.id] && (!showOnlyUnread || a.severity !== "info")),
    [alerts, dismissed, showOnlyUnread]
  );

  const unreadCount = useMemo(
    () => alerts.filter((a) => !dismissed[a.id] && a.severity !== "info").length,
    [alerts, dismissed]
  );

  const failedCount = useMemo(() => calls.filter((c) => FAILED.has(c.status)).length, [calls]);

  const visibleCalls = useMemo(
    () => (showOnlyUnread ? calls.filter((c) => FAILED.has(c.status)) : calls),
    [calls, showOnlyUnread]
  );

  const feed = useMemo(() => {
    const items: { ts: string; id: string; type: "alert" | "call" }[] = [
      ...visibleAlerts.map((a) => ({ ts: a.createdAt, id: `a-${a.id}`, type: "alert" as const })),
      ...visibleCalls.map((c) => ({ ts: c.startedAt, id: `c-${c.id}`, type: "call" as const })),
    ];
    return items.sort((x, y) => (x.ts < y.ts ? 1 : -1)).slice(0, 40);
  }, [visibleAlerts, visibleCalls]);

  const callById = useMemo(() => {
    const m: Record<string, CallItem> = {};
    visibleCalls.forEach((c) => {
      m[c.id] = c;
    });
    return m;
  }, [visibleCalls]);

  const alertById = useMemo(() => {
    const m: Record<string, CompanyAlert> = {};
    visibleAlerts.forEach((a) => {
      m[a.id] = a;
    });
    return m;
  }, [visibleAlerts]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Bell className={cn("w-6 h-6", unreadCount > 0 ? "text-brand-500 dark:text-brand-400" : "text-slate-400 dark:text-white/40")} />
            Notifications
            {unreadCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                {unreadCount + failedCount} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            System alerts from the workspace and the latest call activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin text-brand-500 dark:text-brand-400")} />
            Refresh
          </button>
          {visibleAlerts.length > 0 && (
            <button
              onClick={dismissAll}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 transition-colors"
            >
              <CheckCheck className="w-4 h-4" /> Dismiss all
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 p-1">
          {(["all", "alerts", "calls"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3.5 h-8 rounded-lg text-xs font-semibold capitalize transition-colors",
                tab === t
                  ? "bg-white dark:bg-white/[0.12] text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/80"
              )}
            >
              {t}
              {t === "alerts" && visibleAlerts.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  {visibleAlerts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-white/50 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showOnlyUnread}
            onChange={(e) => setShowOnlyUnread(e.target.checked)}
            className="w-4 h-4 rounded accent-brand-500"
          />
          Only important
        </label>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && alerts.length === 0 && calls.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200/60 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Alerts section */}
          {(tab === "all" || tab === "alerts") && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                Alerts
              </h2>
              {visibleAlerts.length === 0 ? (
                <div className="rounded-2xl p-8 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
                  <CheckCheck className="w-8 h-8 text-emerald-500/70 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white/70">
                    {alerts.length === 0 ? "No alerts in the last 30 days" : "All caught up"}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-white/40 mt-1">
                    We’ll surface plan, quality and agent alerts here as they happen.
                  </p>
                </div>
              ) : (
                visibleAlerts.map((a) => {
                  const sev = SEV_STYLE[a.severity] ?? SEV_STYLE.info;
                  const Icon = sev.icon;
                  return (
                    <div key={a.id} className={cn("rounded-2xl p-4 border flex items-start gap-3", sev.cls)}>
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", sev.cls)}>
                        <Icon className={cn("w-4 h-4", sev.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{a.title}</p>
                          <span className={cn("text-[10px] font-semibold uppercase tracking-wide", sev.text)}>
                            {a.severity}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-white/40 ml-auto">
                            {timeAgo(a.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-white/60 mt-1">{a.message}</p>
                      </div>
                      <button
                        onClick={() => dismissAlert(a)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors flex-shrink-0"
                        aria-label="Dismiss alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </section>
          )}

          {/* Calls section */}
          {(tab === "all" || tab === "calls") && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                  Call Activity
                </h2>
                <Link href="/dashboard/calls" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1">
                  View all calls <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {visibleCalls.length === 0 ? (
                <div className="rounded-2xl p-8 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
                  <Phone className="w-8 h-8 text-slate-300 dark:text-white/20 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white/70">No call activity</p>
                  <p className="text-xs text-slate-400 dark:text-white/40 mt-1">Calls placed by your agents will show up here.</p>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] divide-y divide-slate-200/70 dark:divide-white/[0.04]">
                  {visibleCalls.map((c) => (
                    <Link
                      key={c.id}
                      href="/dashboard/calls"
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", CALL_STATUS_STYLE[c.status])} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 dark:text-white/80 truncate">
                          Call with {c.lead?.name || c.phone}
                        </p>
                        <p className="text-xs mt-0.5 text-slate-500 dark:text-white/40 capitalize">
                          {c.status.replace("_", " ")} · {c.direction} · {c.agent?.name || "Agent"} · {timeAgo(c.startedAt)}
                        </p>
                      </div>
                      {FAILED.has(c.status) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 flex-shrink-0">
                          needs attention
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {feed.length === 0 && (tab === "all") && (
            <div className="rounded-2xl p-12 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
              <Bell className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white/70">You’re all caught up</p>
              <p className="text-xs text-slate-400 dark:text-white/40 mt-1">No alerts or activity to review right now.</p>
            </div>
          )}

          {!loading && unreadCount === 0 && failedCount === 0 && alerts.length > 0 && (
            <p className="text-xs text-slate-400 dark:text-white/40 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3" />
              Live activity updates every few minutes.
            </p>
          )}
        </>
      )}
    </div>
  );
}