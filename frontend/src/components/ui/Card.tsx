"use client";
import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const pad = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, glow = false, padding = "md", children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border transition-all duration-200",
        "bg-surface-card border-line",
        "dark:shadow-glass dark:backdrop-blur-[18px]",
        "shadow-md",
        hover && "hover:-translate-y-0.5 hover:border-brand-500/20 dark:hover:border-brand-500/20",
        glow && "shadow-brand/20 dark:shadow-brand/30",
        pad[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";

export function CardHeader({ children, className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)} {...p}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...p }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold text-content dark:text-white", className)} {...p}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...p }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-content-secondary dark:text-white/50", className)} {...p}>
      {children}
    </p>
  );
}
