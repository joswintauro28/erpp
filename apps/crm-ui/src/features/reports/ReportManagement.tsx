"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Users, BarChart3, ShieldAlert } from 'lucide-react';
import { api } from '@/services/api';

const ReportManagement = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    try {
      const result = await api.get<any>('/reports/dashboard');
      setData(result);
    } catch (error) {
      console.error("Failed to fetch reports dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: 'var(--text-muted)' }}>
        Loading CRM Analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: '#b91c1c' }}>
        <ShieldAlert size={24} style={{ marginRight: '0.5rem' }} /> Failed to load reporting metrics.
      </div>
    );
  }

  const { summary, rep_sales, lead_status, opp_stages } = data;

  const formatCurrency = (val) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val}`;
  };

  // Find max value in rep sales for bar percentage calculation
  const maxRepSales = Math.max(...rep_sales.map(r => r.amount), 1);
  const maxLeadCount = Math.max(...lead_status.map(l => l.count), 1);
  const maxOppCount = Math.max(...opp_stages.map(o => o.count), 1);

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="customer-header" style={{ marginBottom: 0 }}>
        <div className="welcome-msg" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>INSIGHTS</div>
          <h2>CRM Analytics & Performance Reports</h2>
          <p>Real-time visual reports of sales pipeline, conversion funnels, and representative performance.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <TrendingUp size={14} color="var(--accent-primary)" /> WIN RATE
            </span>
          </div>
          <div className="metric-value">{summary.win_rate}%</div>
          <div className="metric-trend trend-up">deals won ratio</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Users size={14} color="var(--accent-primary)" /> LEAD CONVERSION
            </span>
          </div>
          <div className="metric-value">{summary.lead_conv_rate}%</div>
          <div className="metric-trend trend-up">qualified leads</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Award size={14} color="var(--accent-primary)" /> TOTAL REVENUE
            </span>
          </div>
          <div className="metric-value">{formatCurrency(summary.total_sales_value)}</div>
          <div className="metric-trend trend-up">confirmed sales value</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <BarChart3 size={14} color="var(--accent-primary)" /> ACTIVE PIPELINE DEALS
            </span>
          </div>
          <div className="metric-value">{summary.total_opportunities}</div>
          <div className="metric-trend trend-up">open opportunities</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Representative Sales Leaderboard */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="card-header" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h3 className="card-title">Revenue by Sales Representative</h3>
              <span className="card-subtitle">Performance breakdown of deals closed</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {rep_sales.length > 0 ? (
              rep_sales.map((item, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-main)' }}>{item.rep}</span>
                    <span style={{ color: 'var(--accent-primary)' }}>{formatCurrency(item.amount)}</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${(item.amount / maxRepSales) * 100}%`, 
                        backgroundColor: '#991b1b', // CRM Brand Red
                        borderRadius: '4px' 
                      }} 
                    />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No closed sales found.</div>
            )}
          </div>
        </div>

        {/* Lead Status Distribution */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="card-header" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h3 className="card-title">Lead Status Distribution</h3>
              <span className="card-subtitle">Current status breakdown of leads in system</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {lead_status.length > 0 ? (
              lead_status.map((item, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-main)' }}>{item.status}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{item.count} leads</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${(item.count / maxLeadCount) * 100}%`, 
                        backgroundColor: '#0ea5e9', // Lead theme blue
                        borderRadius: '4px' 
                      }} 
                    />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No leads found.</div>
            )}
          </div>
        </div>

        {/* Opportunity Stages */}
        <div className="card" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
          <div className="card-header" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h3 className="card-title">Opportunity Pipeline stages</h3>
              <span className="card-subtitle">Active funnel stages of deals in progress</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {opp_stages.length > 0 ? (
              opp_stages.map((item, idx) => (
                <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>{item.stage}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.count}</div>
                  <div style={{ marginTop: '0.5rem', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${(item.count / maxOppCount) * 100}%`, 
                        backgroundColor: '#10b981' // Funnel green
                      }} 
                    />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', gridColumn: 'span 3' }}>No active opportunities.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReportManagement;
