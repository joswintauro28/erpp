"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, TrendingUp, ClipboardList, FileSpreadsheet, Plus,
  CheckCircle, Loader, Trash2, ChevronRight, ChevronDown,
  Paperclip, Download, Eye, ShoppingCart, Edit2, PackageOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/services/api";
import { toastError } from "@/utils/toast";
import { useConfirm } from "@datavex/ui-theme";
import { FileUpload, type FileRecord } from "@datavex/ui-theme";

const stageColors: Record<string, { bg: string; color: string }> = {
  Discovery:   { bg: "#dbeafe", color: "#1d4ed8" },
  Proposal:    { bg: "#fef3c7", color: "#b45309" },
  Negotiation: { bg: "#ede9fe", color: "#7c3aed" },
  Won:         { bg: "#dcfce7", color: "#15803d" },
  Lost:        { bg: "#fee2e2", color: "#b91c1c" },
};

interface ReqRowProps {
  req: any;
  onDelete: (r: any) => void;
  onEdit: (r: any) => void;
}

function ReqRow({ req, onDelete, onEdit }: ReqRowProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] mb-2 overflow-hidden">
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 p-3 cursor-pointer select-none"
      >
        <ClipboardList size={14} className="shrink-0 text-[var(--shell-brand)]" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-[var(--shell-foreground)] truncate">{req.name}</div>
          <div className="text-xs text-[var(--shell-muted)] mt-px">{req.category} &middot; {req.priority} priority &middot; {req.owner}</div>
        </div>
        <Badge variant="neutral">{req.status}</Badge>
        {open ? <ChevronDown size={14} className="shrink-0 text-[var(--shell-muted)]" /> : <ChevronRight size={14} className="shrink-0 text-[var(--shell-muted)]" />}
      </div>

      {open && (
        <div className="border-t border-[var(--shell-border)] p-3 bg-[var(--shell-bg)]">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {[
              { label: "ID", value: req.id_str },
              { label: "Account", value: req.account },
              { label: "Category", value: req.category },
              { label: "Priority", value: req.priority },
              { label: "Status", value: req.status },
              { label: "Owner", value: req.owner },
            ].filter((f) => f.value).map((f) => (
              <div key={f.label}>
                <div className="text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-0.5">{f.label}</div>
                <div className="text-xs font-medium text-[var(--shell-foreground)]">{f.value}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--shell-border)] pt-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--shell-muted)] mb-1">Description</div>
            <div className="text-xs text-[var(--shell-foreground)] leading-relaxed">{req.name}</div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(req); }}><Edit2 size={12} className="mr-1" /> Edit</Button>
            <Button variant="outline" size="sm" className="border-[var(--shell-danger)]/30 text-[var(--shell-danger)] hover:bg-[var(--shell-danger-surface)]" onClick={(e) => { e.stopPropagation(); onDelete(req); }}><Trash2 size={12} className="mr-1" /> Delete</Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuoteRowProps {
  quote: any;
  onDelete: (q: any) => void;
  onPreview: (q: any) => void;
  onConverted?: () => void;
  onEdit: (q: any) => void;
}

