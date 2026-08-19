"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Save, Loader2, Plus, X,
  User, Package, CheckCircle2, DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/api";
import { money, formatDate } from "@/utils/format";
import type { QuotationDetailView, QuotationItemView } from "@/types/billing";

interface LineItemDraft {
  description: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
}

const emptyItem = (): LineItemDraft => ({ description: "", quantity: 1, unitPrice: 0, gstRate: 18 });

interface QuotationFormProps {
  mode: "create" | "edit";
  initialData?: QuotationDetailView;
  onSuccess?: () => void;
}

const steps = [
  { title: "Details", icon: User },
  { title: "Items", icon: Package },
  { title: "Review", icon: CheckCircle2 },
];

export default function QuotationForm({ mode, initialData, onSuccess }: QuotationFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [clientName, setClientName] = useState(initialData?.client_name ?? "");
  const [issueDate, setIssueDate] = useState(initialData?.issue_date ?? new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(initialData?.valid_until ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const [items, setItems] = useState<LineItemDraft[]>(
    initialData?.items
      ? initialData.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unit_price, gstRate: i.gst_rate }))
      : [emptyItem()],
  );

  const lineTotals = useMemo(
    () => items.map((item) => (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
    [items],
  );

  const grandTotal = useMemo(() => lineTotals.reduce((s, v) => s + v, 0), [lineTotals]);

  const handleAddItem = useCallback(() => setItems((prev) => [...prev, emptyItem()]), []);
  const handleRemoveItem = useCallback((idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx)), []);
  const handleItemChange = useCallback(
    (idx: number, field: keyof LineItemDraft, value: string | number) => {
      setItems((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      });
    },
    [],
  );

  const canNext = useMemo(() => {
    if (step === 0) return clientName.trim().length > 0 && validUntil.trim().length > 0;
    if (step === 1) return items.length > 0 && items.some((i) => i.description.trim().length > 0);
    return true;
  }, [step, clientName, validUntil, items]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        clientName: clientName.trim(),
        clientId: initialData?.client_id ?? 0,
        quotationDate: issueDate || undefined,
        validUntil: validUntil || undefined,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          gstRate: Number(item.gstRate) || 0,
        })),
      };

      if (isEdit && initialData) {
        await api.put(`/invoices/quotations/${initialData.id}`, payload);
      } else {
        const result = await api.post<{ id: number }>("/invoices/quotations", payload);
        router.push(`/billing/quotations/${result.id}`);
      }
      onSuccess?.();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-0">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.title} className="flex items-center">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                  done
                    ? "bg-[var(--shell-brand)] text-white cursor-pointer"
                    : active
                      ? "bg-[var(--shell-accent)] text-[var(--shell-accent-foreground)]"
                      : "bg-[var(--shell-surface)] text-[var(--shell-muted)] border border-[var(--shell-border)] cursor-default"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.title}
              </button>
              {i < steps.length - 1 && (
                <div className={`mx-2 h-px w-12 ${i < step ? "bg-[var(--shell-brand)]" : "bg-[var(--shell-border)]"}`} />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[var(--shell-brand)]" />
                <h3 className="font-heading text-sm font-semibold text-[var(--shell-foreground)]">Client & Quote Details</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qf-client">Client Name</Label>
                  <Input
                    id="qf-client"
                    placeholder="Enter client name"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qf-issue">Issue Date</Label>
                    <Input
                      id="qf-issue"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qf-valid">Valid Until</Label>
                    <Input
                      id="qf-valid"
                      type="date"
                      required
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qf-notes">Notes & Terms</Label>
                  <Textarea
                    id="qf-notes"
                    rows={3}
                    placeholder="Optional notes, terms, or conditions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[var(--shell-accent)]" />
                  <h3 className="font-heading text-sm font-semibold text-[var(--shell-foreground)]">Line Items</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] p-3"
                  >
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                      />
                    </div>
                    <div className="w-20 space-y-2">
                      <Input
                        type="number"
                        min={0.01}
                        step={1}
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-24 space-y-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="w-16 space-y-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        placeholder="GST%"
                        value={item.gstRate}
                        onChange={(e) => handleItemChange(idx, "gstRate", Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex w-24 flex-col items-end justify-center pt-2">
                      <span className="font-mono text-xs font-semibold text-[var(--shell-foreground)]">
                        {money(lineTotals[idx])}
                      </span>
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-2"
                        onClick={() => handleRemoveItem(idx)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-4 py-3">
                <span className="text-sm font-semibold text-[var(--shell-foreground)]">Estimated Total</span>
                <span className="font-heading text-lg font-bold text-[var(--shell-brand)]">{money(grandTotal)}</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--shell-success)]" />
                <h3 className="font-heading text-sm font-semibold text-[var(--shell-foreground)]">Review & Confirm</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--shell-muted)]">Client</p>
                  <p className="text-sm font-medium text-[var(--shell-foreground)]">{clientName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--shell-muted)]">Issue Date</p>
                  <p className="text-sm text-[var(--shell-foreground)]">{formatDate(issueDate)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--shell-muted)]">Valid Until</p>
                  <p className="text-sm text-[var(--shell-foreground)]">{formatDate(validUntil)}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-16">Qty</TableHead>
                    <TableHead className="text-right w-24">Rate</TableHead>
                    <TableHead className="text-right w-16">GST%</TableHead>
                    <TableHead className="text-right w-20">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-[var(--shell-muted)]">{i + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{item.description || <span className="text-[var(--shell-muted)] italic">No description</span>}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{money(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">{item.gstRate}%</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{money(lineTotals[i])}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[var(--shell-accent)]" />
                  <span className="text-sm font-semibold text-[var(--shell-foreground)]">Grand Total</span>
                </div>
                <span className="font-heading text-xl font-bold text-[var(--shell-brand)]">{money(grandTotal)}</span>
              </div>

              {notes && (
                <div className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--shell-muted)] mb-1">Notes</p>
                  <p className="text-sm text-[var(--shell-foreground)] whitespace-pre-wrap">{notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          )}
        </div>
        <div>
          {step < 2 ? (
            <Button type="button" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" disabled={saving || grandTotal <= 0} onClick={handleSubmit}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              {isEdit ? "Update Quotation" : "Create Quotation"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
