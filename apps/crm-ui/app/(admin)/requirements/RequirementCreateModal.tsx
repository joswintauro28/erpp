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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/api";

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
    description: "",
    source: "",
  });
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
          description: editRecord.description || "",
          source: editRecord.source || "",
        });
      } else {
        setFormData({
          name: "",
          account: "",
          category: "Technical",
          priority: "Medium",
          status: "Draft",
          owner: "",
          description: "",
          source: "",
        });
      }
      setError("");
    }
  }, [isOpen, editRecord]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (editRecord) {
        await api.put(`/requirements/${editRecord.id_str}`, formData);
      } else {
        await api.post("/requirements", formData);
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
      <DialogContent className="sm:max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editRecord ? "Edit" : "Add New"} Requirement
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
                Requirement Title *
              </Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Scalable API Gateway"
                required
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
                  placeholder="e.g. Meridian Foods"
                  required
                />
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
                  Category *
                </Label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]"
                  required
                >
                  <option value="Technical">Technical</option>
                  <option value="Security">Security</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Functional">Functional</option>
                </select>
              </div>

              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
                  Priority *
                </Label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]"
                  required
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

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
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="In Review">In Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Converted">Converted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
                Source
              </Label>
              <Input
                name="source"
                value={formData.source}
                onChange={handleChange}
                placeholder="e.g. RFP Portal, Email Outreach"
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
                Description
              </Label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Detail the technical or functional specification..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} size="sm">
              {submitting ? "Saving..." : `${editRecord ? "Save" : "Add"} Requirement`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
