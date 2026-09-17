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

interface CustomerCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

export default function CustomerCreateModal({ isOpen, onClose, onSuccess, editRecord = null }: CustomerCreateModalProps) {
  const [formData, setFormData] = useState<any>({
    account: '',
    industry: '',
    email: '',
    phone: '',
    tier: 'Standard',
    status: 'Active',
    arr: '',
    credit_limit: '',
    owner: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setFormData({
          account: editRecord.account || '',
          industry: editRecord.industry || '',
          email: editRecord.email || '',
          phone: editRecord.phone || '',
          tier: editRecord.tier || 'Standard',
          status: editRecord.status || 'Active',
          arr: editRecord.arr !== undefined ? String(editRecord.arr) : '',
          credit_limit: editRecord.credit_limit !== undefined ? String(editRecord.credit_limit) : '',
          owner: editRecord.owner || '',
          notes: editRecord.notes || '',
        });
      } else {
        setFormData({
          account: '',
          industry: '',
          email: '',
          phone: '',
          tier: 'Standard',
          status: 'Active',
          arr: '',
          credit_limit: '',
          owner: '',
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

    if (!formData.account.trim()) {
      setError('Account name is required.');
      setSubmitting(false);
      return;
    }

    const payload = {
      ...formData,
      arr: formData.arr ? Number(formData.arr) : null,
      credit_limit: formData.credit_limit ? Number(formData.credit_limit) : null,
    };

    try {
      if (editRecord) {
        await api.put(`/crm/customers/${editRecord.id_str}`, payload);
      } else {
        await api.post('/crm/customers', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save Customer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editRecord ? 'Edit' : 'Add New'} Customer</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-sm bg-[var(--shell-danger-surface)] px-3 py-2 text-xs text-[var(--shell-danger)] mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Account Name</Label>
              <Input name="account" value={formData.account} onChange={handleChange} required />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Industry</Label>
              <Input name="industry" value={formData.industry} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Email Address</Label>
              <Input type="email" name="email" value={formData.email} onChange={handleChange} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Phone Number</Label>
              <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1234567890" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Tier</Label>
              <select
                name="tier"
                value={formData.tier}
                onChange={handleChange}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground"
              >
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Strategic">Strategic</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Status</Label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground"
              >
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Onboarding">Onboarding</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Owner</Label>
              <Input name="owner" value={formData.owner} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">ARR (USD)</Label>
              <Input type="number" name="arr" value={formData.arr} onChange={handleChange} placeholder="Annual Recurring Revenue" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Credit Limit (INR)</Label>
              <Input type="number" name="credit_limit" value={formData.credit_limit} onChange={handleChange} placeholder="Credit Limit" />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Notes</Label>
            <Input name="notes" value={formData.notes} onChange={handleChange} placeholder="Internal notes..." />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Saving...' : `${editRecord ? 'Save' : 'Add'} Customer`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
