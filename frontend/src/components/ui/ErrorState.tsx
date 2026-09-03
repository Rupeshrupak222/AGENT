import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  icon?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  icon,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 mb-4">
        {icon || <AlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400" />}
      </div>
      <h3 className="text-base font-semibold text-content dark:text-white">{title}</h3>
      <p className="text-sm text-content-secondary dark:text-white/45 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 px-4 py-2 text-sm font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
