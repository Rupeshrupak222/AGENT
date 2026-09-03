"use client";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownItem {
  label: string;
  value?: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect: (item: DropdownItem) => void;
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, items, onSelect, align = "left", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 min-w-[12rem] py-1.5 rounded-xl border animate-scale-in",
            "bg-surface-card border-line shadow-lg",
            "dark:bg-[#1a0608] dark:border-white/[0.08] dark:shadow-glass",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-1.5 border-t border-line dark:border-white/[0.06]" />
            ) : (
              <button
                key={i}
                onClick={() => {
                  if (!item.disabled) {
                    onSelect(item);
                    setOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors",
                  item.danger
                    ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    : "text-content-secondary hover:bg-surface-muted hover:text-content dark:text-white/65 dark:hover:bg-white/5 dark:hover:text-white",
                  item.disabled && "opacity-40 cursor-not-allowed"
                )}
              >
                {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function DropdownButton({
  children,
  items,
  onSelect,
  variant = "ghost",
  size = "sm",
}: {
  children: ReactNode;
  items: DropdownItem[];
  onSelect: (item: DropdownItem) => void;
  variant?: "ghost" | "outline";
  size?: "sm" | "md";
}) {
  return (
    <Dropdown
      trigger={
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-medium transition-colors rounded-lg",
            size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
            variant === "ghost"
              ? "text-content-secondary hover:bg-surface-muted hover:text-content dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
              : "border border-line text-content-secondary hover:bg-surface-muted dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
          )}
        >
          {children}
          <ChevronDown className="w-3.5 h-3.5" />
        </span>
      }
      items={items}
      onSelect={onSelect}
    />
  );
}
