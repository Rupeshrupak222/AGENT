"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Loader2,
  RefreshCw,
  Trash2,
  AlertCircle,
  Phone,
  Megaphone,
  CreditCard,
  Calendar,
  Workflow,
  Info,
  CheckCircle2,
  Siren,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notificationsApi, NotificationItem } from "@/lib/api";

const SEV_STYLE: Record<NotificationItem["severity"] & string, { dot: string; text: string; cls: string; icon: any }> = {
  critical: {
    dot: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    cls: "border-rose-500/30 bg-rose-500/[0.06]",
    icon: Siren,
  },
  warning: {
    dot: "bg-amber-400",
    text: "text-amber-600 dark:text-amber-300",
    cls: "border-amber-500/30 bg-amber-500/[0.06]",
    icon: AlertCircle,
  },
  success: {
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    cls: "border-emerald-500/30 bg-emerald-500/[0.06]",
    icon: CheckCircle2,
  },
  info: {
    dot: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-300",
    cls: "border-sky-500/30 bg-sky-500/[0.06]",
    icon: Info,
  },
};

const TYPE_ICON: Record<string, any> = {
  call: Phone,
  campaign: Megaphone,
  billing: CreditCard,
  appointment: Calendar,
  automation: Workflow,
  alert: AlertCircle,
  system: Bell,
};

function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type Tab = "all" | "unread";

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.list({ limit: 50 });
      setItems(res.items || []);
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

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const visible = useMemo(
    () => (tab === "unread" ? items.filter((n) => !n.isRead) : items),
    [items, tab]
  );

  const markRead = async (n: NotificationItem) => {
    if (n.isRead) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    try {
      await notificationsApi.markRead(n.id);
    } catch {
      load();
    }
  };

  const markAllRead = async () => {
    if (busy || unreadCount === 0) return;
    setBusy(true);
    try {
      const res = await notificationsApi.markAllRead();
      if (res.updated > 0) {
        setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      }
    } catch (e: any) {
      setError(e?.message || "Unable to mark notifications as read.");
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (busy || items.length === 0) return;
    setBusy(true);
    try {
      const res = await notificationsApi.clearAll();
      if (res.deleted > 0) {
        setItems([]);
      }
    } catch (e: any) {
      setError(e?.message || "Unable to clear notifications.");
    } finally {
      setBusy(false);
    }
  };

  const notificationRow = (n: NotificationItem) => {
    const sev = SEV_STYLE[n.severity] ?? SEV_STYLE.info;
    const Icon = sev.icon;
    const TypeIcon = TYPE_ICON[n.type] ?? Bell;
    const href = n.data?.link || "/dashboard/notifications";
    return (
      <div
        key={n.id}
        onClick={() => {
          markRead(n);
          if (n.data?.link?.startsWith("/") && n.data.link !== "/dashboard/notifications") {
            window.location.href = n.data.link;
          }
        }}
        className={cn(
          "rounded-2xl p-4 border flex items-start gap-3 cursor-pointer transition-colors",
          sev.cls,
          !n.isRead && "shadow-sm"
        )}
      >
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", sev.cls)}>
          <Icon className={cn("w-4 h-4", sev.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("text-sm font-bold text-slate-900 dark:text-white", n.isRead && "text-slate-600 dark:text-white/70")}>
              {n.title}
            </p>
            <span className={cn("text-[10px] font-semibold uppercase tracking-wide", sev.text)}>{n.severity}</span>
            <span className="text-[10px] text-slate-400 dark:text-white/40 ml-auto flex items-center gap-1">
              <TypeIcon className="w-3 h-3" />
              {n.type} · {timeAgo(n.createdAt)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-white/60 mt-1">{n.message}</p>
          {!n.isRead && (
            <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
          )}
        </div>
        {n.data?.link?.startsWith("/") && n.data.link !== "/dashboard/notifications" && (
          <Link
            href={n.data.link}
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] font-bold px-2 py-1 rounded-lg text-brand-600 dark:text-brand-400 border border-brand-500/30 hover:bg-brand-500/10 transition-colors flex-shrink-0"
          >
            Open
          </Link>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Bell className={cn("w-6 h-6", unreadCount > 0 ? "text-brand-500 dark:text-brand-400" : "text-slate-400 dark:text-white/40")} />
            Notifications
            {unreadCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            Calls, campaigns and system events from your workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin text-brand-500 dark:text-brand-400")} />
            Refresh
          </button>
          <button
            onClick={markAllRead}
            disabled={busy || unreadCount === 0}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-50 transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
          <button
            onClick={clearAll}
            disabled={busy || items.length === 0}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear all
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 p-1">
          {(["all", "unread"] as Tab[]).map((t) => (
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
              {t === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200/60 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
          <Bell className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white/70">
            {tab === "unread" ? "No unread notifications" : "You’re all caught up"}
          </p>
          <p className="text-xs text-slate-400 dark:text-white/40 mt-1">
            Call and campaign events will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(notificationRow)}
          {!loading && (
            <p className="text-xs text-slate-400 dark:text-white/40 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3" />
              Live activity updates every 30 seconds.
            </p>
          )}
        </div>
      )}
    </div>
  );
}