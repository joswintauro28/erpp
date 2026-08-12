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

interface CustomerCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

export default function CustomerCreateModal({
  isOpen,
  onClose,
  onSuccess,
  editRecord = null,
}: CustomerCreateModalProps) {
  const [formData, setFormData] = useState({
    account: "",
    industry: "Software",
    tier: "Silver",
    arr: 0,
    credit_limit: null as number | null,
    status: "Prospect",
    owner: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      const base = {
        account: "",
        industry: "Software",
        tier: "Silver",
        arr: 0,
        credit_limit: null as number | null,
        status: "Prospect",
        owner: "",
      };
      if (editRecord) {
        setFormData({
          ...base,
          account: editRecord.account || "",
          industry: editRecord.industry || "Software",
          tier: editRecord.tier || "Silver",
          arr: editRecord.arr || 0,
          credit_limit:
            editRecord.credit_limit != null ? Number(editRecord.credit_limit) : null,
          status: editRecord.status || "Prospect",
          owner: editRecord.owner || "",
        });
      } else {
        setFormData(base);
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
      [name]:
        name === "arr"
          ? parseFloat(value) || 0
          : name === "credit_limit"
          ? value === ""
            ? null
            : parseFloat(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const now = new Date();
    const dateStr =
      now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) +
      " " +
      now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const submissionData = {
      ...formData,
      updated_at: dateStr,
    };

    try {
      if (editRecord) {
        await api.put(`/customers/${editRecord.id_str}`, submissionData);
      } else {
        await api.post("/customers", submissionData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${editRecord ? "update" : "create"} customer.`
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
            {editRecord ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 border border-destructive/30 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="account" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
              Account Name
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="industry" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
                Industry
              </Label>
              <select
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                required
                className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {["Software", "Hardware", "Finance", "Healthcare", "Retail", "Manufacturing", "Services", "Telecommunications", "Other"].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tier" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
                Tier
              </Label>
              <select
                id="tier"
                name="tier"
                value={formData.tier}
                onChange={handleChange}
                required
                className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {["Enterprise", "Gold", "Silver", "Bronze", "Standard"].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="arr" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
                ARR (USD)
              </Label>
              <Input
                id="arr"
                name="arr"
                type="number"
                value={formData.arr}
                onChange={handleChange}
                placeholder="e.g. 50000"
                required
                className="h-9 border-[var(--shell-border)] bg-[var(--shell-bg)] text-xs text-[var(--shell-foreground)] focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="credit_limit" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
                Credit Limit (INR)
              </Label>
              <Input
                id="credit_limit"
                name="credit_limit"
                type="number"
                min="0"
                value={formData.credit_limit ?? ""}
                onChange={handleChange}
                placeholder="Leave empty for unlimited credit"
                className="h-9 border-[var(--shell-border)] bg-[var(--shell-bg)] text-xs text-[var(--shell-foreground)] focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-[var(--shell-muted)]">
                Enforced by the billing credit check on order approval. Empty = no limit.
              </p>
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
                {["Active", "Prospect", "Dormant", "Churned"].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="owner" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
              Account Owner
            </Label>
            <Input
              id="owner"
              name="owner"
              value={formData.owner}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              required
              className="h-9 border-[var(--shell-border)] bg-[var(--shell-bg)] text-xs text-[var(--shell-foreground)] focus:ring-1 focus:ring-primary"
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
              className="h-9 text-xs font-medium bg-[#C81D25] hover:bg-[#A0171E] text-white"
            >
              {submitting ? "Saving..." : editRecord ? "Save Changes" : "Add Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
