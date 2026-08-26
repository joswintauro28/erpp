"use client";

import React, { useState, useEffect } from 'react';
import { X, PackageOpen, FileText, Download } from 'lucide-react';
import { api } from '@/services/api';
import { FileUpload, type FileRecord } from '@datavex/ui-theme';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const formatCurrency = (value: any) => {
  const n = Number(value);
  if (isNaN(n)) return value;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

interface QuotationDetailsModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialShowForm?: string;
}

export default function QuotationDetailsModal({ record, isOpen, onClose, onSuccess, initialShowForm = '' }: QuotationDetailsModalProps) {
  const [showSalesOrderForm, setShowSalesOrderForm] = useState(false);
  const [salesOrderSubmitting, setSalesOrderSubmitting] = useState(false);
  const [salesOrderError, setSalesOrderError] = useState('');
  const [salesOrderData, setSalesOrderData] = useState({
    so_no: '',
    eta: '',
    status: 'Pending',
    owner: '',
  });
  const [soFileId, setSoFileId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && record) {
      setShowSalesOrderForm(initialShowForm === 'sales-order');
      setSalesOrderError('');
      setSalesOrderData({
        so_no: '',
        eta: record.valid_until || '',
        status: 'Pending',
        owner: record.owner || '',
      });
      setSoFileId(null);
    }
  }, [isOpen, initialShowForm, record]);

  if (!isOpen || !record) return null;

  const handleSalesOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalesOrderSubmitting(true);
    setSalesOrderError('');

    try {
      const soNo = salesOrderData.so_no || '';

      const salesOrderPayload = {
        ...(soNo ? { so_no: soNo } : {}),
        account: record.account || record.client_name || '',
        from_quote: record.quote_no || record.quote_number || '',
        value: String(record.value || record.total || '0'),
        eta: salesOrderData.eta,
        status: salesOrderData.status,
        owner: salesOrderData.owner,
        file_id: soFileId,
        line_items: (record.items || []).map((item: any) => ({
          product_name: item.description || item.product_name || 'Standard Consulting Package',
          sku: item.sku || 'SCP-CRM',
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || item.price || 0.0)
        }))
      };

      await api.post('/sales-orders', salesOrderPayload);
      await api.put(`/quotations/${record.id}/status?status=Converted`);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setSalesOrderError(err?.message || 'Network error. Please try again.');
    } finally {
      setSalesOrderSubmitting(false);
    }
  };

  const renderQuotationFrame = () => {
    const htmlContent = `
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 24px; margin: 0; background-color: #f8fafc; color: #1e293b; }
            .sheet { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { margin: 0; font-size: 22px; color: #0f172a; font-weight: 700; }
            .account { margin: 4px 0 0 0; color: #b45309; font-weight: 600; font-size: 14px; }
            .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
            .metric-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; }
            .metric-label { font-size: 11px; color: #64748b; font-weight: 500; text-transform: uppercase; margin-bottom: 4px; }
            .metric-val { font-size: 18px; font-weight: 700; color: #0f172a; }
            .details-list { font-size: 13px; margin-top: 16px; }
            .details-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .details-label { color: #64748b; }
            .details-val { font-weight: 500; color: #334155; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div>
                <h1 class="title">${record.quote_no || record.quote_number || 'Quotation'}</h1>
                <p class="account">${record.account || record.client_name || ''}</p>
              </div>
            </div>
            <div class="metric-grid">
              <div class="metric-box">
                <div class="metric-label">Quotation Value</div>
                <div class="metric-val">${formatCurrency(record.value || record.total || 0)}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">Discount Applied</div>
                <div class="metric-val">${record.discount_pct || 0}%</div>
              </div>
            </div>
            <div class="details-list">
              <div class="details-item">
                <span class="details-label">Valid Until</span>
                <span class="details-val">${record.valid_until || ''}</span>
              </div>
              <div class="details-item">
                <span class="details-label">Sales Representative</span>
                <span class="details-val">${record.owner || ''}</span>
              </div>
              <div class="details-item">
                <span class="details-label">Status</span>
                <span class="details-val" style="color: ${record.status === 'Accepted' ? '#10b981' : '#64748b'}">${record.status || 'Draft'}</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return (
      <iframe
        srcDoc={htmlContent}
        className="w-full h-[360px] rounded-lg border border-[var(--shell-border)]"
        title="Quotation Detail View"
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-[var(--shell-brand)]" />
            {showSalesOrderForm 
              ? `Convert Quote ${record.quote_no || record.quote_number || ''} to Sales Order`
              : `Quotation Summary: ${record.quote_no || record.quote_number || ''}`
            }
          </DialogTitle>
        </DialogHeader>

        {showSalesOrderForm ? (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--shell-success)]/30 bg-gradient-to-br from-[var(--shell-success-surface)] to-[var(--shell-success-surface)] p-4">
              <PackageOpen className="size-4 text-[var(--shell-success)]" />
              <span className="text-sm font-semibold text-[var(--shell-success)]">
                Converting <strong>{record.quote_no || record.quote_number}</strong> to a Sales Order
              </span>
            </div>

            <div className="flex flex-wrap gap-6 rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)]/50 px-4 py-3 text-xs text-[var(--shell-muted)]">
              <span>Account: <strong className="text-[var(--shell-foreground)]">{record.account || record.client_name}</strong></span>
              <span>Value: <strong className="text-[var(--shell-foreground)]">{formatCurrency(record.value || record.total)}</strong></span>
            </div>

            {salesOrderError && (
              <div className="rounded-sm bg-[var(--shell-danger-surface)] px-3 py-2 text-xs text-[var(--shell-danger)]">
                {salesOrderError}
              </div>
            )}

            <form onSubmit={handleSalesOrderSubmit} className="flex flex-col gap-4">
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">SO No.</Label>
                <Input
                  placeholder="e.g. SO-202608-0001 (auto-generated if blank)"
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
                  <select
                    value={salesOrderData.status}
                    onChange={e => setSalesOrderData(p => ({ ...p, status: e.target.value }))}
                    className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Approved">Approved</option>
                    <option value="Invoiced">Invoiced</option>
                    <option value="Paid">Paid</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Hold">Hold</option>
                    <option value="Stock Hold">Stock Hold</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner *</Label>
                <Input
                  placeholder="e.g. Sales Rep"
                  value={salesOrderData.owner}
                  onChange={e => setSalesOrderData(p => ({ ...p, owner: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Upload Invoice File (PDF or Image)</Label>
                <FileUpload
                  bucket="crm-assets"
                  ownerType="sales_order"
                  ownerId={0}
                  clientName={record.account || "general"}
                  onUpload={(r: FileRecord) => setSoFileId(r.id)}
                  accept="application/pdf,image/*"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={() => setShowSalesOrderForm(false)}>
                  Back
                </Button>
                <Button type="submit" disabled={salesOrderSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
                  {salesOrderSubmitting ? 'Creating...' : 'Confirm & Add to Sales Orders'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-[220px_1fr] gap-6 mt-2">
            <div className="flex flex-col gap-4 border-r border-[var(--shell-border)] pr-6">
              {[
                { label: "Quote No.", value: record.quote_no || record.quote_number },
                { label: "Account", value: record.account || record.client_name },
                { label: "Value", value: formatCurrency(record.value || record.total), accent: true },
                { label: "Discount", value: `${record.discount_pct || 0}%` },
                { label: "Valid Until", value: record.valid_until },
                { label: "Status", value: record.status },
                { label: "Owner", value: record.owner },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-0.5">{f.label}</div>
                  <div className={`text-xs font-semibold ${f.accent ? "text-[var(--shell-warning)]" : "text-[var(--shell-foreground)]"}`}>{f.value || '--'}</div>
                </div>
              ))}

              {record.file_name && (
                <div>
                  <div className="text-[10px] font-semibold uppercase text-[var(--shell-muted)] mb-1">Attached Document</div>
                  <a
                    href={record.file_data}
                    download={record.file_name}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--shell-brand)] hover:underline cursor-pointer"
                  >
                    <Download className="size-3.5" /> Download
                  </a>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="text-xs font-semibold uppercase text-[var(--shell-muted)]">Document Preview</div>
              {renderQuotationFrame()}
            </div>
          </div>
        )}

        {!showSalesOrderForm && (
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--shell-border)] mt-4">
            {record.status === 'Accepted' && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowSalesOrderForm(true)}>
                Convert to Sales Order
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
