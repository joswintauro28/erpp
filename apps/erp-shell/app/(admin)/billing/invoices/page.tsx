"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, FileText, Eye, Download, Receipt, CreditCard, DollarSign, BadgePercent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { money } from "@/utils/format";
import { api } from "@/services/api";
import type { ApiInvoice, ApiClientRef, InvoiceListView } from "@/types/billing";
import InvoicesLoading from "./loading";

const statusOptions = ["", "paid", "pending", "partially_paid", "overdue", "cancelled"] as const;

const statusVariant = (s: string) => {
  if (s === "paid") return "default" as const;
  if (s === "pending") return "secondary" as const;
  if (s === "overdue" || s === "cancelled") return "destructive" as const;
  if (s === "partially_paid") return "outline" as const;
  return "outline" as const;
};

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
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)",
];

const summaryCards = [
  { key: "taxable_value" as const, icon: Receipt, label: "Taxable Value", idx: 0 },
  { key: "total_gst" as const, icon: BadgePercent, label: "Total GST", idx: 1 },
  { key: "total_cgst_sgst" as const, icon: DollarSign, label: "CGST + SGST", idx: 2 },
  { key: "total_igst" as const, icon: CreditCard, label: "IGST", idx: 3 },
  { key: "total_invoices" as const, icon: FileText, label: "Total Invoices", idx: 4 },
];

export default function Invoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceListView[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<ApiInvoice[]>("/invoices"),
      api.get<ApiClientRef[]>("/clients"),
    ])
      .then(([invData, clientData]) => {
        const clientMap = new Map(clientData.map((c) => [c.id, c.name]));
        setInvoices(invData.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number ?? `INV-${inv.id}`,
          client_id: inv.client_id,
          client_name: clientMap.get(inv.client_id) ?? `Client #${inv.client_id}`,
          total: inv.total, paid_amount: inv.paid_amount, balance_due: inv.balance_due,
          status: inv.status, issue_date: inv.issue_date ?? "", due_date: inv.due_date ?? "",
          gst_treatment: inv.gst_treatment, place_of_supply: inv.place_of_supply ?? "",
          subtotal: inv.subtotal, cgst: inv.cgst, sgst: inv.sgst, igst: inv.igst,
          tax_total: inv.tax_total, notes: inv.notes ?? "",
          taxable_value: inv.subtotal,
        })));
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  const gstSummary = useMemo(() => ({
    taxable_value: invoices.reduce((s, inv) => s + inv.subtotal, 0),
    total_cgst: invoices.reduce((s, inv) => s + inv.cgst, 0),
    total_sgst: invoices.reduce((s, inv) => s + inv.sgst, 0),
    total_igst: invoices.reduce((s, inv) => s + inv.igst, 0),
    total_gst: invoices.reduce((s, inv) => s + inv.tax_total, 0),
  }), [invoices]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const searched = q
      ? invoices.filter(
          (inv) =>
            inv.invoice_number.toLowerCase().includes(q) ||
            inv.client_name.toLowerCase().includes(q) ||
            inv.status.toLowerCase().includes(q),
        )
      : invoices;
    if (!statusFilter) return searched;
    return searched.filter((inv) => inv.status === statusFilter);
  }, [invoices, search, statusFilter]);

  if (loading) {
    return <InvoicesLoading />;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Invoices</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Create, manage, and track all client invoices</p>
        </div>
        <Button className="bg-[--shell-brand] hover:bg-[--shell-brand]/90 text-white"><Plus className="h-4 w-4" /> Create Invoice</Button>
      </div>

      {/* GST Summary */}
      <section>
        <SectionHeading label="GST Summary" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {(() => {
            const cgst_sgst = gstSummary.total_cgst + gstSummary.total_sgst;
            const values: Record<string, string> = {
              taxable_value: money(gstSummary.taxable_value),
              total_gst: money(gstSummary.total_gst),
              total_cgst_sgst: money(cgst_sgst),
              total_igst: money(gstSummary.total_igst),
              total_invoices: String(invoices.length),
            };
            return summaryCards.map((card) => {
              const Icon = card.icon;
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
                  <span className="font-heading text-lg font-semibold tracking-tight text-[--shell-foreground]">
                    {values[card.key]}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </section>

      {/* Search & Filter */}
      <section>
        <SectionHeading label="Invoice List" />
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
            <Input placeholder="Search invoices..." className="pl-8 border-[--shell-border] bg-[--shell-surface]" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => v !== null && setStatusFilter(v)}>
            <SelectTrigger className="w-36 border-[--shell-border] bg-[--shell-surface]"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent className="border-[--shell-border] bg-[--shell-surface]">
              <SelectItem value="">All statuses</SelectItem>
              {statusOptions.filter(Boolean).map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
                <FileText className="h-12 w-12" />
                <p className="text-base font-medium text-foreground">
                  {invoices.length === 0 ? "No invoices yet" : "No invoices match your search"}
                </p>
                <p className="text-sm">
                  {invoices.length === 0
                    ? "Create your first invoice to get started."
                    : "Try adjusting your search or filters."}
                </p>
                {invoices.length === 0 && (
                  <Button size="sm" className="mt-2">
                    <Plus className="mr-1 h-4 w-4" /> Create Invoice
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell><span className="font-mono text-xs font-medium">{inv.invoice_number}</span></TableCell>
                      <TableCell className="text-muted-foreground">{inv.client_name}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{money(inv.total)}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{money(inv.paid_amount)}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{money(inv.balance_due)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(inv.status)} className="capitalize">{inv.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inv.due_date}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/billing/invoices/${inv.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm">
                            <Download className="h-3.5 w-3.5" />
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
      </section>
    </div>
  );
}
