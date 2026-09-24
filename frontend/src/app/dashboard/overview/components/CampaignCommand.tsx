"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Megaphone, Play, Pause, ChevronRight } from "lucide-react";
import type { CompanyDashboardData, CompanyActiveCampaign } from "@/lib/api";
import { campaignsApi } from "@/lib/api";
import { realtimeSocket } from "@/lib/socket";
import { useToast } from "@/components/ui/Toast";
import { SectionHeader, Skeleton } from "./shared";

const STATUS_STYLE: Record<string, string> = {
  running: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  paused: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  scheduled: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  draft: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30",
  completed: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
  cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

export function CampaignCommand({
  dashboard,
  isLoading,
  onRefresh,
}: {
  dashboard: CompanyDashboardData | null;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const { success, error } = useToast();
  const [campaigns, setCampaigns] = useState<CompanyActiveCampaign[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setCampaigns(dashboard?.activeCampaigns ?? []);
  }, [dashboard]);

  useEffect(() => {
    const subs = [
      realtimeSocket.on("campaign:status", (d: any) => {
        const id = d?.campaignId;
        if (!id) return;
        setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: d?.status ?? c.status } : c)));
      }),
      realtimeSocket.on("campaign:progress", (d: any) => {
        const id = d?.campaignId;
        if (!id) return;
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  completed: d?.completed ?? d?.statusCount?.completed ?? c.completed,
                  pending: d?.pending ?? d?.statusCount?.pending ?? c.pending,
                  failed: d?.failed ?? d?.statusCount?.failed ?? c.failed,
                  total: d?.totalLeads ?? c.total,
                }
              : c
          )
        );
      }),
    ];
    return () => subs.forEach((u) => u?.());
  }, []);

  const toggle = useCallback(
    async (c: CompanyActiveCampaign) => {
      setBusy(c.id);
      try {
        if (c.status === "running") {
          await campaignsApi.pause(c.id);
          success(`Campaign "${c.name}" paused`);
        } else if (c.status === "paused") {
          const res = await campaignsApi.resume(c.id);
          success(`Campaign "${c.name}" resumed — ${res.enqueued} calls queued`);
        } else {
          const res = await campaignsApi.start(c.id);
          success(`Campaign "${c.name}" started — ${res.enqueued} calls queued`);
        }
        onRefresh();
      } catch {
        error("Campaign action failed — check dialer connectivity first.");
      } finally {
        setBusy(null);
      }
    },
    [success, error, onRefresh]
  );

  const live = campaigns.filter((c) => c.status === "running").length;

  return (
    <div className="rounded-2xl bg-white dark:bg-modal border border-slate-200 dark:border-white/15 p-4 sm:p-5 shadow-sm min-w-0">
      <SectionHeader
        icon={<Megaphone className="w-[18px] h-[18px]" />}
        title="Campaign Command Center"
        subtitle={`${live} running · ${campaigns.length} in range`}
        action={
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            Manage <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {isLoading && campaigns.length === 0 ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-white/50 text-center py-6">
          No campaigns in the selected period.
        </p>
      ) : (
        <div className="space-y-2.5">
          {campaigns.slice(0, 6).map((c, i) => {
            const pct = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
            const active = c.status === "running";
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-slate-200 dark:border-white/10 p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {c.name} <span className="font-medium text-slate-400">· {c.agentName}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-white/50">
                      {c.completed.toLocaleString()} completed · {c.failed.toLocaleString()} failed ·{" "}
                      {c.pending.toLocaleString()} pending
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                        STATUS_STYLE[c.status] ?? STATUS_STYLE.draft
                      }`}
                    >
                      {c.status}
                    </span>
                    {!["completed", "cancelled", "draft"].includes(c.status) && (
                      <button
                        onClick={() => toggle(c)}
                        disabled={busy === c.id}
                        aria-label={active ? `Pause ${c.name}` : `Start ${c.name}`}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-50 ${
                          active
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {busy === c.id ? (
                          <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        ) : active ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}