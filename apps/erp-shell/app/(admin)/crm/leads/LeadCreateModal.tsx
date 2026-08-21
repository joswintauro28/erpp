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

interface LeadCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

export default function LeadCreateModal({ isOpen, onClose, onSuccess, editRecord = null }: LeadCreateModalProps) {
  const [formData, setFormData] = useState<any>({
    name: '',
    company: '',
    email: '',
    phone: '',
    source: 'Website Inquiry',
    status: 'New',
    value: '',
    probability: '',
    owner: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setFormData({
          name: editRecord.name || '',
          company: editRecord.company || '',
          email: editRecord.email || '',
          phone: editRecord.phone || '',
          source: editRecord.source || 'Website Inquiry',
          status: editRecord.status || 'New',
          value: editRecord.est_value !== undefined ? String(editRecord.est_value) : '',
          probability: editRecord.probability || '',
          owner: editRecord.owner || '',
        });
      } else {
        setFormData({
          name: '',
          company: '',
          email: '',
          phone: '',
          source: 'Website Inquiry',
          status: 'New',
          value: '',
          probability: '',
          owner: '',
        });
      }
      setError('');
    }
  }, [isOpen, editRecord]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'name' && !/^[a-zA-Z\s]*$/.test(value)) {
      return;
    }
    if (name === 'phone' && !/^\+?[0-9\s()+-]*$/.test(value)) {
      return;
    }
    setFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (formData.phone && !formData.phone.trim().startsWith('+')) {
      setError('Phone number must start with a country code (e.g. +1).');
      setSubmitting(false);
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address.');
      setSubmitting(false);
      return;
    }

    const payload = {
      ...formData,
      est_value: formData.value ? Number(formData.value) : null,
    };

    try {
      if (editRecord) {
        await api.put(`/leads/${editRecord.id_str}`, payload);
      } else {
        await api.post('/leads', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save Lead.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editRecord ? 'Edit' : 'Add New'} Lead</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-sm bg-[var(--shell-danger-surface)] px-3 py-2 text-xs text-[var(--shell-danger)] mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Lead Name</Label>
              <Input name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Company</Label>
              <Input name="company" value={formData.company} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Email Address</Label>
              <Input type="email" name="email" value={formData.email} onChange={handleChange} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Phone Number</Label>
              <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1234567890" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Lead Source</Label>
              <select
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                required
              >
                <option value="Website Inquiry">Website Inquiry</option>
                <option value="Direct Outreach">Direct Outreach</option>
                <option value="Referral / Agent">Referral / Agent</option>
                <option value="Trade Show / Expo">Trade Show / Expo</option>
                <option value="Tender / RFQ Portal">Tender / RFQ Portal</option>
                <option value="AI Discovery">AI Discovery</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Status</Label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                required
              >
                <option value="New">New</option>
                <option value="Qualified">Qualified</option>
                <option value="In Progress">In Progress</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Est. Value (INR)</Label>
              <Input type="number" name="value" value={formData.value} onChange={handleChange} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Probability</Label>
              <Input name="probability" value={formData.probability} onChange={handleChange} placeholder="e.g. 60%" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner</Label>
              <Input name="owner" value={formData.owner} onChange={handleChange} required />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : `${editRecord ? 'Save' : 'Add'} Lead`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
