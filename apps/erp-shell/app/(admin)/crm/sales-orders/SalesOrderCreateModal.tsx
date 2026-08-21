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
    file_data: "",
    file_name: "",
    line_items: [] as any[],
  });
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
          file_data: editRecord.file_data || "",
          file_name: editRecord.file_name || "",
          line_items: editRecord.line_items || [],
        });
      } else {
        setFormData({
          so_no: "",
          account: "",
          from_quote: "",
          value: "",
          eta: "",
          status: "Pending",
          owner: "",
          file_data: "",
          file_name: "",
          line_items: [],
        });
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          file_name: file.name,
          file_data: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (editRecord) {
        await api.put(`/sales-orders/${editRecord.id_str}`, formData);
      } else {
        await api.post("/sales-orders", formData);
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
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
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
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
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
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
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
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
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
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
                  ETA *
                </Label>
                <input
                  type="date"
                  name="eta"
                  value={formData.eta}
                  onChange={handleChange}
                  className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
                  Status *
                </Label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]"
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
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
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
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
                Upload Invoice File (PDF or Image)
              </Label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileChange}
                className="w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2 py-1.5 text-xs text-[var(--shell-foreground)] file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-0.5 file:text-xs file:font-medium file:text-primary-foreground"
              />
              {formData.file_name && (
                <div className="mt-1 text-xs text-[var(--shell-success)]">
                  Selected File: {formData.file_name}
                </div>
              )}
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
