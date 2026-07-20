"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, UserSquare2, FileText,
  Target, TrendingUp, ShoppingCart, BarChart2, Sparkles, LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">G</div>
        <div className="sidebar-title">
          <h1>Generalref CRM</h1>
          <span>Sales & Service</span>
        </div>
      </div>
      
      <div className="sidebar-section">
        <ul className="sidebar-nav">
          <li className={`sidebar-nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
            <Link href="/dashboard" className="flex items-center gap-3 w-full">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
          </li>
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Sales</div>
        <ul className="sidebar-nav">
          <li className={`sidebar-nav-item ${isActive('/leads') ? 'active' : ''}`}>
            <Link href="/leads" className="flex items-center gap-3 w-full">
              <Target size={18} />
              <span>Leads</span>
            </Link>
          </li>
          <li className={`sidebar-nav-item ${isActive('/opportunities') ? 'active' : ''}`}>
            <Link href="/opportunities" className="flex items-center gap-3 w-full">
              <TrendingUp size={18} />
              <span>Opportunities</span>
            </Link>
          </li>
          <li className={`sidebar-nav-item ${isActive('/sales-orders') ? 'active' : ''}`}>
            <Link href="/sales-orders" className="flex items-center gap-3 w-full">
              <ShoppingCart size={18} />
              <span>Sales Orders</span>
            </Link>
          </li>
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Core</div>
        <ul className="sidebar-nav">
          <li className={`sidebar-nav-item ${isActive('/customers') ? 'active' : ''}`}>
            <Link href="/customers" className="flex items-center gap-3 w-full">
              <Users size={18} />
              <span>Customers</span>
            </Link>
          </li>
          <li className={`sidebar-nav-item ${isActive('/contacts') ? 'active' : ''}`}>
            <Link href="/contacts" className="flex items-center gap-3 w-full">
              <UserSquare2 size={18} />
              <span>Contacts</span>
            </Link>
          </li>
          <li className={`sidebar-nav-item ${isActive('/documents') ? 'active' : ''}`}>
            <Link href="/documents" className="flex items-center gap-3 w-full">
              <FileText size={18} />
              <span>Documents</span>
            </Link>
          </li>
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Insights</div>
        <ul className="sidebar-nav">
          <li className={`sidebar-nav-item ${isActive('/reports') ? 'active' : ''}`}>
            <Link href="/reports" className="flex items-center gap-3 w-full">
              <BarChart2 size={18} />
              <span>Reports</span>
            </Link>
          </li>
          <li className={`sidebar-nav-item ${isActive('/ai-assistant') ? 'active' : ''}`}>
            <Link href="/ai-assistant" className="flex items-center gap-3 w-full">
              <Sparkles size={18} />
              <span>AI Assistant</span>
            </Link>
          </li>
        </ul>
      </div>

      <div className="sidebar-footer" style={{ borderTop: '1px solid #334155', paddingTop: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button 
          onClick={logout}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
