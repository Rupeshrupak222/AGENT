"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0c0102] text-white antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          <ErrorState
            title="Something went wrong"
            message="An unexpected error occurred. Please try again."
            onRetry={() => reset()}
          />
        </div>
      </body>
    </html>
  );
}
