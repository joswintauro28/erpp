"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search, CreditCard, DollarSign, Receipt,
  ArrowUpRight, ArrowDownLeft, Wallet, XCircle, Ban,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { searchBilling, money } from "@/utils/format";
import { api } from "@/services/api";
import { handleError } from "@datavex/ui-theme";
import type { BillingPayment } from "@/types/billing";
import PaymentsLoading from "./loading";

interface PaymentMetrics {
  today: number; thisMonth: number; outstanding: number; refunds: number; failed: number;
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <h2 className="font-heading text-xs font-medium uppercase tracking-[0.12em] text-[var(--shell-muted)]">
        {label}
      </h2>
      <div className="h-px flex-1 bg-[var(--shell-border)]/20" />
    </div>
  );
}

const CHART_VARS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
  "var(--shell-warning)", "var(--shell-danger)",
];

const metricCards = [
  { key: "today" as const, icon: ArrowDownLeft, label: "Today", gradient: "from-[var(--shell-brand)]/5 to-transparent", idx: 0 },
  { key: "thisMonth" as const, icon: DollarSign, label: "This Month", gradient: "from-[var(--shell-accent)]/5 to-transparent", idx: 1 },
  { key: "outstanding" as const, icon: ArrowUpRight, label: "Outstanding", gradient: "from-amber-500/5 to-transparent", idx: 2 },
  { key: "refunds" as const, icon: Ban, label: "Refunds", gradient: "from-orange-500/5 to-transparent", idx: 3 },
  { key: "failed" as const, icon: XCircle, label: "Failed", gradient: "from-red-500/5 to-transparent", idx: 4 },
];

