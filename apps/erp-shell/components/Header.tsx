"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, BellOff, Search, PanelLeftOpen, PanelLeftClose, AlertTriangle, Clock, Package, CreditCard, UserPlus, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import type { Notification, NotificationResponse } from "@/types/notifications";

const NOTIF_ICONS: Record<string, typeof AlertTriangle> = {
  overdue_invoice: AlertTriangle,
  due_soon: Clock,
  low_stock: Package,
  recent_payments: CreditCard,
  new_clients: UserPlus,
};

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

export default function Header({ collapsed, onToggleSidebar }: { collapsed: boolean; onToggleSidebar: () => void }) {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const stored = localStorage.getItem("notif_read");
    return new Set(stored ? JSON.parse(stored) : []);
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const totalCount = notifications.reduce((s, n) => s + n.count, 0);
  const unreadCount = notifications.filter((n) => !readIds.has(n.type)).length;

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.get<NotificationResponse>("/notifications");
      setNotifications(data.notifications);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 120_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notifOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  useEffect(() => {
    localStorage.setItem("notif_read", JSON.stringify([...readIds]));
  }, [readIds]);

  const markAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.type)));
  };

  const markOneRead = (type: string) => {
    setReadIds((prev) => new Set([...prev, type]));
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between border-b border-border bg-background px-6 shadow-engineered">
      <span
        className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-[200%]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, var(--shell-accent) 25%, var(--shell-border) 50%, var(--shell-accent) 75%, transparent 100%)",
          animation: "pulse-sweep 3s ease-in-out infinite",
        }}
      />

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>

        <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground m-0">
          Command Center
        </h1>

        <span className="hidden rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-foreground sm:inline-block">
          Live
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoices, clients, products..."
            className="h-9 w-64 rounded-md border border-input bg-muted/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="relative">
          <Button
            ref={bellRef}
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setNotifOpen(!notifOpen)}
          >
            {totalCount > 0 ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>

          {notifOpen && (
            <div
              ref={dropdownRef}
              className="absolute right-0 top-full mt-2 w-80 rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <span className="text-xs font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                    onClick={markAllRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {loading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 py-8 text-muted-foreground">
                    <BellOff className="h-5 w-5" />
                    <p className="text-xs">All clear — no notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = NOTIF_ICONS[n.type] || Bell;
                    const isRead = readIds.has(n.type);
                    return (
                      <button
                        key={n.type}
                        type="button"
                        className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-xs transition-colors hover:bg-muted/50 cursor-pointer ${!isRead ? "bg-accent/5" : ""}`}
                        onClick={() => markOneRead(n.type)}
                      >
                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${SEVERITY_STYLES[n.severity]}`}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate ${!isRead ? "font-semibold" : ""}`}>{n.title}</p>
                          {!isRead && <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
