"use client";

import { useState, useMemo, useEffect } from "react";
import { CreditCard, Plus, Ban, Loader2, Receipt, DollarSign, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/shared/search-input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/services/api";
import { money } from "@/utils/format";
import type { BillingPayment } from "@/types/billing";
import PaymentsLoading from "./loading";

export default function Payments() {
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [metrics, setMetrics] = useState<{ today: number; this_month: number; outstanding: number; refunds: number; failed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [refunding, setRefunding] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formInvoice, setFormInvoice] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState("Bank_Transfer");
  const [formRef, setFormRef] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [invoices, setInvoices] = useState<{ id: number; number: string; client: string; balance: number }[]>([]);

  const selectedInvoice = useMemo(
    () => invoices.find((i) => i.number === formInvoice),
    [formInvoice, invoices],
  );

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<BillingPayment[]>("/payments"),
      api.get<{ today: number; this_month: number; outstanding: number; refunds: number; failed: number }>("/payments/metrics"),
      api.get<any[]>("/invoices?status=sent,partially_paid,overdue").catch(() => []),
    ])
      .then(([p, m, invs]) => {
        setPayments(p);
        setMetrics(m);
        setInvoices(invs.map((i: any) => ({
          id: i.id,
          number: i.invoice_number ?? `INV-${i.id}`,
          client: i.client_name ?? "Unknown",
          balance: Number(i.balance_due ?? i.total ?? 0),
        })));
      })
      .catch(() => { setPayments([]); setMetrics(null); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter(
      (p) =>
        p.invoice_number.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        p.method.toLowerCase().includes(q),
    );
  }, [payments, search]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const selected = invoices.find((i) => i.number === formInvoice);
    if (!formAmount || !formInvoice || !selected) return;
    setSaving(true);
    try {
      await api.post("/payments", {
        invoiceId: selected.id,
        amount: Number(formAmount),
        paymentMethod: formMethod,
        referenceId: formRef || undefined,
        notes: formNotes || undefined,
      });
      setRecordOpen(false);
      setFormInvoice(""); setFormAmount(""); setFormMethod("Bank_Transfer");
      setFormRef(""); setFormNotes("");
      loadData();
    } catch {
      // handled by api interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async (id: number) => {
    setRefunding(id);
    try {
      await api.post(`/payments/${id}/refund`);
      loadData();
    } catch {
      // handled by api interceptor
    } finally {
      setRefunding(null);
    }
  };

  if (loading) return <PaymentsLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Payments</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Record and manage payments received</p>
        </div>
        <Button aria-label="Record Payment" onClick={() => setRecordOpen(true)}><Plus className="h-4 w-4" /> Record Payment</Button>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[--shell-muted]">Today</p>
            <p className="font-heading text-lg font-semibold text-[--shell-foreground]">{money(metrics.today)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[--shell-muted]">This Month</p>
            <p className="font-heading text-lg font-semibold text-[--shell-foreground]">{money(metrics.this_month)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[--shell-muted]">Outstanding</p>
            <p className="font-heading text-lg font-semibold text-[--shell-danger]">{money(metrics.outstanding)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[--shell-muted]">Refunds</p>
            <p className="font-heading text-lg font-semibold text-[--shell-danger]">{money(metrics.refunds)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[--shell-muted]">Failed</p>
            <p className="font-heading text-lg font-semibold text-[--shell-danger]">{metrics.failed}</p>
          </CardContent></Card>
        </div>
      )}

      <SearchInput value={search} onChange={setSearch} placeholder="Search payments..." className="max-w-xs" />

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title={payments.length === 0 ? "No payments yet" : "No payments match your search"}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell><span className="font-mono text-xs font-medium">{p.payment_id}</span></TableCell>
                    <TableCell className="font-mono text-xs">{p.invoice_number}</TableCell>
                    <TableCell className="text-[--shell-muted]">{p.client_name}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(p.amount)}</TableCell>
                    <TableCell className="capitalize text-xs">{p.method.replace("_", " ")}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{p.date}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{p.reference}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => handleRefund(p.id)}
                          disabled={refunding === p.id}
                          title="Refund"
                        >
                          {refunding === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5 text-amber-600" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog — with invoice balance reference and card-grouped form */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleRecordPayment}>
            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-[--shell-brand]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Select Invoice</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bi-pay-invoice">Invoice</Label>
                <Select value={formInvoice} onValueChange={(v) => v !== null && setFormInvoice(v)}>
                  <SelectTrigger id="bi-pay-invoice"><SelectValue placeholder="Select an invoice" /></SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.number}>
                        {inv.number} — {inv.client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedInvoice && (
                <div className="mt-3 flex items-center justify-between rounded-md bg-[--shell-bg] px-3 py-2 text-xs">
                  <span className="text-[--shell-muted]">Balance Due</span>
                  <span className="font-mono font-semibold text-[--shell-brand]">{money(selectedInvoice.balance)}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="mb-3 flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-[--shell-accent]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Payment Amount</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bi-pay-amount">Amount (₹)</Label>
                <Input id="bi-pay-amount" type="number" min={0} step={0.01} placeholder="0.00" required value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
              </div>
            </div>

            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-[--shell-accent]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Payment Method</span>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bi-pay-method">Method</Label>
                  <Select value={formMethod} onValueChange={(v) => v !== null && setFormMethod(v)}>
                    <SelectTrigger id="bi-pay-method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank_Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Credit_Card">Credit Card</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bi-pay-ref">Reference</Label>
                  <Input id="bi-pay-ref" placeholder="Transaction ID / Reference" value={formRef} onChange={(e) => setFormRef(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bi-pay-notes">Notes</Label>
                  <Textarea id="bi-pay-notes" rows={2} placeholder="Optional notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRecordOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
