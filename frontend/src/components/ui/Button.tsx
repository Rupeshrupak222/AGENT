"use client";
import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "xs" | "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const base =
  "inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.97] select-none whitespace-nowrap";

const sizes: Record<Size, string> = {
  xs: "h-7  px-2.5 text-[0.6875rem] gap-1 rounded-md",
  sm: "h-8  px-3   text-xs  gap-1.5 rounded-lg",
  md: "h-10 px-5   text-sm  gap-2   rounded-xl",
  lg: "h-12 px-6   text-base gap-2  rounded-xl",
  xl: "h-14 px-8   text-base gap-2.5 rounded-2xl",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md hover:shadow-lg hover:brightness-110 hover:-translate-y-px",
  secondary:
    "bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-100 hover:border-brand-300 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/30 dark:hover:bg-brand-500/20 dark:hover:border-brand-500/50",
  outline:
    "border border-line bg-transparent text-content-secondary hover:bg-surface-muted hover:text-content dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white",
  ghost:
    "bg-transparent text-content-secondary hover:bg-surface-muted hover:text-content dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white",
  danger:
    "bg-gradient-to-br from-red-600 to-red-800 text-white shadow-md hover:shadow-lg hover:brightness-110",
  success:
    "bg-gradient-to-br from-green-600 to-green-700 text-white shadow-md hover:shadow-lg hover:brightness-110",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      icon,
      iconRight,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
      {!loading && iconRight}
    </button>
  )
);
Button.displayName = "Button";
