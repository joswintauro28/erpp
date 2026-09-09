"use client";

import React, { useState, useMemo, useEffect } from "react";
import { api } from "@/services/api";
import { FileText, Mail, Phone, Building2, Calendar, Users, DollarSign, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { FileViewer, FilePreviewModal, type FileRecord } from "@datavex/ui-theme";

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num || 0);
}

interface QuotationDetailsModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialShowForm?: string;
}

export default function QuotationDetailsModal({ record, isOpen, onClose, onSuccess, initialShowForm = "" }: QuotationDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [formType, setFormType] = useState(initialShowForm || "");
  const [attachedFiles, setAttachedFiles] = useState<FileRecord[]>([]);
  const [previewFile, setPreviewFile] = useState<{ id: number; name: string; mimeType: string } | null>(null);

  // Fetch attached files when modal opens
  useEffect(() => {
    if (!isOpen || !record?.id) {
      setAttachedFiles([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const files = await api.get<FileRecord[]>(`/files?owner_type=quotation&owner_id=${record.id}`);
        if (!cancelled) setAttachedFiles(files || []);
      } catch {
        if (!cancelled) setAttachedFiles([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, record?.id]);

  const handleConvert = async () => {
    if (!record) return;
    setLoading(true);
    try {
      await api.post(`/crm/quotations/${record.id}/convert`);
      onSuccess?.();
      setFormType("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (file: FileRecord) => {
    try {
      await api.delete(`/files/${file.id}`);
      setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch {
      // silent
    }
  };

  const content = useMemo(() => {
    const rec = record || {};
    const stageColors: Record<string, string> = {
      "Draft": "bg-gray-500",
      "Sent": "bg-blue-500",
      "Accepted": "bg-emerald-500",
      "Rejected": "bg-red-500",
      "Expired": "bg-slate-500",
    };

    return (
      <div className="space-y-6">
        {/* Header Card */}
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--shell-brand)]/10 border border-[var(--shell-brand)]/20">
              <FileText className="h-7 w-7 text-[var(--shell-brand)]" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-semibold text-[var(--shell-foreground)]">
                {rec.quote_no || rec.quote_number}
              </h3>
              <p className="text-xs text-[var(--shell-muted)]">{rec.account}</p>
            </div>
            <div className="ml-auto">
              <Badge className={stageColors[rec.status] || "bg-gray-500"}>
                {rec.status}
              </Badge>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[var(--shell-brand)]" />
              <span className="text-xs text-[var(--shell-muted)]">Value:</span>
              <span className="text-sm font-semibold text-[var(--shell-foreground)]">
                {typeof rec.value === "string" ? rec.value : formatCurrency(rec.value)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--shell-muted)]" />
              <span className="text-xs text-[var(--shell-muted)]">Valid:</span>
              <span className="text-sm text-[var(--shell-foreground)]">{rec.valid_until}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[var(--shell-muted)]" />
              <span className="text-xs text-[var(--shell-muted)]">Stage:</span>
              <span className="text-sm text-[var(--shell-foreground)]">{rec.stage}</span>
            </div>
          </div>
        </div>

        {/* Client Details */}
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-[var(--shell-muted)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)]">Client Details</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Account</Label>
              <p className="text-sm text-[var(--shell-foreground)]">{rec.account}</p>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Contact</Label>
              <p className="text-sm text-[var(--shell-foreground)]">{rec.contact_name}</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[var(--shell-muted)]" />
                <span className="text-xs text-[var(--shell-muted)]">Email:</span>
              </div>
              <p className="text-sm text-[var(--shell-foreground)]">{rec.email}</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[var(--shell-muted)]" />
                <span className="text-xs text-[var(--shell-muted)]">Phone:</span>
              </div>
              <p className="text-sm text-[var(--shell-foreground)]">{rec.phone}</p>
            </div>
          </div>
        </div>

        {/* Quote Details */}
        <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-[var(--shell-muted)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)]">Quote Details</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Status</Label>
              <Badge>{rec.status}</Badge>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner</Label>
              <div className="flex items-center gap-2 mt-1">
                <Users className="h-4 w-4 text-[var(--shell-muted)]" />
                <span className="text-sm text-[var(--shell-foreground)]">{rec.owner}</span>
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Quote Number</Label>
              <p className="text-sm font-mono text-[var(--shell-foreground)]">{rec.quote_no || rec.quote_number}</p>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Probability</Label>
              <p className="text-sm text-[var(--shell-foreground)]">
                {typeof rec.probability === "number" ? `${rec.probability}%` : rec.probability}
              </p>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Converted Invoice</Label>
              <p className="text-sm text-[var(--shell-foreground)]">
                {rec.converted_invoice_id ? `INV-${rec.converted_invoice_id}` : "Not converted"}
              </p>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">ID</Label>
              <p className="text-sm font-mono text-[var(--shell-foreground)]">{rec.id_str}</p>
            </div>
          </div>
        </div>

        {/* Approval Status */}
        {rec.approved_at && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Approved by owner</span>
            </div>
            <p className="text-xs text-emerald-600/70 mt-1">
              Approved at {rec.approved_at}
            </p>
          </div>
        )}

        {/* Notes */}
        {rec.notes && (
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-[var(--shell-muted)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)]">Notes</span>
            </div>
            <p className="text-sm text-[var(--shell-foreground)]">{rec.notes}</p>
          </div>
        )}

        {/* Attached Files from MinIO */}
        {attachedFiles.length > 0 && (
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-[var(--shell-muted)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--shell-foreground)]">
                Attached Documents ({attachedFiles.length})
              </span>
            </div>
            <FileViewer
              files={attachedFiles}
              onDelete={handleDeleteFile}
              onPreview={(f) => setPreviewFile({ id: f.id, name: f.original_name, mimeType: f.mime_type })}
              showActions={true}
            />
          </div>
        )}

        {/* Conversion CTA */}
        {rec.status === "Accepted" && !rec.converted_invoice_id && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Ready to convert to Sales Order</span>
            </div>
            <p className="text-xs text-emerald-600/70 mt-1">
              This quote has been accepted and can be converted to a sales order.
            </p>
          </div>
        )}
      </div>
    );
  }, [record, attachedFiles]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quotation Details</DialogTitle>
          <DialogDescription>Viewing quotation record</DialogDescription>
        </DialogHeader>
        {content}
        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>

      {/* File Preview Modal */}
      <FilePreviewModal
        fileId={previewFile?.id ?? null}
        fileName={previewFile?.name}
        mimeType={previewFile?.mimeType}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </Dialog>
  );
}
