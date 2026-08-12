"use client";

import { Edit2, Trash2, ShoppingCart, Lock, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const badgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "Draft": return "outline";
    case "Sent": return "secondary";
    case "Under Review": return "secondary";
    case "Accepted": case "Converted": return "default";
    case "Rejected": case "Expired": return "destructive";
    default: return "outline";
  }
};

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

interface QuotationTableProps {
  quotations: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
  onFinalize: (record: any) => void;
  onApprovalDecision?: (record: any, approve: boolean) => void;
}

export default function QuotationTable({ quotations, onView, onEdit, onDelete, onFinalize, onApprovalDecision }: QuotationTableProps) {
  if (!quotations?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--shell-muted)]">
        <p className="text-sm">No quotations found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>QUOTE NO</TableHead>
          <TableHead>ACCOUNT</TableHead>
          <TableHead>VALUE</TableHead>
          <TableHead>DISCOUNT</TableHead>
          <TableHead>VALID UNTIL</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotations.map((quote: any) => {
          const approvalPending = quote.approval_status === "Pending Approval";
          const canConvert = quote.status === "Accepted";
          return (
            <TableRow key={quote.id}>
              <TableCell className="font-semibold text-[var(--shell-brand)] hover:underline cursor-pointer" onClick={() => onView(quote)}>
                <span className="flex items-center gap-1.5">
                  {quote.quote_no}
                  {approvalPending && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800 border border-amber-300">
                      <Lock className="h-2.5 w-2.5" /> Approval
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell>{quote.account}</TableCell>
              <TableCell>{formatCurrency(quote.value)}</TableCell>
              <TableCell>
                {Number(quote.discount_pct || 0) > 0 ? (
                  <span className={cn("text-xs font-semibold tabular-nums", Number(quote.discount_pct) > 15 ? "text-amber-700" : "text-emerald-600")}>
                    {Number(quote.discount_pct).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-[var(--shell-muted)]">—</span>
                )}
              </TableCell>
              <TableCell>{quote.valid_until}</TableCell>
              <TableCell><Badge variant={badgeVariant(quote.status)}>{quote.status}</Badge></TableCell>
              <TableCell>{quote.owner}</TableCell>
              <TableCell>
                <div className="flex gap-2 text-[var(--shell-muted)] items-center">
                  {approvalPending && onApprovalDecision && (
                    <>
                      <Button
                        size="icon-sm"
                        title="Approve quote (manager)"
                        className="hover:text-emerald-600 cursor-pointer"
                        onClick={() => onApprovalDecision(quote, true)}
                      >
                        <CheckCircle2 size={14} />
                      </Button>
                      <Button
                        size="icon-sm"
                        title="Reject quote"
                        className="hover:text-red-500 cursor-pointer"
                        onClick={() => onApprovalDecision(quote, false)}
                      >
                        <XCircle size={14} />
                      </Button>
                    </>
                  )}
                  <Button
                    className={cn(
                      "hover:text-[var(--shell-success)] cursor-pointer",
                      !canConvert && "opacity-40 hover:text-[var(--shell-muted)]"
                    )}
                    title={
                      canConvert
                        ? "Convert to Sales Order"
                        : quote.status === "Converted"
                          ? "Already converted"
                          : "Locked — quote must be Accepted before conversion (O1)"
                    }
                    onClick={() => canConvert && onFinalize(quote)}
                  >
                    <ShoppingCart size={14} />
                  </Button>
                  <Button size="icon-sm" className="hover:text-[var(--shell-foreground)] cursor-pointer" onClick={() => onEdit(quote)} title="Edit"><Edit2 size={14} /></Button>
                  <Button size="icon-sm" className="hover:text-[var(--shell-danger)] cursor-pointer" onClick={() => onDelete(quote)} title="Delete"><Trash2 size={14} /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
