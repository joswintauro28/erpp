"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, TrendingUp, ClipboardList, FileSpreadsheet, Plus,
  CheckCircle, Loader, Trash2, ChevronRight, ChevronDown,
  Paperclip, Download, Eye, ShoppingCart, Edit2
} from 'lucide-react';

/* ─── shared styles ─────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.45rem 0.75rem',
  border: '1px solid var(--border-color)', borderRadius: '6px',
  backgroundColor: 'var(--shell-surface,#fff)', color: 'var(--shell-foreground,#1e293b)',
  fontSize: '0.8125rem', height: '2.25rem', boxSizing: 'border-box',
};
const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 650,
  color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase',
};
const tabStyle = (active) => ({
  padding: '0.5rem 1.1rem', border: 'none', background: 'none', cursor: 'pointer',
  fontSize: '0.875rem', fontWeight: active ? 700 : 500,
  color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
  borderBottom: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
  whiteSpace: 'nowrap',
});

const BADGE_COLORS = {
  Draft:          { bg: '#f1f5f9', color: '#64748b' },
  Review:         { bg: '#fef3c7', color: '#b45309' },
  Approved:       { bg: '#dcfce7', color: '#15803d' },
  Blocked:        { bg: '#fee2e2', color: '#b91c1c' },
  Sent:           { bg: '#dbeafe', color: '#1d4ed8' },
  'Under Review': { bg: '#fef3c7', color: '#b45309' },
  Accepted:       { bg: '#dcfce7', color: '#15803d' },
  Rejected:       { bg: '#fee2e2', color: '#b91c1c' },
};
const Badge = ({ label }) => {
  const s = BADGE_COLORS[label] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: s.bg, color: s.color }}>
      {label}
    </span>
  );
};

/* ── sub-rows ─────────────────────────────────────── */
const ReqRow = ({ req, onDelete, onEdit }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card-solid,#fff)', marginBottom: '0.6rem', overflow: 'hidden' }}>
      {/* collapsed header — always visible */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}
      >
        <ClipboardList size={14} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>{req.category} &middot; {req.priority} priority &middot; {req.owner}</div>
        </div>
        <Badge label={req.status} />
        {open
          ? <ChevronDown size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          : <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        }
      </div>

      {/* expanded detail */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.875rem 0.75rem', backgroundColor: 'var(--bg-secondary,#f8fafc)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.875rem' }}>
            {[
              { label: 'ID', value: req.id_str },
              { label: 'Account', value: req.account },
              { label: 'Category', value: req.category },
              { label: 'Priority', value: req.priority },
              { label: 'Status', value: req.status },
              { label: 'Owner', value: req.owner },
            ].filter(f => f.value).map(f => (
              <div key={f.label}>
                <div style={{ fontSize: '0.7rem', fontWeight: 650, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>{f.label}</div>
                <div style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-main)' }}>{f.value}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{req.name}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.875rem', gap: '0.5rem' }}>
            <button
              onClick={e => { e.stopPropagation(); onEdit(req); }}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#fff', color: 'var(--text-main)', fontSize: '0.775rem', cursor: 'pointer', fontWeight: 600 }}
            >
              <Edit2 size={12} /> Edit
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(req); }}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fff', color: '#b91c1c', fontSize: '0.775rem', cursor: 'pointer', fontWeight: 600 }}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface QuoteRowProps {
  quote: any;
  onDelete: (q: any) => void;
  onPreview: (q: any) => void;
  onConverted?: () => void;
  onEdit: (q: any) => void;
}

const QuoteRow: React.FC<QuoteRowProps> = ({ quote, onDelete, onPreview, onConverted, onEdit }) => {
  const [open, setOpen] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleError, setSaleError]   = useState('');
  const [saleSuccess, setSaleSuccess] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const due30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [saleData, setSaleData] = useState({ issued_date: today, due_date: due30, rep: quote.owner || '' });

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const isAccepted  = quote.status === 'Accepted';
  const isConverted = quote.status === 'Converted';

  const handleConvertSale = async (e) => {
    e.preventDefault();
    setSaleSubmitting(true); setSaleError('');
    try {
      const saleRes = await fetch(`${API}/api/sales-orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_str:      `SO-${Date.now().toString().slice(-6)}`,
          so_no:       `SO-${Date.now().toString().slice(-6)}`,
          account:     quote.account || '',
          from_quote:  quote.quote_no || '',
          value:       quote.value   || '0',
          date_ordered: saleData.issued_date,
          eta:         saleData.due_date,
          status:      'Pending',
          owner:       saleData.rep,
        }),
      });
      if (!saleRes.ok) { setSaleError('Failed to create sales order record.'); return; }

      // mark quotation as Converted
      await fetch(`${API}/api/quotations/${quote.id_str}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Converted' }),
      });

      setSaleSuccess(true);
      setShowSaleForm(false);
      if (onConverted) onConverted();
    } catch { setSaleError('Network error. Please try again.'); }
    finally { setSaleSubmitting(false); }
  };

  return (
    <div style={{ borderRadius: '10px', border: `1px solid ${isConverted ? '#86efac' : 'var(--border-color)'}`, backgroundColor: isConverted ? '#f0fdf4' : 'var(--bg-card-solid,#fff)', marginBottom: '0.6rem', overflow: 'hidden' }}>
      {/* header */}
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', cursor: 'pointer', userSelect: 'none' }}>
        <FileSpreadsheet size={14} color={isConverted ? '#15803d' : '#d97706'} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {quote.quote_no}
            {quote.file_data && <span title={quote.file_name || 'attachment'}><Paperclip size={11} color="#d97706" /></span>}
            {isConverted && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d', backgroundColor: '#dcfce7', padding: '1px 7px', borderRadius: '999px' }}>&#10003; Converted to Sales Order</span>}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>Value: {quote.value} &middot; Valid until: {quote.valid_until} &middot; {quote.owner}</div>
        </div>
        <Badge label={quote.status} />
        {open ? <ChevronDown size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} /> : <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
      </div>

      {/* expanded */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.875rem 0.75rem', backgroundColor: 'var(--bg-secondary,#f8fafc)' }}>

          {/* fields grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.875rem' }}>
            {[
              { label: 'Quote No.', value: quote.quote_no },
              { label: 'ID',        value: quote.id_str   },
              { label: 'Account',   value: quote.account  },
              { label: 'Value',     value: quote.value    },
              { label: 'Valid Until', value: quote.valid_until },
              { label: 'Status',    value: quote.status   },
              { label: 'Owner',     value: quote.owner    },
            ].filter(f => f.value).map(f => (
              <div key={f.label}>
                <div style={{ fontSize: '0.7rem', fontWeight: 650, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>{f.label}</div>
                <div style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-main)' }}>{f.value}</div>
              </div>
            ))}
          </div>

          {/* attached file */}
          {quote.file_data ? (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginBottom: '0.875rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attached File</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #fcd34d', backgroundColor: '#fffbeb' }}>
                <Paperclip size={13} color="#d97706" />
                <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{quote.file_name || 'attachment'}</span>
                <button onClick={e => { e.stopPropagation(); onPreview(quote); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '5px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                  <Eye size={12} /> View
                </button>
                <a href={quote.file_data} download={quote.file_name || 'attachment'} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '5px', border: '1px solid #86efac', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                  <Download size={12} /> Download
                </a>
              </div>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginBottom: '0.875rem', fontSize: '0.775rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No file attached.</div>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.875rem' }}>
            {isConverted || saleSuccess ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 0.875rem', borderRadius: '8px', backgroundColor: '#dcfce7', border: '1px solid #86efac' }}>
                <CheckCircle size={14} color="#15803d" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#15803d' }}>This quotation has been converted to a Sales Order.</span>
              </div>
            ) : !showSaleForm ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  {isAccepted
                    ? 'Quotation accepted — ready to convert to a Sales Order.'
                    : <span>Set status to <strong>Accepted</strong> to enable sales order conversion.</span>
                  }
                </span>
                <button
                  disabled={!isAccepted}
                  onClick={e => { e.stopPropagation(); setShowSaleForm(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '7px', border: 'none', backgroundColor: isAccepted ? '#16a34a' : '#e2e8f0', color: isAccepted ? '#fff' : '#94a3b8', fontSize: '0.8rem', fontWeight: 700, cursor: isAccepted ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.2s' }}
                >
                  <ShoppingCart size={13} /> Convert to Sales Order
                </button>
              </div>
            ) : (
              <form onSubmit={handleConvertSale} style={{ padding: '0.875rem', borderRadius: '10px', border: '1px solid #86efac', backgroundColor: '#f0fdf4' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#15803d', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingCart size={14} /> Convert to Sales Order
                </div>
                <div style={{ fontSize: '0.775rem', color: '#166534', marginBottom: '0.875rem', padding: '6px 10px', borderRadius: '6px', backgroundColor: '#dcfce7' }}>
                  Account: <strong>{quote.account}</strong> &nbsp;&middot;&nbsp; Amount: <strong>{quote.value}</strong>
                </div>
                {saleError && <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{saleError}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Order Date *</label>
                    <input type="date" value={saleData.issued_date} onChange={e => setSaleData(p => ({ ...p, issued_date: e.target.value }))} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={labelStyle}>ETA Date *</label>
                    <input type="date" value={saleData.due_date} onChange={e => setSaleData(p => ({ ...p, due_date: e.target.value }))} style={inputStyle} required />
                  </div>
                </div>
                <div style={{ marginBottom: '0.875rem' }}>
                  <label style={labelStyle}>Sales Rep *</label>
                  <input type="text" placeholder="e.g. Rohan Mehta" value={saleData.rep} onChange={e => setSaleData(p => ({ ...p, rep: e.target.value }))} style={inputStyle} required />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={e => { e.stopPropagation(); setShowSaleForm(false); setSaleError(''); }} style={{ border: '1px solid var(--border-color)', background: '#fff', color: 'var(--text-main)', fontSize: '0.8rem', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={saleSubmitting} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#16a34a', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: saleSubmitting ? 'not-allowed' : 'pointer' }}>
                    {saleSubmitting ? <Loader size={13} /> : <CheckCircle size={13} />}
                    {saleSubmitting ? 'Creating Sales Order…' : 'Confirm & Create Sales Order'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* delete & edit */}
          {!showSaleForm && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem', gap: '0.5rem' }}>
              {!isConverted && !saleSuccess && (
                <button
                  onClick={e => { e.stopPropagation(); onEdit(quote); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#fff', color: 'var(--text-main)', fontSize: '0.775rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  <Edit2 size={12} /> Edit
                </button>
              )}
              <button onClick={e => { e.stopPropagation(); onDelete(quote); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fff', color: '#b91c1c', fontSize: '0.775rem', cursor: 'pointer', fontWeight: 600 }}>
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════
   Main modal
══════════════════════════════════════════════════ */
const OpportunityDetailModal = ({ record, isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState('details');

  const [requirements, setRequirements] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqError, setReqError] = useState('');
  const [reqData, setReqData] = useState({ name: '', category: 'Technical', priority: 'Medium', status: 'Draft', owner: '' });

  const [quotations, setQuotations] = useState([]);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState('INR');
  const [quoteData, setQuoteData] = useState({ quote_no: '', value: '', valid_until: '', status: 'Draft', owner: '' });
  const [quoteFile, setQuoteFile] = useState(null);   // { name, base64 }
  const [previewQuote, setPreviewQuote] = useState(null); // quote object to preview
  const fileInputRef = useRef(null);

  const [editReq, setEditReq] = useState(null);
  const [editQuote, setEditQuote] = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const fetchRequirements = useCallback(async () => {
    if (!record) return;
    setReqLoading(true);
    try {
      const res = await fetch(`${API}/api/requirements`);
      if (res.ok) {
        const d = await res.json();
        setRequirements((d.requirements || []).filter(r => r.account === record.account));
      }
    } catch (e) { console.error(e); }
    finally { setReqLoading(false); }
  }, [record, API]);

  const fetchQuotations = useCallback(async () => {
    if (!record) return;
    setQuoteLoading(true);
    try {
      const res = await fetch(`${API}/api/quotations`);
      if (res.ok) {
        const d = await res.json();
        setQuotations((d.quotations || []).filter(q => q.account === record.account));
      }
    } catch (e) { console.error(e); }
    finally { setQuoteLoading(false); }
  }, [record, API]);

  useEffect(() => {
    if (isOpen && record) {
      setTab('details');
      setShowReqForm(false); setShowQuoteForm(false);
      setReqError(''); setQuoteError('');
      setReqData({ name: '', category: 'Technical', priority: 'Medium', status: 'Draft', owner: '' });
      setQuoteData({ quote_no: '', value: '', valid_until: '', status: 'Draft', owner: '' });
      setEditReq(null); setEditQuote(null);
      fetchRequirements();
      fetchQuotations();
    }
  }, [isOpen, record]);

  useEffect(() => {
    if (tab === 'requirements') fetchRequirements();
    if (tab === 'quotations') fetchQuotations();
  }, [tab]);

  if (!isOpen || !record) return null;

  const formatValue = (v) => {
    const n = parseFloat(String(v || '').replace(/[^0-9.]/g, ''));
    if (isNaN(n)) return v;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  };

  /* ─ requirement submit ─ */
  const handleReqSubmit = async (e) => {
    e.preventDefault();
    setReqSubmitting(true); setReqError('');
    try {
      const isEdit = !!editReq;
      const url = isEdit ? `${API}/api/requirements/${editReq.id_str}` : `${API}/api/requirements`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_str: isEdit ? editReq.id_str : `RE-${Date.now().toString().slice(-6)}`,
          name: reqData.name || `Requirement for ${record.account}`,
          account: record.account || '',
          category: reqData.category, priority: reqData.priority,
          status: reqData.status, owner: reqData.owner,
        }),
      });
      if (!res.ok) { setReqError('Failed to save.'); return; }
      setShowReqForm(false);
      setEditReq(null);
      setReqData({ name: '', category: 'Technical', priority: 'Medium', status: 'Draft', owner: '' });
      fetchRequirements();
      if (onSuccess) onSuccess();
    } catch { setReqError('Network error.'); }
    finally { setReqSubmitting(false); }
  };

  /* ─ file → base64 helper ─ */
  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) { setQuoteFile(null); return; }
    const base64 = await readFileAsBase64(file);
    setQuoteFile({ name: file.name, base64 });
  };

  /* ─ quotation submit ─ */
  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    setQuoteSubmitting(true); setQuoteError('');
    try {
      const isEdit = !!editQuote;
      const url = isEdit ? `${API}/api/quotations/${editQuote.id_str}` : `${API}/api/quotations`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_str: isEdit ? editQuote.id_str : `QT-${Date.now().toString().slice(-6)}`,
          quote_no: quoteData.quote_no || `QT-${Date.now().toString().slice(-6)}`,
          account: record.account || '',
          value: quoteData.value,
          valid_until: quoteData.valid_until,
          status: quoteData.status,
          owner: quoteData.owner,
          file_data: quoteFile ? quoteFile.base64 : (isEdit ? editQuote.file_data : null),
          file_name: quoteFile ? quoteFile.name : (isEdit ? editQuote.file_name : null),
        }),
      });
      if (!res.ok) { setQuoteError('Failed to save.'); return; }
      setShowQuoteForm(false);
      setEditQuote(null);
      setQuoteData({ quote_no: '', value: '', valid_until: '', status: 'Draft', owner: '' });
      setQuoteFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchQuotations();
      if (onSuccess) onSuccess();
    } catch { setQuoteError('Network error.'); }
    finally { setQuoteSubmitting(false); }
  };

  const handleDeleteReq = async (req) => {
    if (!window.confirm('Delete this requirement?')) return;
    await fetch(`${API}/api/requirements/${req.id_str}`, { method: 'DELETE' });
    fetchRequirements();
  };

  const handleDeleteQuote = async (q) => {
    if (!window.confirm('Delete this quotation?')) return;
    await fetch(`${API}/api/quotations/${q.id_str}`, { method: 'DELETE' });
    fetchQuotations();
  };

  const detailRows = [
    { label: 'Deal',        value: record.name },
    { label: 'Account',     value: record.account },
    { label: 'Value',       value: formatValue(record.value) },
    { label: 'Probability', value: record.probability },
    { label: 'Stage',       value: record.stage },
    { label: 'Close Date',  value: record.close_date },
    { label: 'Owner',       value: record.owner },
    { label: 'Last Updated',value: record.updated_at },
  ].filter(r => r.value);

  const stageBg = {
    Discovery:   { bg: '#dbeafe', color: '#1d4ed8' },
    Proposal:    { bg: '#fef3c7', color: '#b45309' },
    Negotiation: { bg: '#ede9fe', color: '#7c3aed' },
    Won:         { bg: '#dcfce7', color: '#15803d' },
    Lost:        { bg: '#fee2e2', color: '#b91c1c' },
  }[record.stage] || { bg: '#f1f5f9', color: '#64748b' };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '860px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          <TrendingUp size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.name}</h3>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '1px' }}>{record.account} &middot; {record.id_str}</div>
          </div>
          <span style={{ padding: '2px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: stageBg.bg, color: stageBg.color, flexShrink: 0 }}>{record.stage}</span>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', flexShrink: 0 }}>
          <button style={tabStyle(tab === 'details')} onClick={() => setTab('details')}>Details</button>
          <button style={tabStyle(tab === 'requirements')} onClick={() => setTab('requirements')}>
            Requirements&nbsp;
            {requirements.length > 0 && <span style={{ background: 'var(--accent-primary)', color: '#fff', borderRadius: '999px', padding: '0 6px', fontSize: '0.7rem', fontWeight: 700 }}>{requirements.length}</span>}
          </button>
          <button style={tabStyle(tab === 'quotations')} onClick={() => setTab('quotations')}>
            Quotations&nbsp;
            {quotations.length > 0 && <span style={{ background: '#d97706', color: '#fff', borderRadius: '999px', padding: '0 6px', fontSize: '0.7rem', fontWeight: 700 }}>{quotations.length}</span>}
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {/* ── Details ── */}
          {tab === 'details' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[{ label: 'Value', value: formatValue(record.value), icon: '💰' }, { label: 'Probability', value: record.probability, icon: '🎯' }, { label: 'Close Date', value: record.close_date, icon: '📅' }].map(m => (
                  <div key={m.label} style={{ padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card-solid,#fff)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{m.icon}</div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>{m.label}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                {detailRows.map((row, i) => (
                  <div key={row.label} style={{ display: 'flex', padding: '0.65rem 1rem', backgroundColor: i % 2 === 0 ? 'var(--bg-card-solid,#fff)' : 'var(--bg-secondary,#f8fafc)', borderBottom: i < detailRows.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <span style={{ width: '140px', fontSize: '0.775rem', fontWeight: 650, color: 'var(--text-muted)', textTransform: 'uppercase', flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-main)', fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '0.8rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ChevronRight size={14} />
                Use the <strong style={{ margin: '0 2px' }}>Requirements</strong> and <strong style={{ margin: '0 2px' }}>Quotations</strong> tabs to attach linked records to this opportunity.
              </div>
            </div>
          )}

          {/* ── Requirements ── */}
          {tab === 'requirements' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>Requirements</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Linked to: <strong>{record.account}</strong></div>
                </div>
                {!showReqForm && (
                  <button className="btn btn-primary" onClick={() => setShowReqForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.8rem' }}>
                    <Plus size={14} /> Add Requirement
                  </button>
                )}
              </div>

              {showReqForm && (
                <form onSubmit={handleReqSubmit} style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e40af', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ClipboardList size={14} /> {editReq ? 'Edit Requirement' : 'New Requirement'}
                  </div>
                  {reqError && <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{reqError}</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={labelStyle}>Description *</label>
                      <input type="text" placeholder="Describe the requirement…" value={reqData.name} onChange={e => setReqData(p => ({ ...p, name: e.target.value }))} style={inputStyle} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>Category *</label>
                        <input type="text" placeholder="e.g. Technical, Security" value={reqData.category} onChange={e => setReqData(p => ({ ...p, category: e.target.value }))} style={inputStyle} required />
                      </div>
                      <div>
                        <label style={labelStyle}>Priority</label>
                        <input type="text" placeholder="e.g. High, Medium, Low" value={reqData.priority} onChange={e => setReqData(p => ({ ...p, priority: e.target.value }))} style={inputStyle} required />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>Status</label>
                        <input type="text" placeholder="e.g. Draft, Review, Approved" value={reqData.status} onChange={e => setReqData(p => ({ ...p, status: e.target.value }))} style={inputStyle} required />
                      </div>
                      <div>
                        <label style={labelStyle}>Owner *</label>
                        <input type="text" placeholder="e.g. Aditi Rao" value={reqData.owner} onChange={e => setReqData(p => ({ ...p, owner: e.target.value }))} style={inputStyle} required />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.875rem' }}>
                    <button type="button" className="btn" onClick={() => { setShowReqForm(false); setEditReq(null); setReqData({ name: '', category: 'Technical', priority: 'Medium', status: 'Draft', owner: '' }); }} style={{ border: '1px solid var(--border-color)', background: '#fff', color: 'var(--text-main)', fontSize: '0.8rem', padding: '6px 14px' }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={reqSubmitting} style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {reqSubmitting ? <Loader size={13} /> : <CheckCircle size={13} />}
                      {reqSubmitting ? 'Saving…' : 'Save Requirement'}
                    </button>
                  </div>
                </form>
              )}

              {reqLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>
              ) : requirements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <ClipboardList size={28} style={{ marginBottom: '0.5rem', opacity: 0.4, display: 'block', margin: '0 auto 8px' }} />
                  No requirements linked to <strong>{record.account}</strong> yet.
                </div>
              ) : (
                requirements.map(r => <ReqRow key={r.id || r.id_str} req={r} onDelete={handleDeleteReq} onEdit={(req) => {
                  setEditReq(req);
                  setReqData({ name: req.name, category: req.category, priority: req.priority, status: req.status, owner: req.owner });
                  setShowReqForm(true);
                }} />)
              )}
            </div>
          )}

          {/* ── Quotations ── */}
          {tab === 'quotations' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>Quotations</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Linked to: <strong>{record.account}</strong></div>
                </div>
                {!showQuoteForm && (
                  <button className="btn btn-primary" onClick={() => setShowQuoteForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.8rem', backgroundColor: '#d97706', borderColor: '#d97706' }}>
                    <Plus size={14} /> Add Quotation
                  </button>
                )}
              </div>

              {showQuoteForm && (
                <form onSubmit={handleQuoteSubmit} style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #fcd34d', backgroundColor: '#fffbeb', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#b45309', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileSpreadsheet size={14} /> {editQuote ? 'Edit Quotation' : 'New Quotation'}
                  </div>
                  {quoteError && <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{quoteError}</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>Quote No.</label>
                        <input type="text" placeholder="Auto-generated if blank" value={quoteData.quote_no} onChange={e => setQuoteData(p => ({ ...p, quote_no: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Value *</label>
                        <input type="text" placeholder="e.g. ₹5,00,000 or $10,000" value={quoteData.value} onChange={e => setQuoteData(p => ({ ...p, value: e.target.value }))} style={inputStyle} required />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>Valid Until *</label>
                        <input type="date" value={quoteData.valid_until} onChange={e => setQuoteData(p => ({ ...p, valid_until: e.target.value }))} style={inputStyle} required />
                      </div>
                      <div>
                        <label style={labelStyle}>Status</label>
                        <input type="text" placeholder="e.g. Draft, Sent, Accepted" value={quoteData.status} onChange={e => setQuoteData(p => ({ ...p, status: e.target.value }))} style={inputStyle} required />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Owner *</label>
                      <input type="text" placeholder="e.g. Rohan Mehta" value={quoteData.owner} onChange={e => setQuoteData(p => ({ ...p, owner: e.target.value }))} style={inputStyle} required />
                    </div>
                    {/* File attachment */}
                    <div>
                      <label style={labelStyle}>Attach File <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-muted)', fontSize: '0.7rem' }}>(PDF or image, optional)</span></label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', border: '1px dashed var(--border-color)', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.8125rem', color: quoteFile ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        <Paperclip size={14} color="#d97706" />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {quoteFile ? quoteFile.name : 'Click to choose PDF or image…'}
                        </span>
                        {quoteFile && (
                          <button type="button" onClick={e => { e.preventDefault(); setQuoteFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', padding: 0, display: 'flex', flexShrink: 0 }}><X size={12} /></button>
                        )}
                        <input ref={fileInputRef} type="file" accept="application/pdf,image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.875rem' }}>
                    <button type="button" className="btn" onClick={() => { setShowQuoteForm(false); setEditQuote(null); setQuoteData({ quote_no: '', value: '', valid_until: '', status: 'Draft', owner: '' }); setQuoteFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ border: '1px solid var(--border-color)', background: '#fff', color: 'var(--text-main)', fontSize: '0.8rem', padding: '6px 14px' }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={quoteSubmitting} style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#d97706', borderColor: '#d97706' }}>
                      {quoteSubmitting ? <Loader size={13} /> : <CheckCircle size={13} />}
                      {quoteSubmitting ? 'Saving…' : 'Save Quotation'}
                    </button>
                  </div>
                </form>
              )}

              {quoteLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>
              ) : quotations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <FileSpreadsheet size={28} style={{ marginBottom: '0.5rem', opacity: 0.4, display: 'block', margin: '0 auto 8px' }} />
                  No quotations linked to <strong>{record.account}</strong> yet.
                </div>
              ) : (
                quotations.map(q => <QuoteRow key={q.id || q.id_str} quote={q} onDelete={handleDeleteQuote} onPreview={setPreviewQuote} onEdit={(quote) => {
                  setEditQuote(quote);
                  const rawVal = String(quote.value || '');
                  if (rawVal.startsWith('₹') || rawVal.startsWith('INR')) {
                    setQuoteCurrency('INR');
                  } else if (rawVal.startsWith('$') || rawVal.startsWith('USD')) {
                    setQuoteCurrency('USD');
                  }
                  const cleanVal = rawVal.replace(/[^0-9.]/g, '');
                  setQuoteData({ quote_no: quote.quote_no, value: cleanVal, valid_until: quote.valid_until, status: quote.status, owner: quote.owner });
                  setShowQuoteForm(true);
                }} />)
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── File preview overlay ── */}
      {previewQuote && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setPreviewQuote(null)}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem', maxWidth: '860px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Paperclip size={15} color="#d97706" />
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>{previewQuote.file_name || 'Attachment'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>· {previewQuote.quote_no}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <a href={previewQuote.file_data} download={previewQuote.file_name || 'attachment'} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
                  <Download size={13} /> Download
                </a>
                <button onClick={() => setPreviewQuote(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}><X size={18} /></button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: '400px', maxHeight: '70vh' }}>
              {previewQuote.file_data.startsWith('data:application/pdf') ? (
                <iframe src={previewQuote.file_data} style={{ width: '100%', height: '100%', minHeight: '400px', border: 'none' }} title="PDF Preview" />
              ) : previewQuote.file_data.startsWith('data:image/') ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', height: '100%', minHeight: '400px', padding: '1rem' }}>
                  <img src={previewQuote.file_data} alt="Attachment" style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '6px' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Preview not available for this file type.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityDetailModal;
