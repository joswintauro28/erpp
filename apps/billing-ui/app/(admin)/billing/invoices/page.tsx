"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, FileText, Eye, Receipt, CreditCard, DollarSign, BadgePercent,
  LayoutGrid, List, Loader2, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { money, formatDate } from "@/utils/format";
import { KanbanBoard, type KanbanColumn } from "@/components/kanban/kanban-board";
import { api } from "@/services/api";
import type { ApiInvoice, InvoiceListView } from "@/types/billing";
import InvoicesLoading from "./loading";

const statusOptions = ["paid", "pending", "partially_paid", "overdue", "void"];

const statusVariant = (s: string) => {
  if (s === "paid") return "default" as const;
  if (s === "sent" || s === "pending") return "secondary" as const;
  if (s === "overdue") return "destructive" as const;
  return "outline" as const;
};

export default function Invoices() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewFromUrl = searchParams.get("view") === "kanban" ? "kanban" : "table";
  const statusFromUrl = searchParams.get("status") ?? "";

  const [invoices, setInvoices] = useState<InvoiceListView[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">(viewFromUrl);
  const [statusFilter, setStatusFilter] = useState(statusFromUrl);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const syncUrl = useCallback((view: string, status: string) => {
    const params = new URLSearchParams();
    if (view === "kanban") params.set("view", "kanban");
    if (status) params.set("status", status);
    const qs = params.toString();
    router.replace(`/billing/invoices${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router]);

  const handleViewMode = (mode: "table" | "kanban") => {
    setViewMode(mode);
    syncUrl(mode, statusFilter);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    syncUrl(viewMode, value);
  };

  const loadInvoices = useCallback(() => {
    setLoading(true);
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

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

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

  const kanbanColumns: KanbanColumn[] = useMemo(() => [
    {
      id: "draft",
      title: "Draft",
      color: "var(--chart-4)",
      items: filtered.filter((i) => i.status === "draft").map(toKanbanItem),
    },
    {
      id: "sent",
      title: "Sent",
      color: "var(--chart-5)",
      items: filtered.filter((i) => i.status === "sent").map(toKanbanItem),
    },
    {
      id: "partially_paid",
      title: "Partially Paid",
      color: "var(--chart-3)",
      items: filtered.filter((i) => i.status === "partially_paid").map(toKanbanItem),
    },
    {
      id: "overdue",
      title: "Overdue",
      color: "var(--chart-1)",
      items: filtered.filter((i) => i.status === "overdue").map(toKanbanItem),
    },
    {
      id: "paid",
      title: "Paid",
      color: "var(--chart-2)",
      items: filtered.filter((i) => i.status === "paid").map(toKanbanItem),
    },
  ], [filtered]);

  const handleStatusChange = async (itemId: number, newStatus: string) => {
    try {
      await api.put(`/invoices/${itemId}/status`, { status: newStatus });
      loadInvoices();
    } catch { /* handled by api */ }
  };

  const [formClientName, setFormClientName] = useState("");
  const [formGstTreatment, setFormGstTreatment] = useState("intrastate");
  const [formDiscount, setFormDiscount] = useState("0");
  const [formDiscountType, setFormDiscountType] = useState("fixed");
  const [formItems, setFormItems] = useState([{ description: "", quantity: 1, unitPrice: 0, gstRate: 18 }]);

  const lineTotals = useMemo(() =>
    formItems.map((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const amount = qty * price;
      const gstRate = Number(item.gstRate) || 0;
      const discount = Number(formDiscount) || 0;
      const discountType = formDiscountType;
      const discountAmount = discountType === "percentage" ? amount * discount / 100 : discount;
      const taxable = amount - discountAmount;
      const isInterstate = formGstTreatment === "interstate";
      const igst = isInterstate ? taxable * gstRate / 100 : 0;
      const cgst = isInterstate ? 0 : taxable * gstRate / 200;
      const sgst = isInterstate ? 0 : taxable * gstRate / 200;
      return { amount, taxable, cgst, sgst, igst, gstTotal: taxable * gstRate / 100 };
    }), [formItems, formDiscount, formDiscountType, formGstTreatment]);

  const subtotal = useMemo(() => lineTotals.reduce((s, i) => s + i.amount, 0), [lineTotals]);
  const totalGst = useMemo(() => lineTotals.reduce((s, i) => s + i.gstTotal, 0), [lineTotals]);
  const grandTotal = useMemo(() => {
    const discount = Number(formDiscount) || 0;
    const dt = formDiscountType;
    const discAmt = dt === "percentage" ? subtotal * discount / 100 : discount;
    return subtotal - discAmt + totalGst;
  }, [subtotal, totalGst, formDiscount, formDiscountType]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const discount = Number(formDiscount) || 0;
      await api.post("/invoices", {
        client_name: formClientName,
        gst_treatment: formGstTreatment,
        discount,
        discount_type: discount > 0 ? formDiscountType : undefined,
        items: formItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unitPrice) || 0,
          gst_rate: Number(item.gstRate) || 0,
        })),
      });
      setCreateOpen(false);
      setFormClientName("");
      setFormDiscount("0");
      setFormItems([{ description: "", quantity: 1, unitPrice: 0, gstRate: 18 }]);
      loadInvoices();
    } catch { /* handled */ } finally {
      setSaving(false);
    }
  };

  if (loading) return <InvoicesLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Invoices</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Create, manage, and track all client invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => handleViewMode("table")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => handleViewMode("kanban")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button aria-label="Create Invoice" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create Invoice
          </Button>
        </div>
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

      {viewMode === "table" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search invoices..." className="flex-1 max-w-xs" />
            <Select value={statusFilter} onValueChange={(v) => v !== null && handleStatusFilter(v)}>
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
                      <TableHead>Issued</TableHead>
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
                        <TableCell className="text-xs text-[--shell-muted]">{formatDate(inv.issue_date)}</TableCell>
                        <TableCell className="text-xs text-[--shell-muted]">{formatDate(inv.due_date)}</TableCell>
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
        </>
      )}

      {viewMode === "kanban" && (
        <KanbanBoard
          columns={kanbanColumns}
          onItemClick={(id) => router.push(`/billing/invoices/${id}`)}
          onStatusChange={handleStatusChange}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleCreateInvoice}>
            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-[--shell-brand]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Invoice Details</span>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inv-client">Client Name</Label>
                  <Input id="inv-client" placeholder="Client name" required value={formClientName} onChange={(e) => setFormClientName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-gst">GST Treatment</Label>
                  <Select value={formGstTreatment} onValueChange={(v) => v !== null && setFormGstTreatment(v)}>
                    <SelectTrigger id="inv-gst"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intrastate">Intrastate (CGST+SGST)</SelectItem>
                      <SelectItem value="interstate">Interstate (IGST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-[--shell-accent]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Line Items</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setFormItems([...formItems, { description: "", quantity: 1, unitPrice: 0, gstRate: 18 }])}>
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {formItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 rounded-md border border-[--shell-border] bg-[--shell-bg] p-3">
                    <div className="flex-1 space-y-2">
                      <Input placeholder="Description" value={item.description} onChange={(e) => {
                        const next = [...formItems];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setFormItems(next);
                      }} />
                    </div>
                    <div className="w-20 space-y-2">
                      <Input type="number" min={0.01} step={1} placeholder="Qty" value={item.quantity} onChange={(e) => {
                        const next = [...formItems];
                        next[idx] = { ...next[idx], quantity: Number(e.target.value) || 0 };
                        setFormItems(next);
                      }} />
                    </div>
                    <div className="w-24 space-y-2">
                      <Input type="number" min={0} step={0.01} placeholder="Price" value={item.unitPrice} onChange={(e) => {
                        const next = [...formItems];
                        next[idx] = { ...next[idx], unitPrice: Number(e.target.value) || 0 };
                        setFormItems(next);
                      }} />
                    </div>
                    <div className="w-16 space-y-2">
                      <Input type="number" min={0} max={100} step={0.1} placeholder="GST%" value={item.gstRate} onChange={(e) => {
                        const next = [...formItems];
                        next[idx] = { ...next[idx], gstRate: Number(e.target.value) || 0 };
                        setFormItems(next);
                      }} />
                    </div>
                    <div className="w-20 pt-6 text-right">
                      <span className="font-mono text-xs font-semibold">{money((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</span>
                    </div>
                    {formItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-sm" className="pt-6" onClick={() => setFormItems(formItems.filter((_, i) => i !== idx))}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="mb-3 flex items-center gap-2">
                <BadgePercent className="h-3.5 w-3.5 text-[--shell-accent]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Discount</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="inv-discount">Discount Value</Label>
                  <Input id="inv-discount" type="number" min={0} step={0.01} placeholder="0" value={formDiscount} onChange={(e) => setFormDiscount(e.target.value)} />
                </div>
                <div className="w-36 space-y-2">
                  <Label htmlFor="inv-discount-type">Type</Label>
                  <Select value={formDiscountType} onValueChange={(v) => v !== null && setFormDiscountType(v)}>
                    <SelectTrigger id="inv-discount-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed (₹)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[--shell-muted]">Subtotal</span>
                <span className="font-mono font-medium">{money(subtotal)}</span>
              </div>
              {Number(formDiscount) > 0 && (
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-[--shell-muted]">Discount</span>
                  <span className="font-mono font-medium text-[--shell-danger]">
                    -{money(formDiscountType === "percentage" ? subtotal * Number(formDiscount) / 100 : Number(formDiscount))}
                  </span>
                </div>
              )}
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-[--shell-muted]">GST</span>
                <span className="font-mono font-medium">{money(totalGst)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-[--shell-border] pt-2">
                <span className="text-sm font-semibold text-[--shell-foreground]">Grand Total</span>
                <span className="font-heading text-lg font-bold text-[--shell-brand]">{money(grandTotal)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !formClientName || formItems.length === 0}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function toKanbanItem(inv: InvoiceListView) {
  return {
    id: inv.id,
    title: inv.invoice_number,
    subtitle: inv.client_name,
    amount: inv.balance_due || inv.total,
    status: inv.status,
  };
}
