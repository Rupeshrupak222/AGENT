import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant =
  | "default"
  | "brand"
  | "red"
  | "success"
  | "green"
  | "warning"
  | "yellow"
  | "error"
  | "info"
  | "blue"
  | "purple"
  | "orange"
  | "cyan"
  | "gray"
  | "outline";

// Alias old variant names to new semantic names for backward compatibility
const VARIANT_ALIAS: Record<string, BadgeVariant> = {
  red: "brand",
  green: "success",
  yellow: "warning",
  blue: "info",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  size?: "sm" | "md";
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-500/14 dark:text-brand-400 dark:border-brand-500/32",
  brand:
    "bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-500/18 dark:text-brand-400 dark:border-brand-500/40",
  // Aliases
  red: "bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-500/18 dark:text-brand-400 dark:border-brand-500/40",
  success:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/12 dark:text-green-400 dark:border-green-500/30",
  green: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/12 dark:text-green-400 dark:border-green-500/30",
  warning:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/12 dark:text-amber-400 dark:border-amber-500/30",
  yellow: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/12 dark:text-amber-400 dark:border-amber-500/30",
  error:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/12 dark:text-red-400 dark:border-red-500/30",
  info:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/12 dark:text-blue-400 dark:border-blue-500/30",
  blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/12 dark:text-blue-400 dark:border-blue-500/30",
  purple:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/12 dark:text-purple-400 dark:border-purple-500/30",
  orange:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/12 dark:text-orange-400 dark:border-orange-500/30",
  cyan:
    "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/12 dark:text-cyan-400 dark:border-cyan-500/30",
  gray:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-white/40 dark:border-white/10",
  outline:
    "bg-transparent text-content-secondary border-line dark:text-white/60 dark:border-white/15",
};

export function Badge({
  variant = "default",
  dot = false,
  size = "sm",
  children,
  className,
  ...props
}: BadgeProps) {
  const resolvedVariant = (VARIANT_ALIAS[variant] as BadgeVariant | undefined) || variant;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold leading-tight border",
        size === "sm" ? "px-2 py-[2px] text-[0.6875rem]" : "px-2.5 py-1 text-xs",
        variantStyles[resolvedVariant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full flex-shrink-0",
            variant === "success" && "bg-green-500",
            variant === "warning" && "bg-amber-500",
            variant === "error" && "bg-red-500",
            variant === "info" && "bg-blue-500",
            variant === "red" && "bg-brand-500",
            (variant === "default" || variant === "brand" || variant === "green" || variant === "yellow" || variant === "blue") && "bg-current",
            variant === "purple" && "bg-purple-500",
            variant === "orange" && "bg-orange-500",
            variant === "cyan" && "bg-cyan-500",
            variant === "gray" && "bg-gray-400 dark:bg-white/40",
            variant === "outline" && "bg-content-muted dark:bg-white/30"
          )}
        />
      )}
      {children}
    </span>
  );
}