export default function Payments() {
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [metrics, setMetrics] = useState<PaymentMetrics>({ today: 0, thisMonth: 0, outstanding: 0, refunds: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [payStep, setPayStep] = useState(0);
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
      api.get<any[]>("/payments"),
      api.get<any>("/payments/metrics").catch(() => ({})),
      api.get<any[]>("/invoices?status=sent,partially_paid,overdue").catch(() => []),
    ])
      .then(([pmts, m, invs]) => {
        setPayments(pmts.map((p: any) => ({
          id: p.id, payment_id: p.payment_id,
          invoice_number: p.invoice_number ?? `INV-${p.invoice_id}`,
          client_name: p.client_name ?? "Unknown",
          amount: Number(p.amount), refunded_amount: Number(p.refunded_amount ?? 0),
          method: p.method ?? "Unknown", reference: p.reference ?? "",
          date: p.date ?? "",
        })));
        setMetrics({
          today: Number(m?.today ?? 0),
          thisMonth: Number(m?.this_month ?? m?.thisMonth ?? 0),
          outstanding: Number(m?.outstanding ?? 0),
          refunds: Number(m?.refunds ?? 0),
          failed: Number(m?.failed ?? 0),
        });
        setInvoices(invs.map((i: any) => ({
          id: i.id,
          number: i.invoice_number ?? `INV-${i.id}`,
          client: i.client_name ?? "Unknown",
          balance: Number(i.balance_due ?? i.total ?? 0),
        })));
      })
      .catch(() => { setPayments([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => searchBilling(payments, search), [payments, search]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const selected = invoices.find((i) => i.number === formInvoice);
    if (!formAmount || !formInvoice || !selected) return;
    try {
      // billing-service CreatePaymentDto expects camelCase fields and
      // PaymentMethod enum values (Bank_Transfer, Credit_Card, ...).
      await api.post("/payments", {
        invoiceId: selected.id,
        amount: Number(formAmount),
        paymentMethod: formMethod,
        referenceId: formRef || undefined,
        notes: formNotes || undefined,
      });
      setRecordOpen(false);
      setPayStep(0);
      setFormInvoice("");
      setFormAmount("");
      setFormMethod("Bank_Transfer");
      setFormRef("");
      setFormNotes("");
      loadData();
    } catch {
      // error handled by api interceptor
    }
  };

  const handleRefund = async (id: number) => {
    try {
      await api.post(`/payments/${id}/refund`);
      loadData();
    } catch {
      // error handled by api interceptor
    }
  };

  if (loading) {
    return <PaymentsLoading />;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Payments
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Track collections, refunds, and payment links
          </p>
        </div>
        <Button className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white" onClick={() => setRecordOpen(true)}>
          <Wallet className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Metrics */}
      <section>
        <SectionHeading label="Payment Metrics" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {(() => {
            const values: Record<string, string> = {
              today: money(metrics.today),
              thisMonth: money(metrics.thisMonth),
              outstanding: money(metrics.outstanding),
              refunds: money(metrics.refunds),
              failed: String(metrics.failed),
            };
            return metricCards.map((card) => {
              const Icon = card.icon;
              const isDestructive = card.key === "refunds" || card.key === "failed";
              return (
                <div
                  key={card.key}
                  className="animate-kpi relative flex flex-col gap-1.5 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] overflow-hidden"
                  style={{ animationDelay: `${card.idx * 0.05}s` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">
                      {card.label}
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)]">
                      <Icon className="h-3.5 w-3.5" style={{ color: CHART_VARS[card.idx] }} />
                    </div>
                  </div>
                  <span className={`relative z-10 font-heading text-lg font-semibold tracking-tight ${isDestructive ? "text-[var(--shell-brand)]" : "text-[var(--shell-foreground)]"}`}>
                    {values[card.key]}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </section>

      {/* Payment List */}
      <section>
        <SectionHeading label="Payment History" />
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
            <Input
              placeholder="Search payments..."
              className="pl-8 border-[var(--shell-border)] bg-[var(--shell-surface)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                <CreditCard className="h-10 w-10" />
                <p className="text-sm">No payments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.payment_id}</TableCell>
                      <TableCell className="font-mono text-xs">{p.invoice_number}</TableCell>
                      <TableCell>{p.client_name}</TableCell>
                      <TableCell className="font-mono text-sm font-medium text-right">
                        {money(p.amount)}
                        {p.refunded_amount > 0 && (
                          <span className="ml-1 text-xs text-destructive">
                            (-{money(p.refunded_amount)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.reference}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.date}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {p.refunded_amount === 0 && (
                            <Button variant="ghost" size="icon-sm" onClick={() => handleRefund(p.id)} title="Refund">
                              <Ban className="h-3.5 w-3.5 text-[var(--shell-warning)]" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Record Payment Dialog */}
      <MultiStepDialog
        open={recordOpen}
        onOpenChange={(v) => { if (!v) { setPayStep(0); setRecordOpen(v); } }}
        title="Record Payment"
        steps={[
          { title: "Invoice", description: "Select invoice and enter amount" },
          { title: "Method", description: "Payment method and reference" },
        ]}
        currentStep={payStep}
        onStepChange={setPayStep}
        onSubmit={handleRecordPayment}
        submitLabel="Record Payment"
      >
        {payStep === 0 && (
          <div className="space-y-5">
            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-[var(--shell-brand)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Select Invoice</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-invoice">Invoice</Label>
                <Select value={formInvoice} onValueChange={(v) => v !== null && setFormInvoice(v)}>
                  <SelectTrigger id="payment-invoice"><SelectValue placeholder="Select an invoice" /></SelectTrigger>
                  <SelectContent>
                    {invoices.length === 0 && (
                      <SelectItem value="-" disabled>No invoices available</SelectItem>
                    )}
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
                <DollarSign className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Payment Amount</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount (₹)</Label>
                <Input id="payment-amount" type="number" min={0} step={0.01} placeholder="0.00" required value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
              </div>
            </div>
          </div>
        )}
        {payStep === 1 && (
          <div className="space-y-5">
            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Payment Method</span>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Method</Label>
                  <Select value={formMethod} onValueChange={(v) => v !== null && setFormMethod(v)}>
                    <SelectTrigger id="payment-method"><SelectValue /></SelectTrigger>
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
                  <Label htmlFor="payment-ref">Reference</Label>
                  <Input id="payment-ref" placeholder="Transaction ID / Reference" value={formRef} onChange={(e) => setFormRef(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-notes">Notes</Label>
                  <Textarea id="payment-notes" rows={2} placeholder="Optional notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
