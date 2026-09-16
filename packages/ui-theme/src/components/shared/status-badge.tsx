"use client";

import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "neutral" | "ghost" | "link";

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
  className?: string;
}

const STATUS_MAPS: Record<string, Record<string, StatusConfig>> = {
  invoice: {
    draft: { label: "Draft", variant: "outline" },
    sent: { label: "Sent", variant: "default" },
    paid: { label: "Paid", variant: "success" },
    partially_paid: { label: "Partial", variant: "warning" },
    overdue: { label: "Overdue", variant: "destructive" },
    void: { label: "Void", variant: "outline", className: "opacity-50" },
  },
  payment: {
    pending: { label: "Pending", variant: "outline" },
    cleared: { label: "Cleared", variant: "success" },
    failed: { label: "Failed", variant: "destructive" },
    refunded: { label: "Refunded", variant: "warning" },
  },
  lead: {
    new: { label: "New", variant: "outline" },
    contacted: { label: "Contacted", variant: "default" },
    qualified: { label: "Qualified", variant: "success" },
    converted: { label: "Converted", variant: "success" },
    lost: { label: "Lost", variant: "destructive" },
  },
  quotation: {
    draft: { label: "Draft", variant: "outline" },
    sent: { label: "Sent", variant: "default" },
    accepted: { label: "Accepted", variant: "success" },
    rejected: { label: "Rejected", variant: "destructive" },
    expired: { label: "Expired", variant: "outline", className: "opacity-50" },
  },
  customer: {
    active: { label: "Active", variant: "success" },
    prospect: { label: "Prospect", variant: "default" },
    dormant: { label: "Dormant", variant: "outline" },
    churned: { label: "Churned", variant: "destructive" },
  },
  stock: {
    in_stock: { label: "In Stock", variant: "success" },
    low_stock: { label: "Low", variant: "warning" },
    out_of_stock: { label: "Out", variant: "destructive" },
    adequate: { label: "Adequate", variant: "info" },
  },
  purchase_order: {
    draft: { label: "Draft", variant: "outline" },
    pending: { label: "Pending", variant: "default" },
    approved: { label: "Approved", variant: "info" },
    ordered: { label: "Ordered", variant: "warning" },
    received: { label: "Received", variant: "success" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  },
  supplier: {
    active: { label: "Active Vendor", variant: "success" },
    inactive: { label: "Inactive", variant: "outline" },
    pending: { label: "Pending", variant: "warning" },
  },
  fulfillment: {
    queued: { label: "Order Queue", variant: "neutral" },
    pending: { label: "Pending", variant: "outline" },
    processing: { label: "Processing", variant: "default" },
    reserved: { label: "Stock Reserved", variant: "info" },
    picking: { label: "Picking Items", variant: "warning" },
    packed: { label: "Packed & Ready", variant: "info" },
    dispatched: { label: "Dispatched", variant: "success" },
    delivered: { label: "Delivered", variant: "success" },
    shortage: { label: "Stock Shortage", variant: "destructive" },
    po_created: { label: "Reorder PO Active", variant: "warning" },
    completed: { label: "Completed & Billed", variant: "success" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  },
  work_order: {
    draft: { label: "Draft", variant: "outline" },
    released: { label: "Released", variant: "info" },
    in_progress: { label: "In Progress", variant: "warning" },
    completed: { label: "Completed", variant: "success" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  },
  quality_check: {
    pending: { label: "Pending", variant: "warning" },
    pass: { label: "Pass", variant: "success" },
    fail: { label: "Fail", variant: "destructive" },
    hold: { label: "Hold", variant: "info" },
  },
  serial_number: {
    in_stock: { label: "In Stock", variant: "success" },
    reserved: { label: "Reserved", variant: "info" },
    sold: { label: "Sold", variant: "default" },
    returned: { label: "Returned", variant: "warning" },
    damaged: { label: "Damaged", variant: "destructive" },
  },
  reconciliation: {
    matched: { label: "Matched", variant: "success" },
    partial_match: { label: "Partial", variant: "warning" },
    duplicate: { label: "Duplicate", variant: "destructive" },
    unmatched: { label: "Unmatched", variant: "outline" },
  },
  generic: {
    active: { label: "Active", variant: "success" },
    inactive: { label: "Inactive", variant: "outline" },
    open: { label: "Open", variant: "default" },
    closed: { label: "Closed", variant: "outline" },
  },
};

interface StatusBadgeProps {
  status: string;
  category?: string;
  label?: string;
  variant?: BadgeVariant;
  className?: string;
}

function findStatusConfig(status: string, category?: string, overrideVariant?: BadgeVariant): StatusConfig {
  const lower = status.toLowerCase().replace(/ /g, "_");

  let config: StatusConfig = { label: status.replace(/_/g, " "), variant: "outline" };

  if (category && STATUS_MAPS[category] && STATUS_MAPS[category][lower]) {
    config = { ...STATUS_MAPS[category][lower] };
  } else {
    for (const map of Object.values(STATUS_MAPS)) {
      if (map[lower]) {
        config = { ...map[lower] };
        break;
      }
    }
  }

  if (overrideVariant) {
    config.variant = overrideVariant;
  }

  return config;
}

/**
 * Theme-aware status badge. Maps status strings to the correct
 * Badge variant (success/warning/info/destructive) so colors
 * automatically adapt to the current branding and theme.
 *
 * @example
 * ```tsx
 * <StatusBadge status="paid" category="invoice" />
 * <StatusBadge status="Active" category="customer" />
 * ```
 */
export function StatusBadge({ status, category, label, variant, className }: StatusBadgeProps) {
  const config = findStatusConfig(status, category, variant);
  return (
    <Badge
      variant={config.variant}
      className={cn(
        "text-[10px] font-medium capitalize",
        config.className,
        className,
      )}
    >
      {label || config.label}
    </Badge>
  );
}

export { STATUS_MAPS };
export type { StatusBadgeProps };
