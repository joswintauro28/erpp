"use client";

import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@datavex/ui-theme";
import { cn, statusVariant } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

interface OpportunityTableProps {
  opportunities: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function OpportunityTable({ opportunities, onView, onEdit, onDelete }: OpportunityTableProps) {
  const columns: Column<any>[] = [
    {
      key: "id_str",
      header: "ID",
      render: (row) => <span className="text-muted-foreground font-mono">{row.id_str.slice(0, 12)}...</span>,
    },
    {
      key: "name",
      header: "Opportunity",
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    { key: "account", header: "Account" },
    { key: "stage", header: "Stage", render: (row) => <Badge variant={statusVariant("opportunity", row.stage) as any}>{row.stage}</Badge> },
    { key: "value", header: "Value", render: (row) => formatCurrency(row.value) },
    { key: "probability", header: "Prob.", render: (row) => <span className="text-xs font-mono">{row.probability}%</span> },
    { key: "owner", header: "Owner", hideOnMobile: true },
    { key: "close_date", header: "Close Date", hideOnMobile: true, render: (row) => <span className="text-xs text-muted-foreground">{row.close_date}</span> },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (row) => (
        <div className="flex gap-2 items-center">
          <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(row); }}><Edit2 size={14} className="text-[var(--shell-brand)]" /></Button>
          <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onDelete(row); }}><Trash2 size={14} className="text-[var(--shell-danger)]" /></Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={opportunities}
      columns={columns}
      rowKey={(row) => row.id}
      onRowClick={(row) => onView(row)}
      emptyMessage="No opportunities found"
    />
  );
}
