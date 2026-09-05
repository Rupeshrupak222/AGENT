"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-6">
      <EmptyState
        icon={<SearchX className="w-10 h-10 text-brand-400" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <Link href="/dashboard/overview">
            <Button variant="primary">Back to Dashboard</Button>
          </Link>
        }
      />
    </div>
  );
}
