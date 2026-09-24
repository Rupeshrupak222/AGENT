"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PhoneCall, Mic2, AlertTriangle, ChevronRight } from "lucide-react";
import { numbersApi, voicesApi, PhoneNumberItem, VoiceProfile } from "@/lib/api";

export function InventoryHealth() {
  const [numbers, setNumbers] = useState<PhoneNumberItem[]>([]);
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [numRes, voiceRes] = await Promise.allSettled([
          numbersApi.list({ limit: 100 }),
          voicesApi.list(),
        ]);
        if (!mounted) return;
        if (numRes.status === "fulfilled") setNumbers(numRes.value.items || []);
        if (voiceRes.status === "fulfilled") setVoices(voiceRes.value || []);
      } catch {
        // backend offline
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const active = numbers.filter((n) => n.status !== "inactive");
    const outbound = active.filter((n) => n.isOutbound);
    const inbound = active.filter((n) => n.isInbound);
    const assigned = active.filter((n) => n.assignedAgentId);
    const providerMap = new Map<string, number>();
    active.forEach((n) => providerMap.set(n.provider || "unknown", (providerMap.get(n.provider || "unknown") ?? 0) + 1));
    const providers = Array.from(providerMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const languages = new Set<string>();
    voices.forEach((v) => v.languages?.forEach((l) => languages.add(l.toLowerCase())));
    return {
      total: numbers.length,
      active,
      outbound: outbound.length,
      inbound: inbound.length,
      assigned: assigned.length,
      unassigned: active.filter((n) => !n.assignedAgentId).length,
      providers,
      voiceCount: voices.length,
      languageCount: languages.size,
      languages,
    };
  }, [numbers, voices]);

  const healthScore = useMemo(() => {
    if (stats.total === 0) return 0;
    const inactive = stats.total - stats.active.length;
    const unassigned = stats.unassigned;
    const score = Math.max(
      0,
      Math.round(100 * (1 - inactive / stats.total) - unassigned * 2)
    );
    return Math.min(100, score);
  }, [stats]);

  const tiles = [
    { label: "Active Numbers", value: stats.active.length, sub: `${stats.total} total`, color: "text-emerald-500" },
    { label: "Outbound Ready", value: stats.outbound, sub: "dialer capacity", color: "text-sky-500" },
    { label: "Inbound Lines", value: stats.inbound, sub: "receiving", color: "text-violet-500" },
    { label: "Voice Profiles", value: stats.voiceCount, sub: `${stats.languageCount} languages`, color: "text-brand-500" },
  ];

  return (
    <div className="rounded-2xl p-5 panel-card min-w-0 bg-gradient-to-b from-white to-slate-50 dark:from-white/[0.03] dark:to-transparent">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Mic2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Voice & Number Fleet Health</h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Telephony numbers, providers & voice profile coverage
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">{healthScore}</span>
            <span className="text-xs text-slate-400">/100</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-white/40 -mt-0.5">health score</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
        {tiles.map((t) => (
          <motion.div
            key={t.label}
            whileHover={{ y: -3 }}
            className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all"
          >
            <p className={`text-xl font-black font-mono ${t.color}`}>{t.value}</p>
            <p className="text-[11px] font-semibold text-slate-700 dark:text-white/70 mt-0.5">{t.label}</p>
            <p className="text-[10px] text-slate-400 dark:text-white/40 font-mono">{t.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] text-xs">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/40 mb-2">
            Providers
          </p>
          <div className="space-y-1.5">
            {stats.providers.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-white/40">No providers configured yet.</p>
            ) : (
              stats.providers.map(([p, count]) => (
                <div key={p} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-white/70 capitalize truncate flex items-center gap-1.5">
                    <PhoneCall className="w-3 h-3 text-brand-500" /> {p}
                  </span>
                  <span className="font-mono text-slate-800 dark:text-white/80">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 ml-3 border-l border-slate-200 dark:border-white/[0.08] pl-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/40 mb-2">
            Attention
          </p>
          {stats.unassigned > 0 || stats.active.length < stats.total ? (
            <div className="space-y-1.5">
              {stats.active.length < stats.total && (
                <p className="text-[11px] text-amber-600 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> {stats.total - stats.active.length} number(s) inactive
                </p>
              )}
              {stats.unassigned > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> {stats.unassigned} number(s) unassigned
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
              All numbers active & assigned. Fleet is healthy.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] text-[11px]">
        <span className="text-slate-400 dark:text-white/40 font-mono">
          {stats.languages.size ? Array.from(stats.languages).join(" · ") : "Voice languages not set"}
        </span>
        <Link href="/dashboard/numbers" className="inline-flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-400 hover:underline">
          Manage Numbers <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}