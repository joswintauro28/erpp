"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  ShoppingCart,
  ClipboardList,
  UserSquare2,
  FolderKanban,
  BarChart3,
  Sparkles,
  Search,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { NavItem, NavGroup } from "@/types/navigation";

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Sales",
    icon: Target,
    children: [
      { name: "Leads", href: "/leads", icon: Users },
      { name: "Opportunities", href: "/opportunities", icon: Target },
      { name: "Requirements", href: "/requirements", icon: ClipboardList },
      { name: "Quotes", href: "/quotes", icon: FileText },
      { name: "Sales Orders", href: "/sales-orders", icon: ShoppingCart },
    ],
  },
  {
    name: "Core",
    icon: UserSquare2,
    children: [
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Contacts", href: "/contacts", icon: UserSquare2 },
      { name: "Documents", href: "/documents", icon: FolderKanban },
    ],
  },
  {
    name: "Intelligence",
    icon: BarChart3,
    children: [
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "AI Assistant", href: "/ai-assistant", icon: Sparkles },
      { name: "Lead Discovery", href: "/lead-discovery", icon: Search },
    ],
  },
];

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname.startsWith(href);
}

function groupActive(group: NavGroup, pathname: string): boolean {
  return group.children.some((c) => isActive(c.href, pathname));
}

function activeChild(group: NavGroup, pathname: string): string | null {
  for (const child of group.children) {
    if (isActive(child.href, pathname)) return child.href;
  }
  return null;
}

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [expanded, setExpanded] = useState<string[]>(["Sales", "Core", "Intelligence"]);

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
    const flyoutEstimatedHeight = group.children.length * 32 + 40;
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
            CRM Center
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden px-3 py-4 custom-scrollbar">
        {navItems.map((item, index) =>
          isGroup(item) ? (
            <div
              key={`group-${item.name}-${index}`}
              className="pt-2 first:pt-0"
              onMouseEnter={(e) => handleGroupMouseEnter(item, e)}
              onMouseLeave={handleGroupMouseLeave}
            >
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
                        groupActive(item, pathname) ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/40"
                      )}
                    />
                  )}
                </button>

                {!collapsed && expanded.includes(item.name) && (
                  <div className="pl-4.5 mt-1 space-y-1 border-l border-sidebar-border ml-4">
                    {item.children.map((child) => {
                      const childActive = activeChild(item, pathname) === child.href;
                      if (child.href === "#") {
                        return (
                          <span
                            key={child.name}
                            className={cn(
                              "relative flex items-center gap-3 rounded-md px-2.5 py-1.5 text-xs transition-all duration-200 group/link",
                              child.soon && "opacity-60",
                              childActive
                                ? "text-sidebar-primary-foreground font-medium bg-sidebar-primary/80"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <child.icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors duration-200", childActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/40 group-hover/link:text-sidebar-accent-foreground")} />
                            <span>{child.name}</span>
                            {child.soon && <span className="ml-auto rounded-full border border-sidebar-primary/30 bg-sidebar-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sidebar-primary">Soon</span>}
                          </span>
                        );
                      }
                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          title={child.name}
                          className={cn(
                            "relative flex items-center gap-3 rounded-md px-2.5 py-1.5 text-xs transition-all duration-200 group/link",
                            child.soon && "opacity-60",
                            childActive
                              ? "text-sidebar-primary-foreground font-medium bg-sidebar-primary/80"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <child.icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors duration-200", childActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/40 group-hover/link:text-sidebar-accent-foreground")} />
                          <span>{child.name}</span>
                          {child.soon && <span className="ml-auto rounded-full border border-sidebar-primary/30 bg-sidebar-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sidebar-primary">Soon</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
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
            {hoveredGroup.children.map((child) => {
              const childActive = isActive(child.href, pathname);
              if (child.href === "#") {
                return (
                  <span
                    key={`fly-${child.name}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs transition-all duration-150 group/flylink",
                      child.soon && "opacity-60",
                      childActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <child.icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors", childActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/45 group-hover/flylink:text-sidebar-accent-foreground")} />
                    <span>{child.name}</span>
                    {child.soon && <span className="ml-auto rounded-full border border-sidebar-primary/30 bg-sidebar-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sidebar-primary">Soon</span>}
                  </span>
                );
              }
              return (
                <Link
                  key={`fly-${child.name}`}
                  href={child.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs transition-all duration-150 group/flylink",
                    child.soon && "opacity-60",
                    childActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <child.icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors", childActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/45 group-hover/flylink:text-sidebar-accent-foreground")} />
                  <span>{child.name}</span>
                  {child.soon && <span className="ml-auto rounded-full border border-sidebar-primary/30 bg-sidebar-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sidebar-primary">Soon</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

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
