import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import Quotations from "./pages/Quotations";
import Invoices from "./pages/Invoices";
import InvoiceDetails from "./pages/InvoiceDetails";
import Products from "./pages/Products";
import Warehouses from "./pages/Warehouses";
import PurchaseOrders from "./pages/PurchaseOrders";
import BatchManagement from "./pages/BatchManagement";
import SerialManagement from "./pages/SerialManagement";
import Leads from "./pages/Leads";
import Payments from "./pages/Payments";
import Stock from "./pages/Stock";
import Settings from "./pages/Settings";
import MyProfile from "./pages/MyProfile";
import Notifications from "./pages/Notifications";
import GeneralLedger from "./pages/GeneralLedger";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import AIAssistant from "./pages/AIAssistant";
import EmailLogs from "./pages/EmailLogs";
import AuditLogs from "./pages/AuditLogs";
import RecurringInvoices from "./pages/RecurringInvoices";
import CreditNotes from "./pages/CreditNotes";
import DebitNotes from "./pages/DebitNotes";
import NotificationsSettings from "./pages/NotificationsSettings";
import WorkflowSettings from "./pages/WorkflowSettings";
import BrandingSettings from "./pages/BrandingSettings";
import TeamManagement from "./pages/TeamManagement";
import AcceptInvitation from "./pages/AcceptInvitation";
import AccessDenied from "./pages/AccessDenied";
import Suppliers from "./pages/Suppliers";
import StockAdjustments from "./pages/StockAdjustments";
import InventoryValuation from "./pages/InventoryValuation";

// Client Portal
import ClientPortalLayout from "./layouts/ClientPortalLayout";
import PortalProtectedRoute from "./routes/PortalProtectedRoute";
import ClientPortalLogin from "./pages/portal/ClientPortalLogin";
import AcceptClientInvitation from "./pages/portal/AcceptClientInvitation";
import ClientPortalDashboard from "./pages/portal/ClientPortalDashboard";
import ClientPortalInvoices from "./pages/portal/ClientPortalInvoices";
import ClientPortalQuotations from "./pages/portal/ClientPortalQuotations";
import ClientPortalPayments from "./pages/portal/ClientPortalPayments";
import ClientPortalProfile from "./pages/portal/ClientPortalProfile";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/403" element={<AccessDenied />} />
      <Route path="/accept-invitation" element={<AcceptInvitation />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<ProtectedRoute requiredPermission="clients.view"><Clients /></ProtectedRoute>} />
          <Route path="/clients/:id" element={<ProtectedRoute requiredPermission="clients.view"><ClientDetails /></ProtectedRoute>} />
          <Route path="/quotations" element={<ProtectedRoute requiredPermission="quotations.view"><Quotations /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute requiredPermission="invoices.view"><Invoices /></ProtectedRoute>} />
          <Route path="/invoices/:id" element={<ProtectedRoute requiredPermission="invoices.view"><InvoiceDetails /></ProtectedRoute>} />
          <Route path="/recurring-invoices" element={<ProtectedRoute requiredPermission="invoices.view"><RecurringInvoices /></ProtectedRoute>} />
          <Route path="/credit-notes" element={<ProtectedRoute requiredPermission="invoices.view"><CreditNotes /></ProtectedRoute>} />
          <Route path="/debit-notes" element={<ProtectedRoute requiredPermission="invoices.view"><DebitNotes /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute requiredPermission="products.view"><Products /></ProtectedRoute>} />
          <Route path="/warehouses" element={<ProtectedRoute requiredPermission="inventory.warehouses.view"><Warehouses /></ProtectedRoute>} />
          <Route path="/purchase-orders" element={<ProtectedRoute requiredPermission="purchase_orders.view"><PurchaseOrders /></ProtectedRoute>} />
          <Route path="/batches" element={<ProtectedRoute requiredPermission="stock.view"><BatchManagement /></ProtectedRoute>} />
          <Route path="/serials" element={<ProtectedRoute requiredPermission="stock.view"><SerialManagement /></ProtectedRoute>} />
          <Route path="/leads" element={<ProtectedRoute requiredPermission="clients.view"><Leads /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute requiredPermission="payments.view"><Payments /></ProtectedRoute>} />
          <Route path="/stock" element={<ProtectedRoute requiredPermission="stock.view"><Stock /></ProtectedRoute>} />
          <Route path="/stock/adjustments" element={<ProtectedRoute requiredPermission="stock.adjust"><StockAdjustments /></ProtectedRoute>} />
          <Route path="/inventory/valuation" element={<ProtectedRoute requiredPermission="stock.view"><InventoryValuation /></ProtectedRoute>} />
          <Route path="/suppliers" element={<ProtectedRoute requiredPermission="suppliers.view"><Suppliers /></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute requiredPermission="accounting.view"><ChartOfAccounts /></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute requiredPermission="reports.view"><GeneralLedger /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute requiredPermission="expenses.view"><Expenses /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute requiredPermission="reports.view"><Reports /></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/email-logs" element={<ProtectedRoute requiredPermission="invoices.view"><EmailLogs /></ProtectedRoute>} />
          <Route path="/audit-logs" element={<ProtectedRoute requiredPermission="audit_logs.view"><AuditLogs /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute requiredPermission="settings.manage"><Settings /></ProtectedRoute>} />
          <Route path="/settings/branding" element={<ProtectedRoute requiredPermission="settings.manage"><BrandingSettings /></ProtectedRoute>} />
          <Route path="/settings/notifications" element={<ProtectedRoute requiredPermission="settings.manage"><NotificationsSettings /></ProtectedRoute>} />
          <Route path="/settings/workflow" element={<ProtectedRoute requiredPermission="workflow.manage"><WorkflowSettings /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute requiredPermission="users.manage"><TeamManagement /></ProtectedRoute>} />
          <Route path="/profile" element={<MyProfile />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
      </Route>

      {/* Client Portal Routes */}
      <Route path="/portal/login" element={<ClientPortalLogin />} />
      <Route path="/portal/accept-invitation" element={<AcceptClientInvitation />} />
      
      <Route element={<PortalProtectedRoute />}>
        <Route element={<ClientPortalLayout />}>
          <Route path="/portal/dashboard" element={<ClientPortalDashboard />} />
          <Route path="/portal/invoices" element={<ClientPortalInvoices />} />
          <Route path="/portal/quotations" element={<ClientPortalQuotations />} />
          <Route path="/portal/payments" element={<ClientPortalPayments />} />
          <Route path="/portal/profile" element={<ClientPortalProfile />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
