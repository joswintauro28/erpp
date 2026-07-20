"use client";

import React, { useState, useEffect } from 'react';
import { X, Target, BarChart2, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

const LeadDetailsModal = ({ lead, isOpen, onClose, onSuccess, onViewAIInsights }) => {
  const [isConverting, setIsConverting] = useState(false);
  const [probability, setProbability] = useState('60%');
  const [closeDate, setCloseDate] = useState('');
  const [stage, setStage] = useState('RFQ / Inquiry');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [pinnedDetail, setPinnedDetail] = useState(null);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const loadAIInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lead-discovery/pinned/${encodeURIComponent(lead.company)}`);
      if (res.ok) {
        const data = await res.json();
        setPinnedDetail(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (lead) {
      setIsConverting(false);
      setProbability('60%');
      setStage('RFQ / Inquiry');
      setError('');
      setPinnedDetail(null);
      setShowAIInsights(false);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const yyyy = futureDate.getFullYear();
      const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
      const dd = String(futureDate.getDate()).padStart(2, '0');
      setCloseDate(`${yyyy}-${mm}-${dd}`);
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
      const createRes = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/opportunities', {
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
      const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${lead.id_str}`, {
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
                  <input
                    type="text"
                    placeholder="e.g. 80%"
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'white', fontSize: '0.8125rem', height: '2.25rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--shell-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                    Target Close Date
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--shell-muted)', pointerEvents: 'none' }} />
                    <input
                      type="date"
                      value={closeDate}
                      onChange={(e) => setCloseDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'white', fontSize: '0.8125rem', height: '2.25rem', boxSizing: 'border-box', colorScheme: 'light' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 650, color: 'var(--shell-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                    Stage
                  </label>
                  <input
                    type="text"
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    placeholder="e.g. RFQ / Inquiry, Negotiation…"
                    style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'white', fontSize: '0.8125rem', height: '2.25rem' }}
                    required
                  />
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
            ) : showAIInsights ? (
              <div style={{ backgroundColor: 'var(--shell-surface-alt)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontWeight: 650 }}>
                    ✨ AI Discovery Insights
                  </h4>
                  <button type="button" className="btn" onClick={() => setShowAIInsights(false)} style={{ fontSize: '0.75rem', padding: '4px 10px', backgroundColor: 'white', border: '1px solid var(--border-color)' }}>
                    Back to Summary
                  </button>
                </div>

                {loadingInsights ? (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading insights...</div>
                ) : !pinnedDetail ? (
                  <div style={{ fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    No stored insights found. Make sure this lead is pinned or was imported from Discovery.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600, marginBottom: '2px' }}>AI Readiness Score</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{pinnedDetail.ai_readiness_score}/100</span>
                        <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${pinnedDetail.ai_readiness_score}%`, height: '100%', backgroundColor: 'var(--accent-secondary)' }} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Company Overview</span>
                      <p style={{ fontSize: '0.8125rem', lineHeight: '1.4', margin: 0 }}>{pinnedDetail.company_overview}</p>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Detected Technologies</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {pinnedDetail.detected_technologies?.map((tech, idx) => (
                          <span key={idx} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>{tech}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Business Pain Points</span>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8125rem' }}>
                        {pinnedDetail.business_pain_points?.map((pt, idx) => (
                          <li key={idx} style={{ marginBottom: '2px' }}>{pt}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Recommended AI Solutions</span>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8125rem' }}>
                        {pinnedDetail.recommended_ai_solutions?.map((sol, idx) => (
                          <li key={idx} style={{ marginBottom: '2px' }}>{sol}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Key Decision Makers</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        {pinnedDetail.key_decision_makers?.map((dm, idx) => (
                          <span key={idx} style={{ fontSize: '0.8125rem', fontWeight: 500 }}>&bull; {dm}</span>
                        ))}
                      </div>
                    </div>

                    {pinnedDetail.public_contact && (
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600, marginBottom: '2px' }}>Public Contact Details</span>
                        <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {pinnedDetail.public_contact.email && <div><strong>Email:</strong> {pinnedDetail.public_contact.email}</div>}
                          {pinnedDetail.public_contact.phone && <div><strong>Phone:</strong> {pinnedDetail.public_contact.phone}</div>}
                          {pinnedDetail.public_contact.address && <div><strong>Address:</strong> {pinnedDetail.public_contact.address}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Lead Preview Frame</span>
                {renderLeadFrame()}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          {lead.source === 'AI Discovery' && !showAIInsights && (
            <button className="btn btn-secondary" onClick={() => { setShowAIInsights(true); loadAIInsights(); }} style={{ marginRight: 'auto', backgroundColor: 'white', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}>
              ✨ View AI Insights
            </button>
          )}
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
