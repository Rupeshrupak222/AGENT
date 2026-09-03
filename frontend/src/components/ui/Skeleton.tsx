import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}

const radiusMap = { sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg", full: "rounded-full" };

export function Skeleton({ className, rounded = "md" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse",
        "bg-surface-muted dark:bg-white/[0.06]",
        radiusMap[rounded],
        className
      )}
    />
  );
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "p-5 rounded-xl border",
        "bg-surface-card border-line dark:bg-[rgba(21,3,5,0.7)] dark:border-white/[0.07]",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-12 h-4 rounded-md" />
      </div>
      <Skeleton className="w-24 h-8 rounded-md mb-2" />
      <Skeleton className="w-20 h-3 rounded-md" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4, className }: { columns?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 py-4 px-4 border-b border-line dark:border-white/[0.04]", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1 rounded-md" />
      ))}
    </div>
  );
}

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 p-6", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="w-48 h-8 rounded-lg" />
        <Skeleton className="w-32 h-10 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-0 rounded-xl border bg-surface-card border-line dark:bg-[rgba(21,3,5,0.7)] dark:border-white/[0.07]">
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRowSkeleton key={i} columns={5} />
        ))}
      </div>
    </div>
  );
}
