"use client";

import { FileText, Download } from "lucide-react";

interface FileAttachmentProps {
  fileData: string;
  fileName: string;
}

export default function FileAttachment({ fileData, fileName }: FileAttachmentProps) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Attached Document: {fileName || "attachment"}
          </span>
        </div>
        <a
          href={fileData}
          download={fileName || "attachment"}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-foreground hover:text-action"
        >
          <Download className="h-3 w-3" /> Download
        </a>
      </div>

      {fileData.startsWith("data:application/pdf") ? (
        <iframe
          src={fileData}
          className="w-full h-[300px] rounded-md border border-border"
          title="Attached File Preview"
        />
      ) : fileData.startsWith("data:image/") ? (
        <div className="flex max-h-[300px] items-center justify-center overflow-y-auto rounded-md bg-muted/50 p-2">
          <img
            src={fileData}
            alt="Attachment Preview"
            className="max-w-full h-auto rounded"
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Preview not available for this file type.
        </p>
      )}
    </div>
  );
}
