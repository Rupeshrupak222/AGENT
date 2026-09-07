"use client";

import {
  Users,
  Clock,
  PhoneForwarded,
  CheckCircle2,
  XCircle,
  RotateCcw,
  SkipForward,
  TrendingUp,
  Percent,
  Timer,
} from "lucide-react";
import { CampaignMetrics } from "@/lib/api";
import { formatDuration } from "@/lib/utils";

interface CampaignKPICardsProps {
  metrics: CampaignMetrics | null;
  loading?: boolean;
}

export function CampaignKPICards({ metrics, loading = false }: CampaignKPICardsProps) {
  const cards = [
    {
      title: "Total Contacts",
      value: metrics?.totalLeads ?? 0,
      sub: "Enrolled in campaign",
      icon: Users,
      color: "text-slate-600 dark:text-slate-300",
      bg: "bg-slate-100 dark:bg-white/5",
    },
    {
      title: "In Progress / Calling",
      value: metrics?.calling ?? 0,
      sub: `${metrics?.queued ?? 0} queued`,
      icon: PhoneForwarded,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      pulse: (metrics?.calling ?? 0) > 0,
    },
    {
      title: "Calls Completed",
      value: metrics?.completed ?? 0,
      sub: `${metrics?.connectedCalls ?? metrics?.completed ?? 0} connected`,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Failed & Skipped",
      value: (metrics?.failed ?? 0) + (metrics?.skipped ?? 0),
      sub: `${metrics?.retryPending ?? 0} retry pending`,
      icon: XCircle,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      title: "Connect Rate",
      value: `${metrics?.connectRate ?? 0}%`,
      sub: `${metrics?.totalCalls ?? 0} total dials`,
      icon: Percent,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Conversion / Qualified",
      value: `${metrics?.conversionRate ?? 0}%`,
      sub: "AI evaluated BANT",
      icon: TrendingUp,
      color: "text-brand-500",
      bg: "bg-brand-500/10",
    },
    {
      title: "Avg Call Duration",
      value: metrics?.avgDuration ? formatDuration(metrics.avgDuration) : "0s",
      sub: "Talk time per lead",
      icon: Timer,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="p-3.5 rounded-2xl bg-white dark:bg-surface-card border border-slate-200/80 dark:border-white/5 shadow-sm space-y-2 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50 truncate">
                {c.title}
              </span>
              <div className={`p-1.5 rounded-lg ${c.bg} ${c.color} shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${c.pulse ? "animate-pulse" : ""}`} />
              </div>
            </div>

            <div>
              <p className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {loading ? "..." : c.value}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-white/40 truncate mt-0.5">
                {c.sub}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
