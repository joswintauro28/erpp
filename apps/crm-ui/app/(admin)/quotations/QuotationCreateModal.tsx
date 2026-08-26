"use client";

import React, { useState, useEffect } from 'react';
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
import { FileUpload, type FileRecord } from '@datavex/ui-theme';

interface QuotationCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

export default function QuotationCreateModal({ isOpen, onClose, onSuccess, editRecord = null }: QuotationCreateModalProps) {
  const [formData, setFormData] = useState<any>({
    quote_no: '',
    account: '',
    value: '',
    discount_pct: '0',
    valid_until: '',
    status: 'Draft',
    owner: '',
  });
  const [fileId, setFileId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setFormData({
          quote_no: editRecord.quote_no || editRecord.quote_number || '',
          account: editRecord.account || editRecord.client_name || '',
          value: editRecord.value || String(editRecord.total || ''),
          discount_pct: editRecord.discount_pct !== undefined ? String(editRecord.discount_pct) : '0',
          valid_until: editRecord.valid_until || '',
          status: editRecord.status || 'Draft',
          owner: editRecord.owner || '',
        });
        setFileId(editRecord.file_id || null);
      } else {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const yyyy = futureDate.getFullYear();
        const mm = String(futureDate.getMonth() + 1).padStart(2, "0");
        const dd = String(futureDate.getDate()).padStart(2, "0");

        setFormData({
          quote_no: '',
          account: '',
          value: '',
          discount_pct: '0',
          valid_until: `${yyyy}-${mm}-${dd}`,
          status: 'Draft',
          owner: '',
        });
        setFileId(null);
      }
      setError('');
    }
  }, [isOpen, editRecord]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUploadComplete = (record: FileRecord) => {
    setFileId(record.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      ...formData,
      quote_number: formData.quote_no,
      client_name: formData.account,
      total: formData.value ? Number(formData.value) : 0,
      discount_pct: formData.discount_pct ? Number(formData.discount_pct) : 0,
      notes: '',
      file_id: fileId,
    };

    try {
      if (editRecord) {
        await api.put(`/quotations/${editRecord.id}`, payload);
      } else {
        await api.post('/quotations', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save Quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editRecord ? 'Edit' : 'Add New'} Quotation</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-sm bg-[var(--shell-danger-surface)] px-3 py-2 text-xs text-[var(--shell-danger)] mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Quotation Number (Quote No.)</Label>
              <Input name="quote_no" value={formData.quote_no} onChange={handleChange} placeholder="e.g. QT-202608-0001" required />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Account (Client Name)</Label>
              <Input name="account" value={formData.account} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Total Value (INR)</Label>
              <Input type="number" name="value" value={formData.value} onChange={handleChange} required />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Discount (%)</Label>
              <Input type="number" name="discount_pct" value={formData.discount_pct} onChange={handleChange} min="0" max="100" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Valid Until</Label>
              <input
                type="date"
                name="valid_until"
                value={formData.valid_until}
                onChange={handleChange}
                className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Status</Label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                required
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner (Sales Rep)</Label>
              <Input name="owner" value={formData.owner} onChange={handleChange} required />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Upload Quotation File (PDF or Image)</Label>
            <FileUpload
              bucket="crm-assets"
              ownerType="quotation"
              ownerId={editRecord?.id || 0}
              clientName={formData.account || "general"}
              onUpload={handleUploadComplete}
              accept="application/pdf,image/*"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : `${editRecord ? 'Save' : 'Add'} Quotation`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
