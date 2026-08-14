"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DocumentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

export default function DocumentCreateModal({
  isOpen,
  onClose,
  onSuccess,
  editRecord = null,
}: DocumentCreateModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    type: "SLA / Agreement",
    account: "",
    status: "Draft",
    owner: "",
    summary: "",
    file_data: "",
    size: "",
  });
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setFormData({
          title: editRecord.title || editRecord.name || "",
          type: editRecord.type || "SLA / Agreement",
          account: editRecord.account || "",
          status: editRecord.status || "Draft",
          owner: editRecord.owner || "",
          summary: editRecord.summary || "",
          file_data: editRecord.file_data || "",
          size: editRecord.size || "",
        });
        setFileName(editRecord.name || "");
      } else {
        setFormData({
          title: "",
          type: "SLA / Agreement",
          account: "",
          status: "Draft",
          owner: "",
          summary: "",
          file_data: "",
          size: "",
        });
        setFileName("");
      }
      setError("");
    }
  }, [isOpen, editRecord]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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
        const sizeStr =
          file.size >= 1048576
            ? `${(file.size / 1048576).toFixed(1)} MB`
            : `${(file.size / 1024).toFixed(0)} KB`;
        
        setFileName(file.name);
        setFormData((prev) => ({
          ...prev,
          title: prev.title || file.name.split(".")[0],
          size: sizeStr,
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

    if (!editRecord && !formData.file_data) {
      setError("Please upload a document file.");
      setSubmitting(false);
      return;
    }

    const now = new Date();
    const dateStr =
      now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) +
      " " +
      now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    // The backend uses item.name as well as item.title, so let's provide both
    const submissionData = {
      ...formData,
      name: fileName || formData.title,
      updated_at: dateStr,
    };

    try {
      if (editRecord) {
        await api.put(`/documents/${editRecord.id_str}`, submissionData);
      } else {
        await api.post("/documents", submissionData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${editRecord ? "update" : "create"} document.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-[var(--shell-surface)] border-[var(--shell-border)] text-[var(--shell-foreground)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight text-[var(--shell-foreground)]">
            {editRecord ? "Edit Document Metadata" : "Upload New Document"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 border border-destructive/30 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
              Document File (PDF or Image)
            </Label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileChange}
              required={!editRecord}
              className="w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2.5 py-1.5 text-xs text-[var(--shell-foreground)] file:mr-2 file:rounded file:border-0 file:bg-[var(--shell-brand)] file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-[var(--shell-action)] file:cursor-pointer"
            />
            {fileName && (
              <div className="text-[10px] text-green-600 font-medium">
                Active: {fileName} ({formData.size})
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
              Document Title
            </Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Master Services Agreement"
              required
              className="h-9 border-[var(--shell-border)] bg-[var(--shell-bg)] text-xs text-[var(--shell-foreground)] focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
                Document Type
              </Label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {["SLA / Agreement", "NDA", "Proposal", "Invoice", "Technical Spec"].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
                Status
              </Label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {["Draft", "Under Review", "Signed", "Expired"].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="account" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
                Linked Account
              </Label>
              <Input
                id="account"
                name="account"
                value={formData.account}
                onChange={handleChange}
                placeholder="e.g. Acme Corp"
                required
                className="h-9 border-[var(--shell-border)] bg-[var(--shell-bg)] text-xs text-[var(--shell-foreground)] focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="owner" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
                Owner / Author
              </Label>
              <Input
                id="owner"
                name="owner"
                value={formData.owner}
                onChange={handleChange}
                placeholder="e.g. Aditi Rao"
                required
                className="h-9 border-[var(--shell-border)] bg-[var(--shell-bg)] text-xs text-[var(--shell-foreground)] focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="summary" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
              Document Summary
            </Label>
            <Textarea
              id="summary"
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              placeholder="Provide a brief summary of the document's content..."
              className="min-h-[80px] border-[var(--shell-border)] bg-[var(--shell-bg)] text-xs text-[var(--shell-foreground)] focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--shell-border)]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs border-[var(--shell-border)] bg-transparent hover:bg-[var(--shell-surface-alt)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-9 text-xs font-medium bg-[var(--shell-brand)] hover:bg-[var(--shell-action)] text-white"
            >
              {submitting ? "Saving..." : editRecord ? "Save Changes" : "Upload Document"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
