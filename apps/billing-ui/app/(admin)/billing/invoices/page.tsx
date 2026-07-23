"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, FileText, Eye, Pencil, Receipt, CreditCard, DollarSign, BadgePercent,
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

const statusStyles: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  sent: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  partially_paid: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-800",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  overdue: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800",
  void: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-800",
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
  const [formIssueDate, setFormIssueDate] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPlaceOfSupply, setFormPlaceOfSupply] = useState("");
  const [formInvoiceType, setFormInvoiceType] = useState("receivable");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);

  const lineTotals = useMemo(() =>
    formItems.map((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const amount = qty * price;
      const gstRate = 18;
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
        issue_date: formIssueDate || undefined,
        due_date: formDueDate || undefined,
        place_of_supply: formPlaceOfSupply || undefined,
        type: formInvoiceType,
        discount,
        discount_type: discount > 0 ? formDiscountType : undefined,
        notes: formNotes || undefined,
        items: formItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unitPrice) || 0,
          gst_rate: 18,
        })),
      });
      setCreateOpen(false);
      setFormClientName("");
      setFormGstTreatment("intrastate");
      setFormIssueDate("");
      setFormDueDate("");
      setFormPlaceOfSupply("");
      setFormInvoiceType("receivable");
      setFormDiscount("0");
      setFormDiscountType("fixed");
      setFormNotes("");
      setFormItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      loadInvoices();
    } catch { /* handled */ } finally {
      setSaving(false);
    }
  };

  if (loading) return <InvoicesLoading />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-[--shell-foreground]">Invoices</h1>
          <p className="text-sm text-[--shell-muted] mt-0.5">Create, manage, and track all client invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleViewMode("table")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleViewMode("kanban")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button size="sm" aria-label="Create Invoice" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[--chart-1]/10">
              <Receipt className="h-4 w-4 text-[--chart-1]" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-base font-semibold leading-tight">{money(gstSummary.taxable_value)}</p>
              <p className="text-[11px] font-medium text-[--shell-muted] leading-tight mt-0.5">Taxable Value</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[--chart-2]/10">
              <BadgePercent className="h-4 w-4 text-[--chart-2]" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-base font-semibold leading-tight">{money(gstSummary.total_gst)}</p>
              <p className="text-[11px] font-medium text-[--shell-muted] leading-tight mt-0.5">Total GST</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[--chart-3]/10">
              <DollarSign className="h-4 w-4 text-[--chart-3]" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-base font-semibold leading-tight">{money(gstSummary.total_cgst + gstSummary.total_sgst)}</p>
              <p className="text-[11px] font-medium text-[--shell-muted] leading-tight mt-0.5">CGST + SGST</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[--chart-4]/10">
              <CreditCard className="h-4 w-4 text-[--chart-4]" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-base font-semibold leading-tight">{money(gstSummary.total_igst)}</p>
              <p className="text-[11px] font-medium text-[--shell-muted] leading-tight mt-0.5">IGST</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[--shell-success]/10">
              <FileText className="h-4 w-4 text-[--shell-success]" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-base font-semibold leading-tight">{invoices.length}</p>
              <p className="text-[11px] font-medium text-[--shell-muted] leading-tight mt-0.5">Total Invoices</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === "table" && (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search invoices..." className="flex-1" />
            <Select value={statusFilter} onValueChange={(v) => v !== null && handleStatusFilter(v)}>
              <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {statusOptions.filter(Boolean).map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={invoices.length === 0 ? "No invoices yet" : "No invoices match your search"}
                  description={invoices.length === 0 ? "Create your first invoice to get started." : "Try adjusting your search or filters."}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider">Invoice</TableHead>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider">Client</TableHead>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-right">Total</TableHead>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-right">Paid</TableHead>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-right">Balance</TableHead>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider">Status</TableHead>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider">Issued</TableHead>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider">Due</TableHead>
                        <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((inv) => (
                        <TableRow key={inv.id} className="group h-12">
                          <TableCell>
                            <span className="font-mono text-xs font-semibold text-[--shell-foreground]">{inv.invoice_number}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-[--shell-muted] truncate block max-w-[180px]">{inv.client_name}</span>
                          </TableCell>
                          <TableCell className="font-mono text-sm font-semibold text-right">{money(inv.total)}</TableCell>
                          <TableCell className="font-mono text-sm text-right">{money(inv.paid_amount)}</TableCell>
                          <TableCell className="font-mono text-sm text-right">{money(inv.balance_due)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`h-6 text-[11px] font-semibold px-2.5 rounded-full capitalize border ${statusStyles[inv.status] || ""}`}>
                              {inv.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-[--shell-muted]">
                            {inv.status === "draft" ? (
                              <span className="text-[--shell-muted]/50 italic">Not Issued</span>
                            ) : (
                              formatDate(inv.issue_date)
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-[--shell-muted]">{formatDate(inv.due_date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-0.5">
                              {inv.status === "draft" && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => router.push(`/billing/invoices/${inv.id}`)} aria-label="Edit invoice">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.push(`/billing/invoices/${inv.id}`)} aria-label="View invoice">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
        <DialogContent
          className="flex flex-col overflow-hidden p-0 shadow-2xl"
          style={{
            maxWidth: "min(960px, calc(100vw - 64px))",
            width: "100%",
            maxHeight: "calc(100vh - 64px)",
          }}
        >
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between px-6 pt-5 pb-4 border-b border-border">
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form id="create-invoice-form" onSubmit={handleCreateInvoice}>
              <div className="space-y-4">
                <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-[--shell-brand]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[--shell-foreground]">Invoice Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-client">Client Name</Label>
                      <Input id="inv-client" placeholder="Enter client name" required value={formClientName} onChange={(e) => setFormClientName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-gst">GST Treatment</Label>
                      <Select value={formGstTreatment} onValueChange={(v) => v !== null && setFormGstTreatment(v)}>
                        <SelectTrigger id="inv-gst" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="intrastate">Intrastate (CGST + SGST)</SelectItem>
                          <SelectItem value="interstate">Interstate (IGST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-issue-date">Issue Date</Label>
                      <Input id="inv-issue-date" type="date" value={formIssueDate} onChange={(e) => setFormIssueDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-due-date">Due Date</Label>
                      <Input id="inv-due-date" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-place-of-supply">Place of Supply</Label>
                      <Input id="inv-place-of-supply" placeholder="e.g. Maharashtra" value={formPlaceOfSupply} onChange={(e) => setFormPlaceOfSupply(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-type">Invoice Type</Label>
                      <Select value={formInvoiceType} onValueChange={(v) => v !== null && setFormInvoiceType(v)}>
                        <SelectTrigger id="inv-type" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="receivable">Receivable (Sales)</SelectItem>
                          <SelectItem value="payable">Payable (Purchase)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="inv-notes">Notes</Label>
                      <Input id="inv-notes" placeholder="Optional notes or payment instructions..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[--shell-accent]" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[--shell-foreground]">Line Items</span>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormItems([...formItems, { description: "", quantity: 1, unitPrice: 0 }])}>
                      <Plus className="h-3.5 w-3.5" /> Add Item
                    </Button>
                  </div>

                  <div className="hidden sm:grid grid-cols-[3fr_80px_110px_70px_110px_40px] gap-3 mb-2 px-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted]">Description</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted] text-right">Qty</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted] text-right">Rate</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted] text-center">GST</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted] text-right">Amount</span>
                    <span />
                  </div>

                  <div className="space-y-2">
                    {formItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-[3fr_80px_110px_70px_110px_40px] gap-3 items-center rounded-md border border-[--shell-border] p-3">
                        <div className="min-w-0">
                          <Label className="sm:hidden text-[11px] text-[--shell-muted] mb-1 block">Description</Label>
                          <Input placeholder="Enter item description" value={item.description} onChange={(e) => {
                            const next = [...formItems];
                            next[idx] = { ...next[idx], description: e.target.value };
                            setFormItems(next);
                          }} required />
                        </div>
                        <div>
                          <Label className="sm:hidden text-[11px] text-[--shell-muted] mb-1 block">Qty</Label>
                          <Input type="number" min={0.01} step={1} placeholder="0" value={item.quantity} onChange={(e) => {
                            const next = [...formItems];
                            next[idx] = { ...next[idx], quantity: Number(e.target.value) || 0 };
                            setFormItems(next);
                          }} required />
                        </div>
                        <div>
                          <Label className="sm:hidden text-[11px] text-[--shell-muted] mb-1 block">Rate</Label>
                          <Input type="number" min={0} step={0.01} placeholder="0.00" value={item.unitPrice} onChange={(e) => {
                            const next = [...formItems];
                            next[idx] = { ...next[idx], unitPrice: Number(e.target.value) || 0 };
                            setFormItems(next);
                          }} required />
                        </div>
                        <div>
                          <Label className="sm:hidden text-[11px] text-[--shell-muted] mb-1 block">GST</Label>
                          <div className="flex items-center justify-center h-9 rounded-md border border-[--shell-border] bg-[--shell-bg]">
                            <span className="text-xs font-mono font-semibold text-[--shell-muted]">18%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-end h-9">
                          <span className="font-mono text-sm font-semibold">{money((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</span>
                        </div>
                        <div className="flex items-center justify-center">
                          {formItems.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-[--shell-muted] hover:text-destructive" onClick={() => setFormItems(formItems.filter((_, i) => i !== idx))}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <BadgePercent className="h-4 w-4 text-[--shell-accent]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[--shell-foreground]">Discount</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-discount">Discount Value</Label>
                      <Input id="inv-discount" type="number" min={0} step={0.01} placeholder="0" value={formDiscount} onChange={(e) => setFormDiscount(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-discount-type">Discount Type</Label>
                      <Select value={formDiscountType} onValueChange={(v) => v !== null && setFormDiscountType(v)}>
                        <SelectTrigger id="inv-discount-type" className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed (₹)</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-5">
                  <div className="flex items-center justify-between text-sm py-1">
                    <span className="text-[--shell-muted]">Subtotal</span>
                    <span className="font-mono font-semibold">{money(subtotal)}</span>
                  </div>
                  {Number(formDiscount) > 0 && (
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="text-[--shell-muted]">Discount</span>
                      <span className="font-mono font-semibold text-[--shell-danger]">
                        -{money(formDiscountType === "percentage" ? subtotal * Number(formDiscount) / 100 : Number(formDiscount))}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm py-1">
                    <span className="text-[--shell-muted]">GST @ 18%</span>
                    <span className="font-mono font-semibold">{money(totalGst)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[--shell-border] pt-3 mt-1">
                    <span className="text-sm font-semibold text-[--shell-foreground]">Grand Total</span>
                    <span className="font-heading text-xl font-bold text-[--shell-brand]">{money(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-[--shell-surface] px-6 py-4 -mx-0 -mb-0 rounded-t-none">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-invoice-form" disabled={saving || !formClientName || formItems.length === 0} className="min-w-[140px]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
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
