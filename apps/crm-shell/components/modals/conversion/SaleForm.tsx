"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SaleFormProps {
  record: Record<string, unknown>;
  nameField: string;
  data: { invoice_no: string; issued_date: string; due_date: string; status: string; rep: string };
  onChange: (data: Partial<SaleFormProps["data"]>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  error: string;
  submitting: boolean;
}

export default function SaleForm({
  record, nameField, data, onChange, onSubmit, onBack, error, submitting,
}: SaleFormProps) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 p-4">
        <ShoppingCart className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-700">
          Converting <strong>{nameField}</strong> to a Sale
        </span>
      </div>

      <div className="mb-5 flex flex-wrap gap-6 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span>Account: <strong className="text-foreground">{record.account as string}</strong></span>
        <span>Amount: <strong className="text-foreground">{record.value as string}</strong></span>
      </div>

      {error && (
        <div className="mb-4 rounded bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <Label>Invoice No.</Label>
            <Input
              type="text"
              placeholder="e.g. INV-20260001 (auto-generated if blank)"
              value={data.invoice_no}
              onChange={(e) => onChange({ invoice_no: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Issued Date *</Label>
              <Input
                type="date"
                value={data.issued_date}
                onChange={(e) => onChange({ issued_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={data.due_date}
                onChange={(e) => onChange({ due_date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status *</Label>
              <Input
                type="text"
                placeholder="e.g. Pending, Closed"
                value={data.status}
                onChange={(e) => onChange({ status: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Rep *</Label>
              <Input
                type="text"
                placeholder="e.g. Aditi Rao"
                value={data.rep}
                onChange={(e) => onChange({ rep: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={submitting} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <ShoppingCart className="h-3.5 w-3.5" />
            {submitting ? "Creating Sale..." : "Confirm & Add to Sales"}
          </Button>
        </div>
      </form>
    </div>
  );
}
