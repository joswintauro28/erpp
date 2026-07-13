"use client";

import { useState, useEffect } from "react";
import { X, Download, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";

interface FileEntry {
  name: string;
  size: string;
  file_data?: string;
}

interface DocumentDetailsModalProps {
  doc: Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
}

function dataURLtoBlob(dataurl: string) {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

function getMockHtml(doc: Record<string, unknown>) {
  return `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; padding: 24px; margin: 0; background-color: #f8fafc; color: #1e293b; }
          .doc-container { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); max-width: 100%; box-sizing: border-box; }
          .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { margin: 0; font-size: 20px; color: #0f172a; font-weight: 600; }
          .subtitle { margin: 4px 0 0 0; color: #64748b; font-size: 13px; }
          .status-badge { background-color: #fef3c7; color: #d97706; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; font-size: 13px; }
          .info-item label { color: #64748b; font-weight: 500; display: block; margin-bottom: 4px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
          .content-section { border-top: 1px solid #f1f5f9; padding-top: 24px; }
          .content-title { font-size: 14px; font-weight: 600; margin-top: 0; margin-bottom: 12px; color: #0f172a; }
          .content-text { font-size: 13px; line-height: 1.6; color: #475569; }
        </style>
      </head>
      <body>
        <div class="doc-container">
          <div class="header"><div><h1 class="title">${doc.name as string}</h1><p class="subtitle">Document ID: ${doc.id_str as string}</p></div><div><span class="status-badge">${doc.status as string}</span></div></div>
          <div class="info-grid">
            <div class="info-item"><label>Account Name</label><span>${(doc.account as string) || "N/A"}</span></div>
            <div class="info-item"><label>Document Type</label><span>${(doc.type as string) || "N/A"}</span></div>
            <div class="info-item"><label>Author / Owner</label><span>${(doc.owner as string) || "N/A"}</span></div>
            <div class="info-item"><label>File Size</label><span>${(doc.size as string) || "N/A"}</span></div>
          </div>
          <div class="content-section">
            <h3 class="content-title">${(doc.summary as string) ? "Document Summary" : "Agreement & SLA Summary"}</h3>
            <p class="content-text">${(doc.summary as string) || "This document serves as an official record for CRM operations."}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export default function DocumentDetailsModal({
  doc, isOpen, onClose,
}: DocumentDetailsModalProps) {
  const [fileList, setFileList] = useState<FileEntry[]>([]);
  const [activeFile, setActiveFile] = useState<FileEntry | null>(null);

  useEffect(() => {
    if (!doc) {
      setFileList([]);
      setActiveFile(null);
      return;
    }
    let list: FileEntry[] = [];
    if (doc.files) {
      try {
        list = JSON.parse(doc.files as string);
      } catch { /* ignore */ }
    }
    if (list.length === 0 && doc.file_data) {
      list = [{ name: (doc.name as string) || "", size: (doc.size as string) || "", file_data: doc.file_data as string }];
    }
    setFileList(list);
    setActiveFile(list.length > 0 ? list[0] : null);
  }, [doc]);

  if (!isOpen || !doc) return null;

  const handleDownloadFile = (file: FileEntry | null) => {
    if (file?.file_data) {
      try {
        const blob = dataURLtoBlob(file.file_data);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = file.name;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        const link = document.createElement("a");
        link.href = file.file_data; link.download = file.name;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link);
      }
    } else {
      const blob = new Blob([getMockHtml(doc)], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `${String(doc.name).split(", ")[0] || "document"}.html`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleOpenInNewTab = (file: FileEntry | null) => {
    if (file?.file_data) {
      try {
        window.open(URL.createObjectURL(dataURLtoBlob(file.file_data)), "_blank");
      } catch {
        const newTab = window.open();
        if (newTab) {
          newTab.document.write(`<iframe src="${file.file_data}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`);
          newTab.document.close();
        }
      }
    } else {
      const newTab = window.open();
      if (newTab) { newTab.document.write(getMockHtml(doc)); newTab.document.close(); }
    }
  };

  const renderFilePreview = () => {
    if (activeFile?.file_data) {
      if (activeFile.file_data.startsWith("data:application/pdf")) {
        return <iframe src={activeFile.file_data} className="w-full h-[420px] rounded border-none" title={activeFile.name} />;
      }
      if (activeFile.file_data.startsWith("data:image/")) {
        return (
          <div className="flex h-[420px] items-center justify-center rounded bg-muted/50 p-4">
            <img src={activeFile.file_data} className="max-w-full max-h-full rounded object-contain" alt={activeFile.name} />
          </div>
        );
      }
    }
    return <iframe srcDoc={getMockHtml(doc)} className="w-full h-[420px] rounded border border-border" title={doc.name as string} />;
  };

  const statusColor = (s: string) => {
    if (s === "Signed") return { bg: "bg-emerald-100", text: "text-emerald-700" };
    if (s === "Under Review") return { bg: "bg-amber-100", text: "text-amber-700" };
    return { bg: "bg-muted", text: "text-muted-foreground" };
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-xl border bg-card p-6 shadow-engineered">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-foreground" />
            <h3 className="m-0 text-lg font-semibold text-foreground">
              Document Details: {String(doc.name).split(", ")[0]}
            </h3>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-[250px_1fr] gap-6">
          <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto border-r border-border pr-6">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document ID</span>
              <span className="text-sm font-semibold text-foreground">{doc.id_str as string}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</span>
              <span className="text-sm font-semibold text-foreground">{doc.type as string}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</span>
              <span className="text-sm font-semibold text-foreground">{doc.account as string}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Owner</span>
              <span className="text-sm font-semibold text-foreground">{doc.owner as string}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
              <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${statusColor(doc.status as string).bg} ${statusColor(doc.status as string).text}`}>
                {doc.status as string}
              </span>
            </div>
            {((doc.summary as string) && (doc.summary as string) !== "None" && String(doc.summary).trim() !== "") && (
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</span>
                <p className="mt-1 rounded bg-muted/30 p-2 text-xs leading-relaxed text-foreground">
                  {doc.summary as string}
                </p>
              </div>
            )}
            <div className="border-t border-border pt-4">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Uploaded Files ({fileList.length})
              </span>
              <div className="flex flex-col gap-2">
                {fileList.map((file, idx) => (
                  <div
                    key={idx}
                    className={`cursor-pointer rounded-md border p-2 text-sm transition-colors ${
                      activeFile?.name === file.name
                        ? "border-foreground bg-muted/40"
                        : "border-border bg-transparent hover:bg-muted/20"
                    }`}
                    onClick={() => setActiveFile(file)}
                  >
                    <div className="truncate font-semibold text-foreground" title={file.name}>{file.name}</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{file.size}</span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleOpenInNewTab(file)} className="cursor-pointer border-none bg-transparent p-0 text-muted-foreground hover:text-foreground" title="Open in new tab">
                          <ExternalLink className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleDownloadFile(file)} className="cursor-pointer border-none bg-transparent p-0 text-muted-foreground hover:text-foreground" title="Download file">
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Frame Preview: {activeFile ? activeFile.name : (doc.name as string)}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenInNewTab(activeFile)}>
                  <ExternalLink className="h-3 w-3" /> Open in New Tab
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadFile(activeFile)}>
                  <Download className="h-3 w-3" /> Download
                </Button>
              </div>
            </div>
            {renderFilePreview()}
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
