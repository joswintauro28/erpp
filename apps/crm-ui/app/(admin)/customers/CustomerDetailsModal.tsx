"use client";

import React from "react";
import { X, Building2, ShieldCheck, DollarSign, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CustomerDetailsModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
}

const badgeVariant = (status: string) => {
  switch (status) {
    case "Active":
      return "default";
    case "Prospect":
      return "secondary";
    case "Dormant":
      return "outline";
    case "Churned":
      return "destructive";
    default:
      return "default";
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function CustomerDetailsModal({
  record,
  isOpen,
  onClose,
}: CustomerDetailsModalProps) {
  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-[var(--shell-surface)] border-[var(--shell-border)] text-[var(--shell-foreground)]">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-[var(--shell-border)] pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-[#C81D25]" />
            <DialogTitle className="text-lg font-semibold tracking-tight text-[var(--shell-foreground)]">
              Customer Details
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-[var(--shell-foreground)]">
                {record.account}
              </h3>
              <p className="text-xs text-[var(--shell-muted)] mt-1">
                ID: {record.id_str}
              </p>
            </div>
            <Badge variant={badgeVariant(record.status)} className="px-2.5 py-0.5 text-xs font-semibold">
              {record.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 border border-[var(--shell-border)] rounded-xl bg-[var(--shell-surface-alt)] p-4">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--shell-muted)] block">
                Industry
              </span>
              <span className="text-sm font-medium text-[var(--shell-foreground)]">
                {record.industry || "N/A"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--shell-muted)] block">
                Tier
              </span>
              <span className="text-sm font-medium text-[var(--shell-foreground)]">
                {record.tier || "N/A"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--shell-muted)] block">
                ARR (Annual Revenue)
              </span>
              <span className="text-sm font-semibold text-[var(--shell-foreground)] flex items-center gap-0.5">
                {formatCurrency(record.arr)}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--shell-muted)] block">
                Credit Limit
              </span>
              <span
                className={`text-sm font-semibold flex items-center gap-0.5 ${
                  record.credit_limit != null && record.credit_limit > 0
                    ? "text-[var(--shell-foreground)]"
                    : "text-emerald-600"
                }`}
                title={record.credit_limit ? "Enforced on sales order approval" : "No limit configured — orders are not blocked"}
              >
                {record.credit_limit != null && record.credit_limit > 0
                  ? `₹${Number(record.credit_limit).toLocaleString("en-IN")}`
                  : "Unlimited"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--shell-muted)] block">
                Account Owner
              </span>
              <span className="text-sm font-medium text-[var(--shell-foreground)] flex items-center gap-1">
                <User className="size-3.5 text-[var(--shell-muted)]" />
                {record.owner || "N/A"}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-[var(--shell-muted)] pt-2 border-t border-[var(--shell-border)]">
            <span>Last Updated: {record.updated_at || "N/A"}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[var(--shell-border)]">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs border-[var(--shell-border)] bg-transparent hover:bg-[var(--shell-surface-alt)] text-[var(--shell-foreground)]"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
