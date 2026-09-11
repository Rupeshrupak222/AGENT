"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { ToastProvider } from "@/components/ui/Toast";

function ColorSchemeSync() {
  const { theme } = useTheme();
  React.useEffect(() => {
    // Keep native controls (selects, scrollbars, inputs) in sync with the
    // active theme instead of locking them to dark mode.
    document.documentElement.style.colorScheme =
      theme === "dark" ? "dark" : "light";
  }, [theme]);
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ColorSchemeSync />
      {children}
    </ToastProvider>
  );
}