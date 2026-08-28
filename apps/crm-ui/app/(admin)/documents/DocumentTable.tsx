"use client";

import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@datavex/ui-theme";
import { statusVariant } from "@/lib/utils";

interface DocumentTableProps {
  documents: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function DocumentTable({ documents, onView, onEdit, onDelete }: DocumentTableProps) {
  const columns: Column<any>[] = [
    {
      key: "id_str",
      header: "ID",
      render: (row) => <span className="text-muted-foreground">{row.id_str}</span>,
    },
    {
      key: "title",
      header: "Document",
      render: (row) => <span className="font-medium text-foreground">{row.title}</span>,
    },
    { key: "type", header: "Type" },
    { key: "account", header: "Account", hideOnMobile: true },
    { key: "size", header: "Size", hideOnMobile: true },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={statusVariant("document", row.status) as any}>{row.status}</Badge>,
    },
    { key: "owner", header: "Owner", hideOnMobile: true },
    { key: "updated_at", header: "Updated", hideOnMobile: true },
    {
      key: "actions",
      header: "",
      className: "w-20",
      render: (row) => (
        <div className="flex gap-2 text-muted-foreground">
          <Button size="icon-sm" className="hover:text-foreground cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(row); }} title="Edit"><Edit2 size={14} /></Button>
          <Button size="icon-sm" className="hover:text-destructive cursor-pointer" onClick={(e) => { e.stopPropagation(); onDelete(row); }} title="Delete"><Trash2 size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={documents}
      columns={columns}
      rowKey={(row) => row.id}
      onRowClick={(row) => onView(row)}
      emptyMessage="No documents found"
    />
  );
}
