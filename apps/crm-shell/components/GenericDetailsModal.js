import React, { useState } from 'react';
import { X, FileText, ShoppingCart, ArrowRight, ClipboardList, FileSpreadsheet, PackageOpen, Download } from 'lucide-react';

const inputStyle = {
  width: '100%',
  padding: '0.45rem 0.75rem',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  backgroundColor: 'var(--shell-surface, #fff)',
  color: 'var(--shell-foreground, #1e293b)',
  fontSize: '0.8125rem',
  height: '2.25rem',
  boxSizing: 'border-box'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 650,
  color: 'var(--text-muted)',
  marginBottom: '0.25rem',
  textTransform: 'uppercase'
};

const GenericDetailsModal = ({ record, entityName, isOpen, onClose, onSuccess }) => {
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleError, setSaleError] = useState('');
  const [saleData, setSaleData] = useState({
    invoice_no: '',
    issued_date: '',
    due_date: '',
    status: 'Pending',
    rep: ''
  });

  const [showRequirementForm, setShowRequirementForm] = useState(false);
  const [requirementSubmitting, setRequirementSubmitting] = useState(false);
  const [requirementError, setRequirementError] = useState('');
  const [requirementData, setRequirementData] = useState({
    name: '',
    category: 'Technical',
    priority: 'Medium',
    status: 'Draft',
    owner: ''
  });

  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotationSubmitting, setQuotationSubmitting] = useState(false);
  const [quotationError, setQuotationError] = useState('');
  const [quotationCurrency, setQuotationCurrency] = useState('INR');
  const [quotationData, setQuotationData] = useState({
    quote_no: '',
    value: '',
    valid_until: '',
    status: 'Draft',
    owner: ''
  });

  const [showSalesOrderForm, setShowSalesOrderForm] = useState(false);
  const [salesOrderSubmitting, setSalesOrderSubmitting] = useState(false);
  const [salesOrderError, setSalesOrderError] = useState('');
  const [salesOrderData, setSalesOrderData] = useState({
    so_no: '',
    eta: '',
    status: 'Pending',
    owner: '',
    file_data: '',
    file_name: ''
  });

  if (!isOpen || !record) return null;

  const formatKey = (key) => {
    if (entityName === 'Requirement' && key === 'name') return 'Requirements';
    if (entityName === 'Opportunity' && key === 'name') return 'Deal';
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatValue = (key, value) => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const renderFrameContent = () => {
    const ignoredKeys = ['id', 'id_str', 'file_data', 'files', 'updated_at', 'last_contact', 'last_login', 'date', 'date_raised'];
    const fields = Object.entries(record).filter(([key]) => !ignoredKeys.includes(key));
    const nameField = record.name || record.title || record.account || record.id_str || 'Record Details';
    const subTitleField = record.company || record.category || record.stage || record.type || '';

    const htmlContent = `
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 24px; margin: 0; background-color: #f8fafc; color: #1e293b; }
            .details-sheet { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); box-sizing: border-box; }
            .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; }
            .title { margin: 0; font-size: 22px; color: #0f172a; font-weight: 700; }
            .subtitle { margin: 4px 0 0 0; color: #991b1b; font-weight: 600; font-size: 14px; }
            .details-list { font-size: 13px; margin-top: 16px; }
            .details-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
            .details-label { color: #64748b; font-weight: 500; }
            .details-val { font-weight: 600; color: #1e293b; }
          </style>
        </head>
        <body>
          <div class="details-sheet">
            <div class="header">
              <h1 class="title">${nameField}</h1>
              ${subTitleField ? `<p class="subtitle">${subTitleField}</p>` : ''}
            </div>
            <div class="details-list">
              ${fields.map(([key, val]) => `
                <div class="details-item">
                  <span class="details-label">${formatKey(key)}</span>
                  <span class="details-val">${formatValue(key, val)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </body>
      </html>
    `;

    return (
      <iframe
        srcDoc={htmlContent}
        style={{ width: '100%', height: '360px', border: '1px solid var(--border-color)', borderRadius: '8px' }}
        title={nameField}
      />
    );
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    setSaleSubmitting(true);
    setSaleError('');

    try {
      const invoiceNo = saleData.invoice_no || `INV-${Date.now().toString().slice(-6)}`;

      const salePayload = {
        id_str: `SALE-${Date.now().toString().slice(-6)}`,
        invoice_no: invoiceNo,
        account: record.account || '',
        amount: record.value || '0',
        issued_date: saleData.issued_date,
        due_date: saleData.due_date,
        status: saleData.status,
        rep: saleData.rep
      };

      const saleRes = await fetch("" + '/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });

      if (!saleRes.ok) {
        const errText = await saleRes.text();
        setSaleError('Failed to create sale: ' + errText);
        setSaleSubmitting(false);
        return;
      }

      await fetch(`${""}/api/opportunities/${record.id_str}`, {
        method: 'DELETE'
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setSaleError('Network error. Please try again.');
    } finally {
      setSaleSubmitting(false);
    }
  };

  const handleRequirementSubmit = async (e) => {
    e.preventDefault();
    setRequirementSubmitting(true);
    setRequirementError('');

    try {
      const requirementPayload = {
        id_str: `RE-${Date.now().toString().slice(-6)}`,
        name: requirementData.name || `Requirement for ${record.account}`,
        account: record.account || '',
        category: requirementData.category,
        priority: requirementData.priority,
        status: requirementData.status,
        owner: requirementData.owner
      };

      const res = await fetch("" + '/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requirementPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        setRequirementError('Failed to create requirement: ' + errText);
        setRequirementSubmitting(false);
        return;
      }

      if (isSale) {
        await fetch(`${""}/api/sales/${record.id_str}`, {
          method: 'DELETE'
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setRequirementError('Network error. Please try again.');
    } finally {
      setRequirementSubmitting(false);
    }
  };

  const handleQuotationSubmit = async (e) => {
    e.preventDefault();
    setQuotationSubmitting(true);
    setQuotationError('');

    try {
      const quoteNo = quotationData.quote_no || `QT-${Date.now().toString().slice(-6)}`;
      const symbol = quotationCurrency === 'INR' ? '₹' : '$';
      const quoteValue = symbol + quotationData.value;

      const quotationPayload = {
        id_str: `QT-${Date.now().toString().slice(-6)}`,
        quote_no: quoteNo,
        account: record.account || '',
        value: quoteValue,
        valid_until: quotationData.valid_until,
        status: quotationData.status,
        owner: quotationData.owner
      };

      const res = await fetch("" + '/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        setQuotationError('Failed to create quotation: ' + errText);
        setQuotationSubmitting(false);
        return;
      }

      if (isRequirement) {
        await fetch(`${""}/api/requirements/${record.id_str}`, {
          method: 'DELETE'
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setQuotationError('Network error. Please try again.');
    } finally {
      setQuotationSubmitting(false);
    }
  };

  const handleSalesOrderSubmit = async (e) => {
    e.preventDefault();
    setSalesOrderSubmitting(true);
    setSalesOrderError('');

    try {
      const soNo = salesOrderData.so_no || `SO-${Date.now().toString().slice(-6)}`;

      const salesOrderPayload = {
        id_str: `SO-${Date.now().toString().slice(-6)}`,
        so_no: soNo,
        account: record.account || '',
        from_quote: record.quote_no || '',
        value: record.value || '0',
        eta: salesOrderData.eta,
        status: salesOrderData.status,
        owner: salesOrderData.owner,
        file_data: salesOrderData.file_data || '',
        file_name: salesOrderData.file_name || ''
      };

      const res = await fetch("" + '/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salesOrderPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        setSalesOrderError('Failed to create sales order: ' + errText);
        setSalesOrderSubmitting(false);
        return;
      }

      if (isQuotation) {
        await fetch(`${""}/api/quotations/${record.id_str}`, {
          method: 'DELETE'
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setSalesOrderError('Network error. Please try again.');
    } finally {
      setSalesOrderSubmitting(false);
    }
  };

  const nameField = record.name || record.title || record.account || record.id_str || 'Record';
  const isOpportunity = entityName === 'Opportunity';
  const isSale = entityName === 'Sale';
  const isRequirement = entityName === 'Requirement';
  const isQuotation = entityName === 'Quotation';

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
      <div className="card" style={{ maxWidth: '900px', width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0 }}>{entityName} Summary: {nameField}</h3>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Frame Preview */}
        {!showSaleForm && !showRequirementForm && !showQuotationForm && !showSalesOrderForm && (
          <div style={{ marginBottom: '1.5rem' }}>
            {renderFrameContent()}
            
            {record.file_data && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary, #f8fafc)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Attached Document: {record.file_name || 'attachment'}</span>
                  </div>
                  <a
                    href={record.file_data}
                    download={record.file_name || 'attachment'}
                    className="btn btn-primary"
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      textDecoration: 'none'
                    }}
                  >
                    <Download size={12} /> Download
                  </a>
                </div>
                
                {/* File Preview */}
                {record.file_data.startsWith('data:application/pdf') ? (
                  <iframe
                    src={record.file_data}
                    style={{ width: '100%', height: '300px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                    title="Attached File Preview"
                  />
                ) : record.file_data.startsWith('data:image/') ? (
                  <div style={{ textAlign: 'center', backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                    <img
                      src={record.file_data}
                      alt="Attachment Preview"
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                    />
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Preview not available for this file type.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add to Sale Form */}
        {showSaleForm && isOpportunity && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              border: '1px solid #86efac',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ShoppingCart size={16} color="#16a34a" />
              <span style={{ fontSize: '0.875rem', color: '#15803d', fontWeight: 600 }}>
                Converting <strong>{nameField}</strong> to a Sale
              </span>
            </div>

            <div style={{
              background: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              display: 'flex',
              gap: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <span>Account: <strong style={{ color: 'var(--text-main)' }}>{record.account}</strong></span>
              <span>Amount: <strong style={{ color: 'var(--text-main)' }}>{record.value}</strong></span>
            </div>

            {saleError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {saleError}
              </div>
            )}

            <form onSubmit={handleSaleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Invoice No.</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-20260001 (auto-generated if blank)"
                    value={saleData.invoice_no}
                    onChange={e => setSaleData(p => ({ ...p, invoice_no: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Issued Date *</label>
                    <input
                      type="date"
                      value={saleData.issued_date}
                      onChange={e => setSaleData(p => ({ ...p, issued_date: e.target.value }))}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Due Date *</label>
                    <input
                      type="date"
                      value={saleData.due_date}
                      onChange={e => setSaleData(p => ({ ...p, due_date: e.target.value }))}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Status *</label>
                    <select
                      value={saleData.status}
                      onChange={e => setSaleData(p => ({ ...p, status: e.target.value }))}
                      style={inputStyle}
                      required
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Rep / Sales Rep *</label>
                    <input
                      type="text"
                      placeholder="Sales representative name"
                      value={saleData.rep}
                      onChange={e => setSaleData(p => ({ ...p, rep: e.target.value }))}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowSaleForm(false)}
                  style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saleSubmitting}
                  style={{ backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ShoppingCart size={14} />
                  {saleSubmitting ? 'Creating Sale...' : 'Confirm & Add to Sales'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add to Requirement Form */}
        {showRequirementForm && isSale && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              border: '1px solid #93c5fd',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ClipboardList size={16} color="#2563eb" />
              <span style={{ fontSize: '0.875rem', color: '#1e40af', fontWeight: 600 }}>
                Adding Sale to Requirements
              </span>
            </div>

            <div style={{
              background: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              display: 'flex',
              gap: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <span>Account: <strong style={{ color: 'var(--text-main)' }}>{record.account}</strong></span>
              <span>Invoice No: <strong style={{ color: 'var(--text-main)' }}>{record.invoice_no}</strong></span>
            </div>

            {requirementError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {requirementError}
              </div>
            )}

            <form onSubmit={handleRequirementSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Requirements *</label>
                  <input
                    type="text"
                    placeholder="Describe the requirement..."
                    value={requirementData.name}
                    onChange={e => setRequirementData(p => ({ ...p, name: e.target.value }))}
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Category *</label>
                    <input
                      type="text"
                      placeholder="e.g. Security, Technical"
                      value={requirementData.category}
                      onChange={e => setRequirementData(p => ({ ...p, category: e.target.value }))}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Priority *</label>
                    <select
                      value={requirementData.priority}
                      onChange={e => setRequirementData(p => ({ ...p, priority: e.target.value }))}
                      style={inputStyle}
                      required
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Status *</label>
                    <select
                      value={requirementData.status}
                      onChange={e => setRequirementData(p => ({ ...p, status: e.target.value }))}
                      style={inputStyle}
                      required
                    >
                      <option value="Draft">Draft</option>
                      <option value="Review">Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Owner *</label>
                    <input
                      type="text"
                      placeholder="e.g. Aditi Rao"
                      value={requirementData.owner}
                      onChange={e => setRequirementData(p => ({ ...p, owner: e.target.value }))}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowRequirementForm(false)}
                  style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={requirementSubmitting}
                  style={{ backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ClipboardList size={14} />
                  {requirementSubmitting ? 'Creating...' : 'Confirm & Add to Requirements'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add to Quotation Form */}
        {showQuotationForm && isRequirement && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7, #fef3c7)',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FileSpreadsheet size={16} color="#d97706" />
              <span style={{ fontSize: '0.875rem', color: '#b45309', fontWeight: 600 }}>
                Converting <strong>{nameField}</strong> to a Quotation
              </span>
            </div>

            <div style={{
              background: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              display: 'flex',
              gap: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <span>Account: <strong style={{ color: 'var(--text-main)' }}>{record.account}</strong></span>
              <span>Requirement: <strong style={{ color: 'var(--text-main)' }}>{record.name}</strong></span>
            </div>

            {quotationError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {quotationError}
              </div>
            )}

            <form onSubmit={handleQuotationSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Quote No.</label>
                  <input
                    type="text"
                    placeholder="e.g. QT-20260001 (auto-generated if blank)"
                    value={quotationData.quote_no}
                    onChange={e => setQuotationData(p => ({ ...p, quote_no: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Value *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select
                        value={quotationCurrency}
                        onChange={e => setQuotationCurrency(e.target.value)}
                        style={{
                          padding: '0.45rem 0.5rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          backgroundColor: 'var(--shell-surface)',
                          color: 'var(--shell-foreground)',
                          fontSize: '0.8125rem',
                          height: '2.25rem',
                          width: '80px',
                          flexShrink: 0
                        }}
                      >
                        <option value="INR">₹ INR</option>
                        <option value="USD">$ USD</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={quotationData.value}
                        onChange={e => setQuotationData(p => ({ ...p, value: e.target.value }))}
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Valid Until *</label>
                    <input
                      type="date"
                      value={quotationData.valid_until}
                      onChange={e => setQuotationData(p => ({ ...p, valid_until: e.target.value }))}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Status *</label>
                    <select
                      value={quotationData.status}
                      onChange={e => setQuotationData(p => ({ ...p, status: e.target.value }))}
                      style={inputStyle}
                      required
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Declined">Declined</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Owner *</label>
                    <input
                      type="text"
                      placeholder="e.g. Aditi Rao"
                      value={quotationData.owner}
                      onChange={e => setQuotationData(p => ({ ...p, owner: e.target.value }))}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowQuotationForm(false)}
                  style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={quotationSubmitting}
                  style={{ backgroundColor: '#d97706', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <FileSpreadsheet size={14} />
                  {quotationSubmitting ? 'Creating...' : 'Confirm & Add to Quotation'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add to Sales Order Form */}
        {showSalesOrderForm && isQuotation && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
              border: '1px solid #6ee7b7',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <PackageOpen size={16} color="#059669" />
              <span style={{ fontSize: '0.875rem', color: '#047857', fontWeight: 600 }}>
                Converting <strong>{nameField}</strong> to a Sales Order
              </span>
            </div>

            <div style={{
              background: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              display: 'flex',
              gap: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <span>Account: <strong style={{ color: 'var(--text-main)' }}>{record.account}</strong></span>
              <span>Value: <strong style={{ color: 'var(--text-main)' }}>{record.value}</strong></span>
            </div>

            {salesOrderError && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {salesOrderError}
              </div>
            )}

            <form onSubmit={handleSalesOrderSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>SO No.</label>
                  <input
                    type="text"
                    placeholder="e.g. SO-20260001 (auto-generated if blank)"
                    value={salesOrderData.so_no}
                    onChange={e => setSalesOrderData(p => ({ ...p, so_no: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>ETA *</label>
                    <input
                      type="date"
                      value={salesOrderData.eta}
                      onChange={e => setSalesOrderData(p => ({ ...p, eta: e.target.value }))}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Status *</label>
                    <select
                      value={salesOrderData.status}
                      onChange={e => setSalesOrderData(p => ({ ...p, status: e.target.value }))}
                      style={inputStyle}
                      required
                    >
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="In Fulfillment">In Fulfillment</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Owner *</label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Shah"
                    value={salesOrderData.owner}
                    onChange={e => setSalesOrderData(p => ({ ...p, owner: e.target.value }))}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Upload Invoice File (PDF or Image)</label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setSalesOrderData(p => ({
                            ...p,
                            file_name: file.name,
                            file_data: reader.result
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ ...inputStyle, padding: '0.35rem 0.5rem', height: 'auto' }}
                  />
                  {salesOrderData.file_name && (
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#16a34a' }}>
                      Selected File: {salesOrderData.file_name}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowSalesOrderForm(false)}
                  style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={salesOrderSubmitting}
                  style={{ backgroundColor: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <PackageOpen size={14} />
                  {salesOrderSubmitting ? 'Creating...' : 'Confirm & Add to Sales Orders'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer Buttons */}
        {!showSaleForm && !showRequirementForm && !showQuotationForm && !showSalesOrderForm && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <div>
              {isOpportunity && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowSaleForm(true)}
                  style={{ backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ShoppingCart size={14} />
                  Add to Sale
                  <ArrowRight size={14} />
                </button>
              )}
              {isSale && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowRequirementForm(true)}
                  style={{ backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ClipboardList size={14} />
                  Add to Requirements
                  <ArrowRight size={14} />
                </button>
              )}
              {isRequirement && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowQuotationForm(true)}
                  style={{ backgroundColor: '#d97706', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <FileSpreadsheet size={14} />
                  Add to Quotation
                  <ArrowRight size={14} />
                </button>
              )}
              {isQuotation && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowSalesOrderForm(true)}
                  style={{ backgroundColor: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <PackageOpen size={14} />
                  Add to Sales Orders
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
            <button className="btn btn-primary" onClick={onClose} style={{ backgroundColor: 'var(--accent-secondary)' }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenericDetailsModal;
