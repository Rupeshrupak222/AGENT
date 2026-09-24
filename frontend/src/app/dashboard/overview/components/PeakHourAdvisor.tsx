"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock3 } from "lucide-react";
import type { CompanyDashboardTimeSeriesPoint } from "@/lib/api";
import { companyDashboardApi } from "@/lib/api";
import type { DashboardRange } from "@/lib/dashboard-range";
import { SectionHeader, Skeleton } from "./shared";

const HOUR_LABELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

const fmtHour = (h: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${ampm}`;
};

export function PeakHourAdvisor({ range }: { range: DashboardRange }) {
  const [points, setPoints] = useState<CompanyDashboardTimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await companyDashboardApi.get({
          from: range.from,
          to: range.to,
          granularity: "hour",
        });
        if (mounted) setPoints(res?.timeSeries ?? []);
      } catch {
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [range.from, range.to]);

  const hours = useMemo(() => {
    const volume = new Array<number>(24).fill(0);
    const connected = new Array<number>(24).fill(0);
    const misses = new Array<number>(24).fill(0);
    points.forEach((p) => {
      const d = new Date(p.bucket);
      const h = d.getHours();
      if (h >= 0 && h < 24) {
        volume[h] += p.totalCalls;
        connected[h] += p.connectedCalls;
        misses[h] += p.missedCalls;
      }
    });
    const list = HOUR_LABELS.map((h) => ({
      hour: h,
      label: fmtHour(h),
      totalCalls: volume[h],
      connected: connected[h],
      missed: misses[h],
      connectRate: volume[h] > 0 ? Math.round((connected[h] / volume[h]) * 100) : 0,
    }))
      .filter((x) => x.totalCalls > 0)
      .sort((a, b) => b.totalCalls - a.totalCalls);
    const best = list[0];
    const max = Math.max(1, ...list.map((x) => x.totalCalls));
    return { list, best, max };
  }, [points]);

  const recommendation = useMemo(() => {
    if (!hours.best) return null;
    const top3 = hours.list.slice(0, 3);
    const spread = `${top3[0]?.label} – ${top3[top3.length - 1]?.label}`;
    const connectAhead = hours.list.slice(0, 3).some((h) => h.connectRate > 65);
    return {
      heading: `Busiest window: ${spread}`,
      note: connectAhead
        ? "Top hours still hold a healthy connect rate — worth shifting more dials here."
        : "High volume hours show softer connect rates — consider pacing dials earlier in the day.",
    };
  }, [hours]);

  return (
    <div className="rounded-2xl bg-white dark:bg-modal border border-slate-200 dark:border-white/15 p-4 sm:p-5 shadow-sm min-w-0">
      <SectionHeader
        icon={<Clock3 className="w-[18px] h-[18px]" />}
        title="Peak-Call Hour Advisor"
        subtitle="Call volume by hour of day in this range"
      />

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : hours.list.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-white/50 text-center py-6">
          No hourly call data for this range. Widen the period to see patterns.
        </p>
      ) : (
        <>
          <div className="space-y-1.5 mb-3">
            {hours.list.slice(0, 5).map((h) => (
              <div key={h.hour} className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-white/50 w-14 flex-shrink-0">
                  {h.label}
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-brand-500"
                    style={{ width: `${Math.round((h.totalCalls / hours.max) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-white/80 w-10 text-right flex-shrink-0">
                  {h.totalCalls}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-white/40 w-12 text-right flex-shrink-0">
                  {h.connectRate}% conn
                </span>
              </div>
            ))}
          </div>

          {recommendation && (
            <div className="rounded-xl bg-brand-500/[0.06] border border-brand-500/20 px-3 py-2.5">
              <p className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
                {recommendation.heading}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-white/50 mt-0.5 leading-relaxed">
                {recommendation.note}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}