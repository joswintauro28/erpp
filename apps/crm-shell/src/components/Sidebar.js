import React from 'react';
import { 
  LayoutDashboard, Users, UserSquare2, FileText, Bell, 
  Target, TrendingUp, DollarSign, ListTodo, FileInput, 
  ShoppingCart, MessageSquare, MapPin, Repeat2, CheckSquare,
  Mail, CalendarClock, AlertOctagon, Star, Swords, BarChart2, Sparkles, Settings, LogOut
} from 'lucide-react';

const Sidebar = ({ currentView, setCurrentView, onGoToAdmin, onLogout }) => {
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
        <div className="sidebar-section-title">Core</div>
        <ul className="sidebar-nav">
          <li 
            className={`sidebar-nav-item ${currentView === 'Dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('Dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'Customers' ? 'active' : ''}`}
            onClick={() => setCurrentView('Customers')}
          >
            <Users size={18} />
            <span>Customers</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'Contacts' ? 'active' : ''}`}
            onClick={() => setCurrentView('Contacts')}
          >
            <UserSquare2 size={18} />
            <span>Contacts</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'Documents' ? 'active' : ''}`}
            onClick={() => setCurrentView('Documents')}
          >
            <FileText size={18} />
            <span>Documents</span>
          </li>
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Sales</div>
        <ul className="sidebar-nav">
          <li 
            className={`sidebar-nav-item ${currentView === 'Leads' ? 'active' : ''}`}
            onClick={() => setCurrentView('Leads')}
          >
            <Target size={18} />
            <span>Leads</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'Opportunities' ? 'active' : ''}`}
            onClick={() => setCurrentView('Opportunities')}
          >
            <TrendingUp size={18} />
            <span>Opportunities</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'Sales' ? 'active' : ''}`}
            onClick={() => setCurrentView('Sales')}
          >
            <ShoppingCart size={18} />
            <span>Sales</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'Requirements' ? 'active' : ''}`}
            onClick={() => setCurrentView('Requirements')}
          >
            <ListTodo size={18} />
            <span>Requirements</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'Quotations' ? 'active' : ''}`}
            onClick={() => setCurrentView('Quotations')}
          >
            <FileText size={18} />
            <span>Quotations</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'SalesOrders' ? 'active' : ''}`}
            onClick={() => setCurrentView('SalesOrders')}
          >
            <TrendingUp size={18} />
            <span>Sales Orders</span>
          </li>
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Engagement</div>
        <ul className="sidebar-nav">
          <li 
            className={`sidebar-nav-item ${currentView === 'Enquiries' ? 'active' : ''}`}
            onClick={() => setCurrentView('Enquiries')}
          >
            <MessageSquare size={18} />
            <span>Enquiries</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'SiteVisits' ? 'active' : ''}`}
            onClick={() => setCurrentView('SiteVisits')}
          >
            <MapPin size={18} />
            <span>Site Visits</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'FollowUps' ? 'active' : ''}`}
            onClick={() => setCurrentView('FollowUps')}
          >
            <Repeat2 size={18} />
            <span>Follow-ups</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'Tasks' ? 'active' : ''}`}
            onClick={() => setCurrentView('Tasks')}
          >
            <CheckSquare size={18} />
            <span>Tasks</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'Comms' ? 'active' : ''}`}
            onClick={() => setCurrentView('Comms')}
          >
            <Mail size={18} />
            <span>Comms</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'VisitPlanner' ? 'active' : ''}`}
            onClick={() => setCurrentView('VisitPlanner')}
          >
            <CalendarClock size={18} />
            <span>Visit Planner</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'Complaints' ? 'active' : ''}`}
            onClick={() => setCurrentView('Complaints')}
          >
            <AlertOctagon size={18} />
            <span>Complaints</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'Feedback' ? 'active' : ''}`}
            onClick={() => setCurrentView('Feedback')}
          >
            <Star size={18} />
            <span>Feedback</span>
          </li>
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Insights</div>
        <ul className="sidebar-nav">
          <li className="sidebar-nav-item">
            <Swords size={18} />
            <span>Competitors</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'Reports' ? 'active' : ''}`}
            onClick={() => setCurrentView('Reports')}
          >
            <BarChart2 size={18} />
            <span>Reports</span>
          </li>
          <li 
            className={`sidebar-nav-item ${currentView === 'AIAssistant' ? 'active' : ''}`}
            onClick={() => setCurrentView('AIAssistant')}
          >
            <Sparkles size={18} />
            <span>AI Assistant</span>
          </li>
        </ul>
      </div>

      <div className="sidebar-footer" style={{ borderTop: '1px solid #334155', paddingTop: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {onLogout && (
          <button 
            onClick={onLogout}
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
        )}
      </div>
    </div>
  );
};

export default Sidebar;
