"use client";

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface GenericFormModalProps {
  entityType: string;
  entityName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRecord?: any;
}

const GenericFormModal: React.FC<GenericFormModalProps> = ({ entityType, entityName, isOpen, onClose, onSuccess, editRecord = null }) => {
  const [fields, setFields] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [isCustomSourceActive, setIsCustomSourceActive] = useState(false);
  const [opportunityCurrency, setOpportunityCurrency] = useState('INR');

  useEffect(() => {
    if (!isOpen) return;

    const fetchFields = async () => {
      setLoading(true);
      setError('');
      try {
        const schemaFields = await api.get<any[]>(`/${entityType}/fields`);
        setFields(schemaFields);
          
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const simpleDateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

          const standardSources = ['Trade Show / Expo', 'Tender / RFQ Portal', 'Direct Outreach', 'Referral / Agent', 'Website Inquiry'];

          if (editRecord) {
            const initialData = { ...editRecord };
            if (schemaFields.some(f => f.name === 'updated_at')) {
              initialData['updated_at'] = dateStr;
            }
            if (entityType === 'leads' && editRecord.source) {
              if (!standardSources.includes(editRecord.source)) {
                setIsCustomSourceActive(true);
                setCustomSource(editRecord.source);
              } else {
                setIsCustomSourceActive(false);
                setCustomSource('');
              }
            }
            const curVal = (entityType === 'sales') ? editRecord.amount : editRecord.value;
            if ((entityType === 'opportunities' || entityType === 'quotations' || entityType === 'sales-orders' || entityType === 'sales') && curVal) {
              const raw = String(curVal);
              if (raw.startsWith('\u20b9') || raw.startsWith('INR')) {
                setOpportunityCurrency('INR');
              } else if (raw.startsWith('$') || raw.startsWith('USD')) {
                setOpportunityCurrency('USD');
              }
            }
            setFormData(initialData);
          } else {
            const initialData = {};
            setIsCustomSourceActive(false);
            setCustomSource('');
            schemaFields.forEach(field => {
              if (field.name === 'updated_at') {
                initialData[field.name] = dateStr;
              } else if (field.name === 'last_contact' || field.name === 'last_login') {
                initialData[field.name] = dateStr;
              } else if (field.name === 'date' || field.name === 'date_raised') {
                initialData[field.name] = simpleDateStr;
              } else if (field.name === 'source') {
                initialData[field.name] = 'Website Inquiry';
              } else {
                initialData[field.name] = field.options ? field.options[0] : '';
              }
            });
            setFormData(initialData);
          }
      } catch (err) {
        setError('Network error loading schema.');
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, [isOpen, entityType, editRecord]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name' && ['contacts', 'admins'].includes(entityType) && !/^[a-zA-Z\s]*$/.test(value)) {
      return;
    }
    if (name === 'phone' && !/^\+?[0-9\s()+-]*$/.test(value)) {
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const submissionData = { ...formData };
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    if (fields.some(f => f.name === 'updated_at')) {
      submissionData['updated_at'] = dateStr;
    }

    if (submissionData.name && ['contacts', 'admins'].includes(entityType) && !/^[a-zA-Z\s]+$/.test(submissionData.name)) {
      setError('Name can only contain letters.');
      setSubmitting(false);
      return;
    }

    if (submissionData.phone && !submissionData.phone.trim().startsWith('+')) {
      setError('Phone number must start with a country code (e.g. +1).');
      setSubmitting(false);
      return;
    }

    if (submissionData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submissionData.email)) {
      setError('Please enter a valid email address (e.g. name@domain.com).');
      setSubmitting(false);
      return;
    }

    try {
      if (editRecord) {
        await api.put(`/${entityType}/${editRecord.id_str}`, submissionData);
      } else {
        await api.post(`/${entityType}`, submissionData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editRecord ? 'update' : 'create'} record. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hiddenFields = ['updated_at', 'last_contact', 'last_login', 'date', 'date_raised', 'file_data', 'files', 'file_name'];
  if (entityType === 'documents') {
    hiddenFields.push('size');
  }
  if (entityType === 'admins') {
    hiddenFields.push('owner');
  }
  if (entityType === 'leads') {
    hiddenFields.push('status');
  }
  if (entityType === 'admins' && editRecord && editRecord.role === 'Super Admin') {
    fields.forEach(field => {
      if (field.name !== 'password') {
        hiddenFields.push(field.name);
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editRecord ? 'Edit' : 'Add New'} {entityName}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-8 text-center text-[var(--shell-muted)]">Loading form...</div>
        )}
        
        {error && (
          <div className="rounded-sm bg-red-100 px-3 py-2 text-xs text-red-700 mb-4">
            {error}
          </div>
        )}

        {!loading && fields.length > 0 && (
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 mb-6">
              {entityType === 'documents' && (
                <div className="mb-2">
                  <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
                    Upload Document File (PDF or Image)
                  </Label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData(prev => ({
                            ...prev,
                            name: file.name,
                            size: file.size >= 1048576 
                              ? `${(file.size / 1048576).toFixed(1)} MB` 
                              : `${(file.size / 1024).toFixed(0)} KB`,
                            file_data: reader.result
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2 py-1.5 text-xs text-[var(--shell-foreground)] file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-0.5 file:text-xs file:font-medium file:text-primary-foreground"
                    required={!editRecord}
                  />
                  {formData.name && (
                    <div className="mt-1 text-xs text-green-600">
                      Selected File: {formData.name} ({formData.size})
                    </div>
                  )}
                </div>
              )}
              {(entityType === 'sales-orders' || entityType === 'quotations') && (
                <div className="mb-2">
                  <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
                    {entityType === 'quotations' ? 'Upload Quotation File (PDF or Image)' : 'Upload Invoice File (PDF or Image)'}
                  </Label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData(prev => ({
                            ...prev,
                            file_name: file.name,
                            file_data: reader.result
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-2 py-1.5 text-xs text-[var(--shell-foreground)] file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-0.5 file:text-xs file:font-medium file:text-primary-foreground"
                  />
                  {formData.file_name && (
                    <div className="mt-1 text-xs text-green-600">
                      Selected File: {formData.file_name}
                    </div>
                  )}
                </div>
              )}
              {fields
                .filter(field => !hiddenFields.includes(field.name))
                .filter(field => field.name !== 'summary' || (formData.file_data || formData.files || editRecord))
                .map((field) => (
                  <div key={field.name}>
                    <Label className="mb-1 block text-xs font-semibold uppercase text-[var(--shell-muted)]">
                      {entityType === 'opportunities' && field.name === 'name' ? 'Deal' : (entityType === 'requirements' && field.name === 'name') ? 'Requirements' : field.label}
                    </Label>
                                       {((entityType === 'opportunities' && field.name === 'close_date') || (entityType === 'quotations' && field.name === 'valid_until') || (entityType === 'sales-orders' && field.name === 'eta') || (entityType === 'sales' && (field.name === 'issued_date' || field.name === 'due_date'))) ? (
                      <input
                        type="date"
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        className="h-9 w-full rounded-md border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 text-xs text-[var(--shell-foreground)]"
                        required
                      />
                    ) : field.name === 'summary' ? (
                      <Textarea
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        placeholder="Optional document summary..."
                        className="min-h-[80px]"
                      />
                    ) : (
                      <Input
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        required
                      />
                    )}
                  </div>
                ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : `${editRecord ? 'Save' : 'Add'} ${entityName}`}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GenericFormModal;
