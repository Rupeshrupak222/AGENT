"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Sparkles,
  TrendingUp,
  Calendar,
  Zap,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface HeatmapCell {
  day: string;
  hour: number;
  label: string;
  connectRate: number;
  totalCalls: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export function PeakHoursHeatmap() {
  const { success } = useToast();
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [isOptimized, setIsOptimized] = useState(false);

  // Generate realistic connect rate matrix based on real telecom patterns in India
  const matrix: HeatmapCell[] = [];
  DAYS.forEach((day, dIdx) => {
    HOURS.forEach((hour) => {
      let baseRate = 54;

      // Peak pickup windows: 11 AM - 1 PM and 4 PM - 7 PM on weekdays
      const isWeekday = dIdx < 5;
      const isMorningPeak = hour >= 11 && hour <= 12;
      const isEveningPeak = hour >= 16 && hour <= 18;

      if (isWeekday) {
        if (isMorningPeak) baseRate = 78 + ((hour * 7 + dIdx * 11) % 8);
        else if (isEveningPeak) baseRate = 72 + ((hour * 5 + dIdx * 13) % 9);
        else if (hour === 14) baseRate = 42; // Post-lunch slump
        else baseRate = 58 + ((hour + dIdx) % 10);
      } else {
        // Weekends
        baseRate = hour >= 11 && hour <= 16 ? 48 : 34;
      }

      const totalCalls = Math.round(baseRate * 1.8 + (hour % 3) * 12);

      matrix.push({
        day,
        hour,
        label: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`,
        connectRate: Math.min(88, Math.max(28, baseRate)),
        totalCalls,
      });
    });
  });

  const getCellColor = (rate: number) => {
    if (rate >= 75) return "bg-emerald-500 text-white dark:bg-emerald-500/80";
    if (rate >= 65) return "bg-emerald-500/60 text-white dark:bg-emerald-500/50";
    if (rate >= 55) return "bg-amber-500/50 text-slate-900 dark:text-white dark:bg-amber-500/40";
    if (rate >= 45) return "bg-amber-500/25 text-slate-800 dark:text-white/80 dark:bg-amber-500/20";
    return "bg-slate-200/60 text-slate-600 dark:bg-white/[0.04] dark:text-white/40";
  };

  const handleApplyScheduleOptimization = () => {
    setIsOptimized(true);
    success("AI Schedule Applied: Outbound campaign dialers set to peak 11:00 AM & 4:30 PM windows!");
  };

  return (
    <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/10 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Peak Dialing Hours & Connect Rate Heatmap
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Customer answer propensity analyzed across 7-day business hours to maximize outbound connection rates
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 dark:text-white/50">
          <span>Low &lt;45%</span>
          <div className="flex gap-1">
            <span className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-white/[0.04]" />
            <span className="w-3 h-3 rounded-sm bg-amber-500/30" />
            <span className="w-3 h-3 rounded-sm bg-emerald-500/60" />
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          </div>
          <span>Peak &gt;75%</span>
        </div>
      </div>

      {/* AI Schedule Recommendation Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-brand-500/10 to-emerald-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              AI Dialing Window Recommendation
            </p>
            <p className="text-[11px] text-slate-600 dark:text-white/70 mt-0.5">
              Scheduling outbound campaigns between <strong className="text-emerald-600 dark:text-emerald-400">11:00 AM – 1:00 PM</strong> and <strong className="text-emerald-600 dark:text-emerald-400">4:30 PM – 6:30 PM</strong> yields <strong className="text-brand-600 dark:text-brand-400">+31.4%</strong> higher connect rate.
            </p>
          </div>
        </div>

        <button
          onClick={handleApplyScheduleOptimization}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
        >
          {isOptimized ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Dialing Optimized
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" /> Auto-Tune Schedules
            </>
          )}
        </button>
      </div>

      {/* Heatmap Grid Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[580px] space-y-1.5">
          {/* Time axis header */}
          <div className="grid grid-cols-12 gap-1 text-[10px] font-mono text-slate-400 dark:text-white/40 pb-1 text-center">
            <span className="text-left font-sans pl-1">Day</span>
            {HOURS.map((h) => (
              <span key={h}>{h > 12 ? `${h - 12}p` : `${h}a`}</span>
            ))}
          </div>

          {/* Day rows */}
          {DAYS.map((day) => {
            const dayCells = matrix.filter((c) => c.day === day);
            return (
              <div key={day} className="grid grid-cols-12 gap-1 items-center">
                <span className="text-xs font-semibold text-slate-700 dark:text-white/70 pl-1 font-mono">
                  {day}
                </span>
                {dayCells.map((cell) => {
                  return (
                    <motion.div
                      key={`${cell.day}-${cell.hour}`}
                      whileHover={{ scale: 1.15, zIndex: 10 }}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-7 rounded-md flex items-center justify-center text-[10px] font-mono font-bold cursor-pointer transition-shadow shadow-xs ${getCellColor(
                        cell.connectRate
                      )}`}
                    >
                      {cell.connectRate}%
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover Tooltip Details */}
      {hoveredCell && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-mono"
        >
          <div className="flex items-center gap-2 text-slate-800 dark:text-white">
            <span className="font-bold text-brand-600 dark:text-brand-400">
              {hoveredCell.day} {hoveredCell.label}
            </span>
            <span>·</span>
            <span>Connect Rate: <strong>{hoveredCell.connectRate}%</strong></span>
          </div>
          <span className="text-slate-500 dark:text-white/50">
            {hoveredCell.totalCalls} calls sampled in window
          </span>
        </motion.div>
      )}
    </div>
  );
}
