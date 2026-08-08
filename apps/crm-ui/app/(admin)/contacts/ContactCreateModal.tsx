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

interface ContactCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

export default function ContactCreateModal({
  isOpen,
  onClose,
  onSuccess,
  editRecord = null,
}: ContactCreateModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    account: "",
    email: "",
    phone: "",
    type: "Primary",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setFormData({
          name: editRecord.name || "",
          role: editRecord.role || "",
          account: editRecord.account || "",
          email: editRecord.email || "",
          phone: editRecord.phone || "",
          type: editRecord.type || "Primary",
        });
      } else {
        setFormData({
          name: "",
          role: "",
          account: "",
          email: "",
          phone: "",
          type: "Primary",
        });
      }
      setError("");
    }
  }, [isOpen, editRecord]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Apply basic phone pattern filter on input change
    if (name === "phone" && value !== "" && !/^\+?[0-9\s()+-]*$/.test(value)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (formData.phone && !formData.phone.trim().startsWith("+")) {
      setError("Phone number must start with a country code (e.g. +1).");
      setSubmitting(false);
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address (e.g. name@domain.com).");
      setSubmitting(false);
      return;
    }

    const now = new Date();
    const dateStr =
      now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) +
      " " +
      now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const submissionData = {
      ...formData,
      last_contact: dateStr,
    };

    try {
      if (editRecord) {
        await api.put(`/contacts/${editRecord.id_str}`, submissionData);
      } else {
        await api.post("/contacts", submissionData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${editRecord ? "update" : "create"} contact.`
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
            {editRecord ? "Edit Contact" : "Add New Contact"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 border border-destructive/30 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
              Full Name
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Jane Doe"
              required
              className="h-9 border-[var(--shell-border)] bg-[var(--shell-bg)] text-xs text-[var(--shell-foreground)] focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="role" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
                Role / Title
              </Label>
              <Input
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                placeholder="e.g. Chief Operations Officer"
                required
                className="h-9 border-[var(--shell-border)] bg-[var(--shell-bg)] text-xs text-[var(--shell-foreground)] focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="account" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
                Account / Company
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. jane@acme.com"
                required
                className="h-9 border-[var(--shell-border)] bg-[var(--shell-bg)] text-xs text-[var(--shell-foreground)] focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
                Phone Number
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +1234567890"
                required
                className="h-9 border-[var(--shell-border)] bg-[var(--shell-bg)] text-xs text-[var(--shell-foreground)] focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
              Contact Type
            </Label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {["Primary", "Decision", "Influencer", "Inactive"].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
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
              {submitting ? "Saving..." : editRecord ? "Save Changes" : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
