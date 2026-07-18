"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Send, Ban, CreditCard, Loader2,
  Calendar, MapPin, Receipt, Hash, Building2, FileSignature, ScrollText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { api } from "@/services/api";
import { money, formatDate } from "@/utils/format";
import type { InvoiceDetailView } from "@/types/billing";

const statusVariant = (s: string) => {
  if (s === "paid") return "default" as const;
  if (s === "sent" || s === "pending") return "secondary" as const;
  if (s === "overdue") return "destructive" as const;
  return "outline" as const;
};

const statusActions: Record<string, string[]> = {
  draft: ["sent", "void"],
  sent: ["void"],
  partially_paid: ["void"],
  overdue: [],
  paid: [],
  void: [],
};

export default function InvoiceDetail() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [paySaving, setPaySaving] = useState(false);

  const loadInvoice = useCallback(() => {
    if (!params.id) return;
    setLoading(true);
    api.get<InvoiceDetailView>(`/invoices/${params.id}`)
      .then(setInvoice)
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  const handleStatusChange = async (status: string) => {
    setActionLoading(status);
    try {
      await api.put(`/invoices/${params.id}/status`, { status });
      loadInvoice();
    } catch { /* handled */ } finally {
      setActionLoading("");
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaySaving(true);
    try {
      await api.post("/payments", {
        invoice_id: Number(params.id),
        amount: Number(payAmount),
        payment_method: payMethod,
      });
      setPayOpen(false);
      setPayAmount("");
      loadInvoice();
    } catch { /* handled */ } finally {
      setPaySaving(false);
    }
  };

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

  const actions = statusActions[invoice.status] ?? [];
  const gst = invoice.cgst + invoice.sgst + invoice.igst;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Back to invoices" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground] truncate">
              {invoice.invoice_number}
            </h1>
            <Badge variant={statusVariant(invoice.status)} className="capitalize shrink-0">
              {invoice.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-[--shell-muted] truncate">{invoice.client_name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions.includes("sent") && (
            <Button size="sm" onClick={() => handleStatusChange("sent")} disabled={actionLoading === "sent"}>
              {actionLoading === "sent" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              Mark Sent
            </Button>
          )}
          {actions.includes("void") && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange("void")} disabled={actionLoading === "void"}>
              {actionLoading === "void" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Ban className="mr-1 h-4 w-4" />}
              Void
            </Button>
          )}
        </div>
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
          <p className="font-heading text-lg font-semibold text-[--shell-foreground]">{formatDate(invoice.due_date)}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <Calendar className="h-4 w-4 text-[--shell-accent]" />
          <div><p className="text-xs text-[--shell-muted]">Issue Date</p><p className="text-sm font-medium">{formatDate(invoice.issue_date)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <MapPin className="h-4 w-4 text-[--chart-3]" />
          <div><p className="text-xs text-[--shell-muted]">Place of Supply</p><p className="text-sm font-medium">{invoice.place_of_supply || "-"}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <Receipt className="h-4 w-4 text-[--chart-2]" />
          <div><p className="text-xs text-[--shell-muted]">GST Treatment</p><p className="text-sm font-medium capitalize">{invoice.gst_treatment?.replace("_", " ") ?? "-"}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <Building2 className="h-4 w-4 text-[--chart-4]" />
          <div><p className="text-xs text-[--shell-muted]">Type</p><p className="text-sm font-medium capitalize">{invoice.type?.replace("_", " ") ?? "Receivable"}</p></div>
        </CardContent></Card>
      </div>

      {(invoice.status === "sent" || invoice.status === "partially_paid" || invoice.status === "overdue") && invoice.balance_due > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[--shell-accent]/20 bg-gradient-to-r from-[--shell-accent]/5 to-transparent px-5 py-3">
          <span className="text-sm text-[--shell-muted]">
            Outstanding: <strong className="text-[--shell-foreground]">{money(invoice.balance_due)}</strong>
          </span>
          <Button size="sm" className="ml-auto" onClick={() => setPayOpen(true)}>
            <CreditCard className="mr-1 h-4 w-4" /> Register Payment
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-16">Qty</TableHead>
                <TableHead className="text-right w-24">Rate</TableHead>
                <TableHead className="text-right w-16">GST%</TableHead>
                <TableHead className="text-right w-20">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs text-[--shell-muted]">{i + 1}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{item.description}</p>
                    {item.product && <p className="text-xs text-[--shell-muted]">{item.product}</p>}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{money(item.unit_price)}</TableCell>
                  <TableCell className="text-right">{item.gst_percent}%</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{money(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableBody>
              {invoice.discount > 0 && (
                <TableRow>
                  <TableCell colSpan={4} />
                  <TableCell className="text-xs text-[--shell-muted] text-right">Discount</TableCell>
                  <TableCell className="text-right font-mono text-sm text-[--shell-danger]">
                    -{money(invoice.discount)}
                  </TableCell>
                </TableRow>
              )}
              {invoice.cgst > 0 && (
                <TableRow>
                  <TableCell colSpan={4} />
                  <TableCell className="text-xs text-[--shell-muted] text-right">CGST @{invoice.items[0]?.gst_percent ? (Number(invoice.items[0].gst_percent) / 2) : 0}%</TableCell>
                  <TableCell className="text-right font-mono text-xs">{money(invoice.cgst)}</TableCell>
                </TableRow>
              )}
              {invoice.sgst > 0 && (
                <TableRow>
                  <TableCell colSpan={4} />
                  <TableCell className="text-xs text-[--shell-muted] text-right">SGST @{invoice.items[0]?.gst_percent ? (Number(invoice.items[0].gst_percent) / 2) : 0}%</TableCell>
                  <TableCell className="text-right font-mono text-xs">{money(invoice.sgst)}</TableCell>
                </TableRow>
              )}
              {invoice.igst > 0 && (
                <TableRow>
                  <TableCell colSpan={4} />
                  <TableCell className="text-xs text-[--shell-muted] text-right">IGST @{invoice.items[0]?.gst_percent ?? 0}%</TableCell>
                  <TableCell className="text-right font-mono text-xs">{money(invoice.igst)}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={4} />
                <TableCell className="text-xs font-semibold text-[--shell-foreground] text-right">Total</TableCell>
                <TableCell className="text-right font-heading text-base font-bold text-[--shell-brand]">
                  {money(invoice.total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invoice.payments.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
              <CreditCard className="h-4 w-4 text-[--shell-accent]" />
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">
                Payment History
              </span>
              <span className="text-xs text-[--shell-muted] ml-auto">
                {money(invoice.payments.reduce((s, p) => s + p.amount, 0))} total collected
              </span>
            </div>
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
                    <TableCell className="text-xs">{formatDate(p.payment_date ?? p.created_at)}</TableCell>
                    <TableCell className="capitalize text-xs">{p.payment_method?.replace("_", " ") ?? "-"}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted] font-mono">{p.reference_number ?? p.reference_id ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">{money(p.amount)}</TableCell>
                    <TableCell><Badge variant={p.status === "cleared" ? "default" : "outline"} className="capitalize text-xs">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <CardContent className="flex items-start gap-3 px-5 py-4">
            <FileSignature className="h-4 w-4 text-[--shell-muted] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[--shell-muted] mb-1">Notes</p>
              <p className="text-sm text-[--shell-foreground] whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Payment</DialogTitle>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleRegisterPayment}>
            <div className="flex items-center justify-between rounded-lg border border-[--shell-border] bg-[--shell-surface] px-4 py-3">
              <span className="text-sm text-[--shell-muted]">Balance Due</span>
              <span className="font-mono font-semibold text-[--shell-brand]">{money(invoice.balance_due)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount (₹)</Label>
              <Input id="pay-amount" type="number" min={0.01} max={invoice.balance_due} step={0.01} placeholder="0.00" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-method">Method</Label>
              <Select value={payMethod} onValueChange={(v) => v !== null && setPayMethod(v)}>
                <SelectTrigger id="pay-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={paySaving || !payAmount}>
                {paySaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
