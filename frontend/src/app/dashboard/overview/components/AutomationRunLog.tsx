"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Workflow, ChevronRight } from "lucide-react";
import type { AutomationRule, AutomationLogItem } from "@/lib/api";
import { automationsApi } from "@/lib/api";
import { SectionHeader, Skeleton } from "./shared";

const LOG_STYLE: Record<string, string> = {
  sent: "text-emerald-600 dark:text-emerald-400",
  delivered: "text-emerald-600 dark:text-emerald-400",
  read: "text-sky-600 dark:text-sky-400",
  queued: "text-amber-600 dark:text-amber-400",
  skipped: "text-slate-500 dark:text-white/50",
  failed: "text-rose-600 dark:text-rose-400",
};
const LOG_DOT: Record<string, string> = {
  sent: "bg-emerald-500",
  delivered: "bg-emerald-500",
  read: "bg-sky-500",
  queued: "bg-amber-500",
  skipped: "bg-slate-400",
  failed: "bg-rose-500",
};

function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AutomationRunLog() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [r, l] = await Promise.allSettled([
          automationsApi.listRules(),
          automationsApi.getLogs({ limit: 8 }),
        ]);
        if (!mounted) return;
        if (r.status === "fulfilled") setRules(r.value);
        if (l.status === "fulfilled") setLogs(l.value.items);
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
    const active = rules.filter((r) => r.status === "active");
    const execs = rules.reduce((s, r) => s + (r.executions ?? 0), 0);
    const failed = logs.filter((l) => l.status === "failed" || l.error).length;
    return { total: rules.length, active: active.length, execs, failed };
  }, [rules, logs]);

  const tiles = [
    { label: "Active Rules", value: stats.active, color: "text-emerald-500" },
    { label: "Total Executions", value: stats.execs.toLocaleString(), color: "text-sky-500" },
    { label: "Recent Failures", value: stats.failed, color: stats.failed > 0 ? "text-rose-500" : "text-emerald-500" },
  ];

  return (
    <div className="rounded-2xl bg-white dark:bg-modal border border-slate-200 dark:border-white/15 p-4 sm:p-5 shadow-sm min-w-0">
      <SectionHeader
        icon={<Workflow className="w-[18px] h-[18px]" />}
        title="Automation Run Log"
        subtitle="Rules fired and their latest outcomes"
        action={
          <Link
            href="/dashboard/automations"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            Open <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {tiles.map((t) => (
              <div
                key={t.label}
                className="rounded-xl border border-slate-200 dark:border-white/10 p-2.5 text-center"
              >
                <p className={`text-base font-extrabold ${t.color}`}>{t.value}</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-white/50 mt-0.5 capitalize">
                  {t.label}
                </p>
              </div>
            ))}
          </div>

          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-white/50 text-center py-5">
              No automation activity yet. Rules fire after calls, missed calls or appointment events.
            </p>
          ) : (
            <div className="space-y-1.5">
              {logs.slice(0, 6).map((l) => {
                const st = (LOG_STYLE[l.status] ?? LOG_STYLE.sent);
                const dot = LOG_DOT[l.status] ?? LOG_DOT.sent;
                return (
                  <div
                    key={l.id}
                    className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                  >
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-slate-700 dark:text-white/80 truncate">
                        {l.message || `${l.type} ${l.template}`}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-white/40 flex items-center gap-1">
                        {l.lead?.name ? `${l.lead.name} · ` : ""}
                        {l.type} · {timeAgo(l.createdAt)}
                        {l.error && <span className="text-rose-500 truncate"> · {l.error}</span>}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold capitalize flex-shrink-0 ${st}`}>{l.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}