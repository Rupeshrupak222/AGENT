"use client";
import { useEffect } from "react";

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only apply in browser environment
    if (typeof window === "undefined") return;

    let currentY = window.scrollY;
    let targetY = window.scrollY;
    let isRunning = false;

    function onWheel(e: WheelEvent) {
      // Do not block zoom or horizontal pinch gestures
      if (e.ctrlKey) return;
      e.preventDefault();

      targetY += e.deltaY * 0.9;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      targetY = Math.max(0, Math.min(targetY, maxScroll));

      if (!isRunning) {
        isRunning = true;
        requestAnimationFrame(updateScroll);
      }
    }

    function updateScroll() {
      const diff = targetY - currentY;
      const step = diff * 0.09; // smooth momentum easing factor
      currentY += step;
      window.scrollTo(0, Math.round(currentY));

      if (Math.abs(diff) > 0.5) {
        requestAnimationFrame(updateScroll);
      } else {
        currentY = targetY;
        window.scrollTo(0, currentY);
        isRunning = false;
      }
    }

    function onScroll() {
      if (!isRunning) {
        currentY = window.scrollY;
        targetY = window.scrollY;
      }
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <>{children}</>;
}
