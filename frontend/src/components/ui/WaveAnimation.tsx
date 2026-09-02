"use client";
import { cn } from "@/lib/utils";

interface WaveProps {
  bars?: number;
  active?: boolean;
  color?: string;
  size?: "sm"|"md"|"lg";
  className?: string;
}
const sizeMap = {
  sm: { h:"h-4",  w:"w-0.5", gap:"gap-0.5" },
  md: { h:"h-8",  w:"w-1",   gap:"gap-1"   },
  lg: { h:"h-12", w:"w-1.5", gap:"gap-1"   },
};
const delays = ["0ms","90ms","180ms","270ms","360ms","270ms","180ms","90ms"];

export function WaveAnimation({ bars=8, active=true, color, size="md", className }: WaveProps) {
  const { h, w, gap } = sizeMap[size];
  // Default colour = #D42027
  const barColor = color ?? "#D42027";
  return (
    <div className={cn("flex items-center", gap, h, className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            backgroundColor: active ? barColor : "rgba(255,255,255,0.18)",
            animationDelay: active ? delays[i % delays.length] : undefined,
            animationDuration: active ? "1.3s" : undefined,
            height: active ? undefined : "30%",
          }}
          className={cn(w, "rounded-full", active && "animate-wave")}
        />
      ))}
    </div>
  );
}

export function LiveCallIndicator({ active=true }: { active?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: active ? "#4ade80" : "rgba(255,255,255,0.2)" }} />
        {active && <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-70"/>}
      </div>
      <WaveAnimation active={active} size="sm" bars={5} color={active ? "#4ade80" : undefined} />
    </div>
  );
}
