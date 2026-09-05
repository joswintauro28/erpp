"use client";

import { Edit2, Trash2, Check, X, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@datavex/ui-theme";
import { cn, statusVariant } from "@/lib/utils";

export const formatCurrency = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
};

interface QuotationTableProps {
  quotations: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
  onFinalize: (record: any) => void;
  onApprovalDecision: (record: any, approve: boolean) => void;
}

export default function QuotationTable({ quotations, onView, onEdit, onDelete, onFinalize, onApprovalDecision }: QuotationTableProps) {
  const columns: Column<any>[] = [
    {
      key: "id",
      header: "ID",
      render: (row) => <span className="text-muted-foreground font-mono text-xs">{row.id_str}</span>,
    },
    {
      key: "account",
      header: "Client",
      render: (row) => (
        <span className="font-medium">
          {row.account}
          {row.approved_at && (
            <span className="inline-flex items-center gap-1 ml-2 text-[10px] text-[var(--shell-success)]">
              <Check className="h-3 w-3" /> Approved
            </span>
          )}
        </span>
      ),
    },
    {
      key: "quote_no",
      header: "Quote #",
      render: (row) => <span className="font-mono text-xs text-[var(--shell-muted)]">{row.quote_no || row.quote_number}</span>,
    },
    {
      key: "value",
      header: "Value",
      render: (row) => (
        <span className="font-medium">
          {typeof row.value === "string" ? row.value : formatCurrency(row.value)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={statusVariant("quotation", row.status) as any}>{row.status}</Badge>,
    },
    {
      key: "owner",
      header: "Owner",
      hideOnMobile: true,
    },
    {
      key: "valid_until",
      header: "Valid Until",
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-[var(--shell-muted)]">{row.valid_until}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-48",
      render: (row) => {
        const isDraft = row.status === "Draft";
        const isSent = row.status === "Sent" || row.status === "accepted";
        const isAccepted = row.status === "Accepted";
        const showApproval = row.approved_at === null && !isAccepted;

        return (
          <div className="flex gap-2 items-center">
            {showApproval && (
              <>
                <Button
                  size="icon-sm"
                  title="Approve quote"
                  className="text-muted-foreground hover:text-emerald-600 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onApprovalDecision(row, true); }}
                >
                  <Check size={14} />
                </Button>
                <Button
                  size="icon-sm"
                  title="Reject quote"
                  className="text-muted-foreground hover:text-red-600 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onApprovalDecision(row, false); }}
                >
                  <X size={14} />
                </Button>
              </>
            )}

            {isSent && !row.approved_at && (
              <Button
                size="icon-sm"
                title="Send to client"
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onApprovalDecision(row, true); }}
              >
                <FileText size={14} />
              </Button>
            )}

            {isAccepted && (
              <Button
                size="icon-sm"
                title="Convert to Sales Order"
                className="text-muted-foreground hover:text-emerald-600 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onFinalize(row); }}
              >
                <Check size={14} />
              </Button>
            )}

            <Button size="icon-sm" className="text-muted-foreground hover:text-foreground cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(row); }}><Edit2 size={14} /></Button>
            <Button size="icon-sm" className="text-muted-foreground hover:text-destructive cursor-pointer" onClick={(e) => { e.stopPropagation(); onDelete(row); }}><Trash2 size={14} /></Button>
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
