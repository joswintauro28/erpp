"use client";

import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

interface RequirementFormProps {
  record: Record<string, unknown>;
  nameField: string;
  data: { name: string; category: string; priority: string; status: string; owner: string };
  onChange: (data: Partial<RequirementFormProps["data"]>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  error: string;
  submitting: boolean;
}

export default function RequirementForm({
  record, nameField, data, onChange, onSubmit, onBack, error, submitting,
}: RequirementFormProps) {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
        <ClipboardList className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-semibold text-blue-700">
          Adding Sale to Requirements
        </span>
      </div>

      <div className="mb-5 flex flex-wrap gap-6 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span>Account: <strong className="text-foreground">{record.account as string}</strong></span>
        <span>Invoice No: <strong className="text-foreground">{record.invoice_no as string}</strong></span>
      </div>

      {error && (
        <div className="mb-4 rounded bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <Label>Requirements *</Label>
            <Input
              type="text"
              placeholder="Describe the requirement..."
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Input
                type="text"
                placeholder="e.g. Security, Technical"
                value={data.category}
                onChange={(e) => onChange({ category: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Priority *</Label>
              <Select
                value={data.priority}
                onValueChange={(v) => onChange({ priority: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="Review">Review</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
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
          <Button type="submit" disabled={submitting} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700">
            <ClipboardList className="h-3.5 w-3.5" />
            {submitting ? "Creating..." : "Confirm & Add to Requirements"}
          </Button>
        </div>
      </form>
    </div>
  );
}
