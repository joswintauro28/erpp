import { useState, ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import type { LucideProps } from "lucide-react";
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

interface NavChildItem {
  name: string;
  href: string;
  icon: ComponentType<LucideProps>;
  perm?: string;
}

interface NavGroupItem {
  name: string;
  icon: ComponentType<LucideProps>;
  perm?: string;
  children: NavChildItem[];
}

interface NavLinkItem {
  name: string;
  href: string;
  icon: ComponentType<LucideProps>;
  perm?: string;
}

type NavItem = NavGroupItem | NavLinkItem;

const navItems: NavItem[] = [
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
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(["CRM", "Billing", "Accounting"]);
  const { user } = useAuth();

  const hasPerm = (perm?: string) => {
    if (!perm) return true;
    return user?.permissions?.includes(perm) || false;
  };

  const toggleGroup = (name: string) => {
    setExpanded((prev: any) =>
      prev.includes(name)
        ? (prev || []).filter((n: any) => n !== name)
        : [...prev, name]
    );
  };

  const isChildActive = (children: { href: string }[]) =>
    children?.some((child: any) => pathname === child.href);

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <h1>VexBill</h1>
      </div>

      <nav className="sidebar__nav">
        {(navItems || []).filter((item: NavItem) => hasPerm(item.perm)).map((item: NavItem) =>
          'children' in item ? (
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
                  {(item.children || []).filter((child: any) => hasPerm(child.perm)).map((child: any) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`sidebar__child ${pathname === child.href ? "active" : ""}`}
                    >
                      {child.icon && <child.icon />}
                      <span>{child.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              key={item.name}
              href={item.href}
              className={`sidebar__item ${pathname === item.href ? "active" : ""}`}
            >
              <item.icon />
              <span>{item.name}</span>
            </Link>
          )
        )}
      </nav>
    </aside>
  );
}
