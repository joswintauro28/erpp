"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, FileText, FileIcon, Image, Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

export interface FilePreviewModalProps {
  fileId: number | null;
  fileName?: string;
  mimeType?: string;
  open: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Shared modal for previewing files from RustFS via the /api/files/:id/stream
 * endpoint (302 redirect to presigned URL).
 *
 * - images → inline <img> with zoom controls
 * - PDFs → inline <iframe>
 * - others → download-only card
 *
 * Keyboard: Escape to close, +/- to zoom images
 */
export function FilePreviewModal({ fileId, fileName, mimeType, open, onClose }: FilePreviewModalProps) {
  const [meta, setMeta] = useState<{ original_name: string; mime_type: string; size_bytes: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);

  const streamUrl = fileId ? `/api/files/${fileId}/stream` : null;
  const isImage = (mimeType || meta?.mime_type || "").startsWith("image/");
  const isPdf = (mimeType || meta?.mime_type || "").includes("pdf");

  // Fetch file metadata on open
  useEffect(() => {
    if (!open || !fileId) return;
    setLoading(true);
    setZoom(1);
    fetch(`/api/files/${fileId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setMeta(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, fileId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMeta(null);
      setZoom(1);
    }
  }, [open]);

  // Keyboard handler: Escape + zoom
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (isImage) {
        if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 3));
        if (e.key === "-" || e.key === "_") setZoom((z) => Math.max(z - 0.25, 0.25));
        if (e.key === "0") setZoom(1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, isImage]);

  const handleDownload = useCallback(() => {
    if (!streamUrl) return;
    const a = document.createElement("a");
    a.href = streamUrl;
    a.download = fileName || meta?.original_name || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [streamUrl, fileName, meta]);

  if (!open || !fileId) return null;

  const displayName = fileName || meta?.original_name || "File";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex flex-col rounded-xl border border-border bg-card shadow-2xl w-full max-w-[900px] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isImage ? <Image size={16} className="shrink-0 text-[var(--shell-info)]" /> :
             isPdf ? <FileText size={16} className="shrink-0 text-[var(--shell-danger)]" /> :
             <FileIcon size={16} className="shrink-0 text-muted-foreground" />}
            <span className="text-sm font-semibold truncate">{displayName}</span>
            {meta?.size_bytes ? (
              <span className="text-[11px] text-muted-foreground shrink-0">· {formatBytes(meta.size_bytes)}</span>
            ) : null}
            {isImage && zoom !== 1 && (
              <span className="text-[11px] text-muted-foreground shrink-0">· {Math.round(zoom * 100)}%</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isImage && (
              <>
                <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))} title="Zoom out (-)">
                  <ZoomOut size={14} />
                </Button>
                <Button variant="outline" size="icon-sm" onClick={() => setZoom(1)} title="Reset zoom (0)">
                  <RotateCcw size={14} />
                </Button>
                <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.min(z + 0.25, 3))} title="Zoom in (+)">
                  <ZoomIn size={14} />
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download size={13} className="mr-1" /> Download
            </Button>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto min-h-[300px] max-h-[75vh] bg-background">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : isImage && streamUrl ? (
            <div className="flex items-center justify-center h-full p-4 overflow-auto">
              <img
                src={streamUrl}
                alt={displayName}
                className="rounded-md transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              />
            </div>
          ) : isPdf && streamUrl ? (
            <iframe
              src={streamUrl}
              className="w-full h-full min-h-[500px] border-none"
              title={displayName}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <FileIcon size={40} strokeWidth={1} />
              <p className="text-sm">Preview not available for this file type.</p>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download size={13} className="mr-1" /> Download to view
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
