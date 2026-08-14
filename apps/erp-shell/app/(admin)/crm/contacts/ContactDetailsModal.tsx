"use client";

import React from "react";
import { User, Mail, Phone, Building2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { statusVariant } from "@/lib/utils";

interface ContactDetailsModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactDetailsModal({
  record,
  isOpen,
  onClose,
}: ContactDetailsModalProps) {
  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-[var(--shell-surface)] border-[var(--shell-border)] text-[var(--shell-foreground)]">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-[var(--shell-border)] pb-3">
          <div className="flex items-center gap-2">
            <User className="size-5 text-[var(--shell-brand)]" />
            <DialogTitle className="text-lg font-semibold tracking-tight text-[var(--shell-foreground)]">
              Contact Details
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-[var(--shell-foreground)]">
                {record.name}
              </h3>
              <p className="text-xs text-[var(--shell-muted)] mt-1">
                {record.role} &middot; ID: {record.id_str}
              </p>
            </div>
            <Badge variant={statusVariant("contact", record.type)} className="px-2.5 py-0.5 text-xs font-semibold">
              {record.type}
            </Badge>
          </div>

          <div className="space-y-3 border border-[var(--shell-border)] rounded-xl bg-[var(--shell-surface-alt)] p-4">
            <div className="flex items-center gap-2.5">
              <Building2 className="size-4 text-[var(--shell-muted)] shrink-0" />
              <div className="text-xs">
                <span className="block font-semibold uppercase text-[var(--shell-muted)] tracking-wider text-[10px]">
                  Account / Company
                </span>
                <span className="font-medium text-[var(--shell-foreground)]">
                  {record.account || "N/A"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Mail className="size-4 text-[var(--shell-muted)] shrink-0" />
              <div className="text-xs">
                <span className="block font-semibold uppercase text-[var(--shell-muted)] tracking-wider text-[10px]">
                  Email Address
                </span>
                <a
                  href={`mailto:${record.email}`}
                  className="font-medium text-[var(--shell-brand)] hover:underline"
                >
                  {record.email || "N/A"}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Phone className="size-4 text-[var(--shell-muted)] shrink-0" />
              <div className="text-xs">
                <span className="block font-semibold uppercase text-[var(--shell-muted)] tracking-wider text-[10px]">
                  Phone Number
                </span>
                <a
                  href={`tel:${record.phone}`}
                  className="font-medium text-[var(--shell-foreground)] hover:underline"
                >
                  {record.phone || "N/A"}
                </a>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-[var(--shell-muted)] pt-2 border-t border-[var(--shell-border)]">
            <span>Last Contact: {record.last_contact || "N/A"}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[var(--shell-border)]">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs border-[var(--shell-border)] bg-transparent hover:bg-[var(--shell-surface-alt)] text-[var(--shell-foreground)]"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
