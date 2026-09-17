"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

import { cn } from "../../lib/utils";
import { subscribeToasts, type ToastItem } from "../../utils/toast";

// Semantic tints from --shell-* status tokens (DESIGN.md §7.3, D-11)
const ICONS: Record<ToastItem["type"], React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-[var(--shell-success)]" />,
  error: <AlertCircle className="h-4 w-4 text-[var(--shell-danger)]" />,
  info: <Info className="h-4 w-4 text-[var(--shell-info)]" />,
  warning: <AlertTriangle className="h-4 w-4 text-[var(--shell-warning)]" />,
};

const STYLES: Record<ToastItem["type"], string> = {
  success: "border-[var(--shell-success)]/20 bg-[var(--shell-success)]/5",
  error: "border-[var(--shell-danger)]/20 bg-[var(--shell-danger)]/5",
  info: "border-[var(--shell-info)]/20 bg-[var(--shell-info)]/5",
  warning: "border-[var(--shell-warning)]/20 bg-[var(--shell-warning)]/5",
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToasts((toast) => {
      setToasts((prev) => [...prev.slice(-4), toast]);
      // Auto-dismiss after 5s (errors stay a bit longer)
      const ttl = toast.type === "error" ? 7000 : 4500;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, ttl);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-overlay animate-in slide-in-from-right-2 fade-in duration-200",
            STYLES[toast.type]
          )}
        >
          <span className="mt-0.5 shrink-0">{ICONS[toast.type]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground m-0">
              {toast.title}
            </p>
            {toast.message && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground m-0 break-words">
                {toast.message}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismiss(toast.id)}
            className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
