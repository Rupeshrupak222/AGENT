"use client";
import { cn } from "@/lib/utils";
import { useState, useCallback, createContext, useContext, ReactNode } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const api = {
    toast,
    success: (msg: string) => toast("success", msg),
    error: (msg: string) => toast("error", msg),
    warning: (msg: string) => toast("warning", msg),
    info: (msg: string) => toast("info", msg),
    dismiss,
  };

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle className="w-4.5 h-4.5 text-green-500" />,
    error: <AlertCircle className="w-4.5 h-4.5 text-red-500" />,
    warning: <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />,
    info: <Info className="w-4.5 h-4.5 text-blue-500" />,
  };

  const borderColors: Record<ToastType, string> = {
    success: "border-l-green-500",
    error: "border-l-red-500",
    warning: "border-l-amber-500",
    info: "border-l-blue-500",
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 w-80 px-4 py-3 rounded-xl border border-l-4 shadow-lg animate-slide-up",
              "bg-surface-card border-line",
              "dark:bg-[#1a0608] dark:border-white/[0.08] dark:shadow-glass",
              borderColors[t.type]
            )}
          >
            <span className="mt-0.5 flex-shrink-0">{icons[t.type]}</span>
            <p className="flex-1 text-sm text-content dark:text-white/85">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 p-0.5 text-content-muted hover:text-content dark:text-white/30 dark:hover:text-white/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
