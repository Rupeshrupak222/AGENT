"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Plug, ChevronRight } from "lucide-react";
import type { IntegrationItem } from "@/lib/api";
import { integrationsApi } from "@/lib/api";
import { SectionHeader, Skeleton } from "./shared";

function timeAgo(iso?: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function IntegrationHealth() {
  const [items, setItems] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await integrationsApi.list();
        if (mounted) setItems(res || []);
      } catch {
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const configured = items.filter((i) => i.isConfigured);
    const active = items.filter((i) => i.isConfigured && i.isActive);
    const stale = items.filter(
      (i) => i.lastSyncAt && Date.now() - new Date(i.lastSyncAt).getTime() > 24 * 3600 * 1000
    ).length;
    const score = items.length ? Math.round((active.length / items.length) * 100) : 0;
    return { total: items.length, configured: configured.length, active: active.length, stale, score };
  }, [items]);

  const providerLabel = (p: string) =>
    p
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="rounded-2xl bg-white dark:bg-modal border border-slate-200 dark:border-white/15 p-4 sm:p-5 shadow-sm min-w-0">
      <SectionHeader
        icon={<Plug className="w-[18px] h-[18px]" />}
        title="Integration Health"
        subtitle={`${stats.active} of ${stats.total} connectors live · ${stats.score}% health`}
        action={
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            Connect <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-white/50 text-center py-6">
          No connectors configured. Add CRM, webhook or calendar integrations to stream events here.
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 6).map((it) => {
            const healthy = it.isConfigured && it.isActive;
            return (
              <div
                key={it.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {providerLabel(it.provider)}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-white/40">
                    last sync {timeAgo(it.lastSyncAt)}
                    {it.maskedKey ? ` · ${it.maskedKey}` : ""}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 capitalize ${
                    healthy
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : it.isConfigured
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : "bg-slate-500/10 text-slate-500 dark:text-white/50 border-slate-500/30"
                  }`}
                >
                  {healthy ? "live" : it.isActive ? "config missing" : "off"}
                </span>
              </div>
            );
          })}
          {stats.stale > 0 && (
            <p className="text-[10px] text-amber-500 flex items-center gap-1 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {stats.stale} connector{stats.stale > 1 ? "s" : ""} sharing stale payloads (24h+)
            </p>
          )}
        </div>
      )}
    </div>
  );
}