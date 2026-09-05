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
    stage: 'Discovery',
    value: '',
    probability: '10',
    owner: '',
    close_date: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setFormData({
          name: editRecord.name || '',
          account: editRecord.account || '',
          stage: editRecord.stage || 'Discovery',
          value: editRecord.value !== undefined ? String(editRecord.value) : '',
          probability: editRecord.probability || '10',
          owner: editRecord.owner || '',
          close_date: editRecord.close_date || '',
          notes: editRecord.notes || '',
        });
      } else {
        setFormData({
          name: '',
          account: '',
          stage: 'Discovery',
          value: '',
          probability: '10',
          owner: '',
          close_date: '',
          notes: '',
        });
      }
      setError('');
    }
  }, [isOpen, editRecord]);

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

    if (!formData.name.trim()) {
      setError('Opportunity name is required.');
      setSubmitting(false);
      return;
    }

    const payload = {
      ...formData,
      value: formData.value ? Number(formData.value) : null,
      probability: Number(formData.probability) || 0,
    };

    try {
      if (editRecord) {
        await api.put(`/crm/opportunities/${editRecord.id_str}`, payload);
      } else {
        await api.post('/crm/opportunities', payload);
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
          <div className="rounded-sm bg-[var(--shell-danger-surface)] px-3 py-2 text-xs text-[var(--shell-danger)] mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Opportunity Name</Label>
              <Input name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Account</Label>
              <Input name="account" value={formData.account} onChange={handleChange} required />
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
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Value (INR)</Label>
              <Input type="number" name="value" value={formData.value} onChange={handleChange} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Probability</Label>
              <Input name="probability" value={formData.probability} onChange={handleChange} placeholder="e.g. 60%" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner</Label>
              <Input name="owner" value={formData.owner} onChange={handleChange} required />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Close Date</Label>
              <Input type="date" name="close_date" value={formData.close_date} onChange={handleChange} />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Notes</Label>
            <Input name="notes" value={formData.notes} onChange={handleChange} placeholder="Opportunity notes..." />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Saving...' : `${editRecord ? 'Save' : 'Add'} Opportunity`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
