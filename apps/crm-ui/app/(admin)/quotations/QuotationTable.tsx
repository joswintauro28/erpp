"use client";

import { Edit2, Trash2, ShoppingCart, Lock, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, StatusBadge, type Column } from "@datavex/ui-theme";
import { cn, statusVariant } from "@/lib/utils";

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

interface QuotationTableProps {
  quotations: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
  onFinalize: (record: any) => void;
  onApprovalDecision?: (record: any, approve: boolean) => void;
}

export default function QuotationTable({ quotations, onView, onEdit, onDelete, onFinalize, onApprovalDecision }: QuotationTableProps) {
  const columns: Column<any>[] = [
    {
      key: "quote_no",
      header: "QUOTE NO",
      render: (row) => {
        const approvalPending = row.approval_status === "Pending Approval";
        return (
          <span className="font-semibold text-[var(--shell-brand)] hover:underline cursor-pointer flex items-center gap-1.5">
            {row.quote_no || row.quote_number}
            {approvalPending && (
              <StatusBadge status="pending" category="quotation" label="Approval" />
            )}
          </span>
        );
      },
    },
    { key: "account", header: "ACCOUNT" },
    { key: "value", header: "VALUE", render: (row) => formatCurrency(row.value || row.total) },
    {
      key: "discount_pct",
      header: "DISCOUNT",
      render: (row) => (
        Number(row.discount_pct || 0) > 0 ? (
          <span className={cn("text-xs font-semibold tabular-nums", Number(row.discount_pct) > 15 ? "text-[var(--shell-warning)]" : "text-[var(--shell-success)]")}>
            {Number(row.discount_pct).toFixed(1)}%
          </span>
        ) : (
          <span className="text-[var(--shell-muted)]">—</span>
        )
      ),
    },
    { key: "valid_until", header: "VALID UNTIL" },
    { key: "status", header: "STATUS", render: (row) => <Badge variant={statusVariant("quotation", row.status) as any}>{row.status}</Badge> },
    { key: "owner", header: "OWNER" },
    {
      key: "actions",
      header: "",
      className: "w-40",
      render: (row) => {
        const approvalPending = row.approval_status === "Pending Approval";
        const canConvert = row.status === "Accepted";

        return (
          <div className="flex gap-2 text-[var(--shell-muted)] items-center">
            {approvalPending && onApprovalDecision && (
              <>
                <Button
                  size="icon-sm"
                  title="Approve quote (manager)"
                  className="hover:text-[var(--shell-success)] cursor-pointer"
                  onClick={() => onApprovalDecision(row, true)}
                >
                  <CheckCircle2 size={14} />
                </Button>
                <Button
                  size="icon-sm"
                  title="Reject quote"
                  className="hover:text-[var(--shell-danger)] cursor-pointer"
                  onClick={() => onApprovalDecision(row, false)}
                >
                  <XCircle size={14} />
                </Button>
              </>
            )}
            <Button
              className={cn(
                "hover:text-[var(--shell-success)] cursor-pointer",
                !canConvert && "opacity-40 hover:text-[var(--shell-muted)]"
              )}
              title={
                canConvert
                  ? "Convert to Sales Order"
                  : row.status === "Converted"
                    ? "Already converted"
                    : "Locked — quote must be Accepted before conversion"
              }
              onClick={() => canConvert && onFinalize(row)}
            >
              <ShoppingCart size={14} />
            </Button>
            <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(row); }} title="Edit"><Edit2 size={14} className="text-[var(--shell-brand)]" /></Button>
            <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onDelete(row); }} title="Delete"><Trash2 size={14} className="text-[var(--shell-danger)]" /></Button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      data={quotations}
      columns={columns}
      rowKey={(row) => row.id}
      onRowClick={(row) => onView(row)}
      emptyMessage="No quotations found"
    />
  );
}
