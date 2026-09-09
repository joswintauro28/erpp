"use client";

import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { statusVariant } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

interface OpportunityTableProps {
  opportunities: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function OpportunityTable({ opportunities, onView, onEdit, onDelete }: OpportunityTableProps) {
  if (!opportunities?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--shell-muted)]">
        <p className="text-sm">No opportunities found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>DEAL</TableHead>
          <TableHead>ACCOUNT</TableHead>
          <TableHead>VALUE</TableHead>
          <TableHead>PROBABILITY</TableHead>
          <TableHead>CLOSE DATE</TableHead>
          <TableHead>STAGE</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {opportunities.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell className="text-[var(--shell-muted)] cursor-pointer" onClick={() => onView(item)}>{item.id_str}</TableCell>
            <TableCell className="font-medium text-[var(--shell-foreground)] cursor-pointer" onClick={() => onView(item)}>{item.name}</TableCell>
            <TableCell>{item.account}</TableCell>
            <TableCell>{formatCurrency(item.value)}</TableCell>
            <TableCell>{item.probability}</TableCell>
            <TableCell>{item.close_date}</TableCell>
            <TableCell><Badge variant={statusVariant("opportunity", item.stage)}>{item.stage}</Badge></TableCell>
            <TableCell>{item.owner}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={() => onEdit(item)}><Edit2 size={14} className="text-[var(--shell-brand)]" /></Button>
                <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={() => onDelete(item)}><Trash2 size={14} className="text-[var(--shell-danger)]" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
