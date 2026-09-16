"use client";

import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

let _idCounter = 0;
const DURATION_MS = 4000;
const EXIT_MS = 300;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    // Mark as exiting for fade-out animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    const exitTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, EXIT_MS);
    timers.current.set(id, exitTimer);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = ++_idCounter;
      setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
      const timer = setTimeout(() => dismiss(id), DURATION_MS);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  // Cleanup on unmount
  useEffect(() => {
    const t = timers.current;
    return () => { t.forEach(clearTimeout); t.clear(); };
  }, []);

  const toast = {
    success: (message: string) => addToast("success", message),
    error: (message: string) => addToast("error", message),
    info: (message: string) => addToast("info", message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Viewport */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: "min(380px, calc(100vw - 32px))" }}
      >
        {toasts.map((t) => (
          <ToastBanner key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastBanner({
  toast: t,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const styles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
    success: {
      bg: "bg-[var(--shell-success-surface)] dark:bg-[var(--shell-success-surface)]",
      border: "border-[var(--shell-success)]/30 dark:border-[var(--shell-success)]/30",
      icon: <CheckCircle2 className="h-4 w-4 text-[var(--shell-success)] dark:text-[var(--shell-success)] shrink-0" />,
    },
    error: {
      bg: "bg-[var(--shell-danger-surface)] dark:bg-[var(--shell-danger-surface)]",
      border: "border-[var(--shell-danger)]/30 dark:border-[var(--shell-danger)]/30",
      icon: <XCircle className="h-4 w-4 text-[var(--shell-danger)] dark:text-[var(--shell-danger)] shrink-0" />,
    },
    info: {
      bg: "bg-[var(--shell-info-surface)] dark:bg-[var(--shell-info-surface)]",
      border: "border-[var(--shell-info)]/30 dark:border-[var(--shell-info)]/30",
      icon: <Info className="h-4 w-4 text-[var(--shell-info)] dark:text-[var(--shell-info)] shrink-0" />,
    },
  };

  const s = styles[t.type];

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 ${s.bg} ${s.border} ${
        t.exiting ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"
      }`}
    >
      {s.icon}
      <p className="flex-1 text-sm font-medium text-foreground leading-snug">{t.message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="text-muted-foreground hover:text-foreground transition-colors ml-1 shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
