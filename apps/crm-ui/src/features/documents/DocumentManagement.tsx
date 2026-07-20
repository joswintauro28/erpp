"use client";

import React, { useState, useEffect } from 'react';
import { Download, Plus, Search, Filter } from 'lucide-react';
import { exportToCSV } from '../../utils/exportCsv';
import GenericCreateModal from '../shared/GenericCreateModal';
import DocumentTable from './DocumentTable';
import GenericDetailsModal from '../shared/GenericDetailsModal';

// Fallback data
const fallbackData = {
  summary: {
    total_documents: 0,
    open: 0,
    overdue_at_risk: 0,
    owners: 0
  },
  documents: []
};

const DocumentManagement = () => {
  const [data, setData] = useState(fallbackData);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editRecord, setEditRecord] = useState(null);

  const fetchData = async () => {
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/documents');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.log("Failed to fetch document data, using fallback", error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchData();
  }, []);
  const handleDelete = async (record) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/${record.id_str}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchData();
        } else {
          alert("Failed to delete record.");
        }
      } catch (err) {
        alert("Network error.");
      }
    }
  };
  const itemsPerPage = 10000;
  const totalItems = data.documents ? data.documents.length : 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = data.documents ? data.documents.slice(startIndex, startIndex + itemsPerPage) : [];



  return (
    <div className="dashboard-container">
      <div className="customer-header">
        <div className="welcome-msg" style={{ marginBottom: 0 }}>
          <h2>Document Management</h2>
          <p>Contracts, proposals, and collateral in one library.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" onClick={() => exportToCSV(data.documents, 'documents')} style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ backgroundColor: 'var(--accent-secondary)' }}>
            <Plus size={16} /> New Document
          </button>
        </div>
      </div>

      <div className="metrics-grid" style={{ marginTop: '2rem' }}>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">TOTAL DOCUMENTS</span></div>
          <div className="metric-value">{data.summary.total_documents}</div>
          <div className="metric-trend trend-up">library items</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">OPEN</span></div>
          <div className="metric-value">{data.summary.open}</div>
          <div className="metric-trend trend-up">active review</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">OVERDUE / AT RISK</span></div>
          <div className="metric-value">{data.summary.overdue_at_risk}</div>
          <div className={`metric-trend ${data.summary.overdue_at_risk > 0 ? 'trend-down' : 'trend-up'}`}>
            {data.summary.overdue_at_risk > 0 ? 'expired items' : 'all valid'}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">REPRESENTATIVES</span></div>
          <div className="metric-value">{data.summary.owners}</div>
          <div className="metric-trend trend-up">active reps</div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-filters" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, width: 'auto', backgroundColor: '#f8fafc' }}>
            <Search size={16} color="var(--text-muted)" />
            <input type="text" placeholder="Search documents..." />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <Filter size={16} />
          </div>
          <select className="filter-select">
            <option>Type: All</option>
          </select>
          <select className="filter-select">
            <option>Status: All</option>
          </select>
        </div>
        
        <DocumentTable 
          documents={paginatedItems} 
          onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }} 
          onDelete={handleDelete} 
          onView={(rec) => { setSelectedDoc(rec); setIsDetailsOpen(true); }}
        />
        
        
      </div>
    
      <GenericCreateModal
        entityType="documents"
        entityName="Document"
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditRecord(null); }}
        editRecord={editRecord}
        onSuccess={fetchData}
      />

      <GenericDetailsModal
        record={selectedDoc}
        entityName="Document"
        isOpen={isDetailsOpen}
        onClose={() => { setIsDetailsOpen(false); setSelectedDoc(null); }}
        onSuccess={fetchData}
      />
</div>
  );
};

export default DocumentManagement;
