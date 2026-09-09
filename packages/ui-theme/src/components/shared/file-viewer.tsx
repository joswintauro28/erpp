"use client";

import * as React from "react";
import { Download, Eye, FileIcon, Image, FileText, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { api } from "@datavex/auth-middleware";
import type { FileRecord } from "./file-upload";

interface FileViewerProps {
  files: FileRecord[];
  onDelete?: (record: FileRecord) => void;
  /** Called when the user clicks Preview. When omitted, files open in a new tab. */
  onPreview?: (record: FileRecord) => void;
  className?: string;
  showActions?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  if (mimeType.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
  return <FileIcon className="h-4 w-4 text-[var(--shell-muted)]" />;
}

async function downloadFile(record: FileRecord) {
  try {
    // Use the /stream endpoint which 302-redirects to the presigned MinIO URL.
    // This avoids the JSON-wrapping issue and works with browser download.
    const baseUrl = "/api/files";
    const a = document.createElement("a");
    a.href = `${baseUrl}/${record.id}/stream`;
    a.download = record.original_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    // silent
  }
}

async function openPreview(record: FileRecord) {
  try {
    // Use the /stream endpoint which 302-redirects to the presigned MinIO URL.
    window.open(`/api/files/${record.id}/stream`, "_blank");
  } catch {
    // silent
  }
}

export function FileViewer({ files, onDelete, onPreview, className, showActions = true }: FileViewerProps) {
  if (files.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {files.map((record) => (
        <div
          key={record.id}
          className="flex items-center gap-3 rounded-md border border-[var(--shell-muted)]/20 bg-muted/30 px-3 py-2"
        >
          {fileIcon(record.mime_type)}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{record.original_name}</p>
            <p className="text-xs text-[var(--shell-muted)]">
              {formatBytes(record.size_bytes)}
              {record.checksum_sha256 && (
                <span className="ml-2 font-mono opacity-60">{record.checksum_sha256.slice(0, 8)}</span>
              )}
            </p>
          </div>
          {showActions && (
            <div className="flex shrink-0 gap-1">
              {(record.mime_type.startsWith("image/") || record.mime_type.includes("pdf")) && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => (onPreview ? onPreview(record) : openPreview(record))}
                  title={onPreview ? "Preview" : "Open in new tab"}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => downloadFile(record)}
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDelete(record)}
                  title="Delete"
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
