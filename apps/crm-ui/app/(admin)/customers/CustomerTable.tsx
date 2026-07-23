"use client";

import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const badgeVariant = (status: string) => {
  switch (status) {
    case "Active": return "default";
    case "Prospect": return "secondary";
    case "Dormant": return "outline";
    case "Churned": return "destructive";
    default: return "default";
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

interface CustomerTableProps {
  customers: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function CustomerTable({ customers, onView, onEdit, onDelete }: CustomerTableProps) {
  if (!customers?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--shell-muted)]">
        <p className="text-sm">No customers found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>ACCOUNT</TableHead>
          <TableHead>INDUSTRY</TableHead>
          <TableHead>TIER</TableHead>
          <TableHead>ARR</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead>UPDATED</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell className="text-[var(--shell-muted)] cursor-pointer" onClick={() => onView(item)}>{item.id_str}</TableCell>
            <TableCell className="font-medium text-[var(--shell-foreground)] cursor-pointer" onClick={() => onView(item)}>{item.account}</TableCell>
            <TableCell>{item.industry}</TableCell>
            <TableCell>{item.tier}</TableCell>
            <TableCell>{formatCurrency(item.arr)}</TableCell>
            <TableCell><Badge variant={badgeVariant(item.status)}>{item.status}</Badge></TableCell>
            <TableCell>{item.owner}</TableCell>
            <TableCell className="text-[var(--shell-muted)]">{item.updated_at}</TableCell>
            <TableCell>
              <div className="flex gap-2 text-[var(--shell-muted)]">
                <Button size="icon-sm" className="hover:text-[var(--shell-foreground)] cursor-pointer" onClick={() => onEdit(item)} title="Edit"><Edit2 size={14} /></Button>
                <Button size="icon-sm" className="hover:text-[var(--shell-danger)] cursor-pointer" onClick={() => onDelete(item)} title="Delete"><Trash2 size={14} /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
