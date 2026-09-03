"use client";
import { cn } from "@/lib/utils";
import { useState, ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange: (tabId: string) => void;
  variant?: "underline" | "pill";
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, variant = "underline", className }: TabsProps) {
  const [active, setActive] = useState(activeTab || tabs[0]?.id);

  const currentId = activeTab ?? active;

  const handleChange = (id: string) => {
    setActive(id);
    onChange(id);
  };

  if (variant === "pill") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 p-1 rounded-xl",
          "bg-surface-muted border border-line",
          "dark:bg-white/[0.04] dark:border-white/[0.06]",
          className
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
              currentId === tab.id
                ? "bg-surface-card text-content shadow-sm dark:bg-white/[0.08] dark:text-white dark:shadow-sm"
                : "text-content-secondary hover:text-content dark:text-white/50 dark:hover:text-white/80",
              tab.disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-surface-muted text-content-muted dark:bg-white/[0.06] dark:text-white/40">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("border-b border-line dark:border-white/[0.06]", className)}>
      <div className="flex gap-0 -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              currentId === tab.id
                ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-content-secondary hover:text-content hover:border-line-muted dark:text-white/50 dark:hover:text-white/80 dark:hover:border-white/10",
              tab.disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-surface-muted text-content-muted dark:bg-white/[0.06] dark:text-white/40">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
