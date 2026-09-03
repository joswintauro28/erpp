"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Truck,
  ShoppingCart,
  ScanBarcode,
  ChevronRight,
  LogOut,
  Boxes,
  ArrowRightLeft,
  Building2,
  Factory,
  ClipboardCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { NavItem, NavGroup, NavSection, NavChild } from "@/types/navigation";

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Inventory",
    icon: Package,
    sections: [
      {
        name: "Inventory Management",
        children: [
          { name: "Order Fulfillment", href: "/fulfillment", icon: ClipboardCheck },
          { name: "Products", href: "/products", icon: Boxes },
          { name: "Stock Levels", href: "/stock", icon: Warehouse },
          { name: "Stock Movements", href: "/stock/movements", icon: ArrowRightLeft },
          { name: "Serial Numbers", href: "/serial-numbers", icon: ScanBarcode },
          { name: "Quality Checks", href: "/quality-checks", icon: ShieldCheck },
        ],
      },
      {
        name: "Procurement",
        children: [
          { name: "Suppliers", href: "/suppliers", icon: Truck },
          { name: "Purchase Requisitions", href: "/purchase-requisitions", icon: ClipboardCheck },
          { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart },
        ],
      },
      {
        name: "Manufacturing",
        children: [
          { name: "Work Orders", href: "/work-orders", icon: Factory },
        ],
      },
      {
        name: "Locations",
        children: [
          { name: "Warehouses", href: "/warehouses", icon: Building2 },
        ],
      },
    ],
  },
  { name: "AI Assistant", href: "/ai-assistant", icon: Sparkles },
];

// Extract all defined navigation hrefs for smart matching
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

  // Detail page match (e.g. /products/123 matching /products)
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
  const { user, logout } = useAuth();
  const [expanded, setExpanded] = useState<string[]>(["Inventory"]);
  const [hoveredGroup, setHoveredGroup] = useState<NavGroup | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const flyoutTimeout = useRef<NodeJS.Timeout | null>(null);

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
      {/* Brand */}
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
            Inventory Center
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden px-3 py-4 custom-scrollbar">
        {navItems.map((item, index) =>
          isGroup(item) ? (
            <div
              key={`group-${item.name}-${index}`}
              className="pt-2 first:pt-0"
              onMouseEnter={(e) => handleGroupMouseEnter(item, e)}
              onMouseLeave={handleGroupMouseLeave}
            >
              {/* Section header */}
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
                {/* Group accordion button */}
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
                  {!collapsed && (
                    <ChevronRight
                      className={cn(
                        "ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                        expanded.includes(item.name) && "rotate-90",
                        groupActive(item, pathname)
                          ? "text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/40"
                      )}
                    />
                  )}
                </button>

                {/* Children with section hierarchy */}
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
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                title={child.name}
                                className={cn(
                                  "relative flex items-center gap-3 rounded-sm px-2.5 py-1.5 text-xs transition-all duration-200 group/link",
                                  childActive
                                    ? "text-sidebar-primary-foreground font-medium bg-sidebar-primary/80 shadow-sm"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                )}
                              >
                                {childActive && (
                                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-sidebar-primary" />
                                )}
                                <child.icon
                                  className={cn(
                                    "h-3.5 w-3.5 shrink-0 transition-colors duration-200",
                                    childActive
                                      ? "text-sidebar-primary-foreground"
                                      : "text-sidebar-foreground/40 group-hover/link:text-sidebar-accent-foreground"
                                  )}
                                />
                                <span>{child.name}</span>
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
            /* Standalone link */
            <Link
              key={`link-${item.name}-${index}`}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "relative flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm font-medium transition-all duration-200 group/btn",
                collapsed && "justify-center",
                isActive(item.href, pathname)
                  ? "text-sidebar-primary-foreground font-semibold bg-sidebar-primary shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-all duration-200 group-hover/btn:scale-110",
                    isActive(item.href, pathname)
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
            </Link>
          )
        )}
      </nav>

      {/* Flyout (collapsed state hover) */}
      {collapsed && hoveredGroup && (
        <div
          className="fixed left-[72px] z-50 w-52 rounded-md border border-sidebar-border bg-sidebar p-2 shadow-overlay animate-in fade-in slide-in-from-left-2 duration-150"
          style={{ top: `${hoverPosition}px` }}
          onMouseEnter={handleFlyoutMouseEnter}
          onMouseLeave={handleFlyoutMouseLeave}
        >
          <div className="border-b border-sidebar-border px-3 py-1.5 mb-1">
            <span className="font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-primary">
              {hoveredGroup.name}
            </span>
          </div>
          <div className="space-y-1">
            {flattenSections(hoveredGroup.sections).map((child) => {
              const childActive = isActive(child.href, pathname);
              return (
                <Link
                  key={`fly-${child.href}`}
                  href={child.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs transition-all duration-150 group/flylink",
                    childActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <child.icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-colors",
                      childActive
                        ? "text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/45 group-hover/flylink:text-sidebar-accent-foreground"
                    )}
                  />
                  <span>{child.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* User footer */}
      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border transition-[padding] duration-300 bg-black/10",
          collapsed ? "space-y-2 p-2.5" : "space-y-2 p-4"
        )}
      >
        <div className={cn("flex items-center justify-between", collapsed && "justify-center")}>
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-xs font-bold text-sidebar-foreground select-none">
              {initials}
            </div>
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
          {!collapsed && (
            <button
              title="Sign Out"
              type="button"
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors p-1 rounded-md hover:bg-sidebar-accent group cursor-pointer"
              onClick={async () => {
                await logout();
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
