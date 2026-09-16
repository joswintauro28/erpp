"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Send, Ban, Loader2, Calendar, Clock,
  Building2, FileSignature, Receipt, Hash, ExternalLink,
  Trash2, AlertCircle, CheckCircle, XCircle, Plus, Printer,
  FileCheck, ShieldAlert, Pencil
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { LoadingSpinner, handleError } from "@datavex/ui-theme";
import { api } from "@/services/api";
import { money, formatDate, quotationStatusVariant as statusVariant } from "@/utils/format";
import { useAuth } from "@/contexts/AuthContext";
import type { QuotationDetailView } from "@/types/billing";

const STATUS_FLOW = [
  { key: "draft", label: "Draft", icon: FileText, color: "var(--chart-4)" },
  { key: "sent", label: "Sent", icon: Send, color: "var(--chart-5)" },
  { key: "accepted", label: "Accepted", icon: CheckCircle, color: "var(--chart-2)" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "var(--shell-danger)" },
  { key: "expired", label: "Expired", icon: AlertCircle, color: "var(--shell-muted)" },
];

const STATUS_ACTIONS: Record<string, { label: string; icon: any; action: string; variant?: "default" | "outline" | "destructive"; description: string }[]> = {
  draft: [
    { label: "Send to Client", icon: Send, action: "sent", description: "Marks quotation as sent to the client for review" },
    { label: "Edit Quotation", icon: Pencil, action: "edit", description: "Modify quotation details, items, or terms" },
    { label: "Delete", icon: Trash2, action: "delete", variant: "destructive", description: "Permanently removes this draft quotation" },
  ],
  sent: [
    { label: "Accept Quote", icon: CheckCircle, action: "accepted", description: "Client has accepted the quotation" },
    { label: "Mark Rejected", icon: Ban, action: "rejected", variant: "outline", description: "Client has declined this quotation" },
  ],
  accepted: [],
  rejected: [],
  expired: [],
};

