"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Download, Receipt, DollarSign, BadgePercent,
  Building2, Globe, Mail, Calendar, Clock, MapPin,
  Plus, Loader2, Pencil, Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { MultiStepDialog } from "@/components/multi-step-dialog";
import { money } from "@/utils/format";
import { api } from "@/services/api";
import type { ApiInvoice, InvoiceDetailView, InvoiceItemView, ApiPayment } from "@/types/billing";
import InvoiceDetailLoading from "./loading";

const statusVariant = (s: string) => {
  if (s === "paid") return "default" as const;
  if (s === "pending") return "secondary" as const;
  if (s === "overdue" || s === "cancelled") return "destructive" as const;
  if (s === "partially_paid") return "outline" as const;
  return "outline" as const;
};

export default function InvoiceDetail() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [invoice, setInvoice] = useState<InvoiceDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recStep, setRecStep] = useState(0);

  // Edit draft invoice state
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editClientId, setEditClientId] = useState("");
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [editGstTreatment, setEditGstTreatment] = useState("intrastate");
  const [editDiscount, setEditDiscount] = useState("0");
  const [editDiscountType, setEditDiscountType] = useState("fixed");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState([
    { description: "", quantity: 1, unitPrice: 0, gstRate: 18 },
  ]);

  const loadInvoice = () => {
    setLoading(true);
    Promise.all([
      api.get<ApiInvoice>(`/invoices/${id}`),
      api.get<{ id: number; name: string }[]>("/clients"),
    ])
      .then(([data, clientList]) => {
        setClients(clientList);
        const clientMap = new Map(clientList.map((c) => [c.id, c.name]));
        const halfGst = (rate: number, amount: number) => {
          if (rate === 0) return { cgst: 0, sgst: 0, igst: 0 };
          const gstAmount = amount - amount / (1 + rate / 100);
          if (data.gst_treatment === "interstate") {
            return { cgst: 0, sgst: 0, igst: gstAmount };
          }
          return { cgst: gstAmount / 2, sgst: gstAmount / 2, igst: 0 };
        };
        setInvoice({
          id: data.id,
          invoice_number: data.invoice_number ?? `INV-${data.id}`,
          client_id: data.client_id,
          client_name: clientMap.get(data.client_id) ?? `Client #${data.client_id}`,
          total: data.total, paid_amount: data.paid_amount,
          balance_due: data.balance_due, status: data.status,
          issue_date: data.issue_date ?? "", due_date: data.due_date ?? "",
          gst_treatment: data.gst_treatment,
          place_of_supply: data.place_of_supply ?? "",
          cgst: data.cgst, sgst: data.sgst, igst: data.igst,
          taxable_value: data.subtotal, notes: data.notes ?? "",
          discount: data.discount,
          discount_type: data.discount_type,
        items: data.items.map((item) => {
            const qty = Number(item.quantity);
            const price = Number(item.unit_price);
            const rate = Number(item.gst_rate);
            const amt = Number(item.amount);
            const gst = halfGst(rate, amt);
            return {
              product: item.description,
              description: item.description,
              quantity: qty,
              unit_price: price,
              gst_percent: rate,
              ...gst,
              total: amt,
            };
          }),
          payments: data.payments,
        });
      })
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const openEditModal = () => {
    if (!invoice) return;
    setEditClientId(String(invoice.client_id || ""));
    setEditGstTreatment(invoice.gst_treatment || "intrastate");
    setEditDiscount(String(invoice.discount || 0));
    setEditDiscountType(invoice.discount_type || "fixed");
    setEditNotes(invoice.notes || "");
    setEditItems(
      invoice.items && invoice.items.length > 0
        ? invoice.items.map((i: any) => ({
            description: i.description || i.product || "",
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unit_price) || 0,
            gstRate: Number(i.gst_percent) ?? 18,
          }))
        : [{ description: "", quantity: 1, unitPrice: 0, gstRate: 18 }]
    );
    setEditOpen(true);
  };

  const handleEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const discount = Number(editDiscount) || 0;
      await api.put(`/invoices/${id}`, {
        client_id: Number(editClientId),
        gst_treatment: editGstTreatment,
        discount,
        discount_type: discount > 0 ? editDiscountType : undefined,
        notes: editNotes || undefined,
        items: editItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unitPrice) || 0,
          gst_rate: Number(item.gstRate) || 0,
        })),
      });
      setEditOpen(false);
      loadInvoice();
    } catch { /* handled */ } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return <InvoiceDetailLoading />;
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
        <FileText className="h-12 w-12" />
        <h2 className="font-heading text-lg font-semibold text-[var(--shell-foreground)]">Invoice not found</h2>
        <Button variant="outline" onClick={() => router.push("/billing/invoices")}>Back to Invoices</Button>
      </div>
    );
  }

  // Computed edit dialog totals
  const editSubtotal = editItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
  const editDiscountAmt = editDiscountType === "percentage"
    ? editSubtotal * (Number(editDiscount) / 100)
    : Number(editDiscount) || 0;
  const editTaxable = Math.max(0, editSubtotal - editDiscountAmt);
  const editTaxTotal = editItems.reduce((s, i) => {
    const base = Number(i.quantity) * Number(i.unitPrice);
    return s + base * (Number(i.gstRate) / 100);
  }, 0);
  const editTotal = editTaxable + editTaxTotal;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/billing/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">{invoice.invoice_number}</h1>
              <Badge variant={statusVariant(invoice.status)} className="capitalize">{invoice.status.replace("_", " ")}</Badge>
            </div>
            <p className="text-sm text-[var(--shell-muted)]">{invoice.client_name} &middot; Due {invoice.due_date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === "draft" && (
            <Button variant="outline" size="sm" onClick={openEditModal}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Invoice
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setRecurringOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Make Recurring
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--chart-1)]/10">
              <DollarSign className="h-4 w-4 text-[var(--chart-1)]" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold">{money(invoice.total)}</p>
              <p className="text-xs text-[var(--shell-muted)]">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--chart-2)]/10">
              <Receipt className="h-4 w-4 text-[var(--chart-2)]" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold">{money(invoice.paid_amount)}</p>
              <p className="text-xs text-[var(--shell-muted)]">Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--chart-3)]/10">
              <Clock className="h-4 w-4 text-[var(--chart-3)]" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold">{money(invoice.balance_due)}</p>
              <p className="text-xs text-[var(--shell-muted)]">Balance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--chart-4)]/10">
              <Calendar className="h-4 w-4 text-[var(--chart-4)]" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold">{invoice.due_date}</p>
              <p className="text-xs text-[var(--shell-muted)]">Due Date</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--shell-muted)]" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              {[
                { icon: Building2, label: "Client", value: invoice.client_name },
                { icon: Mail, label: "GST Treatment", value: invoice.gst_treatment === "intrastate" ? "Intra-State (CGST+SGST)" : "Inter-State (IGST)" },
                { icon: MapPin, label: "Place of Supply", value: invoice.place_of_supply },
                { icon: Globe, label: "GST Type", value: invoice.igst > 0 ? "Inter-State" : "Intra-State" },
                { icon: Calendar, label: "Issue Date", value: invoice.issue_date },
                { icon: Calendar, label: "Due Date", value: invoice.due_date },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--shell-muted)]" />
                  <div>
                    <p className="text-xs text-[var(--shell-muted)]">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </dl>
            {invoice.notes && (
              <p className="mt-4 text-sm text-[var(--shell-muted)]">
                <span className="text-xs font-medium">Notes: </span>{invoice.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgePercent className="h-4 w-4 text-[var(--chart-2)]" />
              GST Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--shell-muted)]">Taxable Value</span>
                <span className="font-mono text-sm font-medium">{money(invoice.taxable_value)}</span>
              </div>
              {invoice.cgst > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--shell-muted)]">CGST @ 9%</span>
                    <span className="font-mono text-sm">{money(invoice.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--shell-muted)]">SGST @ 9%</span>
                    <span className="font-mono text-sm">{money(invoice.sgst)}</span>
                  </div>
                </>
              )}
              {invoice.igst > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--shell-muted)]">IGST @ 18%</span>
                  <span className="font-mono text-sm">{money(invoice.igst)}</span>
                </div>
              )}
              <hr className="border-[var(--shell-border)]" />
              <div className="flex justify-between font-medium">
                <span className="text-sm">Total GST</span>
                <span className="font-mono text-sm">{money(invoice.cgst + invoice.sgst + invoice.igst)}</span>
              </div>
              <div className="flex justify-between font-heading text-base font-semibold">
                <span>Grand Total</span>
                <span className="font-mono">{money(invoice.total)}</span>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--shell-muted)]" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">GST%</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-[200px] truncate font-medium">{item.product}</TableCell>
                  <TableCell className="font-mono text-sm text-right">{item.quantity}</TableCell>
                  <TableCell className="font-mono text-sm text-right">{money(item.unit_price)}</TableCell>
                  <TableCell className="text-right">{item.gst_percent}%</TableCell>
                  <TableCell className="font-mono text-sm text-right">{item.cgst > 0 ? money(item.cgst) : "-"}</TableCell>
                  <TableCell className="font-mono text-sm text-right">{item.sgst > 0 ? money(item.sgst) : "-"}</TableCell>
                  <TableCell className="font-mono text-sm text-right">{item.igst > 0 ? money(item.igst) : "-"}</TableCell>
                  <TableCell className="font-mono text-sm font-medium text-right">{money(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[var(--shell-muted)]" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.reference_id || `#${p.id}`}</TableCell>
                    <TableCell className="font-mono text-sm font-medium text-right">{money(p.amount)}</TableCell>
                    <TableCell>{p.payment_method || "-"}</TableCell>
                    <TableCell className="font-mono text-xs text-[var(--shell-muted)]">{p.reference_id || "-"}</TableCell>
                    <TableCell className="text-[var(--shell-muted)]">{p.payment_date || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <MultiStepDialog
        open={recurringOpen}
        onOpenChange={(v) => { if (!v) setRecStep(0); setRecurringOpen(v); }}
        title="Make Recurring"
        steps={[
          { title: "Schedule", description: `Set up ${invoice?.invoice_number ?? "this invoice"} as a recurring template` },
          { title: "Options", description: "Email and delivery preferences" },
        ]}
        currentStep={recStep}
        onStepChange={setRecStep}
        onSubmit={(e) => { e.preventDefault(); setRecurringOpen(false); }}
        submitLabel="Set Recurring"
      >
        {recStep === 0 && (
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            <div className="space-y-2">
              <Label htmlFor="recurring-frequency" className="text-[var(--shell-muted)]">Frequency</Label>
              <Select defaultValue="Monthly">
                <SelectTrigger id="recurring-frequency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurring-start" className="text-[var(--shell-muted)]">Start Date</Label>
              <Input id="recurring-start" type="date" defaultValue={invoice?.issue_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurring-end" className="text-[var(--shell-muted)]">End Date</Label>
              <Input id="recurring-end" type="date" />
            </div>
          </div>
        )}
        {recStep === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-sm border border-[var(--shell-border)] bg-[var(--shell-surface)] px-4 py-3">
              <input
                type="checkbox"
                id="recurring-email"
                defaultChecked
                className="h-4 w-4 rounded border-input accent-[var(--shell-brand)]"
              />
              <Label htmlFor="recurring-email" className="text-[var(--shell-foreground)] cursor-pointer leading-normal">
                Auto-email invoice to client
              </Label>
            </div>
            <p className="text-xs text-[var(--shell-muted)]">
              When enabled, the invoice will be automatically sent to the client on each cycle date.
            </p>
          </div>
        )}
      </MultiStepDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>Edit Draft Invoice</DialogTitle>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleEditInvoice}>
            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-client">Client</Label>
                  <Select value={editClientId} onValueChange={(v) => v && setEditClientId(v)}>
                    <SelectTrigger id="edit-client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gst">GST Treatment</Label>
                  <Select value={editGstTreatment} onValueChange={(v) => v && setEditGstTreatment(v)}>
                    <SelectTrigger id="edit-gst"><SelectValue /></SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="intrastate">Intrastate (CGST + SGST)</SelectItem>
                      <SelectItem value="interstate">Interstate (IGST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-discount">Discount</Label>
                  <Input
                    id="edit-discount"
                    type="number"
                    min={0}
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-discount-type">Discount Type</Label>
                  <Select value={editDiscountType} onValueChange={(v) => v && setEditDiscountType(v)}>
                    <SelectTrigger id="edit-discount-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed (₹)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional notes or payment instructions..."
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-[--shell-muted]">Line Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditItems([...editItems, { description: "", quantity: 1, unitPrice: 0, gstRate: 18 }])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
                </Button>
              </div>

              {/* Column headers */}
              <div className="grid gap-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted]" style={{ gridTemplateColumns: "1fr 80px 112px 96px 100px 32px" }}>
                <span>Description</span>
                <span className="text-center">Qty</span>
                <span className="text-center">Rate (₹)</span>
                <span className="text-center">GST %</span>
                <span className="text-right">Amount</span>
                <span />
              </div>

              {editItems.map((item, idx) => {
                const lineAmt = Number(item.quantity) * Number(item.unitPrice);
                return (
                  <div key={idx} className="grid items-center gap-2 rounded-md border border-[--shell-border] bg-[--shell-surface] p-2" style={{ gridTemplateColumns: "1fr 80px 112px 96px 100px 32px" }}>
                    <Input
                      placeholder="Description"
                      className="w-full"
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...editItems];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setEditItems(updated);
                      }}
                      required
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      className="text-center"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...editItems];
                        updated[idx] = { ...updated[idx], quantity: Number(e.target.value) };
                        setEditItems(updated);
                      }}
                      required
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Rate"
                      className="text-center"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const updated = [...editItems];
                        updated[idx] = { ...updated[idx], unitPrice: Number(e.target.value) };
                        setEditItems(updated);
                      }}
                      required
                    />
                    <Select
                      value={String(item.gstRate)}
                      onValueChange={(v) => {
                        if (!v) return;
                        const updated = [...editItems];
                        updated[idx] = { ...updated[idx], gstRate: Number(v) };
                        setEditItems(updated);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent align="start" sideOffset={4}>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                        <SelectItem value="28">28%</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-right font-mono text-sm font-medium text-[--shell-foreground] pr-1">
                      {money(lineAmt)}
                    </div>
                    {editItems.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0 h-7 w-7"
                        onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : <span />}
                  </div>
                );
              })}

              {/* Totals summary */}
              <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-3 space-y-1.5">
                <div className="flex justify-between text-sm text-[--shell-muted]">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium text-[--shell-foreground]">{money(editSubtotal)}</span>
                </div>
                {Number(editDiscount) > 0 && (
                  <div className="flex justify-between text-sm text-[--shell-muted]">
                    <span>Discount {editDiscountType === "percentage" ? `(${editDiscount}%)` : ""}</span>
                    <span className="font-mono text-destructive">-{money(editDiscountAmt)}</span>
                  </div>
                )}
                {Number(editDiscount) > 0 && (
                  <div className="flex justify-between text-sm text-[--shell-muted]">
                    <span>Taxable Amount</span>
                    <span className="font-mono font-medium text-[--shell-foreground]">{money(editTaxable)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-[--shell-muted]">
                  <span>GST ({editGstTreatment === "intrastate" ? "CGST + SGST" : "IGST"})</span>
                  <span className="font-mono font-medium text-[--shell-foreground]">{money(editTaxTotal)}</span>
                </div>
                <hr className="border-[--shell-border]" />
                <div className="flex justify-between font-heading text-base font-semibold text-[--shell-foreground]">
                  <span>Total</span>
                  <span className="font-mono">{money(editTotal)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
