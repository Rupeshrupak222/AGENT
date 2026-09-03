"use client";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title={title}>
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div
            className={
              variant === "danger"
                ? "p-2 rounded-xl bg-red-50 dark:bg-red-500/10"
                : "p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10"
            }
          >
            <AlertTriangle
              className={
                variant === "danger"
                  ? "w-5 h-5 text-red-500 dark:text-red-400"
                  : "w-5 h-5 text-amber-500 dark:text-amber-400"
              }
            />
          </div>
        </div>
        <p className="text-sm text-content-secondary dark:text-white/60">{message}</p>
      </div>
      <div className="flex items-center justify-end gap-3 mt-6">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          size="sm"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
