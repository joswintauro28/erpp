"use client";

import React, { useState, useEffect } from 'react';
import { X, FileText, ShoppingCart, ArrowRight, ClipboardList, FileSpreadsheet, PackageOpen, Download, CheckCircle } from 'lucide-react';
import { api } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface GenericDetailsModalProps {
  record: any;
  entityName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialShowForm?: string;
  onEdit?: (record: any) => void;
}

const GenericDetailsModal: React.FC<GenericDetailsModalProps> = ({ record, entityName, isOpen, onClose, onSuccess, initialShowForm = '', onEdit }) => {
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleError, setSaleError] = useState('');
  const [saleData, setSaleData] = useState({
    invoice_no: '',
    issued_date: '',
    due_date: '',
    status: 'Pending',
    rep: ''
  });

  const [showRequirementForm, setShowRequirementForm] = useState(false);
  const [requirementSubmitting, setRequirementSubmitting] = useState(false);
  const [requirementError, setRequirementError] = useState('');
  const [requirementData, setRequirementData] = useState({
    name: '',
    category: 'Technical',
    priority: 'Medium',
    status: 'Draft',
    owner: ''
  });

  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotationSubmitting, setQuotationSubmitting] = useState(false);
  const [quotationError, setQuotationError] = useState('');
  const [quotationCurrency, setQuotationCurrency] = useState('INR');
  const [quotationData, setQuotationData] = useState({
    quote_no: '',
    value: '',
    valid_until: '',
    status: 'Draft',
    owner: ''
  });

  const [showSalesOrderForm, setShowSalesOrderForm] = useState(false);
  const [salesOrderSubmitting, setSalesOrderSubmitting] = useState(false);
  const [salesOrderError, setSalesOrderError] = useState('');
  const [salesOrderData, setSalesOrderData] = useState({
    so_no: '',
    eta: '',
    status: 'Pending',
    owner: '',
    file_data: '',
    file_name: ''
  });

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<{ name: string; base64: string } | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState('Paid');

  const [relatedRequirements, setRelatedRequirements] = useState<any[]>([]);
  const [relatedQuotations, setRelatedQuotations] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const fetchRelatedData = async () => {
    if (!record || !record.account) return;
    setLoadingRelated(true);
    try {
      const [reqData, qData] = await Promise.all([
        api.get<any>(`/requirements?account=${encodeURIComponent(record.account)}`),
        api.get<any>(`/quotations?account=${encodeURIComponent(record.account)}`)
      ]);
      setRelatedRequirements(reqData.requirements || []);
      setRelatedQuotations(qData.quotations || []);
    } catch (err) {
      console.error("Failed to fetch related data", err);
    } finally {
      setLoadingRelated(false);
    }
  };

  useEffect(() => {
    if (isOpen && record) {
      setShowSalesOrderForm(initialShowForm === 'sales-order');
      setShowSaleForm(false);
      setShowRequirementForm(false);
      setShowQuotationForm(false);
      setShowInvoiceForm(false);
      setInvoiceFile(null);
      setInvoiceStatus('Paid');
      setSalesOrderData({
        so_no: `SO-${record.quote_no?.split('-')[-1] || Date.now().toString().slice(-6)}`,
        eta: record.valid_until || '',
        status: 'Pending',
        owner: record.owner || '',
        file_data: record.file_data || '',
        file_name: record.file_name || ''
      });
      if (entityName === 'Sales Order') {
        fetchRelatedData();
      }
    }
  }, [isOpen, initialShowForm, record]);

  if (!isOpen || !record) return null;

  const formatKey = (key: string) => {
    if (entityName === 'Requirement' && key === 'name') return 'Requirements';
    if (entityName === 'Opportunity' && key === 'name') return 'Deal';
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char: string) => char.toUpperCase());
  };

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const renderFrameContent = () => {
    const ignoredKeys = ['id', 'id_str', 'file_data', 'files', 'updated_at', 'last_contact', 'last_login', 'date', 'date_raised'];
    const fields = Object.entries(record).filter(([key]) => !ignoredKeys.includes(key));
    const nameField = record.name || record.title || record.account || record.id_str || 'Record Details';
    const subTitleField = record.company || record.category || record.stage || record.type || '';

    const htmlContent = `
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 24px; margin: 0; background-color: #f8fafc; color: #1e293b; }
            .details-sheet { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); box-sizing: border-box; }
            .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; }
            .title { margin: 0; font-size: 22px; color: #0f172a; font-weight: 700; }
            .subtitle { margin: 4px 0 0 0; color: #991b1b; font-weight: 600; font-size: 14px; }
            .details-list { font-size: 13px; margin-top: 16px; }
            .details-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
            .details-label { color: #64748b; font-weight: 500; }
            .details-val { font-weight: 600; color: #1e293b; }
          </style>
        </head>
        <body>
          <div class="details-sheet">
            <div class="header">
              <h1 class="title">${nameField}</h1>
              ${subTitleField ? `<p class="subtitle">${subTitleField}</p>` : ''}
            </div>
            <div class="details-list">
              ${fields.map(([key, val]) => `
                <div class="details-item">
                  <span class="details-label">${formatKey(key)}</span>
                  <span class="details-val">${formatValue(key, val)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </body>
      </html>
    `;

    return (
      <iframe
        srcDoc={htmlContent}
        className="w-full h-[360px] border border-[var(--shell-border)] rounded-lg"
        title={nameField}
      />
    );
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleSubmitting(true);
    setSaleError('');

    try {
      const invoiceNo = saleData.invoice_no || `INV-${Date.now().toString().slice(-6)}`;

      const salePayload = {
        id_str: `SALE-${Date.now().toString().slice(-6)}`,
        invoice_no: invoiceNo,
        account: record.account || '',
        amount: record.value || '0',
        issued_date: saleData.issued_date,
        due_date: saleData.due_date,
        status: saleData.status,
        rep: saleData.rep
      };

      await api.post('/sales', salePayload);

      await api.delete(`/opportunities/${record.id_str}`);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setSaleSubmitting(false);
    }
  };

  const handleRequirementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequirementSubmitting(true);
    setRequirementError('');

    try {
      const requirementPayload = {
        id_str: `RE-${Date.now().toString().slice(-6)}`,
        name: requirementData.name || `Requirement for ${record.account}`,
        account: record.account || '',
        category: requirementData.category,
        priority: requirementData.priority,
        status: requirementData.status,
        owner: requirementData.owner
      };

      await api.post('/requirements', requirementPayload);

      if (isSale) {
        const type = record.id_str.startsWith('SA-') ? 'sales' : 'sales-orders';
        await api.delete(`/${type}/${record.id_str}`);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setRequirementError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setRequirementSubmitting(false);
    }
  };

  const handleQuotationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuotationSubmitting(true);
    setQuotationError('');

    try {
      const quoteNo = quotationData.quote_no || `QT-${Date.now().toString().slice(-6)}`;
      const symbol = quotationCurrency === 'INR' ? '\u20b9' : '$';
      const quoteValue = symbol + quotationData.value;

      const quotationPayload = {
        id_str: `QT-${Date.now().toString().slice(-6)}`,
        quote_no: quoteNo,
        account: record.account || '',
        value: quoteValue,
        valid_until: quotationData.valid_until,
        status: quotationData.status,
        owner: quotationData.owner
      };

      await api.post('/quotations', quotationPayload);

      if (isRequirement) {
        await api.delete(`/requirements/${record.id_str}`);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setQuotationError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setQuotationSubmitting(false);
    }
  };

  const handleSalesOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalesOrderSubmitting(true);
    setSalesOrderError('');

    try {
      const soNo = salesOrderData.so_no || `SO-${Date.now().toString().slice(-6)}`;

      const salesOrderPayload = {
        id_str: `SO-${Date.now().toString().slice(-6)}`,
        so_no: soNo,
        account: record.account || '',
        from_quote: record.quote_no || '',
        value: record.value || '0',
        eta: salesOrderData.eta,
        status: salesOrderData.status,
        owner: salesOrderData.owner,
        file_data: salesOrderData.file_data || '',
        file_name: salesOrderData.file_name || ''
      };

      await api.post('/sales-orders', salesOrderPayload);

      if (isQuotation) {
        await api.put(`/quotations/${record.id}/status?status=Converted`);
      } else if (isOpportunity) {
        await api.delete(`/opportunities/${record.id_str}`);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setSalesOrderError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setSalesOrderSubmitting(false);
    }
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceSubmitting(true);
    setInvoiceError('');

    try {
      const payload = {
        ...record,
        status: invoiceStatus,
        file_data: invoiceFile ? invoiceFile.base64 : record.file_data,
        file_name: invoiceFile ? invoiceFile.name : record.file_name
      };

      await api.put(`/sales-orders/${record.id_str}`, payload);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handleAddAsCustomer = async () => {
    try {
      const custData = await api.get<any>('/customers');
      const exists = custData.customers?.some((c: any) => c.account === record.account);
      if (exists) {
        alert("This account is already added as a customer!");
        return;
      }

      let cleanArr = parseInt(String(record.value || '').replace(/[^0-9]/g, '')) || 0;
      if (cleanArr > 2147483647) cleanArr = 2147483647;
      await api.post('/customers', {
        id_str: `CU-${Date.now().toString().slice(-6)}`,
        account: record.account,
        industry: 'Software',
        tier: 'Silver',
        arr: cleanArr,
        status: 'Active',
        owner: record.owner || ''
      });

      alert("Added successfully to Customers!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert("Network error.");
    }
  };

  const nameField = record.name || record.title || record.account || record.id_str || 'Record';
  const isOpportunity = entityName === 'Opportunity';
  const isSale = entityName === 'Sale' || entityName === 'Sales Order';
  const isRequirement = entityName === 'Requirement';
  const isQuotation = entityName === 'Quotation';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--shell-border)] pb-4 mb-6">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-accent" />
            <DialogTitle className="m-0">{entityName} Summary: {nameField}</DialogTitle>
          </div>
        </div>

        {!showSaleForm && !showRequirementForm && !showQuotationForm && !showSalesOrderForm && (
          <div className="mb-6">
            {renderFrameContent()}
            
            {record.file_data && (
              <div className="mt-4 rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)]/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-accent" />
                    <span className="text-sm font-semibold">Attached Document: {record.file_name || 'attachment'}</span>
                  </div>
                  <a
                    href={record.file_data}
                    download={record.file_name || 'attachment'}
                    className="inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent bg-[var(--shell-brand)] px-2 py-1 text-xs font-medium text-white transition-all hover:bg-[var(--shell-action)] hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)]"
                  >
                    <Download className="mr-1 size-3" /> Download
                  </a>
                </div>
                
                {record.file_data.startsWith('data:application/pdf') ? (
                  <iframe
                    src={record.file_data}
                    className="w-full h-[300px] border border-[var(--shell-border)] rounded-md"
                    title="Attached File Preview"
                  />
                ) : record.file_data.startsWith('data:image/') ? (
                  <div className="max-h-[300px] overflow-y-auto rounded-md bg-[var(--shell-bg)] p-2 text-center">
                    <img
                      src={record.file_data}
                      alt="Attachment Preview"
                      className="max-w-full h-auto rounded-sm"
                    />
                  </div>
                ) : (
                  <div className="text-xs text-[var(--shell-muted)]">
                    Preview not available for this file type.
                  </div>
                )}
              </div>
            )}

            {entityName === 'Sales Order' && (
              <div className="mt-6 border-t border-[var(--shell-border)] pt-6">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
                  
                  <div>
                    <h4 className="m-0 mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--shell-foreground)]">
                      <FileSpreadsheet className="size-4 text-accent" />
                      Linked Quotations
                    </h4>
                    {loadingRelated ? (
                      <div className="text-xs text-[var(--shell-muted)]">Loading...</div>
                    ) : relatedQuotations.length === 0 ? (
                      <div className="text-xs italic text-[var(--shell-muted)]">No linked quotations.</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {relatedQuotations.map((q, idx) => {
                          const isTarget = q.quote_no === record.from_quote;
                          return (
                            <div key={`${q.id_str}-${idx}`} className={cn(
                              "rounded-lg border p-2.5 text-xs",
                              isTarget ? "border-amber-400 bg-amber-50" : "border-[var(--shell-border)] bg-[var(--shell-bg)]"
                            )}>
                              <div className="mb-0.5 flex items-center justify-between">
                                <span className="font-semibold text-[var(--shell-foreground)]">{q.quote_no}</span>
                                <span className="rounded-full bg-[var(--shell-bg)] px-1.5 py-0.5 text-[0.7rem] font-semibold text-[var(--shell-muted)]">{q.status}</span>
                              </div>
                              <div className="text-[var(--shell-muted)] text-xs">
                                Value: {q.value} &middot; Owner: {q.owner}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="m-0 mb-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--shell-foreground)]">
                      <ClipboardList className="size-4 text-accent" />
                      Linked Requirements
                    </h4>
                    {loadingRelated ? (
                      <div className="text-xs text-[var(--shell-muted)]">Loading...</div>
                    ) : relatedRequirements.length === 0 ? (
                      <div className="text-xs italic text-[var(--shell-muted)]">No linked requirements.</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {relatedRequirements.map((r, idx) => (
                          <div key={`${r.id_str}-${idx}`} className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] p-2.5 text-xs">
                            <div className="mb-0.5 flex items-center justify-between">
                              <span className="font-semibold text-[var(--shell-foreground)]">{r.name}</span>
                              <span className="rounded-full bg-[var(--shell-bg)] px-1.5 py-0.5 text-[0.7rem] font-semibold text-[var(--shell-muted)]">{r.status}</span>
                            </div>
                            <div className="text-[var(--shell-muted)] text-xs">
                              Category: {r.category} &middot; Priority: {r.priority} &middot; Owner: {r.owner}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {showSaleForm && isOpportunity && (
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-400 bg-gradient-to-br from-green-50 to-green-100 p-4">
              <ShoppingCart className="size-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">
                Converting <strong>{nameField}</strong> to a Sale
              </span>
            </div>

            <div className="mb-5 flex flex-wrap gap-6 rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)]/50 px-4 py-3 text-xs text-[var(--shell-muted)]">
              <span>Account: <strong className="text-[var(--shell-foreground)]">{record.account}</strong></span>
              <span>Amount: <strong className="text-[var(--shell-foreground)]">{record.value}</strong></span>
            </div>

            {saleError && (
              <div className="mb-4 rounded-sm bg-red-100 px-3 py-2 text-xs text-red-700">
                {saleError}
              </div>
            )}

            <form onSubmit={handleSaleSubmit}>
              <div className="mb-6 flex flex-col gap-4">
                <div>
                  <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Invoice No.</Label>
                  <Input
                    placeholder="e.g. INV-20260001 (auto-generated if blank)"
                    value={saleData.invoice_no}
                    onChange={e => setSaleData(p => ({ ...p, invoice_no: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Issued Date *</Label>
                    <input
                      type="date"
                      value={saleData.issued_date}
                      onChange={e => setSaleData(p => ({ ...p, issued_date: e.target.value }))}
                      className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Due Date *</Label>
                    <input
                      type="date"
                      value={saleData.due_date}
                      onChange={e => setSaleData(p => ({ ...p, due_date: e.target.value }))}
                      className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Status *</Label>
                    <Input
                      placeholder="e.g. Pending, Paid"
                      value={saleData.status}
                      onChange={e => setSaleData(p => ({ ...p, status: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Rep / Sales Rep *</Label>
                    <Input
                      placeholder="Sales representative name"
                      value={saleData.rep}
                      onChange={e => setSaleData(p => ({ ...p, rep: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowSaleForm(false)}>
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={saleSubmitting}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700"
                >
                  <ShoppingCart className="size-3.5" />
                  {saleSubmitting ? 'Creating Sale...' : 'Confirm & Add to Sales'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {showRequirementForm && isSale && (
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
              <ClipboardList className="size-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">
                Adding Sale to Requirements
              </span>
            </div>

            <div className="mb-5 flex flex-wrap gap-6 rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)]/50 px-4 py-3 text-xs text-[var(--shell-muted)]">
              <span>Account: <strong className="text-[var(--shell-foreground)]">{record.account}</strong></span>
              <span>Invoice No: <strong className="text-[var(--shell-foreground)]">{record.invoice_no}</strong></span>
            </div>

            {requirementError && (
              <div className="mb-4 rounded-sm bg-red-100 px-3 py-2 text-xs text-red-700">
                {requirementError}
              </div>
            )}

            <form onSubmit={handleRequirementSubmit}>
              <div className="mb-6 flex flex-col gap-4">
                <div>
                  <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Requirements *</Label>
                  <Input
                    placeholder="Describe the requirement..."
                    value={requirementData.name}
                    onChange={e => setRequirementData(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Category *</Label>
                    <Input
                      placeholder="e.g. Security, Technical"
                      value={requirementData.category}
                      onChange={e => setRequirementData(p => ({ ...p, category: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Priority *</Label>
                    <Input
                      placeholder="e.g. High, Medium, Low"
                      value={requirementData.priority}
                      onChange={e => setRequirementData(p => ({ ...p, priority: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Status *</Label>
                    <Input
                      placeholder="e.g. Draft, Review, Approved"
                      value={requirementData.status}
                      onChange={e => setRequirementData(p => ({ ...p, status: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner *</Label>
                    <Input
                      placeholder="e.g. Aditi Rao"
                      value={requirementData.owner}
                      onChange={e => setRequirementData(p => ({ ...p, owner: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowRequirementForm(false)}>
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={requirementSubmitting}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700"
                >
                  <ClipboardList className="size-3.5" />
                  {requirementSubmitting ? 'Creating...' : 'Confirm & Add to Requirements'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {showQuotationForm && isRequirement && (
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <FileSpreadsheet className="size-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">
                Converting <strong>{nameField}</strong> to a Quotation
              </span>
            </div>

            <div className="mb-5 flex flex-wrap gap-6 rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)]/50 px-4 py-3 text-xs text-[var(--shell-muted)]">
              <span>Account: <strong className="text-[var(--shell-foreground)]">{record.account}</strong></span>
              <span>Requirement: <strong className="text-[var(--shell-foreground)]">{record.name}</strong></span>
            </div>

            {quotationError && (
              <div className="mb-4 rounded-sm bg-red-100 px-3 py-2 text-xs text-red-700">
                {quotationError}
              </div>
            )}

            <form onSubmit={handleQuotationSubmit}>
              <div className="mb-6 flex flex-col gap-4">
                <div>
                  <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Quote No.</Label>
                  <Input
                    placeholder="e.g. QT-20260001 (auto-generated if blank)"
                    value={quotationData.quote_no}
                    onChange={e => setQuotationData(p => ({ ...p, quote_no: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Value *</Label>
                    <Input
                      placeholder="e.g. \u20b95,00,000 or $10,000"
                      value={quotationData.value}
                      onChange={e => setQuotationData(p => ({ ...p, value: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Valid Until *</Label>
                    <input
                      type="date"
                      value={quotationData.valid_until}
                      onChange={e => setQuotationData(p => ({ ...p, valid_until: e.target.value }))}
                      className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Status *</Label>
                    <Input
                      placeholder="e.g. Draft, Sent, Accepted"
                      value={quotationData.status}
                      onChange={e => setQuotationData(p => ({ ...p, status: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner *</Label>
                    <Input
                      placeholder="e.g. Aditi Rao"
                      value={quotationData.owner}
                      onChange={e => setQuotationData(p => ({ ...p, owner: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowQuotationForm(false)}>
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={quotationSubmitting}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700"
                >
                  <FileSpreadsheet className="size-3.5" />
                  {quotationSubmitting ? 'Creating...' : 'Confirm & Add to Quotation'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {showSalesOrderForm && (isQuotation || isOpportunity) && (
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 p-4">
              <PackageOpen className="size-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                Converting <strong>{nameField}</strong> to a Sales Order
              </span>
            </div>

            <div className="mb-5 flex flex-wrap gap-6 rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)]/50 px-4 py-3 text-xs text-[var(--shell-muted)]">
              <span>Account: <strong className="text-[var(--shell-foreground)]">{record.account}</strong></span>
              <span>Value: <strong className="text-[var(--shell-foreground)]">{record.value}</strong></span>
            </div>

            {salesOrderError && (
              <div className="mb-4 rounded-sm bg-red-100 px-3 py-2 text-xs text-red-700">
                {salesOrderError}
              </div>
            )}

            <form onSubmit={handleSalesOrderSubmit}>
              <div className="mb-6 flex flex-col gap-4">
                <div>
                  <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">SO No.</Label>
                  <Input
                    placeholder="e.g. SO-20260001 (auto-generated if blank)"
                    value={salesOrderData.so_no}
                    onChange={e => setSalesOrderData(p => ({ ...p, so_no: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">ETA *</Label>
                    <input
                      type="date"
                      value={salesOrderData.eta}
                      onChange={e => setSalesOrderData(p => ({ ...p, eta: e.target.value }))}
                      className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Status *</Label>
                    <Input
                      placeholder="e.g. Pending, Confirmed"
                      value={salesOrderData.status}
                      onChange={e => setSalesOrderData(p => ({ ...p, status: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner *</Label>
                  <Input
                    placeholder="e.g. Priya Shah"
                    value={salesOrderData.owner}
                    onChange={e => setSalesOrderData(p => ({ ...p, owner: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Upload Invoice File (PDF or Image)</Label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setSalesOrderData(p => ({
                            ...p,
                            file_name: file.name,
                            file_data: reader.result as string
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2 py-1.5 text-xs text-[var(--shell-foreground)] file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-0.5 file:text-xs file:font-medium file:text-primary-foreground"
                  />
                  {salesOrderData.file_name && (
                    <div className="mt-1 text-xs text-green-600">
                      Selected File: {salesOrderData.file_name}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowSalesOrderForm(false)}>
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={salesOrderSubmitting}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  <PackageOpen className="size-3.5" />
                  {salesOrderSubmitting ? 'Creating...' : 'Confirm & Add to Sales Orders'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {showInvoiceForm && (
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 p-4">
              <CheckCircle className="size-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                Marking Sales Order <strong>{record.so_no}</strong> as Done / Paid
              </span>
            </div>
            {invoiceError && <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-xs text-red-700">{invoiceError}</div>}
            <form onSubmit={handleInvoiceSubmit} className="flex flex-col gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Status *</Label>
                <Input
                  placeholder="e.g. Paid, Delivered"
                  value={invoiceStatus}
                  onChange={e => setInvoiceStatus(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Upload Invoice *</Label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (!file) { setInvoiceFile(null); return; }
                    const reader = new FileReader();
                    reader.onload = () => setInvoiceFile({ name: file.name, base64: reader.result as string });
                    reader.readAsDataURL(file);
                  }}
                  className="w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2 py-1.5 text-xs text-[var(--shell-foreground)] file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-0.5 file:text-xs file:font-medium file:text-primary-foreground"
                  required
                />
                {invoiceFile && (
                  <div className="mt-1 text-xs text-green-600">
                    Selected File: {invoiceFile.name}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowInvoiceForm(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={invoiceSubmitting}>
                  {invoiceSubmitting ? 'Saving...' : 'Confirm & Mark Done'}
                </Button>
              </div>
            </form>
          </div>
        )}


        {!showSaleForm && !showRequirementForm && !showQuotationForm && !showSalesOrderForm && !showInvoiceForm && (
          <div className="flex items-center justify-between border-t border-[var(--shell-border)] pt-4">
            <div>
              {isOpportunity && (
                <Button
                  onClick={() => setShowSalesOrderForm(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  <PackageOpen className="size-3.5" />
                  Add to Sales Orders
                  <ArrowRight className="size-3.5" />
                </Button>
              )}
              {isSale && (
                <div className="flex gap-2">
                  {entityName === 'Sales Order' && (
                    <>
                      {['Paid', 'Delivered', 'Done', 'Invoiced', 'Cancelled'].includes(record.status) || !!record.file_data ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (onEdit) onEdit(record);
                            }}
                            className="flex items-center gap-1.5"
                          >
                            Edit Order
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={async () => {
                              if (window.confirm("Are you sure you want to delete this sales order?")) {
                                try {
                                  await api.delete(`/sales-orders/${record.id_str}`);
                                  if (onSuccess) onSuccess();
                                  onClose();
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : "Failed to delete sales order.");
                                }
                              }
                            }}
                            className="flex items-center gap-1.5"
                          >
                            Delete Order
                          </Button>
                          <Button
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700"
                            onClick={handleAddAsCustomer}
                          >
                            Add as Customer
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => setShowInvoiceForm(true)}
                          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600"
                        >
                          <CheckCircle className="size-3.5" />
                          Mark as Done & Upload Invoice
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
              {isRequirement && (
                <Button
                  onClick={() => setShowQuotationForm(true)}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700"
                >
                  <FileSpreadsheet className="size-3.5" />
                  Add to Quotation
                  <ArrowRight className="size-3.5" />
                </Button>
              )}
              {isQuotation && record.status !== 'Converted' && (
                <Button
                  onClick={() => setShowSalesOrderForm(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  <PackageOpen className="size-3.5" />
                  Convert to Sales Order
                  <ArrowRight className="size-3.5" />
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GenericDetailsModal;
