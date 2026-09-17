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

interface QuotationCpqModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuotationCpqModal({ isOpen, onClose, onSuccess }: QuotationCpqModalProps) {
  const [formData, setFormData] = useState<any>({
    account: '',
    contact_name: '',
    email: '',
    phone: '',
    stage: 'Discovery',
    value: '',
    probability: '10',
    owner: '',
    valid_until: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        account: '',
        contact_name: '',
        email: '',
        phone: '',
        stage: 'Discovery',
        value: '',
        probability: '10',
        owner: '',
        valid_until: '',
        notes: '',
      });
      setError('');
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Record<string, string>) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (!formData.account.trim()) {
      setError('Account is required.');
      setSubmitting(false);
      return;
    }

    const payload = {
      ...formData,
      value: formData.value ? Number(formData.value) : null,
      probability: Number(formData.probability) || 0,
    };

    try {
      await api.post('/crm/quotations', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create Quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Quotation (CPQ)</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-sm bg-[var(--shell-danger-surface)] px-3 py-2 text-xs text-[var(--shell-danger)] mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Account</Label>
              <Input name="account" value={formData.account} onChange={handleChange} required />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Contact Name</Label>
              <Input name="contact_name" value={formData.contact_name} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Value (INR)</Label>
              <Input type="number" name="value" value={formData.value} onChange={handleChange} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Probability</Label>
              <Input name="probability" value={formData.probability} onChange={handleChange} placeholder="e.g. 60%" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Owner</Label>
              <Input name="owner" value={formData.owner} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Stage</Label>
              <select
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground"
              >
                <option value="Discovery">Discovery</option>
                <option value="Needs Analysis">Needs Analysis</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Closed Won">Closed Won</option>
                <option value="Closed Lost">Closed Lost</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Valid Until</Label>
              <Input type="date" name="valid_until" value={formData.valid_until} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Email</Label>
              <Input type="email" name="email" value={formData.email} onChange={handleChange} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Phone</Label>
              <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1234567890" />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Notes</Label>
            <Input name="notes" value={formData.notes} onChange={handleChange} placeholder="Quotation notes..." />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Quotation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
