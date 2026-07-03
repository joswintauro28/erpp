import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  CreditCard,
  Package,
  Warehouse,
  Settings,
  ChevronRight,
  ClipboardList,
  Calculator,
  BookOpen,
  PieChart,
  Receipt,
  Sparkles,
  Mail,
  FileClock,
  Repeat,
  ShoppingCart,
  Boxes,
  ScanBarcode,
  SlidersHorizontal,
  Truck,
  BarChart2,
} from "lucide-react";
import "./Sidebar.css";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "CRM",
    icon: UserPlus,
    children: [
      { name: "Leads", href: "/leads", icon: UserPlus },
      { name: "Clients", href: "/clients", icon: Users },
    ],
  },
  {
    name: "Billing",
    icon: FileText,
    children: [
      { name: "Quotations", href: "/quotations", icon: ClipboardList },
      { name: "Invoices", href: "/invoices", icon: FileText },
      { name: "Recurring Invoices", href: "/recurring-invoices", icon: Repeat },
      { name: "Credit Notes", href: "/credit-notes", icon: FileText },
      { name: "Debit Notes", href: "/debit-notes", icon: FileText },
      { name: "Payments", href: "/payments", icon: CreditCard },
    ],
  },
  {
    name: "Accounting",
    icon: Calculator,
    children: [
      { name: "Chart of Accounts", href: "/accounts", icon: ClipboardList },
      { name: "General Ledger", href: "/ledger", icon: BookOpen },
      { name: "Expenses", href: "/expenses", icon: Receipt },
      { name: "Reports", href: "/reports", icon: PieChart },
    ],
  },
  {
    name: "Inventory",
    icon: Package,
    perm: "products.view",
    children: [
      { name: "Products", href: "/products", icon: Package, perm: "products.view" },
      { name: "Stock Movements", href: "/stock", icon: Warehouse, perm: "stock.view" },
      { name: "Stock Adjustments", href: "/stock/adjustments", icon: SlidersHorizontal, perm: "stock.adjust" },
      { name: "Inventory Valuation", href: "/inventory/valuation", icon: BarChart2, perm: "stock.view" },
      { name: "Warehouses", href: "/warehouses", icon: Warehouse, perm: "inventory.warehouses.view" },
      { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart, perm: "purchase_orders.view" },
      { name: "Suppliers", href: "/suppliers", icon: Truck, perm: "suppliers.view" },
      { name: "Batches", href: "/batches", icon: Boxes, perm: "stock.view" },
      { name: "Serials", href: "/serials", icon: ScanBarcode, perm: "stock.view" },
    ],
  },
  { name: "AI Assistant", href: "/ai-assistant", icon: Sparkles },
  { name: "Email Logs", href: "/email-logs", icon: Mail, perm: "invoices.view" },
  { name: "Audit Logs", href: "/audit-logs", icon: FileClock, perm: "audit_logs.view" },
  {
    name: "Settings",
    icon: Settings,
    perm: "settings.manage",
    children: [
      { name: "General Settings", href: "/settings", icon: Settings, perm: "settings.manage" },
      { name: "Branding", href: "/settings/branding", icon: Sparkles, perm: "settings.manage" },
      { name: "Notifications", href: "/settings/notifications", icon: Mail, perm: "settings.manage" },
      { name: "Workflow Automation", href: "/settings/workflow", icon: Repeat, perm: "workflow.manage" },
      { name: "Team Management", href: "/team", icon: Users, perm: "users.manage" },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(["CRM", "Billing", "Accounting"]);
  const { user } = useAuth();

  const hasPerm = (perm) => {
    if (!perm) return true;
    return user?.permissions?.includes(perm) || false;
  };

  const toggleGroup = (name) => {
    setExpanded((prev) =>
      prev.includes(name)
        ? (prev || []).filter((n) => n !== name)
        : [...prev, name]
    );
  };

  const isChildActive = (children) =>
    children?.some((child) => location.pathname === child.href);

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <h1>VexBill</h1>
      </div>

      <nav className="sidebar__nav">
        {(navItems || []).filter(item => hasPerm(item.perm)).map((item) =>
          item.children ? (
            <div key={item.name}>
              <button
                className={`sidebar__group-btn ${isChildActive(item.children) ? "active" : ""}`}
                onClick={() => toggleGroup(item.name)}
              >
                <span className="sidebar__group-btn-left">
                  <item.icon />
                  {item.name}
                </span>
                <ChevronRight
                  className={`sidebar__chevron ${expanded.includes(item.name) ? "open" : ""}`}
                />
              </button>
              {expanded.includes(item.name) && (
                <div className="sidebar__children">
                  {(item.children || []).filter(child => hasPerm(child.perm)).map((child) => (
                    <NavLink
                      key={child.href}
                      to={child.href}
                      className={({ isActive }) =>
                        `sidebar__child ${isActive ? "active" : ""}`
                      }
                    >
                      {child.icon && <child.icon />}
                      <span>{child.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `sidebar__item ${isActive ? "active" : ""}`
              }
            >
              <item.icon />
              <span>{item.name}</span>
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}
