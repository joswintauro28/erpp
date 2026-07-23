"use client";

import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const badgeVariant = (status: string) => {
  switch (status) {
    case "New": return "secondary";
    case "Qualified": return "default";
    case "In Progress": return "outline";
    case "Converted": return "default";
    case "Lost": return "destructive";
    default: return "outline";
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

interface LeadTableProps {
  leads: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function LeadTable({ leads, onView, onEdit, onDelete }: LeadTableProps) {
  if (!leads?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--shell-muted)]">
        <p className="text-sm">No leads found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>LEAD</TableHead>
          <TableHead>COMPANY</TableHead>
          <TableHead>SOURCE</TableHead>
          <TableHead>EST. VALUE</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead>UPDATED</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell className="text-[var(--shell-muted)] cursor-pointer" onClick={() => onView(item)}>{item.id_str}</TableCell>
            <TableCell className="font-medium text-[var(--shell-foreground)] cursor-pointer" onClick={() => onView(item)}>{item.name}</TableCell>
            <TableCell>{item.company}</TableCell>
            <TableCell>{item.source}</TableCell>
            <TableCell>{formatCurrency(item.est_value)}</TableCell>
            <TableCell><Badge variant={badgeVariant(item.status)}>{item.status}</Badge></TableCell>
            <TableCell>{item.owner}</TableCell>
            <TableCell className="text-[var(--shell-muted)]">{item.updated_at}</TableCell>
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