function QuoteRow({ quote, onDelete, onPreview, onConverted, onEdit }: QuoteRowProps) {
  const [open, setOpen] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [saleSuccess, setSaleSuccess] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const due30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [saleData, setSaleData] = useState({ issued_date: today, due_date: due30, rep: quote.owner || "" });

  const isAccepted = quote.status === "Accepted";
  const isConverted = quote.status === "Converted";

  const handleConvertSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleSubmitting(true);
    setSaleError("");
    try {
      await api.post("/sales-orders", {
        account: quote.account || "",
        from_quote: quote.quote_no || "",
        value: quote.value || "0",
        date_ordered: saleData.issued_date,
        eta: saleData.due_date,
        status: "Pending",
        owner: saleData.rep,
      });

      await api.put(`/quotations/${quote.id}/status?status=Converted`);

      setSaleSuccess(true);
      setShowSaleForm(false);
      if (onConverted) onConverted();
    } catch {
      setSaleError("Failed to create sales order.");
    } finally {
      setSaleSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-xl border mb-2 overflow-hidden ${
        isConverted ? "border-[var(--shell-success)]/30 bg-[var(--shell-success-surface)]" : "border-[var(--shell-border)] bg-[var(--shell-surface)]"
      }`}
    >
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 p-3 cursor-pointer select-none"
      >
        <FileSpreadsheet size={14} className={`shrink-0 ${isConverted ? "text-[var(--shell-success)]" : "text-[var(--shell-warning)]"}`} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-[var(--shell-foreground)] flex items-center gap-1.5 flex-wrap">
            {quote.quote_no}
            {quote.file_data && <Paperclip size={11} className="text-[var(--shell-warning)]" />}
            {isConverted && (
              <span className="text-[10px] font-bold text-[var(--shell-success)] bg-[var(--shell-success-surface)] px-1.5 py-0.5 rounded-full">
                &#10003; Converted to Sales Order
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--shell-muted)] mt-px">
            Value: {quote.value} &middot; Valid until: {quote.valid_until} &middot; {quote.owner}
          </div>
        </div>
        <Badge variant={isConverted ? "default" : isAccepted ? "default" : "secondary"}>{quote.status}</Badge>
        {open ? <ChevronDown size={14} className="shrink-0 text-[var(--shell-muted)]" /> : <ChevronRight size={14} className="shrink-0 text-[var(--shell-muted)]" />}
      </div>

      {open && (
        <div className="border-t border-[var(--shell-border)] p-3 bg-[var(--shell-bg)]">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {[
              { label: "Quote No.", value: quote.quote_no },
              { label: "ID", value: quote.id_str },
              { label: "Account", value: quote.account },
              { label: "Value", value: quote.value },
              { label: "Valid Until", value: quote.valid_until },
              { label: "Status", value: quote.status },
              { label: "Owner", value: quote.owner },
            ].filter((f) => f.value).map((f) => (
              <div key={f.label}>
                <div className="text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-0.5">{f.label}</div>
                <div className="text-xs font-medium text-[var(--shell-foreground)]">{f.value}</div>
              </div>
            ))}
          </div>

          {quote.file_data ? (
            <div className="border-t border-[var(--shell-border)] pt-3 mb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--shell-muted)] mb-2">Attached File</div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--shell-warning)]/30 bg-[var(--shell-warning-surface)]">
                <Paperclip size={13} className="text-[var(--shell-warning)] shrink-0" />
                <span className="flex-1 text-xs font-medium text-[var(--shell-foreground)] truncate">{quote.file_name || "attachment"}</span>
                <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={(e) => { e.stopPropagation(); onPreview(quote); }}><Eye size={12} className="mr-1" /> View</Button>
                <a href={quote.file_data} download={quote.file_name || "attachment"} onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] border-[var(--shell-success)]/30 text-[var(--shell-success)]"><Download size={12} className="mr-1" /> Download</Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="border-t border-[var(--shell-border)] pt-3 mb-3 text-[11px] italic text-[var(--shell-muted)]">No file attached.</div>
          )}

          <div className="border-t border-[var(--shell-border)] pt-3">
            {isConverted || saleSuccess ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--shell-success-surface)] border border-[var(--shell-success)]/30 text-[var(--shell-success)] text-xs font-semibold">
                <CheckCircle size={14} /> This quotation has been converted to a Sales Order.
              </div>
            ) : !showSaleForm ? (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <span className="text-[11px] text-[var(--shell-muted)]">
                  {isAccepted
                    ? "Quotation accepted — ready to convert to a Sales Order."
                    : 'Set status to <strong>Accepted</strong> to enable sales order conversion.'
                  }
                </span>
                <Button
                  disabled={!isAccepted}
                  onClick={(e) => { e.stopPropagation(); setShowSaleForm(true); }}
                  className="h-8 text-xs shrink-0"
                >
                  <ShoppingCart size={13} className="mr-1.5" /> Convert to Sales Order
                </Button>
              </div>
            ) : (
              <form onSubmit={handleConvertSale} className="p-3 rounded-xl border border-[var(--shell-success)]/30 bg-[var(--shell-success-surface)]">
                <div className="font-bold text-xs text-[var(--shell-success)] flex items-center gap-1.5 mb-3">
                  <ShoppingCart size={14} /> Convert to Sales Order
                </div>
                <div className="text-[11px] text-[var(--shell-success)] mb-3 p-1.5 rounded-md bg-[var(--shell-success-surface)]">
                  Account: <strong>{quote.account}</strong> &nbsp;&middot;&nbsp; Amount: <strong>{quote.value}</strong>
                </div>
                {saleError && <div className="p-2 bg-[var(--shell-danger-surface)] text-[var(--shell-danger)] rounded-md text-[11px] mb-3">{saleError}</div>}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Order Date *</label>
                    <input type="date" value={saleData.issued_date} onChange={(e) => setSaleData((p) => ({ ...p, issued_date: e.target.value }))} className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">ETA Date *</label>
                    <input type="date" value={saleData.due_date} onChange={(e) => setSaleData((p) => ({ ...p, due_date: e.target.value }))} className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs" required />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Sales Rep *</label>
                  <input type="text" placeholder="e.g. Rohan Mehta" value={saleData.rep} onChange={(e) => setSaleData((p) => ({ ...p, rep: e.target.value }))} className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs" required />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowSaleForm(false); setSaleError(""); }}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={saleSubmitting} className="bg-green-600 hover:bg-green-700">
                    {saleSubmitting ? <Loader size={13} className="mr-1 animate-spin" /> : <CheckCircle size={13} className="mr-1" />}
                    {saleSubmitting ? "Creating..." : "Confirm & Create"}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {!showSaleForm && !isConverted && !saleSuccess && (
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(quote); }}><Edit2 size={12} className="mr-1" /> Edit</Button>
              <Button variant="outline" size="sm" className="border-[var(--shell-danger)]/30 text-[var(--shell-danger)] hover:bg-[var(--shell-danger-surface)]" onClick={(e) => { e.stopPropagation(); onDelete(quote); }}><Trash2 size={12} className="mr-1" /> Delete</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface OpportunityDetailModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OpportunityDetailModal({ record, isOpen, onClose, onSuccess }: OpportunityDetailModalProps) {
  const confirm = useConfirm();
  const [tab, setTab] = useState("details");

  const [requirements, setRequirements] = useState<any[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqError, setReqError] = useState("");
  const [reqData, setReqData] = useState({ name: "", category: "Technical", priority: "Medium", status: "Draft", owner: "" });

  const [quotations, setQuotations] = useState<any[]>([]);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quoteData, setQuoteData] = useState({ quote_no: "", value: "", valid_until: "", status: "Draft", owner: "" });
  const [quoteFileId, setQuoteFileId] = useState<number | null>(null);
  const [previewQuote, setPreviewQuote] = useState<any>(null);

  const [editReq, setEditReq] = useState<any>(null);
  const [editQuote, setEditQuote] = useState<any>(null);

  const fetchRequirements = useCallback(async () => {
    if (!record) return;
    setReqLoading(true);
    try {
      const d = await api.get<any>("/requirements");
      setRequirements((d.requirements || []).filter((r: any) => r.account === record.account));
    } catch {
      /* silent */
    } finally {
      setReqLoading(false);
    }
  }, [record]);

  const fetchQuotations = useCallback(async () => {
    if (!record) return;
    setQuoteLoading(true);
    try {
      const d = await api.get<any>("/quotations");
      setQuotations((d.quotations || []).filter((q: any) => q.account === record.account));
    } catch {
      /* silent */
    } finally {
      setQuoteLoading(false);
    }
  }, [record]);

  useEffect(() => {
    if (isOpen && record) {
      setTab("details");
      setShowReqForm(false);
      setShowQuoteForm(false);
      setReqError("");
      setQuoteError("");
      setReqData({ name: "", category: "Technical", priority: "Medium", status: "Draft", owner: "" });
      setQuoteData({ quote_no: "", value: "", valid_until: "", status: "Draft", owner: "" });
      setEditReq(null);
      setEditQuote(null);
      setPreviewQuote(null);
      setQuoteFileId(null);
      fetchRequirements();
      fetchQuotations();
    }
  }, [isOpen, record]);

  useEffect(() => {
    if (tab === "requirements") fetchRequirements();
    if (tab === "quotations") fetchQuotations();
  }, [tab]);

  if (!isOpen || !record) return null;

  const formatValue = (v: any) => {
    const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
    if (isNaN(n)) return v;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  };

  const handleReqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqSubmitting(true);
    setReqError("");
    try {
      const isEdit = !!editReq;
      const body = {
        name: reqData.name || `Requirement for ${record.account}`,
        account: record.account || "",
        category: reqData.category,
        priority: reqData.priority,
        status: reqData.status,
        owner: reqData.owner,
      };
      if (isEdit) {
        await api.put(`/requirements/${editReq.id_str}`, body);
      } else {
        await api.post("/requirements", body);
      }
      setShowReqForm(false);
      setEditReq(null);
      setReqData({ name: "", category: "Technical", priority: "Medium", status: "Draft", owner: "" });
      fetchRequirements();
      if (onSuccess) onSuccess();
    } catch {
      setReqError("Failed to save.");
    } finally {
      setReqSubmitting(false);
    }
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteSubmitting(true);
    setQuoteError("");
    try {
      const isEdit = !!editQuote;
      const body = {
        quote_no: quoteData.quote_no || "",
        account: record.account || "",
        value: quoteData.value,
        valid_until: quoteData.valid_until,
        status: quoteData.status,
        owner: quoteData.owner,
        file_id: quoteFileId,
      };
      if (isEdit) {
        await api.put(`/quotations/${editQuote.id}`, body);
        if (quoteData.status !== editQuote.status) {
          await api.put(`/quotations/${editQuote.id}/status?status=${quoteData.status}`);
        }
      } else {
        const res = await api.post<any>("/quotations", body);
        if (quoteData.status && quoteData.status.toLowerCase() !== "draft") {
          await api.put(`/quotations/${res.id}/status?status=${quoteData.status}`);
        }
      }
      setShowQuoteForm(false);
      setEditQuote(null);
      setQuoteData({ quote_no: "", value: "", valid_until: "", status: "Draft", owner: "" });
      setQuoteFileId(null);
      fetchQuotations();
      if (onSuccess) onSuccess();
    } catch {
      setQuoteError("Failed to save.");
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const handleDeleteReq = async (req: any) => {
    if (!(await confirm({ title: "Delete requirement", message: "Delete this requirement?", destructive: true }))) return;
    try {
      await api.delete(`/requirements/${req.id_str}`);
      fetchRequirements();
    } catch {
      /* silent */
    }
  };

  const handleDeleteQuote = async (q: any) => {
    if (!(await confirm({ title: "Delete quotation", message: "Delete this quotation?", destructive: true }))) return;
    try {
      await api.delete(`/quotations/${q.id}`);
      fetchQuotations();
    } catch (err: any) {
      toastError(err?.response?.data?.detail || err?.message || "Failed to delete quotation.");
    }
  };

  const detailRows = [
    { label: "Deal", value: record.name },
    { label: "Account", value: record.account },
    { label: "Value", value: formatValue(record.value) },
    { label: "Probability", value: record.probability },
    { label: "Stage", value: record.stage },
    { label: "Close Date", value: record.close_date },
    { label: "Owner", value: record.owner },
    { label: "Last Updated", value: record.updated_at },
  ].filter((r) => r.value);

  const sc = stageColors[record.stage] || { bg: "#f1f5f9", color: "#64748b" };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="w-full max-w-[860px] max-h-[90vh] flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-xl">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border shrink-0">
            <TrendingUp size={20} className="shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-foreground truncate">{record.name}</h3>
              <div className="text-[11px] text-muted-foreground mt-px">{record.account} &middot; {record.id_str}</div>
            </div>
            <span className="px-3 py-0.5 rounded-full text-[11px] font-bold shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>{record.stage}</span>
            <button className="p-1 rounded-md hover:bg-muted text-muted-foreground cursor-pointer" onClick={onClose}><X size={18} /></button>
          </div>

          <div className="flex px-6 border-b border-border shrink-0">
            {["details", "requirements", "quotations"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="relative py-2.5 px-4 text-sm font-medium whitespace-nowrap cursor-pointer"
                style={{
                  color: tab === t ? "var(--shell-brand)" : "var(--shell-muted)",
                  borderBottom: tab === t ? "2px solid var(--shell-brand)" : "2px solid transparent",
                }}
              >
                {t === "details" ? "Details" : t === "requirements" ? `Requirements${requirements.length ? ` (${requirements.length})` : ""}` : `Quotations${quotations.length ? ` (${quotations.length})` : ""}`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {tab === "details" && (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  {[
                    { label: "Value", value: formatValue(record.value), icon: "\uD83D\uDCB0" },
                    { label: "Probability", value: record.probability, icon: "\uD83C\uDFAF" },
                    { label: "Close Date", value: record.close_date, icon: "\uD83D\uDCC5" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl border border-border bg-card p-3.5 text-center">
                      <div className="text-lg mb-1">{m.icon}</div>
                      <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5">{m.label}</div>
                      <div className="text-sm font-bold text-foreground">{m.value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  {detailRows.map((row, i) => (
                    <div
                      key={row.label}
                      className="flex flex-col sm:flex-row px-4 py-2.5 text-xs gap-1 sm:gap-0"
                      style={{ backgroundColor: i % 2 === 0 ? "var(--shell-surface)" : "var(--shell-bg)", borderBottom: i < detailRows.length - 1 ? "1px solid var(--shell-border)" : "none" }}
                    >
                      <span className="w-[140px] shrink-0 font-semibold uppercase text-[var(--shell-muted)]">{row.label}</span>
                      <span className="font-medium text-[var(--shell-foreground)] break-words">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 p-3 rounded-lg bg-[var(--shell-info-surface)] border border-[var(--shell-info)]/30 text-[11px] text-[var(--shell-info)] flex items-center gap-2">
                  <ChevronRight size={14} />
                  Use the <strong className="mx-1">Requirements</strong> and <strong className="mx-1">Quotations</strong> tabs to attach linked records to this opportunity.
                </div>
              </div>
            )}

            {tab === "requirements" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-sm font-bold text-[var(--shell-foreground)]">Requirements</div>
                    <div className="text-[11px] text-[var(--shell-muted)]">Linked to: <strong>{record.account}</strong></div>
                  </div>
                  {!showReqForm && (
                    <Button size="sm" onClick={() => setShowReqForm(true)}><Plus size={14} className="mr-1" /> Add Requirement</Button>
                  )}
                </div>

                {showReqForm && (
                  <form onSubmit={handleReqSubmit} className="p-4 rounded-xl border border-blue-300 bg-[var(--shell-info-surface)] mb-4">
                    <div className="text-xs font-bold text-[var(--shell-info)] flex items-center gap-1.5 mb-3">
                      <ClipboardList size={14} /> {editReq ? "Edit Requirement" : "New Requirement"}
                    </div>
                    {reqError && <div className="p-2 bg-[var(--shell-danger-surface)] text-[var(--shell-danger)] rounded-md text-[11px] mb-3">{reqError}</div>}
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Description *</label>
                        <input type="text" placeholder="Describe the requirement..." value={reqData.name} onChange={(e) => setReqData((p) => ({ ...p, name: e.target.value }))} className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs" required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Category *</label>
                          <input type="text" placeholder="e.g. Technical, Security" value={reqData.category} onChange={(e) => setReqData((p) => ({ ...p, category: e.target.value }))} className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Priority</label>
                          <input type="text" placeholder="e.g. High, Medium, Low" value={reqData.priority} onChange={(e) => setReqData((p) => ({ ...p, priority: e.target.value }))} className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Status</label>
                          <input type="text" placeholder="e.g. Draft, Review, Approved" value={reqData.status} onChange={(e) => setReqData((p) => ({ ...p, status: e.target.value }))} className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Owner *</label>
                          <input type="text" placeholder="e.g. Aditi Rao" value={reqData.owner} onChange={(e) => setReqData((p) => ({ ...p, owner: e.target.value }))} className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs" required />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => { setShowReqForm(false); setEditReq(null); setReqData({ name: "", category: "Technical", priority: "Medium", status: "Draft", owner: "" }); }}>Cancel</Button>
                      <Button type="submit" size="sm" disabled={reqSubmitting}>
                        {reqSubmitting ? <Loader size={13} className="mr-1 animate-spin" /> : <CheckCircle size={13} className="mr-1" />}
                        {reqSubmitting ? "Saving..." : "Save Requirement"}
                      </Button>
                    </div>
                  </form>
                )}

                {reqLoading ? (
                  <div className="text-center py-8 text-[var(--shell-muted)] text-sm">Loading...</div>
                ) : requirements.length === 0 ? (
                  <div className="py-10 border border-dashed border-[var(--shell-border)] rounded-xl">
                    <EmptyState icon={ClipboardList} title={`No requirements linked to ${record.account} yet.`} />
                  </div>
                ) : (
                  requirements.map((r) => (
                    <ReqRow
                      key={r.id || r.id_str}
                      req={r}
                      onDelete={handleDeleteReq}
                      onEdit={(req) => {
                        setEditReq(req);
                        setReqData({ name: req.name, category: req.category, priority: req.priority, status: req.status, owner: req.owner });
                        setShowReqForm(true);
                      }}
                    />
                  ))
                )}
              </div>
            )}

            {tab === "quotations" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-sm font-bold text-[var(--shell-foreground)]">Quotations</div>
                    <div className="text-[11px] text-[var(--shell-muted)]">Linked to: <strong>{record.account}</strong></div>
                  </div>
                  {!showQuoteForm && (
                    <Button size="sm" onClick={() => setShowQuoteForm(true)}><Plus size={14} className="mr-1" /> Add Quotation</Button>
                  )}
                </div>

                {showQuoteForm && (
                  <form onSubmit={handleQuoteSubmit} className="p-4 rounded-xl border border-[var(--shell-warning)]/30 bg-[var(--shell-warning-surface)] mb-4">
                    <div className="text-xs font-bold text-[var(--shell-warning)] flex items-center gap-1.5 mb-3">
                      <FileSpreadsheet size={14} /> {editQuote ? "Edit Quotation" : "New Quotation"}
                    </div>
                    {quoteError && <div className="p-2 bg-[var(--shell-danger-surface)] text-[var(--shell-danger)] rounded-md text-[11px] mb-3">{quoteError}</div>}
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Quote No.</label>
                          <input type="text" placeholder="Auto-generated if blank" value={quoteData.quote_no} onChange={(e) => setQuoteData((p) => ({ ...p, quote_no: e.target.value }))} className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Value *</label>
                          <input type="text" placeholder="e.g. 500000" value={quoteData.value} onChange={(e) => setQuoteData((p) => ({ ...p, value: e.target.value }))} className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Valid Until *</label>
                          <input type="date" value={quoteData.valid_until} onChange={(e) => setQuoteData((p) => ({ ...p, valid_until: e.target.value }))} className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Status</label>
                          <select
                            value={quoteData.status}
                            onChange={(e) => setQuoteData((p) => ({ ...p, status: e.target.value }))}
                            className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2 text-xs text-[var(--shell-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--shell-brand)]"
                            required
                          >
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Expired">Expired</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Owner *</label>
                        <input type="text" placeholder="e.g. Rohan Mehta" value={quoteData.owner} onChange={(e) => setQuoteData((p) => ({ ...p, owner: e.target.value }))} className="h-8 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] px-2.5 text-xs" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">
                          Attach File <span className="font-normal lowercase text-[var(--shell-muted)]">(PDF or image, optional)</span>
                        </label>
                        <FileUpload
                          bucket="crm-assets"
                          ownerType="quotation"
                          ownerId={editQuote?.id || 0}
                          onUpload={(r: FileRecord) => setQuoteFileId(r.id)}
                          accept="application/pdf,image/*"
                          maxSize={10 * 1024 * 1024}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => { setShowQuoteForm(false); setEditQuote(null); setQuoteData({ quote_no: "", value: "", valid_until: "", status: "Draft", owner: "" }); setQuoteFileId(null); }}>Cancel</Button>
                      <Button type="submit" size="sm" disabled={quoteSubmitting}>
                        {quoteSubmitting ? <Loader size={13} className="mr-1 animate-spin" /> : <CheckCircle size={13} className="mr-1" />}
                        {quoteSubmitting ? "Saving..." : "Save Quotation"}
                      </Button>
                    </div>
                  </form>
                )}

                {quoteLoading ? (
                  <div className="text-center py-8 text-[var(--shell-muted)] text-sm">Loading...</div>
                ) : quotations.length === 0 ? (
                  <div className="py-10 border border-dashed border-[var(--shell-border)] rounded-xl">
                    <EmptyState icon={FileSpreadsheet} title={`No quotations linked to ${record.account} yet.`} />
                  </div>
                ) : (
                  quotations.map((q) => (
                    <QuoteRow
                      key={q.id || q.id_str}
                      quote={q}
                      onDelete={handleDeleteQuote}
                      onPreview={setPreviewQuote}
                      onEdit={(quote) => {
                        setEditQuote(quote);
                        const rawVal = String(quote.value || "");
                        const cleanVal = rawVal.replace(/[^0-9.]/g, "");
                        setQuoteData({ quote_no: quote.quote_no, value: cleanVal, valid_until: quote.valid_until, status: quote.status, owner: quote.owner });
                        setShowQuoteForm(true);
                      }}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {previewQuote && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setPreviewQuote(null)}>
          <div className="bg-popover rounded-xl p-4 max-w-[860px] w-full max-h-[90vh] flex flex-col gap-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Paperclip size={15} className="text-[var(--shell-warning)]" />
                <span className="text-sm font-bold text-[var(--shell-foreground)]">{previewQuote.file_name || "Attachment"}</span>
                <span className="text-[11px] text-[var(--shell-muted)]">&middot; {previewQuote.quote_no}</span>
              </div>
              <div className="flex gap-2 items-center">
                <a href={previewQuote.file_data} download={previewQuote.file_name || "attachment"}>
                  <Button size="sm" variant="outline"><Download size={13} className="mr-1" /> Download</Button>
                </a>
                <button onClick={() => setPreviewQuote(null)} className="text-[var(--shell-muted)] hover:text-[var(--shell-foreground)] cursor-pointer"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden rounded-lg border border-[var(--shell-border)] min-h-[400px] max-h-[70vh]">
              {previewQuote.file_data?.startsWith("data:application/pdf") ? (
                <iframe src={previewQuote.file_data} className="w-full h-full min-h-[400px] border-none" title="PDF Preview" />
              ) : previewQuote.file_data?.startsWith("data:image/") ? (
                <div className="flex items-center justify-center bg-[var(--shell-bg)] h-full min-h-[400px] p-4">
                  <img src={previewQuote.file_data} alt="Attachment" className="max-w-full max-h-[65vh] object-contain rounded-md" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[200px] text-[var(--shell-muted)] text-xs">Preview not available for this file type.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
