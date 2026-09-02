"use client";
import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size    = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const base = "inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.97]";

const sizes: Record<Size, string> = {
  sm: "h-8  px-3   text-xs  gap-1.5 rounded-lg",
  md: "h-10 px-5   text-sm  gap-2   rounded-xl",
  lg: "h-12 px-6   text-base gap-2  rounded-xl",
  xl: "h-14 px-8   text-base gap-2.5 rounded-2xl",
};

// Inline styles for exact #D42027 color
const styleMap: Record<Variant, React.CSSProperties> = {
  primary:   { background:"linear-gradient(135deg,#D42027 0%,#9b1219 100%)", color:"#fff", boxShadow:"0 0 24px rgba(212,32,39,0.38), 0 4px 12px rgba(0,0,0,0.3)" },
  secondary: { background:"rgba(212,32,39,0.09)", border:"1px solid rgba(212,32,39,0.35)", color:"rgba(255,255,255,0.85)" },
  ghost:     { background:"transparent", color:"rgba(255,255,255,0.6)" },
  danger:    { background:"linear-gradient(135deg,#D42027 0%,#6d0a0d 100%)", color:"#fff" },
  success:   { background:"linear-gradient(135deg,#16a34a 0%,#15803d 100%)", color:"#fff" },
};

const hoverCls: Record<Variant, string> = {
  primary:   "hover:brightness-110 hover:-translate-y-px hover:shadow-glow",
  secondary: "hover:bg-[rgba(212,32,39,0.18)] hover:border-[rgba(212,32,39,0.6)] hover:text-white",
  ghost:     "hover:bg-white/5 hover:text-white",
  danger:    "hover:brightness-110",
  success:   "hover:brightness-110",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, iconRight, children, className, style, ...props }, ref) => (
    <button
      ref={ref}
      style={{ ...styleMap[variant], ...style }}
      className={cn(base, sizes[size], hoverCls[variant], className)}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ) : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
);
Button.displayName = "Button";
