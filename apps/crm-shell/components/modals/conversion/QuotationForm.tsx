"use client";

import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

interface QuotationFormProps {
  record: Record<string, unknown>;
  nameField: string;
  data: { quote_no: string; value: string; valid_until: string; status: string; owner: string };
  currency: string;
  onChange: (data: Partial<QuotationFormProps["data"]>) => void;
  onCurrencyChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  error: string;
  submitting: boolean;
}

export default function QuotationForm({
  record, nameField, data, currency, onChange, onCurrencyChange,
  onSubmit, onBack, error, submitting,
}: QuotationFormProps) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
        <FileSpreadsheet className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-700">
          Converting <strong>{nameField}</strong> to a Quotation
        </span>
      </div>

      <div className="mb-5 flex flex-wrap gap-6 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span>Account: <strong className="text-foreground">{record.account as string}</strong></span>
        <span>Requirement: <strong className="text-foreground">{record.name as string}</strong></span>
      </div>

      {error && (
        <div className="mb-4 rounded bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <Label>Quote No.</Label>
            <Input
              type="text"
              placeholder="e.g. QT-20260001 (auto-generated if blank)"
              value={data.quote_no}
              onChange={(e) => onChange({ quote_no: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Value *</Label>
              <div className="flex gap-2">
                <Select value={currency} onValueChange={(v) => onCurrencyChange(v ?? "")}>
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={data.value}
                  onChange={(e) => onChange({ value: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Valid Until *</Label>
              <Input
                type="date"
                value={data.valid_until}
                onChange={(e) => onChange({ valid_until: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status *</Label>
              <Select
                value={data.status}
                onValueChange={(v) => onChange({ status: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Owner *</Label>
              <Input
                type="text"
                placeholder="e.g. Aditi Rao"
                value={data.owner}
                onChange={(e) => onChange({ owner: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={submitting} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {submitting ? "Creating..." : "Confirm & Add to Quotation"}
          </Button>
        </div>
      </form>
    </div>
  );
}