export default function QuotationDetail() {
  const params = useParams();
  const router = useRouter();
  const [quotation, setQuotation] = useState<QuotationDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const loadQuotation = useCallback(() => {
    if (!params.id) return;
    setLoading(true);
    api.get<QuotationDetailView>(`/invoices/quotations/${params.id}`)
      .then(setQuotation)
      .catch(() => setQuotation(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { loadQuotation(); }, [loadQuotation]);

  const handleStatusChange = async (status: string) => {
    setActionLoading(status);
    try {
      await api.put(`/invoices/quotations/${params.id}/status?status=${status}`);
      loadQuotation();
    } catch (err) { handleError(err); } finally {
      setActionLoading("");
    }
  };

  const handleConvert = async () => {
    setActionLoading("convert");
    try {
      await api.post(`/invoices/quotations/${params.id}/convert`);
      loadQuotation();
    } catch (err) { handleError(err); } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async () => {
    setDeleteSaving(true);
    try {
      await api.delete(`/invoices/quotations/${params.id}`);
      router.push("/billing/quotations");
    } catch (err) { handleError(err); } finally {
      setDeleteSaving(false);
      setDeleteOpen(false);
    }
  };

  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const canEdit = permissions.includes("quotations.edit");
  const canDelete = permissions.includes("quotations.delete");

  // Live calculations for details view
  const financialSummary = useMemo(() => {
    if (!quotation) return { subtotal: 0, totalGst: 0, grandTotal: 0, taxGroups: [] };
    const subtotal = quotation.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalGst = quotation.items.reduce((sum, item) => sum + (item.quantity * item.unit_price * (item.gst_rate / 100)), 0);

    // Group items by GST rate
    const groups: Record<number, number> = {};
    quotation.items.forEach((item) => {
      const rate = item.gst_rate;
      const itemTaxable = item.quantity * item.unit_price;
      groups[rate] = (groups[rate] || 0) + itemTaxable;
    });

    const taxGroups = Object.keys(groups).map((rateStr) => {
      const rate = Number(rateStr);
      const taxable = groups[rate];
      const cgstRate = rate / 2;
      const sgstRate = rate / 2;
      const cgstAmount = taxable * (cgstRate / 100);
      const sgstAmount = taxable * (sgstRate / 100);
      return {
        rate,
        taxable,
        cgstRate,
        sgstRate,
        cgstAmount,
        sgstAmount,
        totalGst: cgstAmount + sgstAmount
      };
    });

    return {
      subtotal,
      totalGst,
      grandTotal: quotation.total,
      taxGroups
    };
  }, [quotation]);

  if (loading) return <LoadingSpinner />;

  if (!quotation) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
        <FileText className="h-12 w-12 text-[var(--shell-brand)]" />
        <p className="text-base font-medium text-[var(--shell-foreground)]">Quotation not found</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/billing/quotations")}>Back to Quotations</Button>
      </div>
    );
  }

  const statusIdx = STATUS_FLOW.findIndex((s) => s.key === quotation.status);
  const allActions = STATUS_ACTIONS[quotation.status] ?? [];
  const actions = allActions.filter((a) => {
    if (a.action === "delete") return canDelete;
    if (a.action === "edit" || ["sent","accepted","rejected"].includes(a.action)) return canEdit;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[--shell-border] pb-5 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="rounded-full border-[--shell-border] hover:bg-[--shell-surface-alt]" aria-label="Back to quotations" title="Back to quotations" onClick={() => router.push("/billing/quotations")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {canEdit && quotation.status === "draft" && (
            <Button variant="outline" size="icon" className="rounded-full border-[--shell-border] hover:bg-[--shell-surface-alt]" aria-label="Edit quotation" title="Edit quotation" onClick={() => router.push(`/billing/quotations/${quotation.id}/edit`)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--shell-foreground)] truncate">
                {quotation.quote_number}
              </h1>
              <Badge variant={statusVariant(quotation.status)} className="capitalize shrink-0 px-2.5 py-0.5 font-semibold text-xs tracking-wider">
                {quotation.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--shell-muted)] font-medium truncate">{quotation.client_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-[var(--shell-border)]" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4 text-[var(--shell-muted)]" /> Print / PDF
          </Button>
        </div>
      </div>

      {quotation.converted_invoice_id && (
        <div className="flex items-center gap-3.5 rounded-xl border border-[var(--shell-success)]/20 bg-gradient-to-r from-[var(--shell-success-surface)]/5 to-transparent px-5 py-4.5 shadow-sm animate-kpi print:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--shell-success)]/10 text-[var(--shell-success)]">
            <FileCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-[var(--shell-foreground)]">Converted to Invoice</h4>
            <p className="text-xs text-[var(--shell-muted)] mt-0.5">
              This quotation has been accepted and successfully converted into active invoice.
            </p>
          </div>
          <Button size="sm" variant="outline" className="border-[var(--shell-success)]/20 text-[var(--shell-success)] hover:bg-[var(--shell-success)]/10 ml-auto" onClick={() => router.push(`/billing/invoices/${quotation.converted_invoice_id}`)}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View Invoice
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Document Body */}
        <div className="lg:col-span-2 space-y-6 print:col-span-3">
          {/* Printable Corporate Document Card */}
          <Card className="border-[var(--shell-border)] overflow-hidden shadow-engineered relative border-t-4 border-t-[var(--shell-accent)]">
            <CardContent className="p-8 sm:p-10 space-y-8">
              {/* Top Banner Row */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="font-heading text-lg font-bold tracking-tight text-[var(--shell-brand)]">DATAVEX ERP</h2>
                  <p className="text-xs text-[var(--shell-muted)] mt-1 leading-relaxed">
                    100 Corporate Parkway<br />
                    Suite 500, Tech District<br />
                    GSTIN: 29AAAAA0000A1Z5
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="font-heading text-2xl font-bold tracking-wider text-[var(--shell-muted)]">QUOTATION</h3>
                  <div className="mt-2 text-xs text-[var(--shell-muted)] space-y-1">
                    <p><span className="font-medium">Quote #:</span> {quotation.quote_number}</p>
                    <p><span className="font-medium">Date:</span> {formatDate(quotation.issue_date)}</p>
                    <p><span className="font-medium">Expiry:</span> {formatDate(quotation.valid_until)}</p>
                  </div>
                </div>
              </div>

              {/* Bill To Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--shell-bg)] p-4.5 rounded-xl border border-[var(--shell-border)]/40">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--shell-muted)]">Client Billing Address</span>
                  <div className="mt-2 flex items-start gap-2.5">
                    <Building2 className="h-4 w-4 text-[var(--shell-brand)] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--shell-foreground)]">{quotation.client_name}</p>
                      <p className="text-xs text-[var(--shell-muted)] mt-0.5">Client ID: {quotation.client_id}</p>
                    </div>
                  </div>
                </div>
                <div className="md:border-l md:border-[var(--shell-border)]/80 md:pl-6 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--shell-muted)]">Payment & Terms</span>
                  <p className="text-xs font-semibold text-[var(--shell-foreground)] mt-2">Validity: 30 Days</p>
                  <p className="text-xs text-[var(--shell-muted)] mt-0.5">Payment Terms: Bank Transfer / Net 30</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <Table className="border border-[var(--shell-border)] rounded-xl overflow-hidden">
                  <TableHeader className="bg-[var(--shell-bg)]">
                    <TableRow className="border-b border-[var(--shell-border)]">
                      <TableHead className="w-10 text-center font-bold">#</TableHead>
                      <TableHead className="font-bold">Description</TableHead>
                      <TableHead className="text-right w-16 font-bold">Qty</TableHead>
                      <TableHead className="text-right w-24 font-bold">Rate</TableHead>
                      <TableHead className="text-right w-16 font-bold">GST%</TableHead>
                      <TableHead className="text-right w-28 font-bold">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotation.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-[var(--shell-muted)] py-10 text-sm">
                          No line items defined
                        </TableCell>
                      </TableRow>
                    ) : quotation.items.map((item, i) => (
                      <TableRow key={i} className="border-b border-[var(--shell-border)] hover:bg-muted/50">
                        <TableCell className="text-xs text-[var(--shell-muted)] text-center">{i + 1}</TableCell>
                        <TableCell className="text-sm font-semibold text-[var(--shell-foreground)]">{item.description}</TableCell>
                        <TableCell className="text-right font-medium text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-[var(--shell-muted)]">{money(item.unit_price)}</TableCell>
                        <TableCell className="text-right text-xs text-[var(--shell-muted)]">{item.gst_rate}%</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold text-[var(--shell-foreground)]">{money(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Bottom Financial Columns */}
              <div className="flex flex-col md:flex-row justify-between gap-6 pt-4 border-t border-[var(--shell-border)]">
                <div className="max-w-md">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--shell-muted)]">Corporate Terms & Declaration</span>
                  <p className="text-[11px] text-[var(--shell-muted)] mt-2 leading-relaxed">
                    All prices are quoted in local currency inclusive of standard regional taxes as indicated. 
                    This quotation is valid until the stated expiration date. Upon acceptance, client agrees to 
                    terms of settlement within the designated period.
                  </p>
                </div>
                <div className="w-full md:w-80 space-y-2 text-sm bg-[var(--shell-bg)]/30 p-4 rounded-xl border border-[var(--shell-border)]/40">
                  <div className="flex justify-between text-[var(--shell-muted)]">
                    <span>Subtotal (Taxable)</span>
                    <span className="font-mono">{money(financialSummary.subtotal)}</span>
                  </div>
                  
                  {financialSummary.taxGroups.map((group) => (
                    <div key={group.rate} className="space-y-1 pl-2 border-l border-[var(--shell-accent)]/50 my-1">
                      <div className="flex justify-between text-[11px] text-[var(--shell-muted)]">
                        <span>CGST ({group.cgstRate}%) on {money(group.taxable)}</span>
                        <span className="font-mono">{money(group.cgstAmount)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-[var(--shell-muted)]">
                        <span>SGST ({group.sgstRate}%) on {money(group.taxable)}</span>
                        <span className="font-mono">{money(group.sgstAmount)}</span>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between text-[var(--shell-muted)] border-b border-[var(--shell-border)]/50 pb-2 pt-1">
                    <span>Total GST</span>
                    <span className="font-mono">{money(financialSummary.totalGst)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[var(--shell-foreground)] pt-1">
                    <span>Grand Total</span>
                    <span className="font-mono text-[var(--shell-brand)]">{money(financialSummary.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          {quotation.notes && (
            <Card className="border-[var(--shell-border)] shadow-engineered">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileSignature className="h-4 w-4 text-[var(--shell-brand)]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)]">Customer Remarks & Internal Notes</h4>
                </div>
                <p className="text-sm text-[var(--shell-muted)] whitespace-pre-wrap leading-relaxed pl-6">{quotation.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Process Workflow Actions */}
          {actions.length > 0 && (
            <Card className="border-[--shell-border] shadow-engineered bg-gradient-to-br from-[--shell-bg] to-transparent print:hidden">
              <CardContent className="p-6 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)]">Manage Process Flow</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {actions.map((act) => (
                    <button
                      key={act.action}
                      onClick={() =>
                        act.action === "delete" ? setDeleteOpen(true) :
                        act.action === "edit" ? router.push(`/billing/quotations/${quotation.id}/edit`) :
                        handleStatusChange(act.action)
                      }
                      disabled={actionLoading === act.action}
                      className="flex items-start gap-4 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:pointer-events-none group"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface-alt)] shrink-0 group-hover:scale-105 transition-transform duration-200">
                        {actionLoading === act.action
                          ? <Loader2 className="h-4 w-4 animate-spin text-[var(--shell-brand)]" />
                          : <act.icon className={`h-4 w-4 ${act.variant === "destructive" ? "text-[var(--shell-danger)]" : "text-[var(--shell-brand)]"}`} />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${act.variant === "destructive" ? "text-[var(--shell-danger)] font-bold" : "text-foreground"}`}>
                          {act.label}
                        </p>
                        <p className="text-xs text-[var(--shell-muted)] mt-0.5">{act.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conversion Wizard */}
          {canEdit && quotation.status === "accepted" && !quotation.converted_invoice_id && (
            <Card className="border-[var(--shell-success)]/20 shadow-md bg-gradient-to-r from-[var(--shell-success-surface)]/5 to-transparent print:hidden">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--shell-success)]/10 text-[var(--shell-success)] border border-[var(--shell-success)]/20 shrink-0">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--shell-foreground)]">Quotation Accepted</h4>
                    <p className="text-xs text-[var(--shell-muted)] mt-0.5">
                      Generate a primary sales invoice to bill the client.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleConvert}
                  disabled={actionLoading === "convert"}
                  className="bg-[var(--shell-success)] hover:bg-[var(--shell-success)]/90 text-white font-semibold shadow-sm w-full sm:w-auto"
                >
                  {actionLoading === "convert" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Convert to Invoice
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Flow & Details */}
        <div className="space-y-6 print:hidden">
          {/* Status Tracker */}
          <Card className="border-[var(--shell-border)] shadow-engineered">
            <CardContent className="p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)] border-b border-[var(--shell-border)] pb-3 mb-4">
                Lifecycle Progression
              </h4>
              <div className="relative pl-2">
                {STATUS_FLOW.map((step, idx) => {
                  const Icon = step.icon;
                  const isPast = idx < statusIdx;
                  const isCurrent = idx === statusIdx;
                  const isActiveState = isPast || isCurrent;
                  
                  return (
                    <div key={step.key} className="flex items-start gap-3.5 pb-6 last:pb-0 relative">
                      {idx < STATUS_FLOW.length - 1 && (
                        <div className={`absolute left-[13.5px] top-7 w-0.5 h-6 -translate-x-1/2 ${
                          isPast ? "bg-[var(--shell-success-surface)]" : "bg-[var(--shell-border)]"
                        }`} />
                      )}
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shrink-0 z-10 transition-colors duration-200 ${
                        isCurrent
                          ? "border-[var(--shell-brand)] bg-[var(--shell-brand)]/10 text-[var(--shell-brand)]"
                          : isPast
                            ? "border-[var(--shell-success)] bg-[var(--shell-success)]/10 text-[var(--shell-success)]"
                            : "border-[var(--shell-border)] bg-card text-muted-foreground/30"
                      }`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className={`text-xs font-bold ${
                          isCurrent
                            ? "text-[var(--shell-brand)]"
                            : isPast
                              ? "text-[var(--shell-foreground)]"
                              : "text-muted-foreground/40"
                        }`}>
                          {step.label}
                          {isCurrent && " (Current)"}
                        </p>
                        {isCurrent && (
                          <p className="text-[10px] text-[var(--shell-muted)] mt-1 leading-relaxed">
                            {quotation.status === "draft" && "Quotation details are currently editable."}
                            {quotation.status === "sent" && "Awaiting acceptance response from the client."}
                            {quotation.status === "accepted" && "Ready to convert to a billable invoice."}
                            {quotation.status === "rejected" && "The client has declined this quotation."}
                            {quotation.status === "expired" && "Quotation has exceeded validity period."}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Client summary info */}
          <Card className="border-[var(--shell-border)] shadow-engineered">
            <CardContent className="p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)] border-b border-[var(--shell-border)] pb-3 mb-4">
                Client File
              </h4>
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--shell-brand)]/10 border border-[var(--shell-brand)]/20 text-[var(--shell-brand)] shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--shell-foreground)] leading-none">{quotation.client_name}</p>
                  <p className="text-xs text-[var(--shell-muted)] mt-2 font-medium">Account ID: #{quotation.client_id}</p>
                  <p className="text-xs text-[var(--shell-muted)] mt-1 font-medium">Compliance: Registered Customer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Dialog */}
      {canDelete && <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-[--shell-border] bg-card">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--shell-danger-surface)] text-[var(--shell-danger)]">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <DialogTitle>Confirm Permanently Delete</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-[var(--shell-muted)] leading-relaxed pt-2">
            Are you sure you want to permanently delete quotation <strong>{quotation.quote_number}</strong>? 
            This will permanently remove the record and all associated items from the ledger. This action cannot be reversed.
          </p>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" size="sm" className="border-[var(--shell-border)]" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteSaving} className="bg-[var(--shell-danger)] hover:bg-[var(--shell-danger)]/90 text-white">
              {deleteSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>}
    </div>
  );
}
