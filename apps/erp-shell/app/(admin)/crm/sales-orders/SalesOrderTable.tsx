"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Edit2, Trash2, BadgeCheck, Lock } from "lucide-react";

// "Hold" is approvable so a held order can be re-run through the approval
// pipeline once the credit exposure changes (limit raised, invoices paid).
const APPROVABLE = ["Pending", "Confirmed", "Approved", "Hold", "Stock Hold"];

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
  onApprove?: (record: any) => void;
}

export default function SalesOrderTable({ salesOrders, onView, onEdit, onDelete, onApprove }: SalesOrderTableProps) {
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
          <TableHead>ORDER NO</TableHead>
          <TableHead>ACCOUNT</TableHead>
          <TableHead>VALUE</TableHead>
          <TableHead>ETA</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>CREDIT</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {salesOrders.map((item: any) => {
          const creditStatus = item.credit_check_status || "Not Checked";
          const canApprove = APPROVABLE.includes(item.status);
          return (
          <TableRow key={item.id}>
            <TableCell className="font-semibold text-[var(--shell-brand)] hover:underline cursor-pointer" onClick={() => onView(item)}>{item.so_no}</TableCell>
            <TableCell>{item.account}</TableCell>
            <TableCell>{formatCurrency(item.value)}</TableCell>
            <TableCell>{item.eta}</TableCell>
            <TableCell><Badge variant={badgeVariant(item.status)}>{item.status}</Badge></TableCell>
            <TableCell>
              {creditStatus === "Approved" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <BadgeCheck className="h-3.5 w-3.5" /> Approved
                </span>
              ) : creditStatus === "Rejected" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500">
                  <Lock className="h-3 w-3" /> Rejected
                </span>
              ) : (
                <span className="text-[11px] text-[var(--shell-muted)]">{creditStatus}</span>
              )}
            </TableCell>
            <TableCell>{item.owner}</TableCell>
            <TableCell>
              <div className="flex gap-2 text-[var(--shell-muted)] items-center">
                {onApprove && canApprove && (
                  <Button
                    size="icon-sm"
                    title="Approve order — runs Billing credit check then publishes to Inventory (O2–O4)"
                    className="hover:text-emerald-600 cursor-pointer"
                    onClick={() => onApprove(item)}
                  >
                    <BadgeCheck size={14} />
                  </Button>
                )}
                <Button size="icon-sm" className="hover:text-[var(--shell-foreground)] cursor-pointer" onClick={() => onEdit(item)}><Edit2 size={14} /></Button>
                <Button size="icon-sm" className="hover:text-red-500 cursor-pointer" onClick={() => onDelete(item)}><Trash2 size={14} /></Button>
              </div>
            </TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
