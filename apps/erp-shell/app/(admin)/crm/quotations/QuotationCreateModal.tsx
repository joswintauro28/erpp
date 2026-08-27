"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader, CheckCircle, FileSpreadsheet } from "lucide-react";
import { api } from "@/services/api";
import { FileUpload, type FileRecord } from "@datavex/ui-theme";

interface QuotationCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

export default function QuotationCreateModal({ isOpen, onClose, onSuccess, editRecord = null }: QuotationCreateModalProps) {
  const [formData, setFormData] = useState({
    quote_no: "",
    account: "",
    value: "",
    valid_until: "",
    status: "Draft",
    owner: "",
  });
  const [fileId, setFileId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        const rawVal = String(editRecord.value || editRecord.total || "");
        setFormData({
          quote_no: editRecord.quote_no || editRecord.quote_number || "",
          account: editRecord.account || editRecord.client_name || "",
          value: rawVal.replace(/[^0-9.]/g, ""),
          valid_until: editRecord.valid_until || "",
          status: editRecord.status || "Draft",
          owner: editRecord.owner || "",
        });
        setFileId(editRecord.file_id || null);
      } else {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const yyyy = futureDate.getFullYear();
        const mm = String(futureDate.getMonth() + 1).padStart(2, "0");
        const dd = String(futureDate.getDate()).padStart(2, "0");

        setFormData({
          quote_no: "",
          account: "",
          value: "",
          valid_until: `${yyyy}-${mm}-${dd}`,
          status: "Draft",
          owner: "",
        });
        setFileId(null);
      }
      setError("");
    }
  }, [isOpen, editRecord]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      quote_no: formData.quote_no,
      account: formData.account,
      quote_number: formData.quote_no,
      client_name: formData.account,
      value: formData.value,
      total: formData.value ? Number(formData.value) : 0,
      valid_until: formData.valid_until,
      status: formData.status,
      owner: formData.owner,
      notes: "",
      file_id: fileId,
    };

    try {
      if (editRecord) {
        await api.put(`/quotations/${editRecord.id}`, payload);
        if (formData.status !== editRecord.status) {
          await api.put(`/quotations/${editRecord.id}/status?status=${formData.status}`);
        }
      } else {
        const res = await api.post<any>("/quotations", payload);
        if (formData.status && formData.status.toLowerCase() !== "draft") {
          await api.put(`/quotations/${res.id}/status?status=${formData.status}`);
        }
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save Quotation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="p-4 rounded-xl border border-yellow-300 bg-[var(--shell-warning-surface)] m-4 mb-0">
          <div className="text-xs font-bold text-[var(--shell-warning)] flex items-center gap-1.5 mb-0">
            <FileSpreadsheet size={14} /> {editRecord ? "Edit Quotation" : "New Quotation"}
          </div>
        </div>
        <div className="px-4 pb-4">
          <DialogHeader className="sr-only">
            <DialogTitle>{editRecord ? "Edit" : "Add New"} Quotation</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-2 bg-[var(--shell-danger-surface)] text-[var(--shell-danger)] rounded-md text-[11px] mb-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Quote No.</label>
                <input
                  type="text"
                  name="quote_no"
                  placeholder="Auto-generated if blank"
                  value={formData.quote_no}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs text-[var(--shell-foreground)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Account (Client Name) *</label>
                <input
                  type="text"
                  name="account"
                  placeholder="e.g. Meridian Foods"
                  value={formData.account}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs text-[var(--shell-foreground)]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Value (INR) *</label>
                <input
                  type="number"
                  name="value"
                  placeholder="e.g. 500000"
                  value={formData.value}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs text-[var(--shell-foreground)]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Valid Until *</label>
                <input
                  type="date"
                  name="valid_until"
                  value={formData.valid_until}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs text-[var(--shell-foreground)]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]"
                  required
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Owner *</label>
                <input
                  type="text"
                  name="owner"
                  placeholder="e.g. Rohan Mehta"
                  value={formData.owner}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs text-[var(--shell-foreground)]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">
                Attach File <span className="font-normal lowercase text-[var(--shell-muted)]">(PDF or image, optional)</span>
              </label>
              <FileUpload
                bucket="crm-assets"
                ownerType="quotation"
                ownerId={editRecord?.id || 0}
                clientName={formData.account || "general"}
                onUpload={(r: FileRecord) => setFileId(r.id)}
                accept="application/pdf,image/*"
                maxSize={10 * 1024 * 1024}
              />
            </div>

            <div className="flex gap-2 justify-end mt-1">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? <Loader size={13} className="mr-1 animate-spin" /> : <CheckCircle size={13} className="mr-1" />}
                {submitting ? "Saving..." : `${editRecord ? "Save" : "Add"} Quotation`}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
