"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/services/api";
import { FileUpload, type FileRecord } from "@datavex/ui-theme";

interface SalesOrderCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

export default function SalesOrderCreateModal({
  isOpen,
  onClose,
  onSuccess,
  editRecord = null,
}: SalesOrderCreateModalProps) {
  const [formData, setFormData] = useState({
    so_no: "",
    account: "",
    from_quote: "",
    value: "",
    eta: "",
    status: "Pending",
    owner: "",
    line_items: [] as any[],
  });
  const [fileId, setFileId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setFormData({
          so_no: editRecord.so_no || "",
          account: editRecord.account || "",
          from_quote: editRecord.from_quote || "",
          value: editRecord.value || "",
          eta: editRecord.eta || "",
          status: editRecord.status || "Pending",
          owner: editRecord.owner || "",
          line_items: editRecord.line_items || [],
        });
        setFileId(editRecord.file_id || null);
      } else {
        setFormData({
          so_no: "",
          account: "",
          from_quote: "",
          value: "",
          eta: "",
          status: "Pending",
          owner: "",
          line_items: [],
        });
        setFileId(null);
      }
      setError("");
    }
  }, [isOpen, editRecord]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUploadComplete = (record: FileRecord) => {
    setFileId(record.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = { ...formData, file_id: fileId };
      if (editRecord) {
        await api.put(`/crm/sales-orders/${editRecord.id_str}`, payload);
      } else {
        await api.post("/crm/sales-orders", payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save sales order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editRecord ? "Edit" : "Add New"} Sales Order
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                SO No.
              </Label>
              <Input
                name="so_no"
                value={formData.so_no}
                onChange={handleChange}
                placeholder="e.g. SO-202608-0001 (auto-generated if blank)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Company Name *
                </Label>
                <Input
                  name="account"
                  value={formData.account}
                  onChange={handleChange}
                  placeholder="e.g. Halcyon Media"
                  required
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  From Quotation
                </Label>
                <Input
                  name="from_quote"
                  value={formData.from_quote}
                  onChange={handleChange}
                  placeholder="e.g. QT-202608-0003"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Order Value *
                </Label>
                <Input
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  placeholder="e.g. 182000"
                  required
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  ETA *
                </Label>
                <input
                  type="date"
                  name="eta"
                  value={formData.eta}
                  onChange={handleChange}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Status *
                </Label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]"
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
                <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Representative *
                </Label>
                <Input
                  name="owner"
                  value={formData.owner}
                  onChange={handleChange}
                  placeholder="e.g. Maya Patel"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Upload Invoice File (PDF or Image)
              </Label>
              <FileUpload
                bucket="crm-assets"
                ownerType="sales_order"
                ownerId={editRecord?.id || 0}
                clientName={formData.account || "general"}
                onUpload={handleUploadComplete}
                accept="application/pdf,image/*"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} size="sm">
              {submitting ? "Saving..." : `${editRecord ? "Save" : "Add"} Sales Order`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
