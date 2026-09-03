import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="p-4 rounded-2xl bg-surface-muted dark:bg-white/[0.04] mb-4">
        {icon || <Inbox className="w-10 h-10 text-content-muted dark:text-white/25" />}
      </div>
      <h3 className="text-base font-semibold text-content dark:text-white">{title}</h3>
      {description && (
        <p className="text-sm text-content-secondary dark:text-white/45 mt-1 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
