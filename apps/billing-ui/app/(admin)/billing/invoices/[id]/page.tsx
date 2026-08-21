"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Send, Ban, CreditCard, Loader2, Pencil, Plus, Trash2,
  Calendar, MapPin, Receipt, Building2, FileSignature, CheckCircle2, Printer,
  AlertTriangle,
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
import { useToast } from "@/contexts/ToastContext";
import { money, formatDate, statusVariant } from "@/utils/format";
import type { InvoiceDetailView } from "@/types/billing";

const GST_RATES = [0, 5, 12, 18, 28];


// Which status transitions are allowed from each state
const statusActions: Record<string, string[]> = {
  draft: ["sent", "void"],
  sent: ["paid", "void"],
  partially_paid: ["paid", "void"],
  overdue: ["paid", "void"],
  paid: [],
  void: [],
};

const actionLabels: Record<string, string> = {
  sent: "Mark as Sent",
  paid: "Mark as Paid",
  void: "Void Invoice",
};

const destructiveActions = new Set(["void"]);

function toLocalDateString(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export default function InvoiceDetail() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [invoice, setInvoice] = useState<InvoiceDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  // Payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Bank_Transfer");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payRef, setPayRef] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  // Confirmation dialog for destructive status actions
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmSaving, setConfirmSaving] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editClientName, setEditClientName] = useState("");
  const [editGstTreatment, setEditGstTreatment] = useState("intrastate");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPlaceOfSupply, setEditPlaceOfSupply] = useState("");
  const [editDiscount, setEditDiscount] = useState("0");
  const [editDiscountType, setEditDiscountType] = useState("fixed");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState([{ description: "", quantity: 1, unitPrice: 0, gstRate: 18 }]);

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
    setEditPlaceOfSupply(invoice.place_of_supply || "");
    setEditDiscount(String(invoice.discount || 0));
    setEditDiscountType(invoice.discount_type || "fixed");
    setEditNotes(invoice.notes || "");
    setEditItems(
      invoice.items && invoice.items.length > 0
        ? invoice.items.map((i: any) => ({
            description: i.description || "",
            quantity: i.quantity || 1,
            unitPrice: i.unit_price || 0,
            gstRate: i.gst_rate || 18,
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
      await api.put(`/invoices/${params.id}`, {
        clientName: editClientName,
        gstTreatment: editGstTreatment,
        dueDate: editDueDate || undefined,
        placeOfSupply: editPlaceOfSupply || undefined,
        discount,
        discountType: discount > 0 ? editDiscountType : undefined,
        notes: editNotes || undefined,
        items: editItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          gstRate: item.gstRate,
        })),
      });
      setEditOpen(false);
      toast.success("Invoice updated successfully");
      loadInvoice();
    } catch {
      toast.error("Failed to update invoice. Please try again.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setActionLoading(status);
    try {
      await api.put(`/invoices/${params.id}/status`, { status });
      toast.success(`Invoice marked as ${status.replace("_", " ")}`);
      loadInvoice();
    } catch {
      toast.error(`Failed to update status. Please try again.`);
    } finally {
      setActionLoading("");
      setConfirmAction(null);
      setConfirmSaving(false);
    }
  };

  const handleConfirmedAction = async () => {
    if (!confirmAction) return;
    setConfirmSaving(true);
    await handleStatusChange(confirmAction);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paySaving) return;
    setPaySaving(true);
    try {
      await api.post("/payments", {
        invoiceId: Number(params.id),
        amount: Number(payAmount),
        paymentMethod: payMethod,
        paymentDate: payDate || undefined,
        referenceId: payRef || undefined,
      });
      setPayOpen(false);
      setPayAmount("");
      setPayRef("");
      setPayDate(new Date().toISOString().split("T")[0]);
      toast.success("Payment recorded successfully");
      loadInvoice();
    } catch {
      toast.error("Failed to record payment. Please try again.");
    } finally {
      setPaySaving(false);
    }
  };

  const editLineTotals = useMemo(() =>
    editItems.map((item) => (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
  [editItems]);
  const editSubtotal = useMemo(() => editLineTotals.reduce((s, v) => s + v, 0), [editLineTotals]);
  const editGstTotal = useMemo(() =>
    editItems.reduce((s, item, idx) => s + editLineTotals[idx] * ((item.gstRate || 0) / 100), 0),
  [editItems, editLineTotals]);
  const editDiscountAmt = useMemo(() => {
    const d = Number(editDiscount) || 0;
    return editDiscountType === "percentage" ? editSubtotal * d / 100 : d;
  }, [editSubtotal, editDiscount, editDiscountType]);
  const editGrandTotal = useMemo(() => editSubtotal - editDiscountAmt + editGstTotal, [editSubtotal, editDiscountAmt, editGstTotal]);

  if (loading) return <LoadingSpinner />;

  if (!invoice) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
        <FileText className="h-12 w-12" />
        <p className="text-base font-medium text-[var(--shell-foreground)]">Invoice not found</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/billing/invoices")}>Back to Invoices</Button>
      </div>
    );
  }

  const actions = statusActions[invoice.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Screen Interactive Layout */}
      <div className="space-y-6 print:hidden">
        {/* Header */}
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
                <Badge variant={statusVariant("invoice", invoice.status)} className="capitalize text-xs font-medium px-2.5 shrink-0 leading-none inline-flex items-center h-[26px]">
                  {invoice.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-base font-medium text-[--shell-muted] truncate">{invoice.client_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 sm:pt-1 flex-wrap">
            {/* Print / PDF */}
            <Button size="sm" variant="outline" onClick={() => window.print()} aria-label="Print invoice">
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print / PDF
            </Button>

            {/* Edit — only for draft */}
            {invoice.status === "draft" && (
              <Button size="sm" variant="outline" onClick={openEditModal}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Invoice
              </Button>
            )}

            {/* Mark as Sent */}
            {actions.includes("sent") && (
              <Button size="sm" onClick={() => handleStatusChange("sent")} disabled={actionLoading === "sent"}>
                {actionLoading === "sent" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                Mark Sent
              </Button>
            )}

            {/* Mark as Paid */}
            {actions.includes("paid") && (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("paid")} disabled={actionLoading === "paid"}
                className="border-[var(--shell-success)]/30 text-[var(--shell-success)] hover:bg-[var(--shell-success-surface)]">
                {actionLoading === "paid" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                Mark as Paid
              </Button>
            )}

            {/* Void — requires confirmation */}
            {actions.includes("void") && (
              <Button size="sm" variant="outline" onClick={() => setConfirmAction("void")} disabled={actionLoading === "void"}
                className="border-[var(--shell-danger)]/30 text-[var(--shell-danger)] hover:bg-[var(--shell-danger-surface)]">
                {actionLoading === "void" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Ban className="mr-1.5 h-3.5 w-3.5" />}
                Void
              </Button>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card><CardContent className="flex flex-col gap-0.5 px-4 py-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Total</span>
            <span className="font-heading text-lg font-bold text-[--shell-foreground]">{money(invoice.total)}</span>
          </CardContent></Card>
          <Card><CardContent className="flex flex-col gap-0.5 px-4 py-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Paid</span>
            <span className="font-heading text-lg font-bold text-[--shell-success]">{money(invoice.paid_amount)}</span>
          </CardContent></Card>
          <Card><CardContent className="flex flex-col gap-0.5 px-4 py-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Balance Due</span>
            <span className="font-heading text-lg font-bold text-[--shell-danger]">{money(invoice.balance_due)}</span>
          </CardContent></Card>
          <Card><CardContent className="flex flex-col gap-0.5 px-4 py-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Due Date</span>
            <span className="font-heading text-lg font-bold text-[--shell-foreground]">{formatDate(invoice.due_date)}</span>
          </CardContent></Card>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card><CardContent className="flex items-center gap-3 px-4 py-3">
            <Calendar className="h-4 w-4 shrink-0 text-[--shell-accent]" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Issue Date</p>
              <p className="text-sm font-medium truncate">{formatDate(invoice.issue_date)}</p>
            </div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 px-4 py-3">
            <MapPin className="h-4 w-4 shrink-0 text-[--chart-3]" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Place of Supply</p>
              <p className="text-sm font-medium truncate">{invoice.place_of_supply || "-"}</p>
            </div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 px-4 py-3">
            <Receipt className="h-4 w-4 shrink-0 text-[--chart-2]" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">GST Treatment</p>
              <p className="text-sm font-medium capitalize truncate">{invoice.gst_treatment?.replace("_", " ") ?? "-"}</p>
            </div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 px-4 py-3">
            <Building2 className="h-4 w-4 shrink-0 text-[--chart-4]" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[--shell-muted]">Type</p>
              <p className="text-sm font-medium capitalize truncate">{invoice.type?.replace("_", " ") ?? "Receivable"}</p>
            </div>
          </CardContent></Card>
        </div>

        {/* Register Payment CTA */}
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

        {/* Line Items Table */}
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
                    <TableCell><p className="text-sm font-medium">{item.description}</p></TableCell>
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
                    <TableCell className="text-right font-mono text-sm text-[--shell-danger]">-{money(invoice.discount)}</TableCell>
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
                  <TableCell className="text-right font-heading text-base font-bold text-[--shell-brand]">{money(invoice.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payment History */}
        {invoice.payments.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                <CreditCard className="h-4 w-4 text-[--shell-accent]" />
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Payment History</span>
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

        {((invoice.creditNotes && invoice.creditNotes.length > 0) || (invoice.debitNotes && invoice.debitNotes.length > 0)) && (
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                <FileText className="h-4 w-4 text-[--shell-brand]" />
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[--shell-foreground]">Adjustments (Credit & Debit Notes)</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Note #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.debitNotes?.map((dn) => (
                    <TableRow key={`dn-${dn.id}`}>
                      <TableCell><Badge className="bg-[--shell-accent]/10 text-[--shell-accent] border-0 hover:bg-[--shell-accent]/20">Debit Note</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{dn.note_number}</TableCell>
                      <TableCell className="text-xs">{dn.date}</TableCell>
                      <TableCell className="text-xs text-[--shell-muted]">{dn.reason ?? "-"}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium text-[--shell-foreground]">{money(dn.amount)}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{dn.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {invoice.creditNotes?.map((cn) => (
                    <TableRow key={`cn-${cn.id}`}>
                      <TableCell><Badge className="bg-[--shell-danger]/10 text-[--shell-danger] border-0 hover:bg-[--shell-danger]/20">Credit Note</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{cn.note_number}</TableCell>
                      <TableCell className="text-xs">{cn.date}</TableCell>
                      <TableCell className="text-xs text-[--shell-muted]">{cn.reason ?? "-"}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium text-[--shell-danger]">-{money(cn.amount)}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{cn.status}</Badge></TableCell>
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
      </div>

      {/* Print-Only Corporate Document Card */}
      <div className="hidden print:block space-y-8">
        <Card className="border-[--shell-border] overflow-hidden relative border-t-4 border-t-[--shell-accent] bg-card">
          <CardContent className="p-8 sm:p-10 space-y-8">
            {/* Top Banner Row */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="font-heading text-lg font-bold tracking-tight text-[--shell-brand]">DATAVEX ERP</h2>
                <p className="text-xs text-[--shell-muted] mt-1 leading-relaxed">
                  100 Corporate Parkway<br />
                  Suite 500, Tech District<br />
                  GSTIN: 29AAAAA0000A1Z5
                </p>
              </div>
              <div className="text-right">
                <h3 className="font-heading text-2xl font-bold tracking-wider text-[--shell-muted]">INVOICE</h3>
                <div className="mt-2 text-xs text-[--shell-muted] space-y-1">
                  <p><span className="font-medium">Invoice #:</span> {invoice.invoice_number}</p>
                  <p><span className="font-medium">Date:</span> {formatDate(invoice.issue_date)}</p>
                  <p><span className="font-medium">Due Date:</span> {formatDate(invoice.due_date)}</p>
                </div>
              </div>
            </div>

            {/* Bill To Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[--shell-bg] p-4.5 rounded-xl border border-[--shell-border]/40">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[--shell-muted]">Client Billing Address</span>
                <div className="mt-2 flex items-start gap-2.5">
                  <Building2 className="h-4 w-4 text-[--shell-brand] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[--shell-foreground]">{invoice.client_name}</p>
                    <p className="text-xs text-[--shell-muted] mt-0.5">Client ID: {invoice.client_id}</p>
                  </div>
                </div>
              </div>
              <div className="md:border-l md:border-[--shell-border]/80 md:pl-6 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[--shell-muted]">Payment & Terms</span>
                <p className="text-xs font-semibold text-[--shell-foreground] mt-2">Place of Supply: {invoice.place_of_supply}</p>
                <p className="text-xs text-[--shell-muted] mt-0.5">GST Treatment: {invoice.gst_treatment?.replace("_", " ")}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <Table className="border border-[--shell-border] rounded-xl overflow-hidden">
                <TableHeader className="bg-[--shell-bg]">
                  <TableRow className="border-b border-[--shell-border]">
                    <TableHead className="w-10 text-center font-bold">#</TableHead>
                    <TableHead className="font-bold">Description</TableHead>
                    <TableHead className="text-right w-16 font-bold">Qty</TableHead>
                    <TableHead className="text-right w-24 font-bold">Rate</TableHead>
                    <TableHead className="text-right w-16 font-bold">GST%</TableHead>
                    <TableHead className="text-right w-28 font-bold">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, i) => (
                    <TableRow key={i} className="border-b border-[--shell-border] hover:bg-muted/50">
                      <TableCell className="text-xs text-[--shell-muted] text-center">{i + 1}</TableCell>
                      <TableCell className="text-sm font-semibold text-[--shell-foreground]">{item.description}</TableCell>
                      <TableCell className="text-right font-medium text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-[--shell-muted]">{money(item.unit_price)}</TableCell>
                      <TableCell className="text-right text-xs text-[--shell-muted]">{item.gst_rate}%</TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold text-[--shell-foreground]">{money(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Bottom Financial Columns */}
            <div className="flex flex-col md:flex-row justify-between gap-6 pt-4 border-t border-[--shell-border]">
              <div className="max-w-md">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[--shell-muted]">Corporate Terms & Declaration</span>
                <p className="text-[11px] text-[--shell-muted] mt-2 leading-relaxed">
                  All prices are quoted in local currency inclusive of standard regional taxes as indicated. 
                  Payment is due within the designated terms.
                </p>
              </div>
              <div className="w-full md:w-80 space-y-2 text-sm bg-[--shell-bg]/30 p-4 rounded-xl border border-[--shell-border]/40">
                <div className="flex justify-between text-[--shell-muted]">
                  <span>Subtotal (Taxable)</span>
                  <span className="font-mono">{money(invoice.subtotal)}</span>
                </div>
                
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-[--shell-muted]">
                    <span>Discount ({invoice.discount_type})</span>
                    <span className="font-mono text-[--shell-danger]">-{money(invoice.discount)}</span>
                  </div>
                )}

                {invoice.cgst > 0 && (
                  <div className="flex justify-between text-[11px] text-[--shell-muted] pl-2 border-l border-[--shell-accent]/50">
                    <span>CGST</span>
                    <span className="font-mono">{money(invoice.cgst)}</span>
                  </div>
                )}
                {invoice.sgst > 0 && (
                  <div className="flex justify-between text-[11px] text-[--shell-muted] pl-2 border-l border-[--shell-accent]/50">
                    <span>SGST</span>
                    <span className="font-mono">{money(invoice.sgst)}</span>
                  </div>
                )}
                {invoice.igst > 0 && (
                  <div className="flex justify-between text-[11px] text-[--shell-muted] pl-2 border-l border-[--shell-accent]/50">
                    <span>IGST</span>
                    <span className="font-mono">{money(invoice.igst)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-bold text-[--shell-foreground] pt-1 border-t border-[--shell-border]/50">
                  <span>Grand Total</span>
                  <span className="font-mono text-[--shell-brand]">{money(invoice.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {invoice.notes && (
          <Card className="border-[--shell-border] shadow-engineered bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileSignature className="h-4 w-4 text-[--shell-brand]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[--shell-foreground]">Customer Remarks & Notes</h4>
              </div>
              <p className="text-sm text-[--shell-muted] whitespace-pre-wrap leading-relaxed pl-6">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Register Payment Dialog ─────────────────────────────────────── */}
      <Dialog open={payOpen} onOpenChange={(open) => { if (!paySaving) setPayOpen(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register Payment</DialogTitle></DialogHeader>
          <form className="space-y-5" onSubmit={handleRegisterPayment}>
            <div className="flex items-center justify-between rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-4 py-3">
              <span className="text-sm text-[var(--shell-muted)]">Balance Due</span>
              <span className="font-mono font-semibold text-[var(--shell-brand)]">{money(invoice.balance_due)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount (₹)</Label>
              <Input id="pay-amount" type="number" min={0.01} max={invoice.balance_due + 1} step={0.01}
                placeholder="0.00" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-date">Payment Date</Label>
              <Input id="pay-date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-method">Method</Label>
              <Select value={payMethod} onValueChange={(v) => v !== null && setPayMethod(v)}>
                <SelectTrigger id="pay-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank_Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Credit_Card">Credit Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-ref">Reference ID <span className="text-[--shell-muted] font-normal">(optional)</span></Label>
              <Input id="pay-ref" placeholder="Transaction / UTR reference" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
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

      {/* ── Confirmation Dialog for Destructive Actions ─────────────────── */}
      <Dialog open={confirmAction !== null} onOpenChange={(open) => { if (!confirmSaving && !open) setConfirmAction(null); }}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--shell-danger-surface)] text-[var(--shell-danger)]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle>Confirm {confirmAction ? (actionLabels[confirmAction] ?? confirmAction) : ""}</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-[--shell-muted] leading-relaxed pt-1">
            {confirmAction === "void" && (
              <>Are you sure you want to void invoice <strong>{invoice.invoice_number}</strong>? A voided invoice cannot be edited or un-voided. Existing payments are not reversed.</>
            )}
          </p>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setConfirmAction(null)} disabled={confirmSaving}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmedAction} disabled={confirmSaving}>
              {confirmSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
              {confirmAction ? (actionLabels[confirmAction] ?? confirmAction) : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Invoice Dialog ─────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!editSaving) setEditOpen(open); }}>
        <DialogContent
          className="flex flex-col overflow-hidden p-0 shadow-2xl"
          style={{ maxWidth: "min(900px, calc(100vw - 64px))", width: "100%", maxHeight: "calc(100vh - 64px)" }}
        >
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between px-6 pt-5 pb-4 border-b border-border">
            <DialogTitle>Edit Draft Invoice — {invoice.invoice_number}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form id="edit-invoice-form" className="space-y-5" onSubmit={handleEditInvoice}>
              <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="edit-client">Client Name</Label>
                    <Input id="edit-client" required value={editClientName} onChange={(e) => setEditClientName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-gst">GST Treatment</Label>
                    <Select value={editGstTreatment} onValueChange={(v) => v && setEditGstTreatment(v)}>
                      <SelectTrigger id="edit-gst" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intrastate">Intrastate (CGST + SGST)</SelectItem>
                        <SelectItem value="interstate">Interstate (IGST)</SelectItem>
                        <SelectItem value="exempt">Exempt / Non-GST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-due-date">Due Date</Label>
                    <Input id="edit-due-date" type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-place">Place of Supply</Label>
                    <Input id="edit-place" placeholder="e.g. Maharashtra" value={editPlaceOfSupply} onChange={(e) => setEditPlaceOfSupply(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-discount">Discount</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input id="edit-discount" type="number" min={0} value={editDiscount} onChange={(e) => setEditDiscount(e.target.value)} />
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
                    <Input id="edit-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional notes or payment instructions..." />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[--shell-muted]">Line Items</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditItems([...editItems, { description: "", quantity: 1, unitPrice: 0, gstRate: 18 }])}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
                  </Button>
                </div>
                <div className="hidden sm:grid grid-cols-[2fr_80px_1fr_90px_36px] gap-2 mb-2 px-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted]">Description</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted] text-right">Qty</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted] text-right">Rate</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[--shell-muted] text-center">GST %</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-[2fr_80px_1fr_90px_36px] gap-2 items-start rounded-md border border-[--shell-border] p-3">
                      <div>
                        <Label className="sm:hidden text-[11px] text-[--shell-muted] mb-1 block">Description</Label>
                        <Input placeholder="Description" value={item.description}
                          onChange={(e) => { const u = [...editItems]; u[idx] = { ...u[idx], description: e.target.value }; setEditItems(u); }} required />
                      </div>
                      <div>
                        <Label className="sm:hidden text-[11px] text-[--shell-muted] mb-1 block">Qty</Label>
                        <Input type="number" min={1} placeholder="Qty" value={item.quantity}
                          onChange={(e) => { const u = [...editItems]; u[idx] = { ...u[idx], quantity: Number(e.target.value) }; setEditItems(u); }} required />
                      </div>
                      <div>
                        <Label className="sm:hidden text-[11px] text-[--shell-muted] mb-1 block">Rate</Label>
                        <Input type="number" min={0} placeholder="Rate" value={item.unitPrice}
                          onChange={(e) => { const u = [...editItems]; u[idx] = { ...u[idx], unitPrice: Number(e.target.value) }; setEditItems(u); }} required />
                      </div>
                      <div>
                        <Label className="sm:hidden text-[11px] text-[--shell-muted] mb-1 block">GST %</Label>
                        <Select value={String(item.gstRate)} onValueChange={(v) => { const u = [...editItems]; u[idx] = { ...u[idx], gstRate: Number(v) }; setEditItems(u); }}>
                          <SelectTrigger className="h-9 text-xs font-mono font-semibold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {GST_RATES.map((r) => <SelectItem key={r} value={String(r)} className="font-mono">{r}%</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end sm:pt-0 pt-2">
                        {editItems.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0"
                            onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}>
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
                  {editDiscountAmt > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[--shell-muted]">Discount</span>
                      <span className="font-mono font-medium text-[--shell-danger]">-{money(editDiscountAmt)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[--shell-muted]">GST</span>
                    <span className="font-mono font-medium">{money(editGstTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[--shell-border] pt-2 mt-1">
                    <span className="text-sm font-semibold text-[--shell-foreground]">Grand Total</span>
                    <span className="font-heading text-lg font-bold text-[--shell-brand]">{money(editGrandTotal)}</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-[--shell-surface] px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" form="edit-invoice-form" disabled={editSaving}>
              {editSaving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
