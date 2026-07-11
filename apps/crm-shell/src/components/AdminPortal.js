import React from 'react';
import { LogOut, Settings, LayoutDashboard } from 'lucide-react';
import AdminManagement from './AdminManagement';

const AdminPortal = ({ adminUser, onLogout }) => {
  return (
    <div className="app-container">
      {/* Admin Sidebar */}
      <div className="sidebar" style={{ backgroundColor: '#0f172a' }}> {/* Slightly darker than CRM sidebar */}
        <div className="sidebar-header">
          <div className="sidebar-logo">G</div>
          <div className="sidebar-title">
            <h1>Generalref CRM</h1>
            <span>Sales & Service</span>
          </div>
        </div>
        
        <div className="sidebar-section">
          <div className="sidebar-section-title">System</div>
          <ul className="sidebar-nav">
            <li className="sidebar-nav-item active">
              <Settings size={18} />
              <span>Admin Users</span>
            </li>
            {/* Future admin sections could go here */}
            <li className="sidebar-nav-item" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              <LayoutDashboard size={18} />
              <span>System Settings</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Admin Main Content */}
      <div className="main-content">
        {/* Admin Header */}
        <header className="header" style={{ justifyContent: 'flex-end', padding: '1rem 1.5rem' }}>
          <div className="header-actions">
            <button 
              className="btn" 
              onClick={onLogout}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                backgroundColor: 'white', 
                border: '1px solid var(--border-color)', 
                color: 'var(--text-main)',
                padding: '0.45rem 1rem',
                fontSize: '0.875rem'
              }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <AdminManagement />
      </div>
    </div>
  );
};

export default AdminPortal;
