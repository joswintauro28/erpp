"use client";

import { Edit2, Trash2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@datavex/ui-theme";
import { cn, statusVariant } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

interface SalesOrderTableProps {
  salesOrders: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
  onApprove: (record: any) => void;
}

export default function SalesOrderTable({ salesOrders, onView, onEdit, onDelete, onApprove }: SalesOrderTableProps) {
  const columns: Column<any>[] = [
    {
      key: "id_str",
      header: "ID",
      render: (row) => <span className="text-muted-foreground font-mono text-xs">{row.id_str}</span>,
    },
    {
      key: "so_no",
      header: "SO #",
      render: (row) => <span className="font-mono text-xs font-medium">{row.so_no}</span>,
    },
    {
      key: "account",
      header: "Account",
      render: (row) => <span className="font-medium">{row.account}</span>,
    },
    { key: "status", header: "Status", render: (row) => <Badge variant={statusVariant("sales-order", row.status) as any}>{row.status}</Badge> },
    { key: "value", header: "Value", render: (row) => formatCurrency(row.value) },
    { key: "owner", header: "Owner", hideOnMobile: true },
    {
      key: "actions",
      header: "",
      className: "w-28",
      render: (row) => (
        <div className="flex gap-2 items-center">
          {row.status !== "Approved" && row.status !== "Stock Hold" && (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Approve sales order"
              className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onApprove(row); }}
            >
              <Check size={14} className="text-emerald-600" />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(row); }}><Edit2 size={14} className="text-[var(--shell-brand)]" /></Button>
          <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onDelete(row); }}><Trash2 size={14} className="text-[var(--shell-danger)]" /></Button>
        </div>
      ),
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
