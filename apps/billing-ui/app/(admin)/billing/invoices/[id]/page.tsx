"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Send, Ban, CreditCard, Loader2, Pencil, Plus, Trash2,
  Calendar, MapPin, Receipt, Building2, FileSignature,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { api } from "@/services/api";
import { money, formatDate } from "@/utils/format";
import type { InvoiceDetailView } from "@/types/billing";

const statusVariant = (s: string) => {
  if (s === "paid") return "default" as const;
  if (s === "sent" || s === "pending") return "secondary" as const;
  if (s === "overdue") return "destructive" as const;
  return "outline" as const;
};

const statusActions: Record<string, string[]> = {
  draft: ["sent", "void"],
  sent: ["void"],
  partially_paid: ["void"],
  overdue: [],
  paid: [],
  void: [],
};

function toLocalDateString(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export default function InvoiceDetail() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [paySaving, setPaySaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editClientName, setEditClientName] = useState("");
  const [editGstTreatment, setEditGstTreatment] = useState("intrastate");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDiscount, setEditDiscount] = useState("0");
  const [editDiscountType, setEditDiscountType] = useState("fixed");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const loadInvoice = useCallback(() => {
    if (!params.id) return;
    setLoading(true);
    api.get<InvoiceDetailView>(`/invoices/${params.id}`)
      .then(setInvoice)
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  const openEditModal = () => {
    if (!invoice) return;
    setEditClientName(invoice.client_name || "");
    setEditGstTreatment(invoice.gst_treatment || "intrastate");
    setEditDueDate(toLocalDateString(invoice.due_date));
    setEditDiscount(String(invoice.discount || 0));
    setEditDiscountType(invoice.discount_type || "fixed");
    setEditNotes(invoice.notes || "");
    setEditItems(
      invoice.items && invoice.items.length > 0
        ? invoice.items.map((i: any) => ({
            description: i.description || "",
            quantity: i.quantity || 1,
            unitPrice: i.unit_price || 0,
          }))
        : [{ description: "", quantity: 1, unitPrice: 0 }]
    );
    setEditOpen(true);
  };

  const handleEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const discount = Number(editDiscount) || 0;
      await api.put(`/invoices/${params.id}`, {
        client_name: editClientName,
        gst_treatment: editGstTreatment,
        due_date: editDueDate || undefined,
        discount,
        discount_type: discount > 0 ? editDiscountType : undefined,
        notes: editNotes || undefined,
        items: editItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unitPrice) || 0,
          gst_rate: 18,
        })),
      });
      setEditOpen(false);
      loadInvoice();
    } catch { /* handled */ } finally {
      setEditSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setActionLoading(status);
    try {
      await api.put(`/invoices/${params.id}/status`, { status });
      loadInvoice();
    } catch { /* handled */ } finally {
      setActionLoading("");
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaySaving(true);
    try {
      await api.post("/payments", {
        invoice_id: Number(params.id),
        amount: Number(payAmount),
        payment_method: payMethod,
      });
      setPayOpen(false);
      setPayAmount("");
      loadInvoice();
    } catch { /* handled */ } finally {
      setPaySaving(false);
    }
  };

  const editLineTotals = useMemo(() =>
    editItems.map((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      return qty * price;
    }), [editItems]);

  const editSubtotal = useMemo(() => editLineTotals.reduce((s, v) => s + v, 0), [editLineTotals]);
  const editGstTotal = useMemo(() => editSubtotal * 0.18, [editSubtotal]);
  const editGrandTotal = useMemo(() => {
    const discount = Number(editDiscount) || 0;
    const dt = editDiscountType;
    const discAmt = dt === "percentage" ? editSubtotal * discount / 100 : discount;
    return editSubtotal - discAmt + editGstTotal;
  }, [editSubtotal, editGstTotal, editDiscount, editDiscountType]);

  if (loading) return <LoadingSpinner />;

  if (!invoice) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
        <FileText className="h-12 w-12" />
        <p className="text-base font-medium text-[--shell-foreground]">Invoice not found</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/billing/invoices")}>Back to Invoices</Button>
      </div>
    );
  }

  const actions = statusActions[invoice.status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-0">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="icon" aria-label="Back to invoices" onClick={() => router.push("/billing/invoices")} className="shrink-0 mt-1 -ml-2 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-[34px] font-bold leading-tight tracking-tight text-[--shell-foreground] truncate">
                {invoice.invoice_number}
              </h1>
              <Badge variant={statusVariant(invoice.status)} className="capitalize text-xs font-medium px-2.5 rounded-full shrink-0 leading-none inline-flex items-center h-[26px]">
                {invoice.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-base font-medium text-[--shell-muted] truncate">{invoice.client_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 sm:pt-1">
          {invoice.status === "draft" && (
            <Button size="sm" variant="outline" onClick={openEditModal}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit Invoice
            </Button>
          )}
          {actions.includes("sent") && (
            <Button size="sm" onClick={() => handleStatusChange("sent")} disabled={actionLoading === "sent"}>
              {actionLoading === "sent" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Mark Sent
            </Button>
          )}
          {actions.includes("void") && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange("void")} disabled={actionLoading === "void"}>
              {actionLoading === "void" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Ban className="mr-1.5 h-3.5 w-3.5" />}
              Void
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-0.5 px-4 py-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Total</span>
            <span className="font-heading text-lg font-bold text-[--shell-foreground]">{money(invoice.total)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-0.5 px-4 py-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Paid</span>
            <span className="font-heading text-lg font-bold text-[--shell-success]">{money(invoice.paid_amount)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-0.5 px-4 py-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Balance Due</span>
            <span className="font-heading text-lg font-bold text-[--shell-danger]">{money(invoice.balance_due)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-0.5 px-4 py-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Due Date</span>
            <span className="font-heading text-lg font-bold text-[--shell-foreground]">{formatDate(invoice.due_date)}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <Calendar className="h-4 w-4 shrink-0 text-[--shell-accent]" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Issue Date</p>
              <p className="text-sm font-medium truncate">{formatDate(invoice.issue_date)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <MapPin className="h-4 w-4 shrink-0 text-[--chart-3]" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Place of Supply</p>
              <p className="text-sm font-medium truncate">{invoice.place_of_supply || "-"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <Receipt className="h-4 w-4 shrink-0 text-[--chart-2]" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">GST Treatment</p>
              <p className="text-sm font-medium capitalize truncate">{invoice.gst_treatment?.replace("_", " ") ?? "-"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <Building2 className="h-4 w-4 shrink-0 text-[--chart-4]" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Type</p>
              <p className="text-sm font-medium capitalize truncate">{invoice.type?.replace("_", " ") ?? "Receivable"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {(invoice.status === "sent" || invoice.status === "partially_paid" || invoice.status === "overdue") && invoice.balance_due > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[--shell-accent]/20 bg-gradient-to-r from-[--shell-accent]/5 to-transparent px-5 py-3">
          <span className="text-sm text-[--shell-muted]">
            Outstanding: <strong className="text-[--shell-foreground]">{money(invoice.balance_due)}</strong>
          </span>
          <Button size="sm" className="ml-auto" onClick={() => setPayOpen(true)}>
            <CreditCard className="mr-1 h-4 w-4" /> Register Payment
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right w-16">Qty</TableHead>
                <TableHead className="text-right w-24">Rate</TableHead>
                <TableHead className="text-right w-16">GST%</TableHead>
                <TableHead className="text-right w-20">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs text-[--shell-muted]">{i + 1}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{item.description}</p>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{money(item.unit_price)}</TableCell>
                  <TableCell className="text-right">{item.gst_rate}%</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{money(item.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableBody>
              {invoice.discount > 0 && (
                <TableRow>
                  <TableCell colSpan={4} />
                  <TableCell className="text-xs text-[--shell-muted] text-right">Discount</TableCell>
                  <TableCell className="text-right font-mono text-sm text-[--shell-danger]">
                    -{money(invoice.discount)}
                  </TableCell>
                </TableRow>
              )}
              {invoice.cgst > 0 && (
                <TableRow>
                  <TableCell colSpan={4} />
                  <TableCell className="text-xs text-[--shell-muted] text-right">CGST @{invoice.items[0]?.gst_rate ? (Number(invoice.items[0].gst_rate) / 2) : 0}%</TableCell>
                  <TableCell className="text-right font-mono text-xs">{money(invoice.cgst)}</TableCell>
                </TableRow>
              )}
              {invoice.sgst > 0 && (
                <TableRow>
                  <TableCell colSpan={4} />
                  <TableCell className="text-xs text-[--shell-muted] text-right">SGST @{invoice.items[0]?.gst_rate ? (Number(invoice.items[0].gst_rate) / 2) : 0}%</TableCell>
                  <TableCell className="text-right font-mono text-xs">{money(invoice.sgst)}</TableCell>
                </TableRow>
              )}
              {invoice.igst > 0 && (
                <TableRow>
                  <TableCell colSpan={4} />
                  <TableCell className="text-xs text-[--shell-muted] text-right">IGST @{invoice.items[0]?.gst_rate ?? 0}%</TableCell>
                  <TableCell className="text-right font-mono text-xs">{money(invoice.igst)}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={4} />
                <TableCell className="text-xs font-semibold text-[--shell-foreground] text-right">Total</TableCell>
                <TableCell className="text-right font-heading text-base font-bold text-[--shell-brand]">
                  {money(invoice.total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invoice.payments.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
              <CreditCard className="h-4 w-4 text-[--shell-accent]" />
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">
                Payment History
              </span>
              <span className="text-xs text-[--shell-muted] ml-auto">
                {money(invoice.payments.reduce((s, p) => s + p.amount, 0))} total collected
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{formatDate(p.payment_date ?? p.created_at)}</TableCell>
                    <TableCell className="capitalize text-xs">{p.payment_method?.replace("_", " ") ?? "-"}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted] font-mono">{p.reference_number ?? p.reference_id ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">{money(p.amount)}</TableCell>
                    <TableCell><Badge variant={p.status === "cleared" ? "default" : "outline"} className="capitalize text-xs">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <CardContent className="flex items-start gap-3 px-5 py-4">
            <FileSignature className="h-4 w-4 text-[--shell-muted] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[--shell-muted] mb-1">Notes</p>
              <p className="text-sm text-[--shell-foreground] whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Payment</DialogTitle>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleRegisterPayment}>
            <div className="flex items-center justify-between rounded-lg border border-[--shell-border] bg-[--shell-surface] px-4 py-3">
              <span className="text-sm text-[--shell-muted]">Balance Due</span>
              <span className="font-mono font-semibold text-[--shell-brand]">{money(invoice.balance_due)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount (₹)</Label>
              <Input id="pay-amount" type="number" min={0.01} max={invoice.balance_due} step={0.01} placeholder="0.00" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-method">Method</Label>
              <Select value={payMethod} onValueChange={(v) => v !== null && setPayMethod(v)}>
                <SelectTrigger id="pay-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={paySaving || !payAmount}>
                {paySaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>Edit Draft Invoice</DialogTitle>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleEditInvoice}>
            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="edit-client">Client Name</Label>
                  <Input
                    id="edit-client"
                    required
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gst">GST Treatment</Label>
                  <Select value={editGstTreatment} onValueChange={(v) => v && setEditGstTreatment(v)}>
                    <SelectTrigger id="edit-gst" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intrastate">Intrastate (CGST + SGST)</SelectItem>
                      <SelectItem value="interstate">Interstate (IGST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-due-date">Due Date</Label>
                  <Input
                    id="edit-due-date"
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-discount">Discount</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="edit-discount"
                      type="number"
                      min={0}
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(e.target.value)}
                    />
                    <Select value={editDiscountType} onValueChange={(v) => v && setEditDiscountType(v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed (₹)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Input
                    id="edit-notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Optional notes or payment instructions..."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[--shell-muted]">Line Items</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditItems([...editItems, { description: "", quantity: 1, unitPrice: 0 }])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
                </Button>
              </div>

              <div className="hidden sm:grid grid-cols-[2fr_80px_1fr_72px_36px] gap-2 mb-2 px-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted]">Description</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted] text-right">Qty</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted] text-right">Rate</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted] text-center">GST</span>
                <span />
              </div>

              <div className="space-y-2">
                {editItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-[2fr_80px_1fr_72px_36px] gap-2 items-start rounded-md border border-[--shell-border] p-3">
                    <div>
                      <Label className="sm:hidden text-[11px] text-[--shell-muted] mb-1 block">Description</Label>
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...editItems];
                          updated[idx] = { ...updated[idx], description: e.target.value };
                          setEditItems(updated);
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label className="sm:hidden text-[11px] text-[--shell-muted] mb-1 block">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...editItems];
                          updated[idx] = { ...updated[idx], quantity: Number(e.target.value) };
                          setEditItems(updated);
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label className="sm:hidden text-[11px] text-[--shell-muted] mb-1 block">Rate</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Rate"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const updated = [...editItems];
                          updated[idx] = { ...updated[idx], unitPrice: Number(e.target.value) };
                          setEditItems(updated);
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label className="sm:hidden text-[11px] text-[--shell-muted] mb-1 block">GST</Label>
                      <div className="flex items-center justify-center h-9 rounded-md border border-[--shell-border] bg-[--shell-bg] px-2">
                        <Badge variant="outline" className="text-[11px] font-mono px-1.5 py-0">18%</Badge>
                      </div>
                    </div>
                    <div className="flex items-end sm:pt-0 pt-2">
                      {editItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive shrink-0"
                          onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-1 border-t border-[--shell-border] pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[--shell-muted]">Subtotal</span>
                  <span className="font-mono font-medium">{money(editSubtotal)}</span>
                </div>
                {Number(editDiscount) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[--shell-muted]">Discount</span>
                    <span className="font-mono font-medium text-[--shell-danger]">
                      -{money(editDiscountType === "percentage" ? editSubtotal * Number(editDiscount) / 100 : Number(editDiscount))}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[--shell-muted]">GST (18%)</span>
                  <span className="font-mono font-medium">{money(editGstTotal)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[--shell-border] pt-2 mt-1">
                  <span className="text-sm font-semibold text-[--shell-foreground]">Grand Total</span>
                  <span className="font-heading text-lg font-bold text-[--shell-brand]">{money(editGrandTotal)}</span>
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
