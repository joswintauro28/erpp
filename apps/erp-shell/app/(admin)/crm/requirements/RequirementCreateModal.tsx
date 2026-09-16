"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader, CheckCircle, ClipboardList } from "lucide-react";
import { api } from "@/services/api";
import { FileUpload, type FileRecord } from "@datavex/ui-theme";

interface RequirementCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

export default function RequirementCreateModal({
  isOpen,
  onClose,
  onSuccess,
  editRecord = null,
}: RequirementCreateModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    account: "",
    category: "Technical",
    priority: "Medium",
    status: "Draft",
    owner: "",
  });
  const [fileId, setFileId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setFormData({
          name: editRecord.name || "",
          account: editRecord.account || "",
          category: editRecord.category || "Technical",
          priority: editRecord.priority || "Medium",
          status: editRecord.status || "Draft",
          owner: editRecord.owner || "",
        });
        setFileId(editRecord.file_id || null);
      } else {
        setFormData({
          name: "",
          account: "",
          category: "Technical",
          priority: "Medium",
          status: "Draft",
          owner: "",
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      ...formData,
      file_id: fileId,
    };

    try {
      if (editRecord) {
        await api.put(`/crm/requirements/${editRecord.id_str}`, payload);
      } else {
        await api.post("/crm/requirements", payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save requirement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="p-4 rounded-xl border border-[var(--shell-info)]/30 bg-[var(--shell-info-surface)] m-4 mb-0">
          <div className="text-xs font-bold text-[var(--shell-info)] flex items-center gap-1.5 mb-0">
            <ClipboardList size={14} /> {editRecord ? "Edit Requirement" : "New Requirement"}
          </div>
        </div>
        <div className="px-4 pb-4">
          <DialogHeader className="sr-only">
            <DialogTitle>{editRecord ? "Edit" : "Add New"} Requirement</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-2 bg-[var(--shell-danger-surface)] text-[var(--shell-danger)] rounded-md text-[11px] mb-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Description *</label>
              <input
                type="text"
                name="name"
                placeholder="Describe the requirement..."
                value={formData.name}
                onChange={handleChange}
                className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs text-[var(--shell-foreground)]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Company Name *</label>
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
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Representative *</label>
                <input
                  type="text"
                  name="owner"
                  placeholder="e.g. Maya Patel"
                  value={formData.owner}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs text-[var(--shell-foreground)]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]"
                  required
                >
                  <option value="Technical">Technical</option>
                  <option value="Security">Security</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Functional">Functional</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Priority *</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]"
                  required
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

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
                <option value="Submitted">Submitted</option>
                <option value="In Review">In Review</option>
                <option value="Approved">Approved</option>
                <option value="Converted">Converted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">
                Attach File <span className="font-normal lowercase text-[var(--shell-muted)]">(PDF or image, optional)</span>
              </label>
              <FileUpload
                bucket="crm-assets"
                ownerType="requirement"
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
                {submitting ? "Saving..." : `${editRecord ? "Save" : "Add"} Requirement`}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
