"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
  className?: string;
}

const STATUS_MAPS: Record<string, Record<string, StatusConfig>> = {
  invoice: {
    draft: { label: "Draft", variant: "outline" },
    sent: { label: "Sent", variant: "default" },
    paid: { label: "Paid", variant: "secondary", className: "bg-emerald-600 text-white" },
    partially_paid: { label: "Partial", variant: "default", className: "bg-amber-500 text-white" },
    overdue: { label: "Overdue", variant: "destructive" },
    void: { label: "Void", variant: "outline", className: "opacity-50" },
  },
  payment: {
    pending: { label: "Pending", variant: "outline" },
    cleared: { label: "Cleared", variant: "secondary", className: "bg-emerald-600 text-white" },
    failed: { label: "Failed", variant: "destructive" },
    refunded: { label: "Refunded", variant: "default", className: "bg-amber-500 text-white" },
  },
  lead: {
    New: { label: "New", variant: "outline" },
    Contacted: { label: "Contacted", variant: "default" },
    Qualified: { label: "Qualified", variant: "secondary", className: "bg-emerald-600 text-white" },
    Converted: { label: "Converted", variant: "secondary", className: "bg-emerald-600 text-white" },
    Lost: { label: "Lost", variant: "destructive" },
  },
  quotation: {
    draft: { label: "Draft", variant: "outline" },
    sent: { label: "Sent", variant: "default" },
    accepted: { label: "Accepted", variant: "secondary", className: "bg-emerald-600 text-white" },
    rejected: { label: "Rejected", variant: "destructive" },
    expired: { label: "Expired", variant: "outline", className: "opacity-50" },
  },
  customer: {
    Active: { label: "Active", variant: "secondary", className: "bg-emerald-600 text-white" },
    Prospect: { label: "Prospect", variant: "default" },
    Dormant: { label: "Dormant", variant: "outline" },
    Churned: { label: "Churned", variant: "destructive" },
  },
  stock: {
    in_stock: { label: "In Stock", variant: "secondary", className: "bg-emerald-600 text-white" },
    low_stock: { label: "Low", variant: "default", className: "bg-amber-500 text-white" },
    out_of_stock: { label: "Out", variant: "destructive" },
    adequate: { label: "Adequate", variant: "secondary", className: "bg-emerald-600 text-white" },
  },
  purchase_order: {
    draft: { label: "Draft", variant: "outline" },
    pending: { label: "Pending", variant: "default" },
    approved: { label: "Approved", variant: "secondary", className: "bg-blue-600 text-white" },
    ordered: { label: "Ordered", variant: "default", className: "bg-amber-500 text-white" },
    received: { label: "Received", variant: "secondary", className: "bg-emerald-600 text-white" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  },
  fulfillment: {
    pending: { label: "Pending", variant: "outline" },
    processing: { label: "Processing", variant: "default" },
    shipped: { label: "Shipped", variant: "secondary", className: "bg-blue-600 text-white" },
    delivered: { label: "Delivered", variant: "secondary", className: "bg-emerald-600 text-white" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  },
  generic: {
    active: { label: "Active", variant: "secondary", className: "bg-emerald-600 text-white" },
    inactive: { label: "Inactive", variant: "outline" },
    open: { label: "Open", variant: "default" },
    closed: { label: "Closed", variant: "outline" },
  },
};

interface StatusBadgeProps {
  /** The status value (e.g. "paid", "overdue", "Active") */
  status: string;
  /** Optional category to look up the correct status map */
  category?: string;
  /** Optional override for the label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

function findStatusConfig(status: string, category?: string): StatusConfig {
  const lower = status.toLowerCase().replace(/ /g, "_");

  // Try category-specific map first
  if (category && STATUS_MAPS[category]) {
    const config = STATUS_MAPS[category][lower];
    if (config) return config;
  }

  // Try all maps for a match
  for (const map of Object.values(STATUS_MAPS)) {
    if (map[lower]) return map[lower];
  }

  // Fallback
  return { label: status.replace(/_/g, " "), variant: "outline" };
}

/**
 * Unified status badge that renders consistent colors across all pages.
 *
 * @example
 * ```tsx
 * <StatusBadge status="paid" category="invoice" />
 * <StatusBadge status="Active" category="customer" />
 * ```
 */
export function StatusBadge({ status, category, label, className }: StatusBadgeProps) {
  const config = findStatusConfig(status, category);
  return (
    <Badge
      variant={config.variant}
      className={cn(
        "text-[10px] font-medium capitalize",
        config.className,
        className
      )}
    >
      {label || config.label}
    </Badge>
  );
}

export { STATUS_MAPS };
export type { StatusBadgeProps };
