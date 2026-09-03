import { cn } from "@/lib/utils";

type Status = "active" | "paused" | "draft" | "training" | "archived" | "online" | "offline" | "busy";

interface StatusIndicatorProps {
  status: Status;
  size?: "sm" | "md";
  label?: string;
  className?: string;
}

const statusConfig: Record<Status, { color: string; pulse?: boolean }> = {
  active:   { color: "bg-green-500", pulse: true },
  online:   { color: "bg-green-500", pulse: true },
  paused:   { color: "bg-amber-500" },
  busy:     { color: "bg-orange-500" },
  draft:    { color: "bg-gray-400 dark:bg-white/30" },
  training: { color: "bg-blue-500", pulse: true },
  archived: { color: "bg-gray-300 dark:bg-white/15" },
  offline:  { color: "bg-gray-400 dark:bg-white/25" },
};

const statusLabels: Record<Status, string> = {
  active: "Active",
  paused: "Paused",
  draft: "Draft",
  training: "Training",
  archived: "Archived",
  online: "Online",
  offline: "Offline",
  busy: "Busy",
};

export function StatusIndicator({ status, size = "sm", label, className }: StatusIndicatorProps) {
  const cfg = statusConfig[status] || statusConfig.draft;
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("relative flex-shrink-0 rounded-full", cfg.color, dotSize)}>
        {cfg.pulse && (
          <span
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-75",
              cfg.color
            )}
          />
        )}
      </span>
      <span className="text-xs text-content-secondary dark:text-white/55">
        {label || statusLabels[status] || status}
      </span>
    </span>
  );
}
