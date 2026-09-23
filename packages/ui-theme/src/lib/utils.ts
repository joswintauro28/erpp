import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const money = (v: number | null | undefined) => {
  if (v === null || v === undefined || isNaN(v)) return "\u20B90";
  return `\u20B9${v.toLocaleString()}`;
};

export const lakhFormat = (v: number) => `\u20B9${(v / 100000).toFixed(1)}L`;

export const invoiceStatusVariant = (s: string) => {
  const norm = s?.toLowerCase().replace(/[\s_-]+/g, " ").trim();
  if (norm === "paid") return "success" as const;
  if (norm === "partially paid" || norm === "partially_paid" || norm === "pending") return "warning" as const;
  if (norm === "sent" || norm === "draft") return "info" as const;
  if (norm === "overdue" || norm === "cancelled" || norm === "declined" || norm === "discrepancy") return "destructive" as const;
  return "neutral" as const;
};

export const quotationStatusVariant = (s: string) => {
  const norm = s?.toLowerCase().replace(/[\s_-]+/g, " ").trim();
  if (norm === "accepted" || norm === "converted") return "success" as const;
  if (norm === "sent") return "info" as const;
  if (norm === "under review" || norm === "pending") return "warning" as const;
  if (norm === "rejected") return "destructive" as const;
  return "neutral" as const;
};

export const formatDate = (d: string | null | undefined) => {
  if (!d) return "-";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
};

export const noteStatusVariant = (s: string) => {
  const norm = s?.toLowerCase().replace(/[\s_-]+/g, " ").trim();
  if (norm === "issued" || norm === "applied" || norm === "closed" || norm === "active") return "success" as const;
  if (norm === "draft" || norm === "pending") return "warning" as const;
  if (norm === "cancelled" || norm === "void") return "destructive" as const;
  return "neutral" as const;
};

export { statusVariant, type StatusVariantKey } from "../utils/status";
