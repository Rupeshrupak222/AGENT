"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, Variants } from "framer-motion";

/**
 * Hook to detect if user has requested reduced motion.
 */
export function usePrefersReducedMotion(): boolean {
  const shouldReduce = useReducedMotion();
  return Boolean(shouldReduce);
}

// ── Timing Constants (Executive Standard) ────────────────────
export const MOTION_TIMINGS = {
  micro: 0.15,      // 120-180ms
  normal: 0.22,     // 180-280ms
  panel: 0.32,      // 280-400ms
  chart: 0.65,      // 500-900ms
  easing: [0.16, 1, 0.3, 1] as const, // Premium exponential-like easeOut
};

// ── Page Transition ──────────────────────────────────────────
export function PageTransition({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{
        duration: MOTION_TIMINGS.normal,
        ease: MOTION_TIMINGS.easing,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Fade In Primitive ─────────────────────────────────────────
export function FadeIn({
  children,
  delay = 0,
  duration = MOTION_TIMINGS.normal,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: MOTION_TIMINGS.easing }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Slide Up Primitive ────────────────────────────────────────
export function SlideUp({
  children,
  delay = 0,
  distance = 12,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: MOTION_TIMINGS.normal,
        delay,
        ease: MOTION_TIMINGS.easing,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Stagger Container & Items ────────────────────────────────
export function StaggerContainer({
  children,
  staggerInterval = 0.04,
  delayChildren = 0,
  className = "",
}: {
  children: React.ReactNode;
  staggerInterval?: number;
  delayChildren?: number;
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerInterval,
        delayChildren,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: MOTION_TIMINGS.normal,
        ease: MOTION_TIMINGS.easing,
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ── Animated Number Counter ──────────────────────────────────
export function AnimatedNumber({
  value,
  duration = 0.75,
  formatter = (n) => n.toLocaleString(),
  className = "font-mono",
}: {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
  className?: string;
}) {
  const shouldReduce = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (shouldReduce) {
      setDisplayValue(value);
      return;
    }

    let start = displayValue;
    const end = value;
    if (start === end) return;

    const startTime = performance.now();
    const durationMs = duration * 1000;

    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setDisplayValue(end);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration, shouldReduce]);

  return <span className={className}>{formatter(displayValue)}</span>;
}

// ── Live Indicator (Breathing Diode) ──────────────────────────
export function LiveIndicator({
  active = true,
  label = "LIVE",
  showLabel = true,
  color = "emerald", // "emerald" | "amber" | "rose" | "indigo" | "cyan"
  className = "",
}: {
  active?: boolean;
  label?: string;
  showLabel?: boolean;
  color?: "emerald" | "amber" | "rose" | "indigo" | "cyan";
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  const colorConfig = {
    emerald: {
      bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      dot: "bg-emerald-500",
      ping: "bg-emerald-400",
    },
    amber: {
      bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      dot: "bg-amber-500",
      ping: "bg-amber-400",
    },
    rose: {
      bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      dot: "bg-rose-500",
      ping: "bg-rose-400",
    },
    indigo: {
      bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
      dot: "bg-indigo-500",
      ping: "bg-indigo-400",
    },
    cyan: {
      bg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
      dot: "bg-cyan-500",
      ping: "bg-cyan-400",
    },
  }[color];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${colorConfig.bg} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {active && !shouldReduce && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colorConfig.ping}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${colorConfig.dot}`}
        />
      </span>
      {showLabel && <span>{label}</span>}
    </span>
  );
}

// ── Pulse Indicator ──────────────────────────────────────────
export function PulseIndicator({
  state = "active",
  className = "",
}: {
  state?: "active" | "warning" | "error" | "idle";
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  const colors = {
    active: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
    idle: "bg-slate-400",
  }[state];

  return (
    <span className={`relative flex h-2.5 w-2.5 ${className}`}>
      {state === "active" && !shouldReduce && (
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 ${colors}`}
        />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors}`} />
    </span>
  );
}

// ── Panel Expand / Collapse ──────────────────────────────────
export function PanelExpand({
  isOpen,
  children,
  className = "",
}: {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return isOpen ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            duration: MOTION_TIMINGS.panel,
            ease: MOTION_TIMINGS.easing,
          }}
          className={`overflow-hidden ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Chart Reveal Transition ──────────────────────────────────
export function ChartReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: MOTION_TIMINGS.chart,
        ease: MOTION_TIMINGS.easing,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
