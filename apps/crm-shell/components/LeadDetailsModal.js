import React, { useState, useEffect } from 'react';
import { X, Target, BarChart2, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

const LeadDetailsModal = ({ lead, isOpen, onClose, onSuccess }) => {
  const [isConverting, setIsConverting] = useState(false);
  const [probability, setProbability] = useState('50%');
  const [closeDate, setCloseDate] = useState('');
  const [stage, setStage] = useState('RFQ / Inquiry');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (lead) {
      setIsConverting(false);
      setProbability('50%');
      setStage('RFQ / Inquiry');
      setError('');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const dateStr = futureDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      setCloseDate(dateStr);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleConvert = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      // 1. Create opportunity
      const oppPayload = {
        name: lead.name,
        account: lead.company,
        value: lead.est_value,
        probability: probability,
        close_date: closeDate,
        stage: stage,
        owner: lead.owner
      };
      const createRes = await fetch("" + '/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oppPayload)
      });

      if (!createRes.ok) {
        throw new Error("Failed to create Opportunity");
      }

      // 2. Update Lead status to 'Converted'
      const leadPayload = {
        ...lead,
        status: 'Converted'
      };
      const updateRes = await fetch(`${""}/api/leads/${lead.id_str}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadPayload)
      });

      if (!updateRes.ok) {
        throw new Error("Failed to update Lead status");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to convert lead to opportunity.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderLeadFrame = () => {
    const htmlContent = `
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              padding: 24px;
              margin: 0;
              background-color: #f8fafc;
              color: #1e293b;
            }
            .lead-sheet {
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 32px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
              box-sizing: border-box;
            }
            .header {
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 16px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .title {
              margin: 0;
              font-size: 22px;
              color: #0f172a;
              font-weight: 700;
            }
            .company {
              margin: 4px 0 0 0;
              color: var(--accent-primary, #991b1b);
              font-weight: 600;
              font-size: 14px;
            }
            .badge {
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .badge-new { background-color: #e0f2fe; color: #0369a1; }
            .badge-qualified { background-color: #dcfce7; color: #15803d; }
            .badge-in-progress { background-color: #fef3c7; color: #b45309; }
            .badge-converted { background-color: #f3e8ff; color: #6b21a8; }
            .badge-lost { background-color: #fee2e2; color: #991b1b; }
            .metric-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 24px;
            }
            .metric-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 16px;
            }
            .metric-label {
              font-size: 11px;
              color: #64748b;
              font-weight: 500;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .metric-val {
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
            }
            .details-list {
              font-size: 13px;
              margin-top: 16px;
            }
            .details-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #f1f5f9;
            }
            .details-label {
              color: #64748b;
            }
            .details-val {
              font-weight: 500;
              color: #334155;
            }
          </style>
        </head>
        <body>
          <div class="lead-sheet">
            <div class="header">
              <div>
                <h1 class="title">${lead.name}</h1>
                <p class="company">${lead.company}</p>
              </div>
            </div>
            <div class="metric-grid">
              <div class="metric-box">
                <div class="metric-label">Estimated Value</div>
                <div class="metric-val">${formatCurrency(lead.est_value)}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">Lead Source</div>
                <div class="metric-val" style="font-size: 14px; margin-top: 4px;">${lead.source}</div>
              </div>
            </div>
            <div class="details-list">
              <div class="details-item">
                <span class="details-label">Lead Reference ID</span>
                <span class="details-val">${lead.id_str}</span>
              </div>
              <div class="details-item">
                <span class="details-label">Assigned Account Owner</span>
                <span class="details-val">${lead.owner}</span>
              </div>
              <div class="details-item">
                <span class="details-label">Last Contact / Update</span>
                <span class="details-val">${lead.updated_at}</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    return (
      <iframe 
        srcDoc={htmlContent} 
        style={{ width: '100%', height: '400px', border: '1px solid var(--border-color)', borderRadius: '8px' }} 
        title={lead.name} 
      />
    );
  };

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
      <div className="card" style={{ maxWidth: '800px', width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0 }}>
              {isConverting ? `Convert Lead: ${lead.name} to Opportunity` : `Lead Summary: ${lead.name}`}
            </h3>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Metadata Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderRight: '1px solid var(--border-color)', paddingRight: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Lead Name</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 550 }}>{lead.name}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Company</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 550 }}>{lead.company}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Est. Value</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 550, color: 'var(--accent-secondary)' }}>{formatCurrency(lead.est_value)}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Source</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 550 }}>{lead.source}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Owner</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 550 }}>{lead.owner}</span>
            </div>
          </div>

          {/* Right Pane: Conversion Form or Lead Frame Preview */}
          <div>
            {isConverting ? (
              <form onSubmit={handleConvert} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--shell-surface-alt)', padding: '1.25rem', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <TrendingUp size={16} color="var(--accent-primary)" />
                  <span>Configure details to convert this lead into a Pipeline Opportunity.</span>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--shell-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                    Probability
                  </label>
                  <select
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'white', fontSize: '0.8125rem', height: '2.25rem' }}
                    required
                  >
                    {['10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'].map(prob => (
                      <option key={prob} value={prob}>{prob}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--shell-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                    Target Close Date
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={closeDate}
                      onChange={(e) => setCloseDate(e.target.value)}
                      placeholder="e.g. Aug 15"
                      style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'white', fontSize: '0.8125rem', height: '2.25rem' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--shell-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                    Stage
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'white', fontSize: '0.8125rem', height: '2.25rem' }}
                    required
                  >
                    {['RFQ / Inquiry', 'Technical Assessment', 'Estimation & Quoting', 'Negotiation', 'PO Received', 'Lost'].map(stg => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" className="btn" onClick={() => setIsConverting(false)} style={{ backgroundColor: 'white', border: '1px solid var(--border-color)' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting} style={{ backgroundColor: 'var(--accent-secondary)' }}>
                    {submitting ? 'Converting...' : 'Confirm Conversion'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Lead Preview Frame</span>
                {renderLeadFrame()}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          {!isConverting && lead.status !== 'Converted' && (
            <button className="btn btn-primary" onClick={() => setIsConverting(true)} style={{ backgroundColor: 'var(--accent-secondary)' }}>
              Convert to Opportunity
            </button>
          )}
          <button className="btn" onClick={onClose} style={{ backgroundColor: 'white', border: '1px solid var(--border-color)' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailsModal;
