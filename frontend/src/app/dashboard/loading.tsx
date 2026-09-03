"use client";

import { PageSkeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-6">
      <PageSkeleton />
    </div>
  );
}
