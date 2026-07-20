"use client";

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/${entityType}/fields`);
        if (response.ok) {
          const schemaFields = await response.json();
          setFields(schemaFields);
          
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const simpleDateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

          const standardSources = ['Trade Show / Expo', 'Tender / RFQ Portal', 'Direct Outreach', 'Referral / Agent', 'Website Inquiry'];

          if (editRecord) {
            // Prefill with editRecord, but update the updated_at field automatically to device time
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
              if (raw.startsWith('₹') || raw.startsWith('INR')) {
                setOpportunityCurrency('INR');
              } else if (raw.startsWith('$') || raw.startsWith('USD')) {
                setOpportunityCurrency('USD');
              }
            }
            setFormData(initialData);
          } else {
            // Initialize default values for Create
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
        } else {
          setError('Failed to load fields schema.');
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
    // Validate name only allows letters and spaces for contacts/admins (not documents)
    if (name === 'name' && ['contacts', 'admins'].includes(entityType) && !/^[a-zA-Z\s]*$/.test(value)) {
      return;
    }
    // Validate phone only allows digits, +, spaces, parentheses, hyphens
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

    // Ensure updated_at is always current time on submission
    const submissionData = { ...formData };
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    if (fields.some(f => f.name === 'updated_at')) {
      submissionData['updated_at'] = dateStr;
    }

    // Validation: Name must contain only letters for contacts/admins
    if (submissionData.name && ['contacts', 'admins'].includes(entityType) && !/^[a-zA-Z\s]+$/.test(submissionData.name)) {
      setError('Name can only contain letters.');
      setSubmitting(false);
      return;
    }

    // Validation: Phone must include country code starting with +
    if (submissionData.phone && !submissionData.phone.trim().startsWith('+')) {
      setError('Phone number must start with a country code (e.g. +1).');
      setSubmitting(false);
      return;
    }

    // Validation: Email must be a valid email format
    if (submissionData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submissionData.email)) {
      setError('Please enter a valid email address (e.g. name@domain.com).');
      setSubmitting(false);
      return;
    }

    const url = editRecord 
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/${entityType}/${editRecord.id_str}`
      : `${process.env.NEXT_PUBLIC_API_URL}/api/${entityType}`;
      
    const method = editRecord ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError(`Failed to ${editRecord ? 'update' : 'create'} record. Please try again.`);
      }
    } catch (err) {
      setError('Network error submitting request.');
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
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>{editRecord ? 'Edit' : 'Add New'} {entityName}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading form...</div>}
        
        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {!loading && fields.length > 0 && (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {entityType === 'documents' && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 650, color: 'var(--shell-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                    Upload Document File (PDF or Image)
                  </label>
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
                    style={{
                      width: '100%',
                      padding: '0.35rem 0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--shell-surface)',
                      color: 'var(--shell-foreground)',
                      fontSize: '0.8125rem'
                    }}
                    required={!editRecord}
                  />
                  {formData.name && (
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#16a34a' }}>
                      Selected File: {formData.name} ({formData.size})
                    </div>
                  )}
                </div>
              )}
              {(entityType === 'sales-orders' || entityType === 'quotations') && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 650, color: 'var(--shell-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                    {entityType === 'quotations' ? 'Upload Quotation File (PDF or Image)' : 'Upload Invoice File (PDF or Image)'}
                  </label>
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
                    style={{
                      width: '100%',
                      padding: '0.35rem 0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--shell-surface)',
                      color: 'var(--shell-foreground)',
                      fontSize: '0.8125rem'
                    }}
                  />
                  {formData.file_name && (
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#16a34a' }}>
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
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 650, color: 'var(--shell-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                      {entityType === 'opportunities' && field.name === 'name' ? 'Deal' : (entityType === 'requirements' && field.name === 'name') ? 'Requirements' : field.label}
                    </label>
                                       {((entityType === 'opportunities' && field.name === 'close_date') || (entityType === 'quotations' && field.name === 'valid_until') || (entityType === 'sales-orders' && field.name === 'eta') || (entityType === 'sales' && (field.name === 'issued_date' || field.name === 'due_date'))) ? (
                      <input
                        type="date"
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          backgroundColor: 'var(--shell-surface)',
                          color: 'var(--shell-foreground)',
                          fontSize: '0.8125rem',
                          height: '2.25rem'
                        }}
                        required
                      />
                    ) : field.name === 'summary' ? (
                      <textarea
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        placeholder="Optional document summary..."
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          backgroundColor: 'var(--shell-surface)',
                          color: 'var(--shell-foreground)',
                          fontSize: '0.8125rem',
                          minHeight: '80px',
                          resize: 'vertical'
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          backgroundColor: 'var(--shell-surface)',
                          color: 'var(--shell-foreground)',
                          fontSize: '0.8125rem',
                          height: '2.25rem'
                        }}
                        required
                      />
                    )}
                  </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn" onClick={onClose} style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : `${editRecord ? 'Save' : 'Add'} ${entityName}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default GenericFormModal;
