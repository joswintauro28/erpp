"use client";

import * as React from "react";
import {
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileImage,
  FileText,
  FileSpreadsheet,
  File,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { api } from "@datavex/auth-middleware";

export interface FileRecord {
  id: number;
  bucket: string;
  object_key: string;
  uri: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256?: string | null;
  uploader_id: number;
  owner_type: string;
  owner_id: number;
  created_at: string;
}

interface FileUploadProps {
  bucket: string;
  ownerType: string;
  ownerId: number;
  onUpload: (record: FileRecord) => void;
  clientName?: string;  // e.g. "Acme Corp" — organises files as <client>/<domain>/ in the bucket
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: "reading" | "uploading" | "confirming" | "done" | "error";
  error?: string;
  record?: FileRecord;
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isAccepted(file: File, accept?: string): boolean {
  if (!accept) return true;
  const patterns = accept.split(",").map((s) => s.trim());
  return patterns.some((pat) => {
    if (pat.endsWith("/*")) return file.type.startsWith(pat.replace("/*", "/"));
    if (pat.startsWith(".")) return file.name.toLowerCase().endsWith(pat.toLowerCase());
    return file.type === pat;
  });
}

/** Return a lucide-react icon component + colour pair for the given MIME type. */
function fileTypeMeta(mime: string): {
  Icon: typeof File;
  bg: string;
  fg: string;
} {
  if (mime.startsWith("image/"))
    return { Icon: FileImage, bg: "bg-blue-100 dark:bg-blue-900/40", fg: "text-blue-600 dark:text-blue-400" };
  if (mime === "application/pdf")
    return { Icon: FileText, bg: "bg-red-100 dark:bg-red-900/40", fg: "text-red-600 dark:text-red-400" };
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv")
    return { Icon: FileSpreadsheet, bg: "bg-emerald-100 dark:bg-emerald-900/40", fg: "text-emerald-600 dark:text-emerald-400" };
  if (mime.includes("wordprocessing") || mime === "application/msword")
    return { Icon: FileText, bg: "bg-indigo-100 dark:bg-indigo-900/40", fg: "text-indigo-600 dark:text-indigo-400" };
  return { Icon: File, bg: "bg-muted", fg: "text-[var(--shell-muted)]" };
}

/* ── component ───────────────────────────────────────────────────────────── */

export function FileUpload({
  bucket,
  ownerType,
  ownerId,
  onUpload,
  clientName,
  accept = "image/*,application/pdf,.csv,.xlsx,.docx",
  maxSize = 10 * 1024 * 1024,
  multiple = false,
  disabled = false,
  className,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const processFile = React.useCallback(
    async (file: File) => {
      if (!isAccepted(file, accept)) {
        setUploading((prev) => [...prev, { file, progress: "error", error: "File type not accepted" }]);
        return;
      }
      if (file.size > maxSize) {
        setUploading((prev) => [...prev, { file, progress: "error", error: `Max size is ${formatBytes(maxSize)}` }]);
        return;
      }

      const entry: UploadingFile = { file, progress: "reading" };
      setUploading((prev) => [...prev, entry]);

      try {
        const { file_id, upload_url } = await api.post<{
          file_id: number;
          upload_url: string;
        }>("/files/upload-request", {
          original_name: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          bucket,
          owner_type: ownerType,
          owner_id: ownerId,
          client_name: clientName || null,
        });

        entry.progress = "uploading";
        setUploading((prev) => [...prev]);

        const putRes = await fetch(upload_url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });

        if (!putRes.ok) throw new Error("Failed to upload file to storage");

        entry.progress = "confirming";
        setUploading((prev) => [...prev]);

        const record = await api.post<FileRecord>("/files/confirm-upload", {
          file_id,
        });
        entry.progress = "done";
        entry.record = record;
        setUploading((prev) => [...prev]);
        onUpload(record);
      } catch (err: any) {
        entry.progress = "error";
        entry.error = err.message || "Upload failed";
        setUploading((prev) => [...prev]);
      }
    },
    [bucket, ownerType, ownerId, clientName, accept, maxSize, onUpload],
  );

  const handleFiles = React.useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach(processFile);
    },
    [processFile],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeEntry = (idx: number) => {
    setUploading((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ── render helpers ────────────────────────────────────────────────────── */

  const statusBadge = (p: UploadingFile["progress"]) => {
    switch (p) {
      case "done":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Done
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400">
            <AlertCircle className="h-3 w-3" /> Error
          </span>
        );
      case "uploading":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Uploading
          </span>
        );
      case "confirming":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Confirming
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-[var(--shell-muted)]">
            <Loader2 className="h-3 w-3 animate-spin" /> Preparing
          </span>
        );
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragOver
            ? "border-[var(--shell-brand)] bg-[var(--shell-brand)]/5"
            : "border-[var(--shell-muted)]/40 hover:border-[var(--shell-brand)]/50 hover:bg-muted/50",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <div className="rounded-full bg-muted/60 p-2.5">
          <Upload className="h-5 w-5 text-[var(--shell-muted)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--shell-foreground)]">
            Drop files here or click to browse
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--shell-muted)]">
            Max {formatBytes(maxSize)} · {accept.replace(/\//g, "/* ")}
          </p>
        </div>
      </div>

      {/* Upload list */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((entry, idx) => {
            const { Icon, bg, fg } = fileTypeMeta(entry.file.type);
            const isActive = entry.progress === "uploading" || entry.progress === "confirming" || entry.progress === "reading";

            return (
              <div
                key={`${entry.file.name}-${idx}`}
                className={cn(
                  "relative overflow-hidden rounded-lg border px-3 py-2.5 transition-colors",
                  entry.progress === "done"
                    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
                    : entry.progress === "error"
                      ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
                      : "border-[var(--shell-border)] bg-[var(--shell-surface)]",
                )}
              >
                {/* Progress bar overlay */}
                {isActive && (
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-muted overflow-hidden">
                    <div className="h-full bg-[var(--shell-brand)] animate-pulse w-full" />
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {/* File type icon */}
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", bg)}>
                    <Icon className={cn("h-4.5 w-4.5", fg)} />
                  </div>

                  {/* File info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--shell-foreground)]">
                      {entry.file.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[11px] text-[var(--shell-muted)]">
                        {formatBytes(entry.file.size)}
                      </span>
                      {entry.error && (
                        <span className="text-[11px] text-red-500">{entry.error}</span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  {statusBadge(entry.progress)}

                  {/* Remove button */}
                  {!isActive && (
                    <button
                      onClick={() => removeEntry(idx)}
                      className="shrink-0 rounded-md p-1 text-[var(--shell-muted)] hover:bg-muted hover:text-[var(--shell-foreground)] transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
