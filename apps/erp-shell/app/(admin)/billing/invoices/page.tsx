"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, FileText, Eye, Pencil, Download, Receipt, CreditCard, DollarSign, BadgePercent, Loader2, X, Calculator, Building2, CalendarDays, FileSpreadsheet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { MultiStepDialog } from "@/components/multi-step-dialog";
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
      <h2 className="font-heading text-xs font-medium uppercase tracking-[0.12em] text-[var(--shell-muted)]">
        {label}
      </h2>
      <div className="h-px flex-1 bg-[var(--shell-border)]/20" />
    </div>
  );
}

const summaryCards = [
  { key: "taxable_value" as const, icon: Receipt, label: "Taxable Value", gradient: "from-[var(--shell-brand)]/5 to-transparent", idx: 0 },
  { key: "total_gst" as const, icon: BadgePercent, label: "Total GST", gradient: "from-[var(--shell-accent)]/5 to-transparent", idx: 1 },
  { key: "total_cgst_sgst" as const, icon: DollarSign, label: "CGST + SGST", gradient: "from-emerald-500/5 to-transparent", idx: 2 },
  { key: "total_igst" as const, icon: CreditCard, label: "IGST", gradient: "from-blue-500/5 to-transparent", idx: 3 },
  { key: "total_invoices" as const, icon: FileText, label: "Total Invoices", gradient: "from-purple-500/5 to-transparent", idx: 4 },
];

const CHART_VARS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)",
];

