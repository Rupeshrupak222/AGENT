"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-xl border border-white/10 bg-white/5 ${className || ""}`} />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
      aria-label="Toggle theme"
      className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 border ${
        isDark
          ? "bg-white/[0.05] border-white/10 text-amber-300 hover:bg-white/[0.1] hover:border-amber-400/40"
          : "bg-black/[0.05] border-black/10 text-slate-700 hover:bg-black/[0.1] hover:border-slate-400/40"
      } ${className || ""}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
