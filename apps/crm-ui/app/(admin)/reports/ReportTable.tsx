"use client";

import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { statusVariant } from "@/lib/utils";

interface ReportTableProps {
  reports: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function ReportTable({ reports, onView, onEdit, onDelete }: ReportTableProps) {
  if (!reports?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--shell-muted)]">
        <p className="text-sm">No reports found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>TITLE</TableHead>
          <TableHead>CATEGORY</TableHead>
          <TableHead>LAST RUN</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell className="text-[var(--shell-muted)] cursor-pointer" onClick={() => onView(item)}>{item.id_str}</TableCell>
            <TableCell className="font-medium text-[var(--shell-foreground)] cursor-pointer" onClick={() => onView(item)}>{item.title}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell>{item.last_run}</TableCell>
            <TableCell><Badge variant={statusVariant("report", item.status)}>{item.status}</Badge></TableCell>
            <TableCell>{item.owner}</TableCell>
            <TableCell>
              <div className="flex gap-2 text-[var(--shell-muted)]">
                <Button size="icon-sm" className="hover:text-[var(--shell-foreground)] cursor-pointer" onClick={() => onEdit(item)}><Edit2 size={14} /></Button>
                <Button size="icon-sm" className="hover:text-red-500 cursor-pointer" onClick={() => onDelete(item)}><Trash2 size={14} /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
