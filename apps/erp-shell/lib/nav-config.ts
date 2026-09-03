import type { NavItem } from "@/types/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  CreditCard,
  Package,
  Settings,
  Calculator,
  PieChart,
  Receipt,
  BookOpen,
  ClipboardList,
  Sparkles,
  Warehouse,
  ShoppingCart,
  Truck,
  Boxes,
  ScanBarcode,
  BarChart2,
  Repeat,
  Mail,
  FileClock,
  Target,
  Search,
  Calendar,
  Bell,
  ArrowRightLeft,
  ClipboardCheck,
  Factory,
  ShieldCheck,
  Building2,
  ScrollText,
  UserSquare2,
  FolderKanban,
} from "lucide-react";

/**
 * Central navigation configuration for the erp-shell admin panel.
 * All sidebar navigation items are defined here — separated from rendering logic.
 */
export const navItems: NavItem[] = [
  // 1. Overview
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },

  // 2. CRM
  {
    name: "CRM",
    icon: UserPlus,
    sections: [
      {
        name: "Sales",
        children: [
          { name: "Leads", href: "/crm/leads", icon: UserPlus },
          { name: "Opportunities", href: "/crm/opportunities", icon: Target },
          { name: "Requirements", href: "/crm/requirements", icon: ClipboardList },
          { name: "Quotations", href: "/crm/quotations", icon: FileText },
          { name: "Sales Orders", href: "/crm/sales-orders", icon: ShoppingCart },
        ],
      },
      {
        name: "Core",
        children: [
          { name: "Customers", href: "/crm/customers", icon: Users },
          { name: "Contacts", href: "/crm/contacts", icon: UserSquare2 },
          { name: "Documents", href: "/crm/documents", icon: FolderKanban },
        ],
      },
      {
        name: "Intelligence",
        children: [
          { name: "Reports", href: "/crm/reports", icon: BarChart2 },
          { name: "Lead Discovery", href: "/crm/lead-discovery", icon: Search },
        ],
      },
    ],
  },

  // 3. Inventory
  {
    name: "Inventory",
    icon: Package,
    sections: [
      {
        name: "Inventory Management",
        children: [
          { name: "Order Fulfillment", href: "/inventory/fulfillment", icon: ClipboardCheck },
          { name: "Products", href: "/inventory/products", icon: Boxes },
          { name: "Stock Levels", href: "/inventory/stock", icon: Warehouse },
          { name: "Stock Movements", href: "/inventory/stock/movements", icon: ArrowRightLeft },
          { name: "Serial Numbers", href: "/inventory/serial-numbers", icon: ScanBarcode },
          { name: "Quality Checks", href: "/inventory/quality-checks", icon: ShieldCheck },
        ],
      },
      {
        name: "Procurement",
        children: [
          { name: "Suppliers", href: "/inventory/suppliers", icon: Truck },
          { name: "Purchase Requisitions", href: "/inventory/purchase-requisitions", icon: ClipboardCheck },
          { name: "Purchase Orders", href: "/inventory/purchase-orders", icon: ShoppingCart },
        ],
      },
      {
        name: "Manufacturing",
        children: [
          { name: "Work Orders", href: "/inventory/work-orders", icon: Factory },
        ],
      },
      {
        name: "Locations",
        children: [
          { name: "Warehouses", href: "/inventory/warehouses", icon: Building2 },
        ],
      },
    ],
  },

  // 4. Billing
  {
    name: "Billing",
    icon: FileText,
    sections: [
      {
        name: "Billing Management",
        children: [
          { name: "Invoices", href: "/billing/invoices", icon: FileText },
          { name: "Quotations", href: "/billing/quotations", icon: ClipboardList },
          { name: "Payments", href: "/billing/payments", icon: CreditCard },
          { name: "Credit Notes", href: "/billing/credit-notes", icon: FileText },
          { name: "Debit Notes", href: "/billing/debit-notes", icon: FileText },
          { name: "Recurring Invoices", href: "/billing/recurring-invoices", icon: Repeat },
        ],
      },
    ],
  },

  // 5. Accounting
  {
    name: "Accounting",
    icon: Calculator,
    sections: [
      {
        name: "Accounting & Ledger",
        children: [
          { name: "Accounts", href: "/accounting/accounts", icon: Receipt },
          { name: "Expenses", href: "/accounting/expenses", icon: ScrollText },
          { name: "General Ledger", href: "/accounting/ledger", icon: BookOpen },
          { name: "Financial Reports", href: "/accounting/reports", icon: PieChart },
          { name: "Bank Reconciliation", href: "/accounting/reconciliation", icon: Repeat },
          { name: "Fiscal Periods", href: "/accounting/periods", icon: Calendar },
          { name: "AR Aging", href: "/accounting/aging", icon: BarChart2 },
          { name: "Dunning & Collections", href: "/accounting/dunning", icon: Bell },
        ],
      },
    ],
  },

  // 6. Settings
  {
    name: "Settings",
    icon: Settings,
    sections: [
      {
        name: "General",
        children: [
          { name: "System Settings", href: "/settings", icon: Settings },
          { name: "Corporate Branding", href: "/settings/branding", icon: Sparkles },
          { name: "Notification Rules", href: "/settings/notifications", icon: Mail },
          { name: "Workflow Pipelines", href: "/settings/workflow", icon: Repeat },
        ],
      },
      {
        name: "Activity",
        children: [
          { name: "Communication Logs", href: "/email-logs", icon: Mail, soon: true },
          { name: "Audit Logs", href: "/audit-logs", icon: FileClock, soon: true },
        ],
      },
    ],
  },

  // 7. Team
  { name: "Team", href: "/team", icon: Users },

  // 8. AI Assistant
  { name: "AI Assistant", href: "/ai-assistant", icon: Sparkles },
];
