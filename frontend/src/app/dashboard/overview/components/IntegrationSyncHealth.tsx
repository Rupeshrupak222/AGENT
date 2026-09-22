"use client";

import Link from "next/link";
import {
  Plug,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Layers,
} from "lucide-react";

export function IntegrationSyncHealth() {
  const INTEGRATIONS = [
    {
      name: "HubSpot CRM",
      status: "Synced 3m ago",
      records: "142 leads pushed",
      health: "operational",
    },
    {
      name: "Salesforce / Zoho",
      status: "Active Webhook",
      records: "Real-time stream",
      health: "operational",
    },
    {
      name: "Google Calendar",
      status: "Connected",
      records: "Appointments auto-booked",
      health: "operational",
    },
    {
      name: "Outbound Webhooks",
      status: "100% 200 OK",
      records: "0 retries in queue",
      health: "operational",
    },
  ];

  return (
    <div className="rounded-2xl p-4 panel-card border border-slate-200 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
          <Plug className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            Enterprise Pipeline Sync Health
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-white/40">
            Real-time status of two-way CRM connectors, webhooks and appointment calendars
          </p>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {INTEGRATIONS.map((it) => (
          <div
            key={it.name}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-800 dark:text-white/90">{it.name}:</span>
            <span className="text-slate-500 dark:text-white/50 font-mono text-[11px]">{it.status}</span>
          </div>
        ))}

        <Link
          href="/dashboard/integrations"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 ml-1"
        >
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
