"use client";

import { useState } from "react";
import { X, Plus, Trash2, Lock, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/services/api";
import { toastSuccess, toastError, toastWarning, errorMessage } from "@/utils/toast";
import { cn } from "@/lib/utils";

const APPROVAL_THRESHOLD = 15; // % — matches DISCOUNT_APPROVAL_THRESHOLD in crm-service

interface CpqItem {
  description: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
}

interface QuotationCpqModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultAccount?: string;
  editRecord?: any;
}

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function QuotationCpqModal({ isOpen, onClose, onSuccess, defaultAccount = "", editRecord }: QuotationCpqModalProps) {
  const [account, setAccount] = useState(defaultAccount || editRecord?.account || "");
  const [items, setItems] = useState<CpqItem[]>(
    editRecord?.items?.length
      ? editRecord.items.map((it: any) => ({
          description: it.description || it.product_name || "",
          quantity: Number(it.quantity || 1),
          unitPrice: Number(it.unitPrice || it.unit_price || 0),
          gstRate: Number(it.gstRate || it.gst_rate || 18),
        }))
      : [{ description: "", quantity: 1, unitPrice: 0, gstRate: 18 }]
  );
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"amount" | "percent">("percent");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [owner, setOwner] = useState(editRecord?.owner || "");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const discountAmount = discountType === "percent" ? subtotal * (Number(discount) / 100) : Number(discount);
  const discountPct = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  const taxable = Math.max(0, subtotal - discountAmount);
  const gst = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) * ((Number(it.gstRate) || 0) / 100), 0);
  const total = taxable + gst;
  const requiresApproval = discountPct > APPROVAL_THRESHOLD;

  const updateItem = (idx: number, patch: Partial<CpqItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (!account.trim()) throw new Error("Account / client name is required.");
      const cleanItems = items
        .filter((it) => it.description.trim())
        .map((it) => ({
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          gstRate: Number(it.gstRate) || 0,
        }));
      if (!cleanItems.length) throw new Error("Add at least one line item.");

      const res = await api.post<any>("/quotations/cpq", {
        account,
        clientName: account,
        items: cleanItems,
        discount: Number(discount) || 0,
        discountType: discountType === "percent" ? "percent" : "fixed",
        validUntil: validUntil || undefined,
        notes,
        owner,
      });

      const approval = res.approval || {};
      if (approval.approval_required) {
        toastWarning(
          "Quote locked for manager approval",
          `Discount ${approval.discount_pct}% exceeds the ${APPROVAL_THRESHOLD}% threshold — a manager must approve before it can be sent.`
        );
      } else {
        toastSuccess(
          "Quote created",
          `${res.quotation?.quote_no || res.quotation?.quote_number || ""} for ${account} · ${formatINR(total)}`
        );
      }
      onSuccess();
      onClose();
    } catch (err) {
      toastError("Could not create quotation", errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-xl border border-border bg-card w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-[var(--shell-warning)]" />
            <h3 className="text-base font-bold text-foreground m-0">Configure, Price & Quote</h3>
          </div>
          <button className="p-1 rounded-md hover:bg-muted text-muted-foreground cursor-pointer" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Account / Client *</Label>
              <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Company name" className="h-9" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner</Label>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Sales rep" className="h-9" />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="block text-xs font-semibold uppercase text-[var(--shell-muted)]">Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0, gstRate: 18 }])}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] p-2">
                  <Input
                    className="h-8 flex-1 text-xs"
                    placeholder="Product / service description"
                    value={it.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                  />
                  <Input
                    type="number"
                    className="h-8 w-16 text-xs"
                    placeholder="Qty"
                    value={it.quantity}
                    min={1}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    className="h-8 w-24 text-xs"
                    placeholder="Unit price"
                    value={it.unitPrice}
                    min={0}
                    onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                  />
                  <select
                    className="h-8 w-20 rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-1 text-xs"
                    value={it.gstRate}
                    onChange={(e) => updateItem(idx, { gstRate: Number(e.target.value) })}
                  >
                    {[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}%</option>)}
                  </select>
                  <button
                    type="button"
                    className="rounded p-1 text-[var(--shell-muted)] hover:text-[var(--shell-danger)] transition-colors cursor-pointer"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Discount</Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  className="h-9 flex-1"
                  value={discount}
                  min={0}
                  max={100}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
                <select
                  className="h-9 w-24 rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2 text-xs"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                >
                  <option value="percent">%</option>
                  <option value="amount">₹</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Valid Until</Label>
              <input
                type="date"
                className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Notes</Label>
            <textarea
              className="min-h-[60px] w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2 text-xs"
              placeholder="Terms, delivery, payment... (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {requiresApproval && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--shell-warning)]/30 bg-[var(--shell-warning-surface)] p-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--shell-warning)]" />
              <div>
                <p className="m-0 text-xs font-semibold text-[var(--shell-warning)]">Manager approval required (S5/S6)</p>
                <p className="m-0 mt-0.5 text-[11px] text-[var(--shell-warning)]">
                  This quote has a {discountPct.toFixed(1)}% discount — above the {APPROVAL_THRESHOLD}% threshold. It will be created as a
                  locked draft until a manager approves it.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] p-3 text-xs">
            <div className="flex justify-between py-0.5 text-[var(--shell-muted)]">
              <span>Subtotal</span><span className="tabular-nums">{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-[var(--shell-muted)]">
              <span>Discount ({discountPct.toFixed(1)}%)</span>
              <span className={cn("tabular-nums", discountAmount > 0 ? "text-[var(--shell-success)]" : "")}>− {formatINR(discountAmount)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-[var(--shell-muted)]">
              <span>GST</span><span className="tabular-nums">{formatINR(gst)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-dashed border-[var(--shell-border)] pt-2 text-sm font-bold text-[var(--shell-foreground)]">
              <span>Total</span><span className="tabular-nums">{formatINR(total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className={cn(requiresApproval && "bg-amber-600 hover:bg-amber-700")}>
            {submitting ? "Creating..." : requiresApproval ? "Create & Submit for Approval" : "Create Quotation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
