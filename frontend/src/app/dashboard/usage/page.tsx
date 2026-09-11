"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Zap,
  PhoneCall,
  Bot,
  Users,
  Activity,
  AlertCircle,
  RefreshCw,
  CreditCard,
  ArrowUpRight,
  FileText,
  Calendar,
  Target,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { tenantApi, TenantUsage, normalizeApiError } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export default function UsagePage() {
  const { can } = usePermissions();
  const [usage, setUsage] = useState<TenantUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success } = useToast();

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setUsage(await tenantApi.usage());
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can(PERMISSIONS.TENANT_VIEW)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="rounded-2xl p-8 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Access Restricted</p>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">You do not have permission to view usage.</p>
        </div>
      </div>
    );
  }

  const meters = usage
    ? [
        {
          key: "calls",
          label: "Monthly Call Volume",
          icon: <PhoneCall className="w-5 h-5 text-sky-500" />,
          used: usage.usage.calls.used,
          limit: usage.limits.calls,
          unlimited: usage.usage.calls.unlimited,
          pct: usage.usage.calls.pct,
          color: "from-sky-500 to-sky-600",
          note: `${formatNumber(usage.minutesUsed)} voice minutes consumed`,
        },
        {
          key: "agents",
          label: "AI Agents",
          icon: <Bot className="w-5 h-5 text-brand-500 dark:text-brand-400" />,
          used: usage.usage.agents.used,
          limit: usage.limits.agents,
          unlimited: usage.usage.agents.unlimited,
          pct: usage.usage.agents.pct,
          color: "from-brand-500 to-brand-700",
          note: "Concurrent autonomous voice employees",
        },
        {
          key: "members",
          label: "Team Members",
          icon: <Users className="w-5 h-5 text-violet-500" />,
          used: usage.usage.members.used,
          limit: usage.limits.members,
          unlimited: usage.usage.members.unlimited,
          pct: usage.usage.members.pct,
          color: "from-violet-500 to-purple-600",
          note: "Invited workspace users",
        },
      ]
    : [];

  const totals = usage
    ? [
        { label: "Leads Managed", value: usage.leadCount, icon: <Target className="w-4 h-4 text-purple-500" /> },
        { label: "Campaigns", value: usage.campaignCount, icon: <Activity className="w-4 h-4 text-sky-500" /> },
        { label: "Appointments", value: usage.appointmentCount, icon: <Calendar className="w-4 h-4 text-amber-500" /> },
        { label: "AI Analyses", value: usage.analysisCount, icon: <FileText className="w-4 h-4 text-emerald-500" /> },
      ]
    : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Usage & Quota</h1>
            {usage && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/30">
                <Zap className="w-3 h-3" /> {usage.planName}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            Live consumption against your active plan across the current billing cycle.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-brand-500 dark:text-brand-400" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <Link
            href="/dashboard/billing"
            className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" /> Manage Billing
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && !usage ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-200/60 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Resource meters */}
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            {meters.map((m) => {
              const pct = m.pct ?? 0;
              const over = !m.unlimited && m.limit > 0 && pct >= 100;
              return (
                <div key={m.key} className="rounded-2xl p-5 panel-card">
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${m.color === "from-sky-500 to-sky-600" ? "from-sky-500/15 to-sky-600/5 border-sky-500/30" : m.color === "from-violet-500 to-purple-600" ? "from-violet-500/15 to-purple-600/5 border-violet-500/30" : "from-brand-500/15 to-brand-600/5 border-brand-500/30"}`}>
                      {m.icon}
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      {formatNumber(m.used)} {m.unlimited ? "" : `/ ${formatNumber(m.limit)}`}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{m.label}</p>
                  <div className="h-2.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mt-3">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${m.color} ${over ? "!bg-rose-500" : ""}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className={`text-[11px] font-mono mt-2 ${over ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-white/40"}`}>
                    {m.unlimited ? "Unlimited" : `${pct.toFixed(0)}% used`}
                    {over ? " · limit reached!" : ""} · {m.note}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Totals strip */}
          <div className="rounded-2xl p-5 panel-card">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Workspace Totals</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {totals.map((t) => (
                <div key={t.label} className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
                  <span className="p-2 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">{t.icon}</span>
                  <div>
                    <p className="text-lg font-black font-mono text-slate-900 dark:text-white">{formatNumber(t.value)}</p>
                    <p className="text-[11px] text-slate-500 dark:text-white/50">{t.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="rounded-2xl p-6 bg-gradient-to-br from-brand-500/10 to-brand-700/5 border border-brand-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Need more headroom?</p>
              <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
                Compare plans and upgrade to unlock higher call volumes, more agents and additional members.
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2"
            >
              Upgrade Plan <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}