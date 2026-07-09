"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Eye, Receipt, CreditCard, DollarSign, BadgePercent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/components/shared/search-input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { money, invoiceStatusVariant as statusVariant } from "@/utils/format";
import { api } from "@/services/api";
import type { ApiInvoice, InvoiceListView } from "@/types/billing";

const statusOptions = ["paid", "pending", "partially_paid", "overdue", "cancelled"];

export default function Invoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceListView[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api.get<ApiInvoice[]>("/invoices")
      .then((invData) => {
        setInvoices(invData.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number ?? `INV-${inv.id}`,
          client_id: inv.client_id,
          client_name: inv.client_name ?? `Client #${inv.client_id}`,
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
      ? invoices.filter((inv) =>
          inv.invoice_number.toLowerCase().includes(q) ||
          inv.client_name.toLowerCase().includes(q) ||
          inv.status.toLowerCase().includes(q))
      : invoices;
    if (!statusFilter) return searched;
    return searched.filter((inv) => inv.status === statusFilter);
  }, [invoices, search, statusFilter]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Invoices</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Create, manage, and track all client invoices</p>
        </div>
        <Button aria-label="Create Invoice"><Plus className="h-4 w-4" /> Create Invoice</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--chart-1]/10"><Receipt className="h-4 w-4 text-[--chart-1]" /></div>
          <div><p className="font-heading text-base font-semibold">{money(gstSummary.taxable_value)}</p><p className="text-xs text-[--shell-muted]">Taxable Value</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--chart-2]/10"><BadgePercent className="h-4 w-4 text-[--chart-2]" /></div>
          <div><p className="font-heading text-base font-semibold">{money(gstSummary.total_gst)}</p><p className="text-xs text-[--shell-muted]">Total GST</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--chart-3]/10"><DollarSign className="h-4 w-4 text-[--chart-3]" /></div>
          <div><p className="font-heading text-base font-semibold">{money(gstSummary.total_cgst + gstSummary.total_sgst)}</p><p className="text-xs text-[--shell-muted]">CGST + SGST</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--chart-4]/10"><CreditCard className="h-4 w-4 text-[--chart-4]" /></div>
          <div><p className="font-heading text-base font-semibold">{money(gstSummary.total_igst)}</p><p className="text-xs text-[--shell-muted]">IGST</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--shell-success]/10"><FileText className="h-4 w-4 text-[--shell-success]" /></div>
          <div><p className="font-heading text-base font-semibold">{invoices.length}</p><p className="text-xs text-[--shell-muted]">Total Invoices</p></div>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search invoices..." className="flex-1 max-w-xs" />
        <Select value={statusFilter} onValueChange={(v) => v !== null && setStatusFilter(v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
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
            <EmptyState
              icon={FileText}
              title={invoices.length === 0 ? "No invoices yet" : "No invoices match your search"}
              description={invoices.length === 0 ? "Create your first invoice to get started." : "Try adjusting your search or filters."}
            />
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
                    <TableCell className="text-[--shell-muted]">{inv.client_name}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(inv.total)}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(inv.paid_amount)}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(inv.balance_due)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)} className="capitalize">{inv.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{inv.due_date}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/billing/invoices/${inv.id}`)} aria-label="View invoice">
                          <Eye className="h-3.5 w-3.5" />
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
    </div>
  );
}
