"use client";
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
  padding?: "none"|"sm"|"md"|"lg";
}
const pad = { none:"", sm:"p-4", md:"p-6", lg:"p-8" };

export function Card({ hover=false, glow=false, padding="md", children, className, style, ...props }: CardProps) {
  return (
    <div
      style={{
        background:"linear-gradient(135deg,rgba(255,255,255,0.045) 0%,rgba(212,32,39,0.022) 100%)",
        border:"1px solid rgba(255,255,255,0.07)",
        backdropFilter:"blur(18px)",
        WebkitBackdropFilter:"blur(18px)",
        boxShadow: glow
          ? "0 0 40px rgba(212,32,39,0.28),0 8px 32px rgba(0,0,0,0.55)"
          : "0 8px 32px rgba(0,0,0,0.50)",
        borderRadius:"1rem",
        ...style,
      }}
      className={cn(
        "transition-all duration-300",
        hover && "hover:-translate-y-0.5 hover:border-[rgba(212,32,39,0.22)]",
        pad[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between mb-4", className)} {...p}>{children}</div>;
}
export function CardTitle({ children, className, ...p }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold text-white", className)} {...p}>{children}</h3>;
}
