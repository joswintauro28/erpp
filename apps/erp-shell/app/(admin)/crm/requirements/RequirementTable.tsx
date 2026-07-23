"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Edit2, Trash2 } from "lucide-react";

const priorityVariant = (priority: string) => {
  switch (priority) {
    case "High": return "destructive";
    case "Medium": return "secondary";
    case "Low": return "outline";
    default: return "outline";
  }
};

const statusVariant = (status: string) => {
  switch (status) {
    case "Draft": return "outline";
    case "Submitted": return "secondary";
    case "Approved": return "default";
    default: return "default";
  }
};

interface RequirementTableProps {
  requirements: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function RequirementTable({ requirements, onView, onEdit, onDelete }: RequirementTableProps) {
  if (!requirements?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--shell-muted)]">
        <p className="text-sm">No requirements found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>NAME</TableHead>
          <TableHead>CATEGORY</TableHead>
          <TableHead>ACCOUNT</TableHead>
          <TableHead>PRIORITY</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requirements.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell className="text-[var(--shell-muted)] cursor-pointer" onClick={() => onView(item)}>{item.id_str}</TableCell>
            <TableCell className="font-medium text-[var(--shell-foreground)] cursor-pointer" onClick={() => onView(item)}>{item.name}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell>{item.account}</TableCell>
            <TableCell><Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge></TableCell>
            <TableCell><Badge variant={statusVariant(item.status)}>{item.status}</Badge></TableCell>
            <TableCell>{item.owner}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button size="icon-sm" className="text-[var(--shell-muted)] hover:text-[var(--shell-foreground)]" onClick={() => onEdit(item)} title="Edit"><Edit2 size={14} /></Button>
                <Button size="icon-sm" className="text-[var(--shell-muted)] hover:text-destructive" onClick={() => onDelete(item)} title="Delete"><Trash2 size={14} /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
