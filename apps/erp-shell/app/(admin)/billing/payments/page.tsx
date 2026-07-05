"use client";

import { useState, useMemo } from "react";
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
import type { BillingPayment } from "@/types/billing";

const paymentMetrics = {
  today: 156000,
  thisMonth: 1124000,
  outstanding: 1912500,
  refunds: 5500,
  failed: 2,
};

export default function Payments() {
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [search, setSearch] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [payStep, setPayStep] = useState(0);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Payments
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Track collections, refunds, and payment links
          </p>
        </div>
        <Button onClick={() => setRecordOpen(true)}>
          <Wallet className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--chart-1]/10">
              <ArrowDownLeft className="h-4 w-4 text-[--chart-1]" />
            </div>
            <div>
              <p className="font-heading text-base font-semibold">{money(paymentMetrics.today)}</p>
              <p className="text-xs text-[--shell-muted]">Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--chart-2]/10">
              <DollarSign className="h-4 w-4 text-[--chart-2]" />
            </div>
            <div>
              <p className="font-heading text-base font-semibold">{money(paymentMetrics.thisMonth)}</p>
              <p className="text-xs text-[--shell-muted]">This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--chart-3]/10">
              <ArrowUpRight className="h-4 w-4 text-[--chart-3]" />
            </div>
            <div>
              <p className="font-heading text-base font-semibold">{money(paymentMetrics.outstanding)}</p>
              <p className="text-xs text-[--shell-muted]">Outstanding</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--shell-warning]/10">
              <Ban className="h-4 w-4" style={{ color: "var(--shell-warning)" }} />
            </div>
            <div>
              <p className="font-heading text-base font-semibold">{money(paymentMetrics.refunds)}</p>
              <p className="text-xs text-[--shell-muted]">Refunds</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--shell-danger]/10">
              <XCircle className="h-4 w-4 text-[--shell-danger]" />
            </div>
            <div>
              <p className="font-heading text-base font-semibold">{paymentMetrics.failed}</p>
              <p className="text-xs text-[--shell-muted]">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
          <Input
            placeholder="Search payments..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-[--shell-muted]">
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
                        <span className="ml-1 text-xs text-[--shell-danger]">
                          (-{money(p.refunded_amount)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell className="font-mono text-xs text-[--shell-muted]">{p.reference}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{p.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {p.refunded_amount === 0 && (
                          <Button variant="ghost" size="icon-sm" onClick={() => handleRefund(p.id)} title="Refund">
                            <Ban className="h-3.5 w-3.5 text-[--shell-warning]" />
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
        <Label htmlFor="payment-invoice" className="text-[--shell-muted]">Invoice</Label>
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
        <Label htmlFor="payment-amount" className="text-[--shell-muted]">Amount</Label>
        <Input id="payment-amount" type="number" min={0} placeholder="0.00" required />
      </div>
    </div>
  )}
  {payStep === 1 && (
    <div className="space-y-5">
      <div className="space-y-2">
              <Label htmlFor="payment-method" className="text-[--shell-muted]">Method</Label>
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
        <Label htmlFor="payment-ref" className="text-[--shell-muted]">Reference</Label>
        <Input id="payment-ref" placeholder="Transaction ID / Reference" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="payment-notes" className="text-[--shell-muted]">Notes</Label>
              <Textarea id="payment-notes" rows={2} placeholder="Optional notes" />
            </div>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
