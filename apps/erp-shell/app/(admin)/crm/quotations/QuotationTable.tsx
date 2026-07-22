"use client";

import { Edit2, Trash2, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

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
}

export default function QuotationTable({ quotations, onView, onEdit, onDelete, onFinalize }: QuotationTableProps) {
  if (!quotations?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[--shell-muted]">
        <p className="text-sm">No quotations found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>QUOTE #</TableHead>
          <TableHead>ACCOUNT</TableHead>
          <TableHead>VALUE</TableHead>
          <TableHead>VALID UNTIL</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotations.map((quote: any) => (
          <TableRow key={quote.id}>
            <TableCell className="text-[--shell-muted] cursor-pointer" onClick={() => onView(quote)}>{quote.id_str}</TableCell>
            <TableCell className="font-medium text-primary cursor-pointer" onClick={() => onView(quote)}>{quote.quote_no}</TableCell>
            <TableCell>{quote.account}</TableCell>
            <TableCell>{formatCurrency(quote.value)}</TableCell>
            <TableCell>{quote.valid_until}</TableCell>
            <TableCell><Badge variant={badgeVariant(quote.status)}>{quote.status}</Badge></TableCell>
            <TableCell>{quote.owner}</TableCell>
            <TableCell>
              <div className="flex gap-2 text-[--shell-muted] items-center">
                {quote.status !== "Accepted" && quote.status !== "Converted" && (
                  <Button className="hover:text-[--shell-success] cursor-pointer" title="Finalize & Send to Sales" onClick={() => onFinalize(quote)}>
                    <CheckCircle size={14} />
                  </Button>
                )}
                <Button size="icon-sm" className="hover:text-[--shell-foreground] cursor-pointer" onClick={() => onEdit(quote)} title="Edit"><Edit2 size={14} /></Button>
                <Button size="icon-sm" className="hover:text-[--shell-danger] cursor-pointer" onClick={() => onDelete(quote)} title="Delete"><Trash2 size={14} /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
