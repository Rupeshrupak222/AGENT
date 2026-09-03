import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  count?: number;
  className?: string;
}

export function FilterChip({ label, active = false, onClick, count, className }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border",
        active
          ? "bg-brand-500/10 text-brand-600 border-brand-500/25 dark:bg-brand-500/15 dark:text-brand-400 dark:border-brand-500/35"
          : "bg-surface-muted text-content-secondary border-transparent hover:bg-surface-hover hover:text-content dark:bg-white/[0.04] dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white/70",
        className
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "text-[0.625rem] px-1 py-0 rounded-full",
            active
              ? "bg-brand-500/20 text-brand-600 dark:bg-brand-500/25 dark:text-brand-400"
              : "bg-surface-muted text-content-muted dark:bg-white/[0.06] dark:text-white/35"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
