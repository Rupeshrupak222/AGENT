"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Library, ChevronRight } from "lucide-react";
import type { KnowledgeSourceItem } from "@/lib/api";
import { knowledgeApi } from "@/lib/api";
import { SectionHeader, Skeleton } from "./shared";

const STATUS_STYLE: Record<string, string> = {
  ready: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  processing: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  failed: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  outdated: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

function timeAgo(iso?: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (24 * 3600 * 1000));
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function KnowledgeHealth() {
  const [items, setItems] = useState<KnowledgeSourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await knowledgeApi.list({ limit: 100 });
        if (mounted) setItems(res.items || []);
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
    const ready = items.filter((i) => i.status === "ready").length;
    const failed = items.filter((i) => i.status === "failed").length;
    const processing = items.filter((i) => i.status === "processing").length;
    const stale = items.filter(
      (i) => i.lastIndexedAt && Date.now() - new Date(i.lastIndexedAt).getTime() > 30 * 24 * 3600 * 1000
    ).length;
    const typeMap = new Map<string, number>();
    items.forEach((i) => typeMap.set(i.type || "unknown", (typeMap.get(i.type || "unknown") ?? 0) + 1));
    const types = Array.from(typeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const readyPct = items.length ? Math.round((ready / items.length) * 100) : 0;
    return { total: items.length, ready, failed, processing, stale, types, readyPct };
  }, [items]);

  const tiles = [
    { label: "Sources", value: stats.total, color: "text-slate-900 dark:text-white" },
    { label: "Indexed", value: stats.ready, color: "text-emerald-500" },
    { label: "Stale (30d+)", value: stats.stale, color: stats.stale > 0 ? "text-amber-500" : "text-emerald-500" },
    { label: "Failed", value: stats.failed, color: stats.failed > 0 ? "text-rose-500" : "text-emerald-500" },
  ];

  return (
    <div className="rounded-2xl bg-white dark:bg-modal border border-slate-200 dark:border-white/15 p-4 sm:p-5 shadow-sm min-w-0">
      <SectionHeader
        icon={<Library className="w-[18px] h-[18px]" />}
        title="Knowledge Base Health"
        subtitle={`${stats.readyPct}% indexed readiness`}
        action={
          <Link
            href="/dashboard/knowledge"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            Sources <ChevronRight className="w-3.5 h-3.5" />
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
          No knowledge sources yet. Upload docs, URLs or FAQs to power your AI agents.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-lg px-1 text-center">
                <p className={`text-sm font-extrabold ${t.color}`}>{t.value}</p>
                <p className="text-[9px] font-medium text-slate-500 dark:text-white/50 mt-0.5">{t.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {items.slice(0, 4).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 px-1 py-1.5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-white/80 truncate">{s.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-white/40">
                    {s.type} · indexed {timeAgo(s.lastIndexedAt)}
                    {s.agent?.name ? ` · ${s.agent.name}` : ""}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex-shrink-0 capitalize ${
                    STATUS_STYLE[s.status] ?? STATUS_STYLE.processing
                  }`}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>

          {stats.types.length > 0 && (
            <div className="flex items-center gap-1.5 pt-2 mt-1 border-t border-slate-100 dark:border-white/[0.06] flex-wrap">
              {stats.types.map(([t, n]) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-[9px] font-semibold text-slate-500 dark:text-white/50 capitalize"
                >
                  {t} · {n}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}