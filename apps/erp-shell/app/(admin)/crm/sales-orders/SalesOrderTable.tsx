"use client";

import { Edit2, Trash2, BadgeCheck, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@datavex/ui-theme";
import { statusVariant } from "@/lib/utils";

const APPROVABLE = ["Pending", "Confirmed", "Approved", "Hold", "Stock Hold"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

interface SalesOrderTableProps {
  salesOrders: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
  onApprove?: (record: any) => void;
}

export default function SalesOrderTable({ salesOrders, onView, onEdit, onDelete, onApprove }: SalesOrderTableProps) {
  const columns: Column<any>[] = [
    {
      key: "so_no",
      header: "ORDER NO",
      render: (row) => <span className="font-semibold text-[var(--shell-brand)] hover:underline cursor-pointer">{row.so_no}</span>,
    },
    { key: "account", header: "ACCOUNT" },
    { key: "value", header: "VALUE", render: (row) => formatCurrency(row.value) },
    { key: "eta", header: "ETA" },
    { key: "status", header: "STATUS", render: (row) => <Badge variant={statusVariant("sales_order", row.status) as any}>{row.status}</Badge> },
    {
      key: "credit_check_status",
      header: "CREDIT",
      render: (row) => {
        const creditStatus = row.credit_check_status || "Not Checked";
        return creditStatus === "Approved" ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--shell-success)]">
            <BadgeCheck className="h-3.5 w-3.5" /> Approved
          </span>
        ) : creditStatus === "Rejected" ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--shell-danger)]">
            <Lock className="h-3 w-3" /> Rejected
          </span>
        ) : (
          <span className="text-[11px] text-[var(--shell-muted)]">{creditStatus}</span>
        );
      },
    },
    { key: "owner", header: "OWNER" },
    {
      key: "actions",
      header: "",
      className: "w-28",
      render: (row) => {
        const canApprove = APPROVABLE.includes(row.status);
        return (
          <div className="flex gap-2 items-center">
            {onApprove && canApprove && (
              <Button
                variant="ghost"
                size="icon-sm"
                title="Approve order — runs Billing credit check then publishes to Inventory"
                className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onApprove(row); }}
              >
                <BadgeCheck size={14} className="text-[var(--shell-success)]" />
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(row); }}><Edit2 size={14} className="text-[var(--shell-brand)]" /></Button>
            <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onDelete(row); }}><Trash2 size={14} className="text-[var(--shell-danger)]" /></Button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      data={salesOrders}
      columns={columns}
      rowKey={(row) => row.id}
      onRowClick={(row) => onView(row)}
      emptyMessage="No sales orders found"
    />
  );
}
