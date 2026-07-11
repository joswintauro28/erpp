import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CustomerManagement from './components/CustomerManagement';
import ContactManagement from './components/ContactManagement';
import DocumentManagement from './components/DocumentManagement';
import LeadManagement from './components/LeadManagement';
import OpportunityManagement from './components/OpportunityManagement';
import SaleManagement from './components/SaleManagement';
import RequirementManagement from './components/RequirementManagement';
import QuotationManagement from './components/QuotationManagement';
import SalesOrderManagement from './components/SalesOrderManagement';
import EnquiryManagement from './components/EnquiryManagement';
import SiteVisitManagement from './components/SiteVisitManagement';
import FollowUpManagement from './components/FollowUpManagement';
import TaskManagement from './components/TaskManagement';
import CommsManagement from './components/CommsManagement';
import VisitPlannerManagement from './components/VisitPlannerManagement';
import ComplaintManagement from './components/ComplaintManagement';
import FeedbackManagement from './components/FeedbackManagement';
import ReportManagement from './components/ReportManagement';
import AIAssistantManagement from './components/AIAssistantManagement';
import AdminLogin from './components/AdminLogin';
import AdminPortal from './components/AdminPortal';
import EmployeeLogin from './components/EmployeeLogin';

function App() {
  const [appMode, setAppMode] = useState('crm_login'); // 'crm_login', 'crm', 'admin_login', 'admin_portal'
  const [adminUser, setAdminUser] = useState(null);
  const [crmUser, setCrmUser] = useState(null);
  const [currentView, setCurrentView] = useState('Dashboard');

  if (appMode === 'crm_login') {
    return (
      <EmployeeLogin 
        onLoginSuccess={(user) => {
          setCrmUser(user);
          setAppMode('crm');
        }}
        onGoToAdmin={() => setAppMode('admin_login')}
      />
    );
  }

  if (appMode === 'admin_login') {
    return (
      <AdminLogin 
        onLoginSuccess={(user) => {
          setAdminUser(user);
          setAppMode('admin_portal');
        }} 
        onBackToCRM={() => setAppMode('crm_login')}
      />
    );
  }

  if (appMode === 'admin_portal') {
    return (
      <AdminPortal 
        adminUser={adminUser} 
        onLogout={() => {
          setAdminUser(null);
          setAppMode('crm_login');
        }} 
      />
    );
  }

  return (
    <div className="app-container">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onGoToAdmin={() => setAppMode('admin_login')} 
        onLogout={() => {
          setCrmUser(null);
          setAppMode('crm_login');
        }}
      />
        <div className="main-content">
        <Header 
          currentView={currentView} 
          user={crmUser}
          onLogout={() => {
            setCrmUser(null);
            setAppMode('crm_login');
          }}
          onGoToAdmin={() => setAppMode('admin_login')}
        />
        {currentView === 'Dashboard' && <Dashboard />}
        {currentView === 'Customers' && <CustomerManagement />}
        {currentView === 'Contacts' && <ContactManagement />}
        {currentView === 'Documents' && <DocumentManagement />}
        {currentView === 'Leads' && <LeadManagement />}
        {currentView === 'Opportunities' && <OpportunityManagement />}
        {currentView === 'Sales' && <SaleManagement />}
        {currentView === 'Requirements' && <RequirementManagement />}
        {currentView === 'Quotations' && <QuotationManagement />}
        {currentView === 'SalesOrders' && <SalesOrderManagement />}
        {currentView === 'Enquiries' && <EnquiryManagement />}
        {currentView === 'SiteVisits' && <SiteVisitManagement />}
        {currentView === 'FollowUps' && <FollowUpManagement />}
        {currentView === 'Tasks' && <TaskManagement />}
        {currentView === 'Comms' && <CommsManagement />}
        {currentView === 'VisitPlanner' && <VisitPlannerManagement />}
        {currentView === 'Complaints' && <ComplaintManagement />}
        {currentView === 'Feedback' && <FeedbackManagement />}
        {currentView === 'Reports' && <ReportManagement />}
        {currentView === 'AIAssistant' && <AIAssistantManagement />}
      </div>
    </div>
  );
}

export default App;
