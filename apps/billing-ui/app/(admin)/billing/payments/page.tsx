"use client";

import { useState, useMemo, useEffect } from "react";
import { CreditCard, Plus, Ban, Loader2, Receipt, DollarSign, Building2, AlertTriangle } from "lucide-react";
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
import { PageHeader, KpiCard, SectionHeading, handleError } from "@datavex/ui-theme";
import { useToast } from "@/contexts/ToastContext";
import { money } from "@/utils/format";
import type { BillingPayment } from "@/types/billing";
import PaymentsLoading from "./loading";

export default function Payments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [metrics, setMetrics] = useState<{ today: number; this_month: number; outstanding: number; refunds: number; failed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [refunding, setRefunding] = useState<number | null>(null);
  const [refundConfirmId, setRefundConfirmId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formInvoice, setFormInvoice] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMethod, setFormMethod] = useState("Bank_Transfer");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
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
        paymentDate: formDate || undefined,
        referenceId: formRef || undefined,
        notes: formNotes || undefined,
      });
      setRecordOpen(false);
      setFormInvoice(""); setFormAmount(""); setFormMethod("Bank_Transfer");
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormRef(""); setFormNotes("");
      toast.success("Payment recorded successfully");
      loadData();
    } catch {
      toast.error("Failed to record payment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async (id: number) => {
    setRefunding(id);
    setRefundConfirmId(null);
    try {
      await api.post(`/payments/${id}/refund`);
      toast.success("Refund issued successfully");
      loadData();
    } catch {
      toast.error("Failed to issue refund. Please try again.");
    } finally {
      setRefunding(null);
    }
  };

  if (loading) return <PaymentsLoading />;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        title="Payments"
        subtitle="Record and manage payments received"
        actions={<Button aria-label="Record Payment" onClick={() => setRecordOpen(true)}><Plus className="h-4 w-4" /> Record Payment</Button>}
      />

      {metrics && (
        <section>
          <SectionHeading label="Overview" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Today" value={money(metrics.today)} icon={DollarSign} color="var(--chart-2)" index={0} />
            <KpiCard label="This Month" value={money(metrics.this_month)} icon={Receipt} color="var(--chart-2)" index={1} />
            <KpiCard label="Outstanding" value={money(metrics.outstanding)} icon={AlertTriangle} color="var(--shell-danger)" index={2} />
            <KpiCard label="Refunds" value={money(metrics.refunds)} icon={Ban} color="var(--shell-danger)" index={3} />
            <KpiCard label="Failed" value={metrics.failed} icon={Ban} color="var(--shell-danger)" index={4} />
          </div>
        </section>
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
                    <TableCell className="text-[var(--shell-muted)]">{p.client_name}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(p.amount)}</TableCell>
                    <TableCell className="capitalize text-xs">{p.method.replace("_", " ")}</TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">{p.date}</TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">{p.reference}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => setRefundConfirmId(p.id)}
                          disabled={refunding === p.id}
                          title="Refund"
                        >
                          {refunding === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5 text-[var(--shell-warning)]" />}
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
            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-[var(--shell-brand)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Select Invoice</span>
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
                <div className="mt-3 flex items-center justify-between rounded-md bg-[var(--shell-bg)] px-3 py-2 text-xs">
                  <span className="text-[var(--shell-muted)]">Balance Due</span>
                  <span className="font-mono font-semibold text-[var(--shell-brand)]">{money(selectedInvoice.balance)}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-[--shell-accent]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Payment Details</span>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bi-pay-amount">Amount (₹)</Label>
                    <Input id="bi-pay-amount" type="number" min={0} step={0.01} placeholder="0.00" required value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bi-pay-date">Payment Date</Label>
                    <Input id="bi-pay-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Payment Method</span>
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
              <Button type="button" variant="outline" size="sm" onClick={() => setRecordOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Refund Confirmation Dialog */}
      <Dialog open={refundConfirmId !== null} onOpenChange={(open) => { if (!open) setRefundConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--shell-warning-surface)] text-[var(--shell-warning)]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle>Confirm Refund</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-[--shell-muted] pt-1">
            Are you sure you want to issue a refund for this payment? This action will reverse the payment and update the invoice balance accordingly.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setRefundConfirmId(null)}>Cancel</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => refundConfirmId !== null && handleRefund(refundConfirmId)}
              disabled={refunding !== null}
            >
              {refunding !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
              Issue Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
