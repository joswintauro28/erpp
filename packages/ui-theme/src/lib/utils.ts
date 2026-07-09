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
  if (s === "paid") return "default" as const;
  if (s === "pending") return "secondary" as const;
  if (s === "overdue" || s === "cancelled") return "destructive" as const;
  if (s === "partially_paid") return "outline" as const;
  return "outline" as const;
};

export const quotationStatusVariant = (s: string) => {
  if (s === "accepted") return "default" as const;
  if (s === "sent") return "secondary" as const;
  if (s === "draft") return "outline" as const;
  if (s === "rejected" || s === "expired") return "destructive" as const;
  return "outline" as const;
};

export const noteStatusVariant = (s: string) => {
  if (s === "issued") return "default" as const;
  return "outline" as const;
};
