"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  PhoneCall,
  Radio,
  CalendarCheck,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { notificationsApi, NotificationItem, NotificationSeverity, NotificationType } from "@/lib/api";
import { realtimeSocket } from "@/lib/socket";

const TYPE_ICON: Record<string, any> = {
  call: PhoneCall,
  campaign: Radio,
  appointment: CalendarCheck,
  automation: Zap,
  alert: AlertTriangle,
  system: Bot,
};

function makeItem(p: {
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  data?: NotificationItem["data"];
}): NotificationItem {
  return {
    id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: "",
    type: p.type,
    severity: p.severity,
    title: p.title,
    message: p.message,
    isRead: false,
    data: p.data ?? null,
    createdAt: new Date().toISOString(),
  };
}

export function LiveEventFeed() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const [feed, count] = await Promise.all([
        notificationsApi.list({ limit: 6 }),
        notificationsApi.unreadCount(),
      ]);
      setItems(feed.items || []);
      setUnread(count ?? 0);
    } catch {
      // backend offline — keep previous feed
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    const push = (item: NotificationItem) => setItems((prev) => [item, ...prev].slice(0, 8));
    const subs = [
      realtimeSocket.on("call:status", (d: any) => {
        push(
          makeItem({
            type: "call",
            severity: d?.status === "failed" || d?.status === "missed" ? "critical" : "success",
            title: d?.agentName ? `AI agent ${d.agentName} — ${d.status ?? "updated"}` : `Call ${d?.status ?? "updated"}`,
            message: d?.lead?.name ? `Call with ${d.lead.name} ${d?.direction ?? ""}` : "Live call event received",
            data: { callId: d?.callId, phone: d?.phone, link: "/dashboard/calls" },
          })
        );
      }),
      realtimeSocket.on("campaign:status", (d: any) => {
        push(
          makeItem({
            type: "campaign",
            severity: "info",
            title: `Campaign ${d?.campaignId ? "update" : "progress"}`,
            message: d?.name ? `"${d.name}" ${d.status ?? "running"}` : "Campaign status changed",
            data: { campaignId: d?.campaignId, link: "/dashboard/campaigns" },
          })
        );
      }),
      realtimeSocket.on("appointment:booked", (d: any) => {
        push(
          makeItem({
            type: "appointment",
            severity: "success",
            title: "Appointment booked by AI",
            message: d?.leadName ? `New appointment for ${d.leadName}` : "An AI booking was confirmed",
            data: { link: "/dashboard/calendar" },
          })
        );
      }),
      realtimeSocket.on("call:analysis", (d: any) => {
        push(
          makeItem({
            type: "call",
            severity: "success",
            title: "Call analysis completed",
            message: d?.outcome ? `Outcome: ${d.outcome}` : "Sentiment & lead scoring finished",
            data: { callId: d?.callId, link: "/dashboard/calls" },
          })
        );
      }),
    ];
    return () => subs.forEach((unsub) => unsub?.());
  }, [fetchFeed]);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (isNaN(diff)) return "recent";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="rounded-2xl p-5 panel-card min-w-0 flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Bell className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live Event Feed</h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Realtime activity across agents, calls & campaigns
            </p>
          </div>
        </div>
        {unread > 0 && (
          <span className="px-2 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono">
            {unread} unread
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2 mt-3 overflow-hidden">
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
            <Bell className="w-7 h-7 text-slate-300 dark:text-white/20 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-white/70">No events yet</p>
            <p className="text-[11px] text-slate-400 dark:text-white/40 mt-1 max-w-xs">
              Calls, campaigns and appointment events will stream here live.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              const sev =
                n.severity === "critical"
                  ? "text-rose-500"
                  : n.severity === "success"
                    ? "text-emerald-500"
                    : n.severity === "warning"
                      ? "text-amber-500"
                      : "text-sky-500";
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    n.isRead
                      ? "border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]"
                      : "border-brand-500/25 bg-brand-500/5 hover:bg-brand-500/10"
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${sev}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-semibold truncate ${n.isRead ? "text-slate-600 dark:text-white/70" : "text-slate-900 dark:text-white"}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-white/40 flex-shrink-0">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] text-[11px]">
        <span className="inline-flex items-center gap-1 text-emerald-500 font-mono">
          <CheckCircle2 className="w-3 h-3" /> Websocket live
        </span>
        <Link href="/dashboard/notifications" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
          View all →
        </Link>
      </div>
    </div>
  );
}