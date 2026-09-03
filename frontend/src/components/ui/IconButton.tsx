import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "solid";
}

const sizeClasses = { sm: "w-8 h-8", md: "w-9 h-9", lg: "w-11 h-11" };
const iconSizes = { sm: "w-4 h-4", md: "w-[18px] h-[18px]", lg: "w-5 h-5" };

const variantClasses = {
  ghost:
    "text-content-secondary hover:bg-surface-muted hover:text-content dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white",
  outline:
    "text-content-secondary hover:bg-surface-muted hover:text-content border border-line dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white dark:border-white/10",
  solid:
    "bg-brand-500 text-white hover:bg-brand-600 shadow-md",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = "md", variant = "ghost", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
IconButton.displayName = "IconButton";
