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

interface ContactCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

export default function ContactCreateModal({ isOpen, onClose, onSuccess, editRecord = null }: ContactCreateModalProps) {
  const [formData, setFormData] = useState<any>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'Decision Maker',
    title: '',
    status: 'Active',
    owner: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editRecord) {
        setFormData({
          first_name: editRecord.first_name || '',
          last_name: editRecord.last_name || '',
          email: editRecord.email || '',
          phone: editRecord.phone || '',
          role: editRecord.role || 'Decision Maker',
          title: editRecord.title || '',
          status: editRecord.status || 'Active',
          owner: editRecord.owner || '',
          notes: editRecord.notes || '',
        });
      } else {
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          role: 'Decision Maker',
          title: '',
          status: 'Active',
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

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError('First and last name are required.');
      setSubmitting(false);
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address.');
      setSubmitting(false);
      return;
    }

    try {
      if (editRecord) {
        await api.put(`/crm/contacts/${editRecord.id_str}`, formData);
      } else {
        await api.post('/crm/contacts', formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save Contact.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editRecord ? 'Edit' : 'Add New'} Contact</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-sm bg-[var(--shell-danger-surface)] px-3 py-2 text-xs text-[var(--shell-danger)] mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">First Name</Label>
              <Input name="first_name" value={formData.first_name} onChange={handleChange} required />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Last Name</Label>
              <Input name="last_name" value={formData.last_name} onChange={handleChange} required />
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Role</Label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
              >
                <option value="Decision Maker">Decision Maker</option>
                <option value="Influencer">Influencer</option>
                <option value="User">User</option>
                <option value="Champion">Champion</option>
                <option value="Blocker">Blocker</option>
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Title</Label>
              <Input name="title" value={formData.title} onChange={handleChange} placeholder="Job title" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Owner</Label>
              <Input name="owner" value={formData.owner} onChange={handleChange} required />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">Notes</Label>
            <Input name="notes" value={formData.notes} onChange={handleChange} placeholder="Contact notes..." />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Saving...' : `${editRecord ? 'Save' : 'Add'} Contact`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
