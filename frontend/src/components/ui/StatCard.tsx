"use client";
import { cn, formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconColor?: string;
  format?: "number"|"raw";
  className?: string;
}

export function StatCard({ title, value, change, changeLabel, icon, iconColor="#D42027", format="number", className }: StatCardProps) {
  const display = format==="number" && typeof value==="number" ? formatNumber(value) : value;
  const up = change !== undefined && change >= 0;
  const TI = change !== undefined ? (up ? TrendingUp : TrendingDown) : null;
  return (
    <div
      style={{
        background:"linear-gradient(135deg,rgba(255,255,255,0.045) 0%,rgba(212,32,39,0.022) 100%)",
        border:"1px solid rgba(255,255,255,0.07)",
        backdropFilter:"blur(18px)",
        boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
        borderRadius:"1rem",
      }}
      className={cn("p-5 transition-all duration-300 hover:border-[rgba(212,32,39,0.22)]", className)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl" style={{ background:"rgba(212,32,39,0.15)", color: iconColor }}>
          {icon}
        </div>
        {TI && (
          <span className={cn("flex items-center gap-1 text-xs font-semibold", up?"text-green-400":"text-red-400")}>
            <TI className="w-3.5 h-3.5"/>{Math.abs(change!).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-white tracking-tight">{display}</p>
      <p className="text-xs mt-1 font-medium" style={{ color:"rgba(255,255,255,0.42)" }}>{title}</p>
      {changeLabel && <p className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.26)" }}>{changeLabel}</p>}
    </div>
  );
}
