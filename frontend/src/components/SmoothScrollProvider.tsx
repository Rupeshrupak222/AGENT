"use client";

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  // Return children directly without wheel-hijacking to ensure 100% native, zero-latency scrolling
  return <>{children}</>;
}

