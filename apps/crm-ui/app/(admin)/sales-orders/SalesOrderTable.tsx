"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Edit2, Trash2 } from "lucide-react";

const badgeVariant = (status: string) => {
  switch (status) {
    case "Pending": return "secondary";
    case "Confirmed": return "default";
    case "Invoiced": return "outline";
    case "Cancelled": return "destructive";
    case "Paid": return "default";
    case "Hold": return "secondary";
    case "Stock Hold": return "outline";
    default: return "default";
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

interface SalesOrderTableProps {
  salesOrders: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function SalesOrderTable({ salesOrders, onView, onEdit, onDelete }: SalesOrderTableProps) {
  if (!salesOrders?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--shell-muted)]">
        <p className="text-sm">No sales orders found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>SO NO</TableHead>
          <TableHead>ACCOUNT</TableHead>
          <TableHead>VALUE</TableHead>
          <TableHead>ETA</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {salesOrders.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell className="text-[var(--shell-muted)] cursor-pointer" onClick={() => onView(item)}>{item.id_str}</TableCell>
            <TableCell className="font-medium text-[var(--shell-foreground)] cursor-pointer" onClick={() => onView(item)}>{item.so_no}</TableCell>
            <TableCell>{item.account}</TableCell>
            <TableCell>{formatCurrency(item.value)}</TableCell>
            <TableCell>{item.eta}</TableCell>
            <TableCell><Badge variant={badgeVariant(item.status)}>{item.status}</Badge></TableCell>
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
