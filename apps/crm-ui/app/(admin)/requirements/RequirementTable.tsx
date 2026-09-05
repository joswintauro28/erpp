"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@datavex/ui-theme";
import { Edit2, Trash2 } from "lucide-react";
import { statusVariant } from "@/lib/utils";

const priorityVariant = (priority: string) => {
  switch (priority) {
    case "High": return "destructive";
    case "Medium": return "secondary";
    case "Low": return "outline";
    default: return "outline";
  }
};

interface RequirementTableProps {
  requirements: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function RequirementTable({ requirements, onView, onEdit, onDelete }: RequirementTableProps) {
  const columns: Column<any>[] = [
    {
      key: "id_str",
      header: "ID",
      render: (row) => <span className="text-muted-foreground">{row.id_str}</span>,
    },
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="font-medium text-foreground">{row.name}</span>,
    },
    { key: "category", header: "Category" },
    { key: "account", header: "Account" },
    {
      key: "priority",
      header: "Priority",
      render: (row) => <Badge variant={priorityVariant(row.priority) as any}>{row.priority}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={statusVariant("requirement", row.status) as any}>{row.status}</Badge>,
    },
    { key: "owner", header: "Owner", hideOnMobile: true },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (row) => (
        <div className="flex gap-2">
                <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(row); }} title="Edit"><Edit2 size={14} className="text-[var(--shell-brand)]" /></Button>
                <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onDelete(row); }} title="Delete"><Trash2 size={14} className="text-[var(--shell-danger)]" /></Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={requirements}
      columns={columns}
      rowKey={(row) => row.id}
      onRowClick={(row) => onView(row)}
      emptyMessage="No requirements found"
    />
  );
}
