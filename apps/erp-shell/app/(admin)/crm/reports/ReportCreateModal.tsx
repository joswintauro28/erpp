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

interface ReportCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

export default function ReportCreateModal({
  isOpen,
  onClose,
  onSuccess,
  editRecord = null,
}: ReportCreateModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    category: "Sales",
    last_run: "",
    status: "Draft",
    owner: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setFormData({
          title: editRecord.title || "",
          category: editRecord.category || "Sales",
          last_run: editRecord.last_run || "",
          status: editRecord.status || "Draft",
          owner: editRecord.owner || "",
        });
      } else {
        setFormData({
          title: "",
          category: "Sales",
          last_run: new Date().toISOString().split("T")[0],
          status: "Draft",
          owner: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (editRecord) {
        await api.put(`/crm/reports/${editRecord.id_str}`, formData);
      } else {
        await api.post("/crm/reports", formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editRecord ? "Edit" : "Create New"} Report
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
                Report Title *
              </Label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Lead Conversion Funnel Analysis"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Category *
                </Label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]"
                  required
                >
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Customer Success">Customer Success</option>
                  <option value="General">General</option>
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
                  placeholder="e.g. Alex Chen"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                  Last Run Date *
                </Label>
                <input
                  type="date"
                  name="last_run"
                  value={formData.last_run}
                  onChange={handleChange}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]"
                  required
                />
              </div>

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
                  <option value="Draft">Draft</option>
                  <option value="Final">Final</option>
                  <option value="Generating">Generating</option>
                  <option value="Ready">Ready</option>
                  <option value="Success">Success</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} size="sm">
              {submitting ? "Saving..." : `${editRecord ? "Save" : "Create"} Report`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
