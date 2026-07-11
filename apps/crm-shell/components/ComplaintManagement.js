import React, { useState, useEffect } from 'react';
import { Download, Plus, Search, Filter } from 'lucide-react';
import { exportToCSV } from '../utils/exportCsv';
import GenericCreateModal from './GenericCreateModal';
import ComplaintTable from './ComplaintTable';
import GenericDetailsModal from './GenericDetailsModal';

const fallbackData = {
  summary: {
    total: 0,
    active: 0,
    attention: 0,
    owners: 0
  },
  complaints: []
};

const ComplaintManagement = () => {
  const [data, setData] = useState(fallbackData);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editRecord, setEditRecord] = useState(null);

  const fetchData = async () => {
      try {
        const response = await fetch("" + '/api/complaints');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.log("Failed to fetch data, using fallback", error);
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
        const response = await fetch(`${""}/api/complaints/${record.id_str}`, {
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
  const totalItems = data.complaints ? data.complaints.length : 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = data.complaints ? data.complaints.slice(startIndex, startIndex + itemsPerPage) : [];



  return (
    <div className="dashboard-container">
      <div className="customer-header">
        <div className="welcome-msg" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>ENGAGEMENT</div>
          <h2>Complaints</h2>
          <p>Manage customer complaints.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn" onClick={() => exportToCSV(data.complaints, 'complaints')} style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary" style={{ backgroundColor: 'var(--accent-secondary)' }}>
            <Plus size={16} /> New
          </button>
        </div>
      </div>

      <div className="metrics-grid" style={{ marginTop: '2rem' }}>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">TOTAL</span></div>
          <div className="metric-value">{data.summary.total}</div>
          <div className="metric-trend trend-up">active</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">ACTIVE / OPEN</span></div>
          <div className="metric-value">{data.summary.active}</div>
          <div className="metric-trend trend-up">on track</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">ATTENTION</span></div>
          <div className="metric-value">{data.summary.attention}</div>
          <div className="metric-trend trend-down">attention</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">REPRESENTATIVES</span></div>
          <div className="metric-value">{data.summary.owners}</div>
          <div className="metric-trend trend-up">active</div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-filters" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, width: 'auto', backgroundColor: '#f8fafc' }}>
            <Search size={16} color="var(--text-muted)" />
            <input type="text" placeholder="Search..." />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <Filter size={16} />
          </div>
          <select className="filter-select">
            <option>Status: All</option>
          </select>
        </div>
        
        <ComplaintTable complaints={paginatedItems} onView={(rec) => { setSelectedRecordForDetails(rec); setIsDetailsOpen(true); }} onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }} onDelete={handleDelete} />
        
        
      </div>
    
      <GenericCreateModal
        entityType="complaints"
        entityName="Complaint"
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditRecord(null); }}
        editRecord={editRecord}
        onSuccess={fetchData}
      />

      <GenericDetailsModal
        record={selectedRecordForDetails}
        entityName="Complaint"
        isOpen={isDetailsOpen}
        onClose={() => { setIsDetailsOpen(false); setSelectedRecordForDetails(null); }}
        onSuccess={fetchData}
      />
</div>
  );
};

export default ComplaintManagement;
