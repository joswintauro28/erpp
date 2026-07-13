"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search, CreditCard, DollarSign, Receipt,
  ArrowUpRight, ArrowDownLeft, Wallet, XCircle, Ban,
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
import type { BillingPayment } from "@/types/billing";
import PaymentsLoading from "./loading";

interface PaymentMetrics {
  today: number; thisMonth: number; outstanding: number; refunds: number; failed: number;
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <h2 className="font-heading text-xs font-medium uppercase tracking-[0.12em] text-[--shell-muted]">
        {label}
      </h2>
      <div className="h-px flex-1 bg-[--shell-border]/20" />
    </div>
  );
}

const CHART_VARS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
  "var(--shell-warning)", "var(--shell-danger)",
];

const metricCards = [
  { key: "today" as const, icon: ArrowDownLeft, label: "Today", idx: 0 },
  { key: "thisMonth" as const, icon: DollarSign, label: "This Month", idx: 1 },
  { key: "outstanding" as const, icon: ArrowUpRight, label: "Outstanding", idx: 2 },
  { key: "refunds" as const, icon: Ban, label: "Refunds", idx: 3 },
  { key: "failed" as const, icon: XCircle, label: "Failed", idx: 4 },
];

export default function Payments() {
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [metrics, setMetrics] = useState<PaymentMetrics>({ today: 0, thisMonth: 0, outstanding: 0, refunds: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [payStep, setPayStep] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get<any[]>("/payments"),
      api.get<any>("/payments/metrics").catch(() => ({})),
    ])
      .then(([pmts, m]) => {
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
      })
      .catch(() => { setPayments([]); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => searchBilling(payments, search), [payments, search]);

  const handleRefund = (id: number) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, refunded_amount: p.amount }
          : p
      )
    );
  };

  if (loading) {
    return <PaymentsLoading />;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Payments
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Track collections, refunds, and payment links
          </p>
        </div>
        <Button className="bg-[--shell-brand] hover:bg-[--shell-brand]/90 text-white" onClick={() => setRecordOpen(true)}>
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
                  className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
                  style={{ animationDelay: `${card.idx * 0.05}s` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">
                      {card.label}
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[--shell-border] bg-[--shell-bg]">
                      <Icon className="h-3.5 w-3.5" style={{ color: CHART_VARS[card.idx] }} />
                    </div>
                  </div>
                  <span className={`font-heading text-lg font-semibold tracking-tight ${isDestructive ? "text-[--shell-brand]" : "text-[--shell-foreground]"}`}>
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
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
            <Input
              placeholder="Search payments..."
              className="pl-8 border-[--shell-border] bg-[--shell-surface]"
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
                              <Ban className="h-3.5 w-3.5 text-amber-600" />
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
        onOpenChange={(v) => { if (!v) setPayStep(0); setRecordOpen(v); }}
        title="Record Payment"
        steps={[
          { title: "Invoice", description: "Select invoice and enter amount" },
          { title: "Method", description: "Payment method and reference" },
        ]}
        currentStep={payStep}
        onStepChange={setPayStep}
        onSubmit={(e) => { e.preventDefault(); setRecordOpen(false); }}
        submitLabel="Record Payment"
      >
        {payStep === 0 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="payment-invoice" className="text-muted-foreground">Invoice</Label>
              <Select defaultValue="INV-2024-008 - Apex Logistics (₹3,20,000)">
                <SelectTrigger id="payment-invoice"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INV-2024-008 - Apex Logistics (₹3,20,000)">INV-2024-008 — Apex Logistics</SelectItem>
                  <SelectItem value="INV-2024-007 - Coastal Foods (₹5,20,000)">INV-2024-007 — Coastal Foods</SelectItem>
                  <SelectItem value="INV-2024-009 - Velocity Traders (₹70,000)">INV-2024-009 — Velocity Traders</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-amount" className="text-muted-foreground">Amount</Label>
              <Input id="payment-amount" type="number" min={0} placeholder="0.00" required />
            </div>
          </div>
        )}
        {payStep === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="payment-method" className="text-muted-foreground">Method</Label>
              <Select defaultValue="Bank Transfer">
                <SelectTrigger id="payment-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-ref" className="text-muted-foreground">Reference</Label>
              <Input id="payment-ref" placeholder="Transaction ID / Reference" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-notes" className="text-muted-foreground">Notes</Label>
              <Textarea id="payment-notes" rows={2} placeholder="Optional notes" />
            </div>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
