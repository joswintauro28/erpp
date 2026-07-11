import React, { useState } from 'react';
import { Search, LogOut, Settings, User } from 'lucide-react';

const Header = ({ currentView, user, onLogout, onGoToAdmin }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get initials from user name
  const getInitials = (name) => {
    if (!name) return 'AM';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="top-header">
      <div className="header-left">
        <div className="header-title-area">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Core</div>
          <h2 className="header-title">
            {currentView === 'Customers' ? 'Customer Management' : 
             currentView === 'Contacts' ? 'Contact Management' : 
             currentView === 'Documents' ? 'Document Management' :
             currentView === 'Leads' ? 'Lead Management' : 
             currentView === 'Opportunities' ? 'Opportunity Management' : 
             currentView === 'Sales' ? 'Sales' : 
             currentView === 'Requirements' ? 'Requirement Management' : 
             currentView === 'Quotations' ? 'Quotation Management' : 
             currentView === 'SalesOrders' ? 'Sales Order Conversion' : 
             currentView === 'Enquiries' ? 'Enquiries' : 
             currentView === 'SiteVisits' ? 'Site Visits' : 
             currentView === 'FollowUps' ? 'Follow-ups' : 
             currentView === 'Tasks' ? 'Tasks' : 
             currentView === 'Comms' ? 'Communications' : 
             currentView === 'VisitPlanner' ? 'Visit Planner' : 
             currentView === 'Complaints' ? 'Complaints' : 
             currentView === 'Feedback' ? 'Feedback' : 
             currentView === 'Reports' ? 'Reports' : 
             currentView === 'AIAssistant' ? 'AI Assistant' : 
             'Dashboard'}
          </h2>
        </div>
        <div className="search-bar">
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder={
              currentView === 'Customers' ? "Search customers, accounts, contacts..." : 
              currentView === 'Contacts' ? "Search contacts, accounts, contacts..." :
              currentView === 'Documents' ? "Search documents, accounts, contacts..." :
              currentView === 'Leads' ? "Search leads, accounts, contacts..." :
              currentView === 'Opportunities' ? "Search opportunities, accounts, contacts..." :
              currentView === 'Sales' ? "Search sales, accounts, contacts..." :
              currentView === 'Requirements' ? "Search requirements, accounts, contacts..." :
              currentView === 'Quotations' ? "Search quotations, accounts, contacts..." :
              currentView === 'SalesOrders' ? "Search orders, accounts, contacts..." :
              currentView === 'Enquiries' ? "Search enquiries..." :
              currentView === 'SiteVisits' ? "Search visits..." :
              currentView === 'FollowUps' ? "Search follow-ups..." :
              currentView === 'Tasks' ? "Search tasks..." :
              currentView === 'Comms' ? "Search communications..." :
              currentView === 'VisitPlanner' ? "Search plans..." :
              currentView === 'Complaints' ? "Search complaints..." :
              currentView === 'Feedback' ? "Search feedback..." :
              currentView === 'Reports' ? "Search reports..." :
              currentView === 'AIAssistant' ? "Search queries..." :
              "Search dashboard, accounts, contacts..."
            } 
          />
        </div>
      </div>
      <div className="header-right" style={{ position: 'relative' }}>
        {user ? (
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              cursor: 'pointer',
              userSelect: 'none',
              padding: '0.25rem 0.5rem',
              borderRadius: '20px',
              transition: 'background-color 0.2s',
            }}
            className="profile-trigger"
          >
            <div style={{ textAlign: 'right' }} className="profile-info-text">
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>{user.name}</div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{user.role}</div>
            </div>
            <div className="avatar" style={{ margin: 0 }}>{getInitials(user.name)}</div>
          </div>
        ) : (
          <div className="avatar">AM</div>
        )}

        {isDropdownOpen && user && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            width: '240px',
            zIndex: 1010,
            padding: '0.5rem 0',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header info */}
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>{user.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', wordBreak: 'break-all' }}>{user.email}</div>
              <span style={{
                display: 'inline-block',
                marginTop: '0.35rem',
                padding: '0.125rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                backgroundColor: '#eff6ff',
                color: '#2563eb'
              }}>{user.role}</span>
            </div>

            {/* Menu Items */}
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                if (onGoToAdmin) onGoToAdmin();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                fontSize: '0.8125rem',
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              <Settings size={14} color="var(--text-muted)" />
              Admin Portal Login
            </button>

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                if (onLogout) onLogout();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#b91c1c',
                fontSize: '0.8125rem',
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
                borderTop: '1px solid var(--border-color)',
                marginTop: '0.5rem',
                paddingTop: '0.75rem'
              }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
