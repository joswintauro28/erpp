"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  CreditCard,
  Package,
  Settings,
  ChevronRight,
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
  SlidersHorizontal,
  Mail,
  FileClock,
  LogOut,
  Target,
  Search,
  Calendar,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@datavex/auth-middleware";
import { useAuth } from "@/contexts/AuthContext";
import type { NavItem, NavGroup, NavSection, NavChild } from "@/types/navigation";

const WORKSTATION_PORTS: Record<string, string> = {
  "3001": "crm",
  "3002": "billing",
  "3004": "inventory",
};

function getWorkstationUrl(defaultUrl: string): string {
  if (typeof window === "undefined") return defaultUrl;
  const host = window.location.hostname;
  if (host === "app.erp.local" || host.endsWith(".erp.local")) {
    const port = defaultUrl.match(/:(\d+)/)?.[1];
    const subdomain = port ? WORKSTATION_PORTS[port] : null;
    if (subdomain) return `http://${subdomain}.erp.local`;
  }
  return defaultUrl;
}

const navItems: NavItem[] = [
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
          { name: "Contacts", href: "/crm/contacts", icon: Users },
          { name: "Documents", href: "/crm/documents", icon: FileText },
        ],
      },
      {
        name: "Intelligence",
        children: [
          { name: "Reports", href: "/crm/reports", icon: BarChart2 },
          { name: "AI Assistant", href: "/crm/ai-assistant", icon: Sparkles },
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
        name: "Products",
        children: [
          { name: "Product Catalog", href: "/inventory/products", icon: Package },
          { name: "Batch Tracking", href: "#", icon: Boxes, soon: true },
          { name: "Serial Tracking", href: "/inventory/serials", icon: ScanBarcode },
        ],
      },
      {
        name: "Stock & Warehouses",
        children: [
          { name: "Stock Levels", href: "/inventory/stock", icon: Warehouse },
          { name: "Stock Adjustments", href: "/inventory/stock/adjustments", icon: SlidersHorizontal },
          { name: "Inventory Valuation", href: "#", icon: BarChart2, soon: true },
          { name: "Warehouses", href: "/inventory/warehouses", icon: Warehouse },
        ],
      },
      {
        name: "Procurement",
        children: [
          { name: "Purchase Orders", href: "/inventory/purchase-orders", icon: ShoppingCart },
          { name: "Suppliers", href: "/inventory/suppliers", icon: Truck },
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
        name: "Revenue",
        children: [
          { name: "Quotations", href: "/billing/quotations", icon: ClipboardList },
          { name: "Invoices", href: "/billing/invoices", icon: FileText },
          { name: "Recurring Invoices", href: "/billing/recurring-invoices", icon: Repeat },
          { name: "Credit Notes", href: "/billing/credit-notes", icon: FileText },
          { name: "Debit Notes", href: "/billing/debit-notes", icon: FileText },
          { name: "Payments", href: "/billing/payments", icon: CreditCard },
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
        name: "Ledger",
        children: [
          { name: "Chart of Accounts", href: "/accounting/accounts", icon: SlidersHorizontal },
          { name: "General Ledger", href: "/accounting/ledger", icon: BookOpen },
          { name: "Expenses", href: "/accounting/expenses", icon: Receipt },
        ],
      },
      {
        name: "Operations",
        children: [
          { name: "Bank Reconciliation", href: "/accounting/reconciliation", icon: Repeat },
          { name: "AR Aging", href: "/accounting/aging", icon: BarChart2 },
          { name: "Dunning & Collections", href: "/accounting/dunning", icon: Bell },
          { name: "Fiscal Periods", href: "/accounting/periods", icon: Calendar },
        ],
      },
      {
        name: "Reporting",
        children: [
          { name: "Financial Reports", href: "/accounting/reports", icon: PieChart },
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
          { name: "Communication Logs", href: "/email-logs", icon: Mail },
          { name: "Audit Logs", href: "/audit-logs", icon: FileClock },
        ],
      },
    ],
  },

  // 7. Team
  { name: "Team", href: "/team", icon: Users },

  // 8. AI (Coming Soon)
  { name: "AI Assistant", href: "/ai-assistant", icon: Sparkles, soon: true },
];

// Extract all defined navigation hrefs to determine more specific matches
const allHrefs = navItems.flatMap((item) => {
  if ("sections" in item) {
    return item.sections.flatMap((s) => s.children.map((c) => c.href));
  }
  return [item.href];
}).filter((href) => href && href !== "#");

