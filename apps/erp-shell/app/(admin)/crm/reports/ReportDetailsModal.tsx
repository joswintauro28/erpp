"use client";

import React from "react";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ReportDetailsModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportDetailsModal({
  record,
  isOpen,
  onClose,
}: ReportDetailsModalProps) {
  if (!isOpen || !record) return null;

  const renderFrameContent = () => {
    const fields = [
      { label: "Report ID", value: record.id_str },
      { label: "Report Title", value: record.title },
      { label: "Category", value: record.category },
      { label: "Last Run Date", value: record.last_run },
      { label: "Status", value: record.status },
      { label: "Owner", value: record.owner },
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
            .subtitle { margin: 4px 0 0 0; color: #64748b; font-weight: 600; font-size: 14px; }
            .details-list { font-size: 13px; margin-top: 16px; }
            .details-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
            .details-label { color: #64748b; font-weight: 500; }
            .details-val { font-weight: 600; color: #1e293b; text-align: right; max-width: 60%; }
          </style>
        </head>
        <body>
          <div class="details-sheet">
            <div class="header">
              <h1 class="title">${record.title}</h1>
              <p class="subtitle">${record.category} Analytics</p>
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
        className="w-full h-[320px] border border-border rounded-lg"
        title={record.title}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader className="border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-accent" />
            <DialogTitle className="m-0 text-base font-bold">Report Summary: {record.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {renderFrameContent()}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose} size="sm">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