export default function Invoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceListView[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [clients, setClients] = useState<ApiClientRef[]>([]);
  const [createStep, setCreateStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formClientId, setFormClientId] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formGstTreatment, setFormGstTreatment] = useState("registered");
  const [formPlaceOfSupply, setFormPlaceOfSupply] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState([{ product: "", description: "", quantity: 1, unit_price: 0, gst_percent: 18 }]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<ApiInvoice[]>("/invoices"),
      api.get<ApiClientRef[]>("/clients"),
    ])
      .then(([invData, clientData]) => {
        const clientMap = new Map(clientData.map((c) => [c.id, c.name]));
        setClients(clientData);
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
  };

  useEffect(() => { loadData(); }, []);

  // ─── Live GST calculation for create form ───
  const liveCalc = useMemo(() => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    for (const item of formItems) {
      const lineSubtotal = item.quantity * item.unit_price;
      subtotal += lineSubtotal;
      if (formGstTreatment === "registered") {
        const half = (lineSubtotal * item.gst_percent) / 100 / 2;
        cgst += half;
        sgst += half;
      } else {
        igst += (lineSubtotal * item.gst_percent) / 100;
      }
    }
    const taxTotal = formGstTreatment === "registered" ? cgst + sgst : igst;
    return { subtotal, cgst, sgst, igst, taxTotal, grandTotal: subtotal + taxTotal };
  }, [formItems, formGstTreatment]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || formItems.length === 0) return;
    setSaving(true);
    try {
      await api.post("/invoices", {
        client_id: Number(formClientId),
        due_date: formDueDate || undefined,
        gst_treatment: formGstTreatment,
        place_of_supply: formPlaceOfSupply || undefined,
        notes: formNotes || undefined,
        items: formItems.map((item) => ({
          product: item.product,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          gst_percent: item.gst_percent,
        })),
      });
      setCreateOpen(false);
      setCreateStep(0);
      setFormClientId(""); setFormDueDate(""); setFormPlaceOfSupply(""); setFormNotes("");
      setFormItems([{ product: "", description: "", quantity: 1, unit_price: 0, gst_percent: 18 }]);
      loadData();
    } catch {
      // handled by api interceptor
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => setFormItems([...formItems, { product: "", description: "", quantity: 1, unit_price: 0, gst_percent: 18 }]);
  const updateItem = (idx: number, field: string, value: any) => {
    const updated = formItems.map((item, i) => i === idx ? { ...item, [field]: value } : item);
    setFormItems(updated);
  };
  const removeItem = (idx: number) => {
    if (formItems.length > 1) setFormItems(formItems.filter((_, i) => i !== idx));
  };

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
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">Invoices</h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Create, manage, and track all client invoices</p>
        </div>
        <Button className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Invoice</Button>
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
                  <span className="relative z-10 font-heading text-lg font-semibold tracking-tight text-[var(--shell-foreground)]">
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
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
            <Input placeholder="Search invoices..." className="pl-8 border-[var(--shell-border)] bg-[var(--shell-surface)]" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => v !== null && setStatusFilter(v)}>
            <SelectTrigger className="w-36 border-[var(--shell-border)] bg-[var(--shell-surface)]"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent className="border-[var(--shell-border)] bg-[var(--shell-surface)]">
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
                  <Button size="sm" className="mt-2" onClick={() => setCreateOpen(true)}>
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
                          {inv.status === "draft" && (
                            <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/billing/invoices/${inv.id}`)} title="Edit Invoice">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
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

      {/* Create Invoice Dialog — with live GST calculator */}
      <MultiStepDialog
        open={createOpen}
        onOpenChange={(v) => { if (!v) { setCreateStep(0); setCreateOpen(v); } }}
        title="Create Invoice"
        steps={[
          { title: "Client", description: "Select client and basic invoice settings" },
          { title: "Items", description: "Add line items with quantities, prices, and GST" },
        ]}
        currentStep={createStep}
        onStepChange={setCreateStep}
        onSubmit={handleCreateInvoice}
        submitLabel="Create Invoice"
        isSubmitting={saving}
      >
        {createStep === 0 && (
          <div className="space-y-5">
            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-[var(--shell-brand)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Client Details</span>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={formClientId} onValueChange={(v) => v !== null && setFormClientId(v)}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Tax Settings</span>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>GST Treatment</Label>
                  <Select value={formGstTreatment} onValueChange={(v) => v !== null && setFormGstTreatment(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registered">Registered (CGST + SGST)</SelectItem>
                      <SelectItem value="unregistered">Unregistered (IGST)</SelectItem>
                      <SelectItem value="consumer">Consumer (IGST)</SelectItem>
                      <SelectItem value="sez">SEZ (IGST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Place of Supply</Label>
                  <Input placeholder="State name" value={formPlaceOfSupply} onChange={(e) => setFormPlaceOfSupply(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-[var(--shell-muted)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Notes</span>
              </div>
              <div className="mt-3 space-y-2">
                <Textarea rows={2} placeholder="Optional notes or payment instructions" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              </div>
            </div>
          </div>
        )}
        {createStep === 1 && (
          <div className="space-y-5">
            <div className="rounded-lg border border-[var(--shell-brand)]/20 bg-[var(--shell-brand)]/5 p-3">
              <div className="flex items-center gap-2 text-xs text-[var(--shell-muted)]">
                <Calculator className="h-3.5 w-3.5 text-[var(--shell-brand)]" />
                <span className="font-medium text-[var(--shell-foreground)]">{formItems.length} item{formItems.length > 1 ? "s" : ""}</span>
                <span className="mx-1.5 text-[var(--shell-border)]">|</span>
                <span>Subtotal: <strong className="text-[var(--shell-foreground)]">{money(liveCalc.subtotal)}</strong></span>
                <span className="mx-1.5 text-[var(--shell-border)]">|</span>
                <span>Total: <strong className="text-[var(--shell-foreground)]">{money(liveCalc.grandTotal)}</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--shell-muted)]">Line Items</span>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" /> Add Item
              </Button>
            </div>
            {formItems.map((item, idx) => (
              <div key={idx} className="space-y-3 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--shell-brand)]">Item {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--shell-muted)]">
                      Line: {money(item.quantity * item.unit_price)}
                    </span>
                    {formItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeItem(idx)} className="h-5 w-5">
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Product / Service</Label>
                    <Input placeholder="Name" value={item.product} onChange={(e) => updateItem(idx, "product", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Description</Label>
                    <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input type="number" min={0} step={0.01} value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">GST %</Label>
                    <Select value={String(item.gst_percent)} onValueChange={(v) => updateItem(idx, "gst_percent", Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                        <SelectItem value="28">28%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Amount</Label>
                    <div className="flex h-9 items-center rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-sm font-mono text-[var(--shell-foreground)]">
                      {money(item.quantity * item.unit_price)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Live GST Summary */}
            <div className="rounded-lg border border-[var(--shell-accent)]/20 bg-[var(--shell-accent)]/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-foreground)]">Invoice Summary</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-[var(--shell-muted)]">
                  <span>Subtotal</span>
                  <span className="font-mono text-[var(--shell-foreground)]">{money(liveCalc.subtotal)}</span>
                </div>
                {formGstTreatment === "registered" ? (
                  <>
                    <div className="flex justify-between text-[var(--shell-muted)]">
                      <span>CGST (half of GST)</span>
                      <span className="font-mono text-[var(--shell-foreground)]">{money(liveCalc.cgst)}</span>
                    </div>
                    <div className="flex justify-between text-[var(--shell-muted)]">
                      <span>SGST (half of GST)</span>
                      <span className="font-mono text-[var(--shell-foreground)]">{money(liveCalc.sgst)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-[var(--shell-muted)]">
                    <span>IGST</span>
                    <span className="font-mono text-[var(--shell-foreground)]">{money(liveCalc.igst)}</span>
                  </div>
                )}
                <div className="border-t border-[var(--shell-border)] pt-1.5 mt-1.5 flex justify-between font-semibold text-[var(--shell-foreground)]">
                  <span>Grand Total</span>
                  <span className="font-mono text-[var(--shell-brand)]">{money(liveCalc.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </MultiStepDialog>
    </div>
  );
}
