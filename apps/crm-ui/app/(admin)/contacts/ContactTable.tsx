"use client";

import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@datavex/ui-theme";
import { statusVariant } from "@/lib/utils";

interface ContactTableProps {
  contacts: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function ContactTable({ contacts, onView, onEdit, onDelete }: ContactTableProps) {
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
    { key: "role", header: "Role", hideOnMobile: true },
    { key: "account", header: "Account" },
    { key: "email", header: "Email", hideOnMobile: true },
    { key: "phone", header: "Phone", hideOnMobile: true },
    {
      key: "type",
      header: "Type",
      render: (row) => <Badge variant={statusVariant("contact", row.type) as any}>{row.type}</Badge>,
    },
    { key: "last_contact", header: "Last Contact", hideOnMobile: true },
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
      data={contacts}
      columns={columns}
      rowKey={(row) => row.id}
      onRowClick={(row) => onView(row)}
      emptyMessage="No contacts found"
    />
  );
}
