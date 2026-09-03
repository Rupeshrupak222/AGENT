"use client";
import { cn, formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconBg?: string;
  format?: "number" | "raw";
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconBg = "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
  format = "number",
  className,
}: StatCardProps) {
  const display = format === "number" && typeof value === "number" ? formatNumber(value) : value;
  const up = change !== undefined && change >= 0;

  return (
    <div
      className={cn(
        "p-5 rounded-xl border transition-all duration-200",
        "bg-surface-card border-line shadow-md",
        "dark:bg-[rgba(21,3,5,0.7)] dark:border-white/[0.07] dark:shadow-glass dark:backdrop-blur-[18px]",
        "hover:border-brand-500/20 dark:hover:border-brand-500/20",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", iconBg)}>{icon}</div>
        {change !== undefined && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-semibold",
              up ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-content tracking-tight dark:text-white">
        {display}
      </p>
      <p className="text-xs mt-1 font-medium text-content-secondary dark:text-white/42">{title}</p>
      {changeLabel && (
        <p className="text-xs mt-0.5 text-content-muted dark:text-white/26">{changeLabel}</p>
      )}
    </div>
  );
}
