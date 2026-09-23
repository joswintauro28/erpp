"use client";

import React, { useState, useEffect } from "react";
import { X, FileText, ClipboardList, FileSpreadsheet, Download, CheckCircle, BadgeCheck, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUpload, type FileRecord, handleError } from "@datavex/ui-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import { toastSuccess, toastError, toastInfo, toastWarning } from "@/utils/toast";

interface SalesOrderDetailsModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onEdit?: (record: any) => void;
  onApprove?: (record: any) => void;
}

export default function SalesOrderDetailsModal({
  record,
  isOpen,
  onClose,
  onSuccess,
  onEdit,
  onApprove,
}: SalesOrderDetailsModalProps) {
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceFileId, setInvoiceFileId] = useState<number | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState("Paid");

  const [relatedRequirements, setRelatedRequirements] = useState<any[]>([]);
  const [relatedQuotations, setRelatedQuotations] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const fetchRelatedData = async () => {
    if (!record || !record.account) return;
    setLoadingRelated(true);
    try {
      const [reqData, qData] = await Promise.all([
        api.get<any>(`/crm/requirements?account=${encodeURIComponent(record.account)}`),
        api.get<any>(`/crm/quotations?account=${encodeURIComponent(record.account)}`),
      ]);
      setRelatedRequirements(reqData.requirements || []);
      setRelatedQuotations(qData.quotations || []);
    } catch (err) {
      handleError(err, "Failed to fetch related data");
    } finally {
      setLoadingRelated(false);
    }
  };

  useEffect(() => {
    if (isOpen && record) {
      setShowInvoiceForm(false);
      setInvoiceFileId(null);
      setInvoiceStatus("Paid");
      fetchRelatedData();
    }
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceSubmitting(true);
    setInvoiceError("");

    try {
      const check = await api.post<any>(`/crm/sales-orders/${record.id_str}/check-stock`);

      const payload = {
        ...record,
        status: check.available ? invoiceStatus : "Stock Hold",
        file_id: invoiceFileId || record.file_id,
      };

      await api.put(`/crm/sales-orders/${record.id_str}`, payload);

      if (check.available) {
        toastSuccess("Stock available — order confirmed.");
      } else {
        const shortItems = (check.items || [])
          .filter((i: any) => !i.is_available)
          .map((i: any) => `- ${i.product_name || i.sku || i.product_id} (needed ${i.requested_quantity}, available ${i.available_quantity})`)
          .join("\n");
        toastWarning(`Insufficient stock — order placed on Stock Hold. Inventory accounts have been notified.\n\nShort items:\n${shortItems}`);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handleAddAsCustomer = async () => {
    try {
      const custData = await api.get<any>("/crm/customers");
      const exists = custData.customers?.some((c: any) => c.account === record.account);
      if (exists) {
        toastInfo("This account is already added as a customer!");
        return;
      }

      let cleanArr = parseInt(String(record.value || "").replace(/[^0-9]/g, "")) || 0;
      if (cleanArr > 2147483647) cleanArr = 2147483647;
      await api.post("/crm/customers", {
        account: record.account,
        industry: "Software",
        tier: "Silver",
        arr: cleanArr,
        status: "Active",
        owner: record.owner || "",
      });

      toastSuccess("Added successfully to Customers!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toastError("Network error.");
    }
  };

  const handleInnerApprove = async () => {
    if (onApprove) {
      onApprove(record);
      onClose();
    }
  };

  const renderFrameContent = () => {
    const inr = (v: any) =>
      v != null && !isNaN(Number(v)) ? `₹${Number(v).toLocaleString("en-IN")}` : "N/A";
    const cd = record.credit_check_detail || {};
    const fields = [
      { label: "Order No", value: record.so_no },
      { label: "Company Name", value: record.account },
      { label: "From Quote", value: record.from_quote || "N/A" },
      { label: "Value (INR)", value: record.value },
      { label: "ETA", value: record.eta },
      { label: "Status", value: record.status },
      { label: "Credit Status", value: record.credit_check_status || "Not Checked" },
      { label: "Credit Limit", value: cd.unlimited || cd.credit_limit == null ? "Unlimited" : inr(cd.credit_limit) },
      { label: "Credit Exposure", value: cd.outstanding != null ? inr(cd.outstanding) : "N/A" },
      { label: "Available Credit", value: cd.available_credit != null ? inr(cd.available_credit) : "N/A" },
      { label: "Approval Status", value: record.approval_status || "Pending" },
      { label: "Representative", value: record.owner },
    ];

    const htmlContent = `
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; margin: 0; background-color: #f8fafc; color: #1e293b; }
            .details-sheet { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); box-sizing: border-box; }
            .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 20px; }
            .title { margin: 0; font-size: 20px; color: #0f172a; font-weight: 700; }
            .subtitle { margin: 4px 0 0 0; color: #991b1b; font-weight: 600; font-size: 13px; }
            .details-list { font-size: 13px; margin-top: 12px; }
            .details-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .details-label { color: #64748b; font-weight: 500; }
            .details-val { font-weight: 600; color: #1e293b; }
          </style>
        </head>
        <body>
          <div class="details-sheet">
            <div class="header">
              <h1 class="title">${record.so_no}</h1>
              <p class="subtitle">${record.account}</p>
            </div>
            <div class="details-list">
              ${fields.map(f => `
                <div class="details-item">
                  <span class="details-label">${f.label}</span>
                  <span class="details-val">${f.value}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </body>
      </html>
    `;

    return (
      <iframe
        srcDoc={htmlContent}
        className="w-full h-[360px] border border-border rounded-lg"
        title={record.so_no}
      />
    );
  };

  const APPROVABLE = ["Pending", "Confirmed", "Approved", "Hold", "Stock Hold"];
  const canApprove = APPROVABLE.includes(record.status);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader className="border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-accent" />
            <DialogTitle className="m-0 text-base font-bold">Sales Order Summary: {record.so_no}</DialogTitle>
          </div>
        </DialogHeader>

        {!showInvoiceForm ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderFrameContent()}

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Order Line Items</h4>
                  {record.line_items && record.line_items.length > 0 ? (
                    <div className="border border-border rounded-lg overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-background border-b border-border">
                            <th className="p-2 font-semibold">Product</th>
                            <th className="p-2 font-semibold">SKU</th>
                            <th className="p-2 font-semibold text-right">Qty</th>
                            <th className="p-2 font-semibold text-right">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.line_items.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-border last:border-0">
                              <td className="p-2 truncate max-w-[120px]" title={item.product_name}>{item.product_name}</td>
                              <td className="p-2 font-mono">{item.sku}</td>
                              <td className="p-2 text-right">{item.quantity}</td>
                              <td className="p-2 text-right">₹{item.unit_price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">No line items specified.</p>
                  )}
                </div>

                {record.file_id && (
                  <div className="rounded-lg border border-border bg-background/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold truncate max-w-[200px]">Invoice: {record.file_name || "attachment"}</span>
                      <a
                        href={`/api/files/${record.file_id}/stream`}
                        download={record.file_name || "invoice"}
                        className="inline-flex shrink-0 items-center justify-center rounded bg-primary px-2 py-0.5 text-xs text-white hover:bg-[var(--shell-action)]"
                      >
                        <Download className="mr-1 size-3" /> Download
                      </a>
                    </div>
                    <iframe src={`/api/files/${record.file_id}/stream`} className="w-full h-[150px] border border-border rounded" title="Invoice Preview" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-4">
              <div>
                <h4 className="m-0 mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <FileSpreadsheet className="size-4 text-accent" />
                  Linked Quotations
                </h4>
                {loadingRelated ? (
                  <div className="text-xs text-muted-foreground">Loading...</div>
                ) : relatedQuotations.length === 0 ? (
                  <div className="text-xs italic text-muted-foreground">No linked quotations.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {relatedQuotations.map((q, idx) => {
                      const qNo = q.quote_no || q.quote_number || `#${q.id}`;
                      const isTarget = qNo === record.from_quote;
                      return (
                        <div key={`${q.id}-${idx}`} className={`rounded-lg border p-2.5 text-xs ${isTarget ? "border-[var(--shell-warning)]/40 bg-[var(--shell-warning-surface)]" : "border-border bg-background"}`}>
                          <div className="mb-0.5 flex items-center justify-between">
                            <span className="font-semibold">{qNo}</span>
                            <span className="rounded-full bg-background px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted-foreground">{q.status}</span>
                          </div>
                          <div className="text-muted-foreground text-[11px]">Value: {q.value ?? q.total ?? "—"} &middot; Owner: {q.owner || "—"}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h4 className="m-0 mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <ClipboardList className="size-4 text-accent" />
                  Linked Requirements
                </h4>
                {loadingRelated ? (
                  <div className="text-xs text-muted-foreground">Loading...</div>
                ) : relatedRequirements.length === 0 ? (
                  <div className="text-xs italic text-muted-foreground">No linked requirements.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {relatedRequirements.map((r, idx) => (
                      <div key={`${r.id}-${idx}`} className="rounded-lg border border-border bg-background p-2.5 text-xs">
                        <div className="mb-0.5 flex items-center justify-between">
                          <span className="font-semibold">{r.name || r.id_str}</span>
                          <span className="rounded-full bg-background px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted-foreground">{r.status}</span>
                        </div>
                        <div className="text-muted-foreground text-[11px]">Category: {r.category || "—"} &middot; Priority: {r.priority || "—"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex gap-2">
                {onApprove && canApprove && (
                  <Button
                    onClick={handleInnerApprove}
                    className="flex items-center gap-1.5 bg-[var(--shell-success)] hover:bg-[var(--shell-success)]/90 text-white"
                    size="sm"
                  >
                    <BadgeCheck className="size-3.5" />
                    Approve Order
                  </Button>
                )}
                {["Paid", "Delivered", "Done", "Invoiced", "Cancelled"].includes(record.status) || !!record.file_id ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => onEdit?.(record)}>
                      Edit Order
                    </Button>
                    <Button className="bg-[var(--shell-info)] hover:bg-[var(--shell-info)]/90 text-white" size="sm" onClick={handleAddAsCustomer}>
                      Add as Customer
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setShowInvoiceForm(true)}
                    className="flex items-center gap-1.5 bg-[var(--shell-success-surface)] hover:bg-[var(--shell-success)] text-white"
                    size="sm"
                  >
                    <CheckCircle className="size-3.5" />
                    Done & Check Stock
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={onClose} size="sm">Close</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--shell-success)]/30 bg-gradient-to-br from-[var(--shell-success-surface)] to-[var(--shell-success-surface)] p-4">
              <CheckCircle className="size-4 text-[var(--shell-success)]" />
              <span className="text-sm font-semibold text-[var(--shell-success)]">
                Marking Sales Order <strong>{record.so_no}</strong> as Done / Paid
              </span>
            </div>
            {invoiceError && <div className="mb-4 rounded-md bg-[var(--shell-danger-surface)] px-3 py-2 text-xs text-[var(--shell-danger)]">{invoiceError}</div>}
            <form onSubmit={handleInvoiceSubmit} className="flex flex-col gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Status *</Label>
                <select
                  value={invoiceStatus}
                  onChange={e => setInvoiceStatus(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Approved">Approved</option>
                  <option value="Invoiced">Invoiced</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Hold">Hold</option>
                  <option value="Stock Hold">Stock Hold</option>
                </select>
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Upload Invoice (optional)</Label>
                <FileUpload
                  bucket="crm-assets"
                  ownerType="sales_order"
                  ownerId={record?.id || 0}
                  clientName={record?.account || "general"}
                  onUpload={(r: FileRecord) => setInvoiceFileId(r.id)}
                  accept="application/pdf,image/*"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowInvoiceForm(false)} size="sm">Cancel</Button>
                <Button type="submit" className="bg-[var(--shell-success-surface)] hover:bg-[var(--shell-success)] text-white" disabled={invoiceSubmitting} size="sm">
                  {invoiceSubmitting ? "Checking stock..." : "Check stock & confirm"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
