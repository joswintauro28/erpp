"use client";

import * as React from "react";
import { Upload, X, FileIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

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

export function FileUpload({
  bucket,
  ownerType,
  ownerId,
  onUpload,
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
        const res = await fetch("/api/files/upload-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original_name: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            bucket,
            owner_type: ownerType,
            owner_id: ownerId,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Upload request failed" }));
          throw new Error(err.detail || "Upload request failed");
        }

        const { file_id, upload_url } = await res.json();

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

        const confirmRes = await fetch("/api/files/confirm-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_id }),
        });

        if (!confirmRes.ok) throw new Error("Failed to confirm upload");

        const record: FileRecord = await confirmRes.json();
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
    [bucket, ownerType, ownerId, accept, maxSize, onUpload],
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

  const progressIcon = (p: UploadingFile["progress"]) => {
    switch (p) {
      case "done":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-[var(--shell-brand)]" />;
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

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragOver
            ? "border-[var(--shell-brand)] bg-[var(--shell-brand)]/5"
            : "border-[var(--shell-muted)] hover:border-[var(--shell-brand)]/50 hover:bg-muted/50",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Upload className="h-8 w-8 text-[var(--shell-muted)]" />
        <p className="text-sm font-medium text-[var(--shell-foreground)]">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-[var(--shell-muted)]">
          Max {formatBytes(maxSize)}
        </p>
      </div>

      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((entry, idx) => (
            <div
              key={`${entry.file.name}-${idx}`}
              className="flex items-center gap-3 rounded-md border border-[var(--shell-muted)]/20 bg-muted/30 px-3 py-2"
            >
              {progressIcon(entry.progress)}
              <FileIcon className="h-4 w-4 shrink-0 text-[var(--shell-muted)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.file.name}</p>
                <p className="text-xs text-[var(--shell-muted)]">
                  {formatBytes(entry.file.size)}
                  {entry.error && <span className="ml-2 text-red-500">{entry.error}</span>}
                </p>
              </div>
              {entry.progress !== "uploading" && entry.progress !== "confirming" && (
                <button
                  onClick={() => removeEntry(idx)}
                  className="shrink-0 rounded p-1 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
