"use client";

import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

interface SalesOrderFormProps {
  record: Record<string, unknown>;
  nameField: string;
  data: { so_no: string; eta: string; status: string; owner: string; file_data: string; file_name: string };
  onChange: (data: Partial<SalesOrderFormProps["data"]>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  error: string;
  submitting: boolean;
}

export default function SalesOrderForm({
  record, nameField, data, onChange, onSubmit, onBack, error, submitting,
}: SalesOrderFormProps) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
        <PackageOpen className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-700">
          Converting <strong>{nameField}</strong> to a Sales Order
        </span>
      </div>

      <div className="mb-5 flex flex-wrap gap-6 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span>Account: <strong className="text-foreground">{record.account as string}</strong></span>
        <span>Value: <strong className="text-foreground">{record.value as string}</strong></span>
      </div>

      {error && (
        <div className="mb-4 rounded bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <Label>SO No.</Label>
            <Input
              type="text"
              placeholder="e.g. SO-20260001 (auto-generated if blank)"
              value={data.so_no}
              onChange={(e) => onChange({ so_no: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ETA *</Label>
              <Input
                type="date"
                value={data.eta}
                onChange={(e) => onChange({ eta: e.target.value })}
                required
              />
            </div>
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
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="In Fulfillment">In Fulfillment</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Owner *</Label>
            <Input
              type="text"
              placeholder="e.g. Priya Shah"
              value={data.owner}
              onChange={(e) => onChange({ owner: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={submitting} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <PackageOpen className="h-3.5 w-3.5" />
            {submitting ? "Creating..." : "Confirm & Add to Sales Orders"}
          </Button>
        </div>
      </form>
    </div>
  );
}
