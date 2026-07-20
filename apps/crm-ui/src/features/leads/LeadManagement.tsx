"use client";

import React, { useState, useEffect } from 'react';
import { Download, Plus, Search, Filter, Sparkles } from 'lucide-react';
import { exportToCSV } from '../../utils/exportCsv';
import GenericCreateModal from '../shared/GenericCreateModal';
import LeadTable from './LeadTable';
import LeadDetailsModal from './LeadDetailsModal';

// Fallback data
const fallbackData = {
  summary: {
    total_leads: 0,
    open: 0,
    overdue_at_risk: 0,
    owners: 0
  },
  leads: []
};

const LeadManagement = ({ setCurrentView, setDiscoveryQuery }) => {
  const [data, setData] = useState(fallbackData);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editRecord, setEditRecord] = useState(null);

  const fetchData = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/leads');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.log("API not running, using fallback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (lead) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${lead.id_str}`, {
          method: 'DELETE'
        });
        fetchData();
      } catch (err) {
        console.error("Failed to delete", err);
      }
    }
  };

  const handleViewAIInsights = (companyName) => {
    if (setDiscoveryQuery && setCurrentView) {
      setDiscoveryQuery({ company_name: companyName });
      setCurrentView('LeadDiscovery');
    }
  };

  if (loading) {
    return <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading...</div>;
  }

  const activeLeads = data.leads ? data.leads.filter(lead => lead.status !== 'Converted') : [];
  const itemsPerPage = 10000;
  const totalItems = activeLeads.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = activeLeads.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="dashboard-container">
      <div className="customer-header">
        <div className="welcome-msg" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>SALES</div>
          <h2>Lead Management</h2>
          <p>Capture, qualify and route inbound leads across channels.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn" onClick={() => exportToCSV(activeLeads, 'leads')} style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
            <Download size={16} /> Export
          </button>
          <button className="btn btn-secondary" onClick={() => setCurrentView('LeadDiscovery')}>
            <Sparkles size={16} /> Discover Leads
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ backgroundColor: 'var(--accent-secondary)' }}>
            <Plus size={16} /> New Lead
          </button>
        </div>
      </div>

      <div className="metrics-grid" style={{ marginTop: '2rem' }}>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">TOTAL LEADS</span></div>
          <div className="metric-value">{data.summary.total_leads}</div>
          <div className="metric-trend trend-up">leads in pipeline</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">OPEN</span></div>
          <div className="metric-value">{data.summary.open}</div>
          <div className="metric-trend trend-up">open leads</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">OVERDUE / AT RISK</span></div>
          <div className="metric-value">{data.summary.overdue_at_risk}</div>
          <div className="metric-trend trend-down">needs attention</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">OWNERS</span></div>
          <div className="metric-value">{data.summary.owners}</div>
          <div className="metric-trend trend-up">active reps</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem', padding: '0', overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'white' }}>
          <div className="search-bar" style={{ flex: 1, width: 'auto', backgroundColor: '#f8fafc' }}>
            <Search size={16} color="var(--text-muted)" />
            <input type="text" placeholder="Search leads..." />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <Filter size={16} />
          </div>
          <select className="filter-select">
            <option>Status: All</option>
          </select>
          <select className="filter-select">
            <option>Source: All</option>
          </select>
        </div>
        
        <LeadTable 
          leads={paginatedItems} 
          onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }} 
          onDelete={handleDelete} 
          onView={(rec) => { setSelectedLead(rec); setIsDetailsOpen(true); }}
        />
        
        
      </div>
    
      <GenericCreateModal
        entityType="leads"
        entityName="Lead"
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditRecord(null); }}
        editRecord={editRecord}
        onSuccess={fetchData}
      />

      <LeadDetailsModal
        lead={selectedLead}
        isOpen={isDetailsOpen}
        onClose={() => { setIsDetailsOpen(false); setSelectedLead(null); }}
        onSuccess={fetchData}
        onViewAIInsights={handleViewAIInsights}
      />
</div>
  );
};

export default LeadManagement;
