"use client";

import React, { useState, useEffect } from "react";
import { FileText, FileSpreadsheet, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import { FileViewer, FilePreviewModal, type FileRecord } from "@datavex/ui-theme";

interface RequirementDetailsModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RequirementDetailsModal({
  record,
  isOpen,
  onClose,
  onSuccess,
}: RequirementDetailsModalProps) {
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotationSubmitting, setQuotationSubmitting] = useState(false);
  const [quotationError, setQuotationError] = useState("");
  const [quotationData, setQuotationData] = useState({
    quote_no: "",
    value: "",
    valid_until: "",
    status: "Draft",
    owner: "",
  });

  // Attached files from MinIO
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
        const files = await api.get<FileRecord[]>(`/files?owner_type=requirement&owner_id=${record.id}`);
        if (!cancelled) setAttachedFiles(files || []);
      } catch {
        if (!cancelled) setAttachedFiles([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, record?.id]);

  if (!isOpen || !record) return null;

  const handleDeleteFile = async (file: FileRecord) => {
    try {
      await api.delete(`/files/${file.id}`);
      setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch {
      // silent
    }
  };

  const handleQuotationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuotationSubmitting(true);
    setQuotationError("");

    try {
      const quoteNo = quotationData.quote_no || "";
      const rawValue = quotationData.value.replace(/[₹$,\s]/g, "");
      const numericValue = parseFloat(rawValue) || 0;

      const payload = {
        clientName: record.account || "",
        clientId: 0,
        ...(quoteNo ? { quotationNumber: quoteNo } : {}),
        validUntil: quotationData.valid_until || undefined,
        notes: `Converted from requirement: ${record.name || ""}`,
        items: [
          {
            description: record.name || "Requirement conversion",
            quantity: 1,
            unitPrice: numericValue,
            gstRate: 18,
          },
        ],
      };

      await api.post("/crm/quotations", payload);
      await api.delete(`/crm/requirements/${record.id_str}`);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setQuotationError(err instanceof Error ? err.message : "Failed to convert to quotation.");
    } finally {
      setQuotationSubmitting(false);
    }
  };

  const renderFrameContent = () => {
    const fields = [
      { label: "Requirement ID", value: record.id_str },
      { label: "Requirements Title", value: record.name },
      { label: "Company Name", value: record.account },
      { label: "Category", value: record.category },
      { label: "Priority", value: record.priority },
      { label: "Status", value: record.status },
      { label: "Representative", value: record.owner },
      { label: "Source", value: record.source || "N/A" },
      { label: "Description", value: record.description || "No description provided." },
    ];

    const htmlContent = `
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 24px; margin: 0; background-color: #f8fafc; color: #1e293b; }
            .details-sheet { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); box-sizing: border-box; }
            .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; }
            .title { margin: 0; font-size: 22px; color: #0f172a; font-weight: 700; }
            .subtitle { margin: 4px 0 0 0; color: #991b1b; font-weight: 600; font-size: 14px; }
            .details-list { font-size: 13px; margin-top: 16px; }
            .details-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
            .details-label { color: #64748b; font-weight: 500; }
            .details-val { font-weight: 600; color: #1e293b; text-align: right; max-width: 60%; }
          </style>
        </head>
        <body>
          <div class="details-sheet">
            <div class="header">
              <h1 class="title">${record.name}</h1>
              <p class="subtitle">${record.account}</p>
            </div>
            <div class="details-list">
              ${fields.map(f => `
                <div class="details-item">
                  <span class="details-label">${f.label}</span>
                  <span class="details-val">${f.value}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </body>
      </html>
    `;

    return (
      <iframe
        srcDoc={htmlContent}
        className="w-full h-[360px] border border-[var(--shell-border)] rounded-lg"
        title={record.name}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader className="border-b border-[var(--shell-border)] pb-4 mb-6">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-accent" />
            <DialogTitle className="m-0 text-base font-bold">Requirement Summary: {record.name}</DialogTitle>
          </div>
        </DialogHeader>

        {!showQuotationForm ? (
          <div className="space-y-6">
            {renderFrameContent()}

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

            <div className="flex items-center justify-between border-t border-[var(--shell-border)] pt-4">
              <Button
                onClick={() => {
                  setQuotationData({
                    quote_no: "",
                    value: "",
                    valid_until: "",
                    status: "Draft",
                    owner: record.owner || "",
                  });
                  setShowQuotationForm(true);
                }}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                size="sm"
              >
                <FileSpreadsheet className="size-3.5" />
                Add to Quotation
                <ArrowRight className="size-3.5" />
              </Button>
              <Button variant="outline" onClick={onClose} size="sm">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--shell-warning)]/30 bg-[var(--shell-warning-surface)] p-4">
              <FileSpreadsheet className="size-4 text-[var(--shell-warning)]" />
              <span className="text-sm font-semibold text-[var(--shell-warning)]">
                Converting <strong>{record.name}</strong> to a Quotation
              </span>
            </div>

            <div className="mb-5 flex flex-wrap gap-6 rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)]/50 px-4 py-3 text-xs text-[var(--shell-muted)]">
              <span>Account: <strong className="text-[var(--shell-foreground)]">{record.account}</strong></span>
              <span>Requirement: <strong className="text-[var(--shell-foreground)]">{record.name}</strong></span>
            </div>

            {quotationError && (
              <div className="mb-4 rounded-sm bg-[var(--shell-danger-surface)] px-3 py-2 text-xs text-[var(--shell-danger)]">
                {quotationError}
              </div>
            )}

            <form onSubmit={handleQuotationSubmit}>
              <div className="mb-6 flex flex-col gap-4">
                <div>
                  <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Quote No.</Label>
                  <Input
                    placeholder="e.g. QT-20260001 (auto-generated if blank)"
                    value={quotationData.quote_no}
                    onChange={e => setQuotationData(p => ({ ...p, quote_no: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Value *</Label>
                    <Input
                      placeholder="e.g. ₹5,00,000 or $10,000"
                      value={quotationData.value}
                      onChange={e => setQuotationData(p => ({ ...p, value: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Valid Until *</Label>
                    <input
                      type="date"
                      value={quotationData.valid_until}
                      onChange={e => setQuotationData(p => ({ ...p, valid_until: e.target.value }))}
                      className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Status *</Label>
                    <Input
                      placeholder="e.g. Draft, Sent, Accepted"
                      value={quotationData.status}
                      onChange={e => setQuotationData(p => ({ ...p, status: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner *</Label>
                    <Input
                      placeholder="e.g. Aditi Rao"
                      value={quotationData.owner}
                      onChange={e => setQuotationData(p => ({ ...p, owner: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowQuotationForm(false)} size="sm">
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={quotationSubmitting}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                  size="sm"
                >
                  <FileSpreadsheet className="size-3.5" />
                  {quotationSubmitting ? 'Converting...' : 'Confirm & Add to Quotation'}
                </Button>
              </div>
            </form>
          </div>
        )}
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