function flattenSections(sections: NavSection[]): NavChild[] {
  return sections.flatMap((s) => s.children);
}

function isGroup(item: NavItem): item is NavGroup {
  return "sections" in item;
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  if (href === "#") return false;
  
  // Exact match
  if (pathname === href) return true;
  
  // Detail page match (e.g. /billing/invoices/123 matching /billing/invoices)
  if (pathname.startsWith(href + "/")) {
    // Exclude if there is a more specific defined route matching the path
    return !allHrefs.some(
      (otherHref) =>
        otherHref !== href &&
        otherHref.startsWith(href + "/") &&
        pathname.startsWith(otherHref)
    );
  }
  
  return false;
}

function groupActive(group: NavGroup, pathname: string): boolean {
  return flattenSections(group.sections).some((c) => isActive(c.href, pathname));
}

function activeChild(group: NavGroup, pathname: string): string | null {
  for (const child of flattenSections(group.sections)) {
    if (isActive(child.href, pathname)) return child.href;
  }
  return null;
}

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [expanded, setExpanded] = useState<string[]>(["CRM", "Inventory", "Billing"]);

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";
  const initials = (displayName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)) || "U";
    
  const displayRole = user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : "User";
  
  const [hoveredGroup, setHoveredGroup] = useState<NavGroup | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const flyoutTimeout = useRef<NodeJS.Timeout | null>(null);

  const toggleGroup = (name: string) => {
    if (collapsed) return;
    setExpanded((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleGroupMouseEnter = (group: NavGroup, event: React.MouseEvent<HTMLElement>) => {
    if (!collapsed) return;
    if (flyoutTimeout.current) clearTimeout(flyoutTimeout.current);
    
    const rect = event.currentTarget.getBoundingClientRect();
    const flyoutEstimatedHeight = flattenSections(group.sections).length * 32 + 40; 
    const windowHeight = window.innerHeight;
    
    // Bounds Check Strategy: Adjust vertical coordinate up if it risks spilling past viewport margins
    if (rect.top + flyoutEstimatedHeight > windowHeight) {
      setHoverPosition(Math.max(16, windowHeight - flyoutEstimatedHeight - 16));
    } else {
      setHoverPosition(rect.top);
    }
    
    setHoveredGroup(group);
  };

  const handleGroupMouseLeave = () => {
    if (!collapsed) return;
    flyoutTimeout.current = setTimeout(() => {
      setHoveredGroup(null);
    }, 150);
  };

  const handleFlyoutMouseEnter = () => {
    if (flyoutTimeout.current) clearTimeout(flyoutTimeout.current);
  };

  const handleFlyoutMouseLeave = () => {
    setHoveredGroup(null);
  };

  useEffect(() => {
    return () => {
      if (flyoutTimeout.current) clearTimeout(flyoutTimeout.current);
    };
  }, []);

  return (
    <aside
      className="relative z-40 flex shrink-0 flex-col bg-sidebar border-r border-sidebar-border shadow-xl transition-[width] duration-300 ease-in-out"
      style={{ width: collapsed ? "64px" : "var(--sidebar-width)" }}
    >
      {/* Brand Header Context */}
      <div
        className={cn(
          "flex shrink-0 items-center transition-[padding] duration-300 border-b border-sidebar-border",
          collapsed ? "h-20 justify-center px-0" : "h-20 gap-3 px-5"
        )}
      >
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-extrabold text-sidebar-primary-foreground shadow-md transition-transform duration-300 hover:rotate-6 select-none">
          <span className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
          D
        </div>
        <div
          className={cn(
            "flex flex-col overflow-hidden transition-all duration-300",
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}
        >
          <span className="font-heading text-sm font-bold tracking-[0.18em] text-sidebar-primary select-none">
            DATAVEX
          </span>
          <span className="text-[9px] font-medium tracking-[0.1em] text-sidebar-foreground/50 uppercase mt-0.5 select-none">
            ERP Control Suite
          </span>
        </div>
      </div>

      {/* Primary Navigation Hub */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden px-3 py-4 custom-scrollbar">
        {navItems.map((item, index) =>
          isGroup(item) ? (
            <div
              key={`group-${item.name}-${index}`}
              className="pt-2 first:pt-0"
              onMouseEnter={(e) => handleGroupMouseEnter(item, e)}
              onMouseLeave={handleGroupMouseLeave}
            >
              {/* Expandable Meta Headers */}
              {!collapsed ? (
                <div className="mb-1.5 flex items-center gap-2 px-2.5">
                  <span className="font-heading text-[9px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/40 select-none">
                    {item.name}
                  </span>
                  <div className="h-px flex-1 bg-sidebar-border" />
                </div>
              ) : (
                <div className="mb-1.5 flex justify-center">
                  <div className="h-1 w-5 rounded-full bg-sidebar-border" />
                </div>
              )}

              <div className="space-y-1">
                {/* Accordion Group Head Router */}
                <button
                  onClick={() => toggleGroup(item.name)}
                  title={collapsed ? item.name : undefined}
                  type="button"
                  className={cn(
                    "relative flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm font-medium transition-all duration-200 group/btn cursor-pointer",
                    collapsed && "justify-center",
                    groupActive(item, pathname)
                      ? "text-sidebar-primary-foreground font-semibold bg-sidebar-primary shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-all duration-200 group-hover/btn:scale-110",
                        groupActive(item, pathname)
                          ? "text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/60 group-hover/btn:text-sidebar-accent-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "overflow-hidden whitespace-nowrap transition-all duration-300",
                        collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                      )}
                    >
                      {item.name}
                    </span>
                  </div>

                  {/* Operational Dropdown Marker */}
                  {!collapsed && (
                    <ChevronRight
                      className={cn(
                        "ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                        expanded.includes(item.name) && "rotate-90",
                        groupActive(item, pathname) ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/40"
                      )}
                    />
                  )}
                </button>

                {/* Internal Multi-Link Lists with Section Hierarchy (Expanded Context Only) */}
                {!collapsed && expanded.includes(item.name) && (
                  <div className="mt-1 space-y-3 border-l border-sidebar-border ml-4 pl-4">
                    {item.sections.map((section, sIdx) => (
                      <div key={section.name}>
                        {sIdx > 0 && (
                          <div className="mb-2.5 h-px bg-sidebar-border/60 mx-1.5" />
                        )}
                        <div className="space-y-0.5">
                          <span className="block text-[9px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/30 px-1.5 py-1 select-none">
                            {section.name}
                          </span>
                          {section.children.map((child) => {
                            const childActive = activeChild(item, pathname) === child.href;
                            const isExternal = child.href.startsWith("http");
                            const linkClasses = cn(
                              "relative flex items-center gap-3 rounded-sm px-2.5 py-1.5 text-xs transition-all duration-200 group/link",
                              child.soon && "opacity-50",
                              childActive
                                ? "text-sidebar-primary-foreground font-medium bg-sidebar-primary/80 shadow-sm"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            );
                            if (child.href === "#") {
                              return (
                                <span key={child.name} className={linkClasses}>
                                  {childActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-sidebar-primary" />}
                                  <child.icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors duration-200", childActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/40 group-hover/link:text-sidebar-accent-foreground")} />
                                  <span>{child.name}</span>
                                  {child.soon && <span className="ml-auto text-[8px] font-medium uppercase tracking-wider text-[var(--shell-accent)]">Soon</span>}
                                </span>
                              );
                            }
                            if (isExternal) {
                              return (
                                <a
                                  key={child.name}
                                  href={child.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={linkClasses}
                                  onClick={(e) => {
                                    const token = getAccessToken();
                                    if (token) {
                                      e.preventDefault();
                                      window.open(`${getWorkstationUrl(child.href)}?token=${token}`, "_blank", "noopener");
                                    }
                                  }}
                                >
                                  {childActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-sidebar-primary" />}
                                  <child.icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors duration-200", childActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/40 group-hover/link:text-sidebar-accent-foreground")} />
                                  <span>{child.name}</span>
                                  {child.soon && <span className="ml-auto text-[8px] font-medium uppercase tracking-wider text-[var(--shell-accent)]">Soon</span>}
                                </a>
                              );
                            }
                            return (
                              <Link key={child.name} href={child.href} title={child.name} className={linkClasses}>
                                {childActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-sidebar-primary" />}
                                <child.icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors duration-200", childActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/40 group-hover/link:text-sidebar-accent-foreground")} />
                                <span>{child.name}</span>
                                {child.soon && <span className="ml-auto text-[8px] font-medium uppercase tracking-wider text-[var(--shell-accent)]">Soon</span>}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Standard Route Configurations */
            <Link
              key={`link-${item.name}-${index}`}
              href={item.soon ? "#" : item.href}
              title={collapsed ? item.name : undefined}
              onClick={item.soon ? (e) => e.preventDefault() : undefined}
              className={cn(
                "relative flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm font-medium transition-all duration-200 group/btn",
                collapsed && "justify-center",
                item.soon && "opacity-50 cursor-not-allowed",
                !item.soon && isActive(item.href, pathname)
                  ? "text-sidebar-primary-foreground font-semibold bg-sidebar-primary shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-all duration-200 group-hover/btn:scale-110",
                    !item.soon && isActive(item.href, pathname)
                      ? "text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/60 group-hover/btn:text-sidebar-accent-foreground"
                  )}
                />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap transition-all duration-300",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}
                >
                  {item.name}
                </span>
                {item.soon && !collapsed && (
                  <span className="ml-auto text-[8px] font-medium uppercase tracking-wider text-sidebar-foreground/45">Soon</span>
                )}
              </div>
            </Link>
          )
        )}
      </nav>

      {/* Floating Submenu / Flyout System (Active under Collapsed State Interactions) */}
      {collapsed && hoveredGroup && (
        <div
          className="fixed left-[72px] z-50 w-52 rounded-md border border-sidebar-border bg-sidebar p-2 shadow-overlay animate-in fade-in slide-in-from-left-2 duration-150"
          style={{ top: `${hoverPosition}px` }}
          onMouseEnter={handleFlyoutMouseEnter}
          onMouseLeave={handleFlyoutMouseLeave}
        >
          {/* Flyout Submenu Label */}
          <div className="border-b border-sidebar-border px-3 py-1.5 mb-1">
            <span className="font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-primary">
              {hoveredGroup.name}
            </span>
          </div>
          
          {/* Submenu Core Link Array */}
          <div className="space-y-1">
            {flattenSections(hoveredGroup.sections).map((child) => {
              const childActive = isActive(child.href, pathname);
              const isExternal = child.href.startsWith("http");
              const linkClasses = cn(
                "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs transition-all duration-150 group/flylink",
                child.soon && "opacity-60",
                childActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              );
              if (child.href === "#") {
                return (
                  <span key={`fly-${child.name}`} className={linkClasses}>
                    <child.icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors", childActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/45 group-hover/flylink:text-sidebar-accent-foreground")} />
                    <span>{child.name}</span>
                    {child.soon && <span className="ml-auto text-[8px] font-medium uppercase tracking-wider text-[var(--shell-accent)]">Soon</span>}
                  </span>
                );
              }
              if (isExternal) {
                return (
                  <a
                    key={`fly-${child.name}`}
                    href={child.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClasses}
                    onClick={(e) => {
                      const token = getAccessToken();
                      if (token) {
                        e.preventDefault();
                        window.open(`${getWorkstationUrl(child.href)}?token=${token}`, "_blank", "noopener");
                      }
                    }}
                  >
                    <child.icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors", childActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/45 group-hover/flylink:text-sidebar-accent-foreground")} />
                    <span>{child.name}</span>
                    {child.soon && <span className="ml-auto text-[8px] font-medium uppercase tracking-wider text-[var(--shell-accent)]">Soon</span>}
                  </a>
                );
              }
              return (
                <Link key={`fly-${child.name}`} href={child.href} className={linkClasses}>
                  <child.icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors", childActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/45 group-hover/flylink:text-sidebar-accent-foreground")} />
                  <span>{child.name}</span>
                  {child.soon && <span className="ml-auto text-[8px] font-medium uppercase tracking-wider text-[var(--shell-accent)]">Soon</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Operational User Summary Module */}
      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border transition-[padding] duration-300 bg-black/10",
          collapsed ? "space-y-2 p-2.5" : "space-y-2 p-4"
        )}
      >
        <div className={cn("flex items-center justify-between", collapsed && "justify-center")}>
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
            {/* Shield Avatar with Internal Layer Sweeps */}
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-xs font-bold text-sidebar-foreground select-none">
              {initials}
            </div>
            
            {/* Identity Text Aggregation */}
            <div
              className={cn(
                "overflow-hidden whitespace-nowrap transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
            >
              <p className="truncate text-xs font-semibold text-sidebar-foreground tracking-wide">{displayName}</p>
              <p className="truncate text-[10px] text-sidebar-foreground/50 mt-0.5">{displayRole}</p>
            </div>
          </div>

          {/* Quick Session Termination Action (Visible when Expanded) */}
          {!collapsed && (
            <button
              title="Sign Out"
              type="button"
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors p-1 rounded-md hover:bg-sidebar-accent group cursor-pointer"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              <LogOut className="h-4 w-4 text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}