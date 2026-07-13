"use client";

import { useState, useMemo, useEffect } from "react";
import { CreditCard, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/search-input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/services/api";
import { money } from "@/utils/format";
import type { BillingPayment } from "@/types/billing";
import PaymentsLoading from "./loading";

export default function Payments() {
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [metrics, setMetrics] = useState<{ dailyTotal: number; monthlyTotal: number; outstandingTotal: number; totalRefunds: number; failedTransactions: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<BillingPayment[]>("/payments"),
      api.get<{ dailyTotal: number; monthlyTotal: number; outstandingTotal: number; totalRefunds: number; failedTransactions: number }>("/payments/metrics"),
    ])
      .then(([p, m]) => { setPayments(p); setMetrics(m); })
      .catch(() => { setPayments([]); setMetrics(null); })
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) return <PaymentsLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Payments</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Record and manage payments received</p>
        </div>
        <Button aria-label="Record Payment"><Plus className="h-4 w-4" /> Record Payment</Button>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[--shell-muted]">Today</p>
            <p className="font-heading text-lg font-semibold text-[--shell-foreground]">{money(metrics.dailyTotal)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[--shell-muted]">This Month</p>
            <p className="font-heading text-lg font-semibold text-[--shell-foreground]">{money(metrics.monthlyTotal)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[--shell-muted]">Outstanding</p>
            <p className="font-heading text-lg font-semibold text-[--shell-danger]">{money(metrics.outstandingTotal)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[--shell-muted]">Refunds</p>
            <p className="font-heading text-lg font-semibold text-[--shell-danger]">{money(metrics.totalRefunds)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[--shell-muted]">Failed</p>
            <p className="font-heading text-lg font-semibold text-[--shell-danger]">{metrics.failedTransactions}</p>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
