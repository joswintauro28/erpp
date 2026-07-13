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

export default function DocumentDetailsModal({
  doc,
  isOpen,
  onClose,
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
        list = JSON.parse(doc.files as string) as FileEntry[];
      } catch {
        console.error("Failed to parse document files JSON");
      }
    }

    if (list.length === 0 && doc.file_data) {
      list = [
        {
          name: (doc.name as string) || "",
          size: (doc.size as string) || "",
          file_data: doc.file_data as string,
        },
      ];
    }

    setFileList(list);
    setActiveFile(list.length > 0 ? list[0] : null);
  }, [doc]);

  if (!isOpen || !doc) return null;

  const getMockHtml = () => {
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
                <h1 class="title">${doc.name as string}</h1>
                <p class="subtitle">Document ID: ${doc.id_str as string}</p>
              </div>
              <div>
                <span class="status-badge">${doc.status as string}</span>
              </div>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <label>Account Name</label>
                <value>${(doc.account as string) || "N/A"}</value>
              </div>
              <div class="info-item">
                <label>Document Type</label>
                <value>${(doc.type as string) || "N/A"}</value>
              </div>
              <div class="info-item">
                <label>Author / Owner</label>
                <value>${(doc.owner as string) || "N/A"}</value>
              </div>
              <div class="info-item">
                <label>File Size</label>
                <value>${(doc.size as string) || "N/A"}</value>
              </div>
            </div>
            <div class="content-section">
              <h3 class="content-title">${(doc.summary as string) ? "Document Summary" : "Agreement & SLA Summary"}</h3>
              <p class="content-text">
                ${(doc.summary as string) || `This document serves as an official record for CRM operations.`}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleDownloadFile = (file: FileEntry | null) => {
    if (file?.file_data) {
      try {
        const blob = dataURLtoBlob(file.file_data);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        const link = document.createElement("a");
        link.href = file.file_data;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      const blob = new Blob([getMockHtml()], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${String(doc.name).split(", ")[0] || "document"}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleOpenInNewTab = (file: FileEntry | null) => {
    if (file?.file_data) {
      try {
        const blob = dataURLtoBlob(file.file_data);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } catch {
        const newTab = window.open();
        if (newTab) {
          newTab.document.write(
            `<iframe src="${file.file_data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`,
          );
          newTab.document.close();
        }
      }
    } else {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(getMockHtml());
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
            style={{
              width: "100%",
              height: "420px",
              border: "none",
              borderRadius: "4px",
            }}
            title={activeFile.name}
          />
        );
      }
      if (activeFile.file_data.startsWith("data:image/")) {
        return (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#f1f5f9",
              padding: "1rem",
              borderRadius: "4px",
              height: "420px",
            }}
          >
            <img
              src={activeFile.file_data}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "4px",
              }}
              alt={activeFile.name}
            />
          </div>
        );
      }
    }

    return (
      <iframe
        srcDoc={getMockHtml()}
        style={{
          width: "100%",
          height: "420px",
          border: "1px solid var(--border-color)",
          borderRadius: "4px",
        }}
        title={doc.name as string}
      />
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div
        className="rounded-xl border bg-card shadow-engineered"
        style={{
          maxWidth: "900px",
          width: "100%",
          padding: "1.5rem",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0 }}>
              Document Details: {String(doc.name).split(", ")[0]}
            </h3>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "250px 1fr",
            gap: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              borderRight: "1px solid var(--border-color)",
              paddingRight: "1.5rem",
              maxHeight: "65vh",
              overflowY: "auto",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  display: "block",
                  fontWeight: 600,
                }}
              >
                Document ID
              </span>
              <span style={{ fontSize: "0.875rem", fontWeight: 550 }}>
                {doc.id_str as string}
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  display: "block",
                  fontWeight: 600,
                }}
              >
                Type
              </span>
              <span style={{ fontSize: "0.875rem", fontWeight: 550 }}>
                {doc.type as string}
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  display: "block",
                  fontWeight: 600,
                }}
              >
                Account
              </span>
              <span style={{ fontSize: "0.875rem", fontWeight: 550 }}>
                {doc.account as string}
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  display: "block",
                  fontWeight: 600,
                }}
              >
                Owner
              </span>
              <span style={{ fontSize: "0.875rem", fontWeight: 550 }}>
                {doc.owner as string}
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  display: "block",
                  fontWeight: 600,
                }}
              >
                Status
              </span>
              <span
                style={{
                  display: "inline-block",
                  marginTop: "0.25rem",
                  fontSize: "0.75rem",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "4px",
                  fontWeight: 600,
                  backgroundColor:
                    (doc.status as string) === "Signed"
                      ? "#dcfce7"
                      : (doc.status as string) === "Under Review"
                        ? "#fef3c7"
                        : "#f1f5f9",
                  color:
                    (doc.status as string) === "Signed"
                      ? "#15803d"
                      : (doc.status as string) === "Under Review"
                        ? "#b45309"
                        : "#475569",
                }}
              >
                {doc.status as string}
              </span>
            </div>

            {(doc.summary as string) &&
              (doc.summary as string) !== "None" &&
              (doc.summary as string).trim() !== "" && (
                <div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      display: "block",
                      fontWeight: 600,
                    }}
                  >
                    Summary
                  </span>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      margin: "0.25rem 0 0 0",
                      color: "var(--text-main)",
                      lineHeight: "1.4",
                      backgroundColor: "var(--shell-surface-alt)",
                      padding: "0.5rem",
                      borderRadius: "4px",
                    }}
                  >
                    {doc.summary as string}
                  </p>
                </div>
              )}

            <div
              style={{
                borderTop: "1px solid var(--border-color)",
                paddingTop: "1rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  display: "block",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                Uploaded Files ({fileList.length})
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {fileList.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid",
                      borderColor:
                        activeFile?.name === file.name
                          ? "var(--accent-primary)"
                          : "var(--border-color)",
                      backgroundColor:
                        activeFile?.name === file.name
                          ? "var(--shell-surface-alt)"
                          : "transparent",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                    }}
                    onClick={() => setActiveFile(file)}
                  >
                    <div
                      style={{
                        fontWeight: 550,
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        color: "var(--text-main)",
                      }}
                      title={file.name}
                    >
                      {file.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "0.25rem",
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                      }}
                    >
                      <span>{file.size}</span>
                      <div
                        style={{ display: "flex", gap: "0.35rem" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleOpenInNewTab(file)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            color: "var(--text-muted)",
                          }}
                          title="Open in new tab"
                        >
                          <ExternalLink size={12} />
                        </button>
                        <button
                          onClick={() => handleDownloadFile(file)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            color: "var(--text-muted)",
                          }}
                          title="Download file"
                        >
                          <Download size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Frame Preview: {activeFile ? activeFile.name : (doc.name as string)}
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button variant="outline" size="sm" onClick={() => handleOpenInNewTab(activeFile)}>
                  <ExternalLink size={12} /> Open in New Tab
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadFile(activeFile)}>
                  <Download size={12} /> Download
                </Button>
              </div>
            </div>
            {renderFilePreview()}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            borderTop: "1px solid var(--border-color)",
            paddingTop: "1rem",
          }}
        >
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
