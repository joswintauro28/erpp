import React, { useState, useEffect } from 'react';
import { Download, Plus, Search, Filter } from 'lucide-react';
import { exportToCSV } from '../utils/exportCsv';
import GenericCreateModal from './GenericCreateModal';
import AdminTable from './AdminTable';

const fallbackData = {
  summary: {
    total: 0,
    active: 0,
    attention: 0,
    owners: 0
  },
  admins: []
};

const AdminManagement = () => {
  const [data, setData] = useState(fallbackData);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editRecord, setEditRecord] = useState(null);

  const fetchData = async () => {
      try {
        const response = await fetch("" + '/api/admins');
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
        const response = await fetch(`${""}/api/admins/${record.id_str}`, {
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
  const superAdmins = data.admins ? data.admins.filter(a => a.role === 'Super Admin') : [];
  const adminsList = data.admins ? data.admins.filter(a => a.role === 'Admin') : [];
  const employeesList = data.admins ? data.admins.filter(a => a.role === 'Employee') : [];

  return (
    <div className="dashboard-container">
      <div className="customer-header">
        <div className="welcome-msg" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>SETTINGS</div>
          <h2>User & Employee Management</h2>
          <p>Manage system users, employees, and administrator roles.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn" onClick={() => exportToCSV(data.admins, 'admins')} style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
            <Download size={16} /> Export
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ backgroundColor: 'var(--accent-secondary)' }}>
            <Plus size={16} /> New User / Employee
          </button>
        </div>
      </div>

      <div className="metrics-grid" style={{ marginTop: '2rem' }}>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">TOTAL EMPLOYEES</span></div>
          <div className="metric-value">{employeesList.length}</div>
          <div className="metric-trend trend-up">active</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">TOTAL ADMINS</span></div>
          <div className="metric-value">{adminsList.length + superAdmins.length}</div>
          <div className="metric-trend trend-up">access</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">ACTIVE USERS</span></div>
          <div className="metric-value">{data.admins ? data.admins.filter(a => a.status === 'Active').length : 0}</div>
          <div className="metric-trend trend-up">on track</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span className="metric-title">SUSPENDED</span></div>
          <div className="metric-value">{data.admins ? data.admins.filter(a => a.status === 'Suspended').length : 0}</div>
          <div className="metric-trend trend-down">attention</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
        {/* Super Admins Row */}
        {superAdmins.length > 0 && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '1.125rem' }}>Super Administrators</h3>
            <AdminTable admins={superAdmins} onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }} onDelete={handleDelete} />
          </div>
        )}

        {/* Admins Row */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '1.125rem' }}>Administrators</h3>
          <AdminTable admins={adminsList} onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }} onDelete={handleDelete} />
        </div>

        {/* Employees Row */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', fontSize: '1.125rem' }}>Employees</h3>
          <AdminTable admins={employeesList} onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }} onDelete={handleDelete} />
        </div>
      </div>
    
      <GenericCreateModal
        entityType="admins"
        entityName="User"
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditRecord(null); }}
        editRecord={editRecord}
        onSuccess={fetchData}
      />
</div>
  );
};

export default AdminManagement;
