"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { api } from "@/services/api";
import { money } from "@/utils/format";
import type { InvoiceDetailView } from "@/types/billing";

export default function InvoiceDetail() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetailView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    api.get<InvoiceDetailView>(`/invoices/${params.id}`)
      .then(setInvoice)
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner />;

  if (!invoice) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
        <FileText className="h-12 w-12" />
        <p className="text-base font-medium text-[--shell-foreground]">Invoice not found</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/billing/invoices")}>Back to Invoices</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Back to invoices" onClick={() => router.push("/billing/invoices")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            {invoice.invoice_number}
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">{invoice.client_name}</p>
        </div>
        <Badge variant={invoice.status === "paid" ? "default" : invoice.status === "overdue" ? "destructive" : "secondary"} className="capitalize ml-auto">
          {invoice.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card><CardContent className="pt-6">
          <p className="text-xs text-[--shell-muted]">Total Amount</p>
          <p className="font-heading text-lg font-semibold text-[--shell-foreground]">{money(invoice.total)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-[--shell-muted]">Paid</p>
          <p className="font-heading text-lg font-semibold text-[--shell-success]">{money(invoice.paid_amount)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-[--shell-muted]">Balance Due</p>
          <p className="font-heading text-lg font-semibold text-[--shell-danger]">{money(invoice.balance_due)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-[--shell-muted]">Due Date</p>
          <p className="font-heading text-lg font-semibold text-[--shell-foreground]">{invoice.due_date}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">GST%</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{item.product}</TableCell>
                  <TableCell className="text-[--shell-muted] text-xs">{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{money(item.unit_price)}</TableCell>
                  <TableCell className="text-right">{item.gst_percent}%</TableCell>
                  <TableCell className="text-right font-mono text-xs">{money(item.cgst)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{money(item.sgst)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{money(item.igst)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{money(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invoice.payments.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{p.payment_date}</TableCell>
                    <TableCell className="capitalize text-xs">{p.payment_method?.replace("_", " ") ?? "-"}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{p.reference_id ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{money(p.amount)}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize text-xs">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
