"use client";

export interface ToastItem {
  id: number;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
}

type Listener = (toast: ToastItem) => void;

let listeners: Listener[] = [];
let nextId = 1;

export function subscribeToasts(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function pushToast(
  type: ToastItem["type"],
  title: string,
  message?: string
): number {
  const item: ToastItem = { id: nextId++, type, title, message };
  listeners.forEach((l) => l(item));
  return item.id;
}

export const toastSuccess = (title: string, message?: string) =>
  pushToast("success", title, message);
export const toastError = (title: string, message?: string) =>
  pushToast("error", title, message);
export const toastInfo = (title: string, message?: string) =>
  pushToast("info", title, message);
export const toastWarning = (title: string, message?: string) =>
  pushToast("warning", title, message);

/** Extract a readable message from an unknown error (ApiClientError, Error, string). */
export function errorMessage(err: unknown, fallback = "Request failed."): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  const anyErr = err as any;
  const detail = anyErr?.detail ?? anyErr?.message ?? anyErr?.error;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "object" && first && (first as any).message) {
      return String((first as any).message);
    }
  }
  return fallback;
}
