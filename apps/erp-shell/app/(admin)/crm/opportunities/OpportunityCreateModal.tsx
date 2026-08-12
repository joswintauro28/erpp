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

interface OpportunityCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

export default function OpportunityCreateModal({ isOpen, onClose, onSuccess, editRecord = null }: OpportunityCreateModalProps) {
  const [formData, setFormData] = useState<any>({
    name: '',
    account: '',
    value: '',
    stage: 'Discovery',
    probability: '60%',
    close_date: '',
    owner: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setFormData({
          name: editRecord.name || '',
          account: editRecord.account || '',
          value: editRecord.value || '',
          stage: editRecord.stage || 'Discovery',
          probability: editRecord.probability || '60%',
          close_date: editRecord.close_date || '',
          owner: editRecord.owner || '',
        });
      } else {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const yyyy = futureDate.getFullYear();
        const mm = String(futureDate.getMonth() + 1).padStart(2, "0");
        const dd = String(futureDate.getDate()).padStart(2, "0");

        setFormData({
          name: '',
          account: '',
          value: '',
          stage: 'Discovery',
          probability: '60%',
          close_date: `${yyyy}-${mm}-${dd}`,
          owner: '',
        });
      }
      setError('');
    }
  }, [isOpen, editRecord]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editRecord) {
        await api.put(`/opportunities/${editRecord.id_str}`, formData);
      } else {
        await api.post('/opportunities', formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save Opportunity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editRecord ? 'Edit' : 'Add New'} Opportunity</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-sm bg-red-100 px-3 py-2 text-xs text-red-700 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Opportunity (Deal) Name</Label>
              <Input name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Company Name (Account)</Label>
              <Input name="account" value={formData.account} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Estimated Value</Label>
              <Input name="value" value={formData.value} onChange={handleChange} placeholder="e.g. 500000 or ₹5,00,000" required />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Probability</Label>
              <Input name="probability" value={formData.probability} onChange={handleChange} placeholder="e.g. 60%" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Stage</Label>
              <select
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                required
              >
                <option value="Discovery">Discovery</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Close Date</Label>
              <input
                type="date"
                name="close_date"
                value={formData.close_date}
                onChange={handleChange}
                className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                required
              />
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
              {submitting ? 'Saving...' : `${editRecord ? 'Save' : 'Add'} Opportunity`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
