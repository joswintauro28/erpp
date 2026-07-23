"use client";

import { useState, useEffect } from "react";
import { X, FileText, Download, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FileItem {
  name: string;
  size?: string;
  file_data?: string;
}

interface DocumentDetailsModalProps {
  doc: any;
  isOpen: boolean;
  onClose: () => void;
}

function dataURLtoBlob(dataurl: string) {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

function getMockHtml(doc: any) {
  return `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            padding: 24px; margin: 0;
            background-color: #f8fafc; color: #1e293b;
          }
          .doc-container {
            background-color: #ffffff;
            border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            max-width: 100%; box-sizing: border-box;
          }
          .header {
            border-bottom: 2px solid #f1f5f9; padding-bottom: 20px;
            margin-bottom: 24px; display: flex;
            justify-content: space-between; align-items: flex-start;
          }
          .title { margin: 0; font-size: 20px; color: #0f172a; font-weight: 600; }
          .subtitle { margin: 4px 0 0 0; color: #64748b; font-size: 13px; }
          .status-badge {
            background-color: #fef3c7; color: #d97706;
            padding: 4px 12px; border-radius: 9999px;
            font-size: 11px; font-weight: 600; text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .info-grid {
            display: grid; grid-template-columns: 1fr 1fr;
            gap: 16px; margin-bottom: 32px; font-size: 13px;
          }
          .info-item label { color: #64748b; font-weight: 500; display: block; margin-bottom: 4px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
          .info-item value { font-weight: 600; color: #334155; }
          .content-section { border-top: 1px solid #f1f5f9; padding-top: 24px; }
          .content-title { font-size: 14px; font-weight: 600; margin-top: 0; margin-bottom: 12px; color: #0f172a; }
          .content-text { font-size: 13px; line-height: 1.6; color: #475569; }
        </style>
      </head>
      <body>
        <div class="doc-container">
          <div class="header">
            <div>
              <h1 class="title">${doc?.title || doc?.name}</h1>
              <p class="subtitle">Document ID: ${doc?.id_str}</p>
            </div>
            <div><span class="status-badge">${doc?.status}</span></div>
          </div>
          <div class="info-grid">
            <div class="info-item"><label>Account Name</label><value>${doc?.account || "N/A"}</value></div>
            <div class="info-item"><label>Document Type</label><value>${doc?.type || "N/A"}</value></div>
            <div class="info-item"><label>Author / Owner</label><value>${doc?.owner || "N/A"}</value></div>
            <div class="info-item"><label>File Size</label><value>${doc?.size || "N/A"}</value></div>
          </div>
          <div class="content-section">
            <h3 class="content-title">${doc?.summary ? "Document Summary" : "Agreement & SLA Summary"}</h3>
            <p class="content-text">${doc?.summary || `This document serves as an official record for CRM operations. All procedures and service-level agreements (SLAs) outlined in this record are binding under corporate policies.`}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export default function DocumentDetailsModal({ doc, isOpen, onClose }: DocumentDetailsModalProps) {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [activeFile, setActiveFile] = useState<FileItem | null>(null);

  useEffect(() => {
    if (!doc) {
      setFileList([]);
      setActiveFile(null);
      return;
    }

    let list: FileItem[] = [];
    if (doc.files) {
      try {
        list = JSON.parse(doc.files);
      } catch {}
    }

    if (list.length === 0 && doc.file_data) {
      list = [{ name: doc.name || doc.title, size: doc.size, file_data: doc.file_data }];
    }

    setFileList(list);
    setActiveFile(list.length > 0 ? list[0] : null);
  }, [doc]);

  if (!isOpen || !doc) return null;

  const handleDownloadFile = (file: FileItem | null) => {
    const target = file || activeFile;
    if (target?.file_data) {
      try {
        const blob = dataURLtoBlob(target.file_data);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = target.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        const link = document.createElement("a");
        link.href = target.file_data!;
        link.download = target.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      const blob = new Blob([getMockHtml(doc)], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(doc.title || doc.name || "document").split(", ")[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleOpenInNewTab = (file: FileItem | null) => {
    const target = file || activeFile;
    if (target?.file_data) {
      try {
        const blob = dataURLtoBlob(target.file_data);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } catch {
        const newTab = window.open();
        if (newTab) {
          newTab.document.write(`<iframe src="${target.file_data}" frameborder="0" style="border:0; width:100%; height:100%;" allowfullscreen></iframe>`);
          newTab.document.close();
        }
      }
    } else {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(getMockHtml(doc));
        newTab.document.close();
      }
    }
  };

  const renderFilePreview = () => {
    if (activeFile?.file_data) {
      if (activeFile.file_data.startsWith("data:application/pdf")) {
        return (
          <iframe
            src={activeFile.file_data}
            className="w-full h-[420px] border-0 rounded"
            title={activeFile.name}
          />
        );
      }
      if (activeFile.file_data.startsWith("data:image/")) {
        return (
          <div className="flex items-center justify-center bg-[var(--shell-surface-alt)] p-4 rounded h-[420px]">
            <img src={activeFile.file_data} alt={activeFile.name} className="max-w-full max-h-full object-contain rounded" />
          </div>
        );
      }
    }

    return (
      <iframe
        srcDoc={getMockHtml(doc)}
        className="w-full h-[420px] border border-[var(--shell-border)] rounded"
        title={doc.title || doc.name}
      />
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-xl border border-border bg-card w-full max-w-[900px] max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex justify-between items-center pb-4 mb-6 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            <h3 className="text-base font-bold text-foreground m-0">
              Document Details: {(doc.title || doc.name || "").split(", ")[0]}
            </h3>
          </div>
          <button className="p-1 rounded-md hover:bg-muted text-muted-foreground cursor-pointer" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6 mb-6">
          <div className="flex flex-col gap-5 border-b md:border-b-0 md:border-r border-[var(--shell-border)] pb-6 md:pb-0 md:pr-6 max-h-[65vh] overflow-y-auto">
            <div>
              <div className="text-[11px] font-semibold uppercase text-[var(--shell-muted)] mb-0.5">Document ID</div>
              <div className="text-sm font-medium text-[var(--shell-foreground)]">{doc.id_str}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-[var(--shell-muted)] mb-0.5">Type</div>
              <div className="text-sm font-medium text-[var(--shell-foreground)]">{doc.type}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-[var(--shell-muted)] mb-0.5">Account</div>
              <div className="text-sm font-medium text-[var(--shell-foreground)]">{doc.account}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-[var(--shell-muted)] mb-0.5">Owner</div>
              <div className="text-sm font-medium text-[var(--shell-foreground)]">{doc.owner}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-[var(--shell-muted)] mb-0.5">Status</div>
              <Badge variant={
                doc.status === "Signed" ? "default" :
                doc.status === "Under Review" ? "secondary" :
                doc.status === "Expired" ? "destructive" :
                "outline"
              }>{doc.status}</Badge>
            </div>

            {doc.summary && doc.summary !== "None" && doc.summary.trim() !== "" && (
              <div>
                <div className="text-[11px] font-semibold uppercase text-[var(--shell-muted)] mb-0.5">Summary</div>
                <p className="text-xs leading-relaxed text-[var(--shell-foreground)] m-0 bg-[var(--shell-surface-alt)] p-2 rounded">{doc.summary}</p>
              </div>
            )}

            <div className="border-t border-[var(--shell-border)] pt-4">
              <div className="text-[11px] font-semibold uppercase text-[var(--shell-muted)] mb-2">Uploaded Files ({fileList.length})</div>
              <div className="flex flex-col gap-2">
                {fileList.map((file, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-md border cursor-pointer text-xs ${
                      activeFile?.name === file.name
                        ? "border-[var(--shell-brand)] bg-[var(--shell-surface-alt)]"
                        : "border-[var(--shell-border)]"
                    }`}
                    onClick={() => setActiveFile(file)}
                  >
                    <div className="font-medium text-[var(--shell-foreground)] truncate" title={file.name}>{file.name}</div>
                    <div className="flex justify-between items-center mt-1 text-[var(--shell-muted)]">
                      <span>{file.size}</span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleOpenInNewTab(file)} className="hover:text-[var(--shell-foreground)] cursor-pointer" title="Open in new tab"><ExternalLink size={12} /></button>
                        <button onClick={() => handleDownloadFile(file)} className="hover:text-[var(--shell-foreground)] cursor-pointer" title="Download"><Download size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-semibold uppercase text-[var(--shell-muted)]">
                Frame Preview: {activeFile ? activeFile.name : (doc.title || doc.name)}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenInNewTab(null)}>
                  <ExternalLink size={12} className="mr-1" /> Open in New Tab
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadFile(null)}>
                  <Download size={12} className="mr-1" /> Download
                </Button>
              </div>
            </div>
            {renderFilePreview()}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[var(--shell-border)]">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
