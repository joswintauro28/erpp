"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  WifiOff,
  Loader2,
  ClipboardCheck,
} from "lucide-react";

import { cn } from "../../lib/utils";
import { useNotifications, type LiveNotification } from "./notification-provider";

// Semantic tints from --shell-* status tokens (DESIGN.md §7.3, D-11)
const TYPE_META: Record<string, { icon: typeof Info; cls: string }> = {
  INFO: { icon: Info, cls: "bg-[var(--shell-info)]/10 text-[var(--shell-info)] border-[var(--shell-info)]/20" },
  SUCCESS: { icon: CheckCircle2, cls: "bg-[var(--shell-success)]/10 text-[var(--shell-success)] border-[var(--shell-success)]/20" },
  WARNING: { icon: AlertTriangle, cls: "bg-[var(--shell-warning)]/10 text-[var(--shell-warning)] border-[var(--shell-warning)]/20" },
  ERROR: { icon: XCircle, cls: "bg-[var(--shell-danger)]/10 text-[var(--shell-danger)] border-[var(--shell-danger)]/20" },
  ACTION: { icon: ClipboardCheck, cls: "bg-[var(--shell-brand)]/10 text-[var(--shell-brand)] border-[var(--shell-brand)]/20" },
};

function ModuleBadge({ source }: { source: string }) {
  const cls =
    source === "INVENTORY"
      ? "bg-[var(--shell-warning)]/10 text-[var(--shell-warning)]"
      : source === "BILLING"
        ? "bg-[var(--shell-success)]/10 text-[var(--shell-success)]"
        : source === "CRM"
          ? "bg-[var(--shell-info)]/10 text-[var(--shell-info)]"
          : "bg-muted text-muted-foreground";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", cls)}>
      {source}
    </span>
  );
}

export function NotificationBell({
  className,
  onOpenChange,
}: {
  className?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const { notifications, unreadCount, connected, markRead, markAllRead, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    onOpenChange?.(next);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        ref={bellRef}
        type="button"
        aria-label={open ? "Close notifications" : "Open notifications"}
        title="Notifications"
        className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground cursor-pointer"
        onClick={toggle}
      >
        {unreadCount > 0 ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={containerRef}
          className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Notifications</span>
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                  connected ? "bg-[var(--shell-success)]/10 text-[var(--shell-success)]" : "bg-muted text-muted-foreground"
                )}
              >
                {connected ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                {connected ? "Live" : "Offline"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Refresh notifications"
                className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                onClick={handleRefresh}
              >
                <Loader2 className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
                  onClick={markAllRead}
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-10 text-muted-foreground">
                <BellOff className="h-6 w-6" />
                <p className="text-xs">All caught up — no notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={() => markRead(n.id)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: LiveNotification;
  onRead: () => void;
}) {
  const meta = TYPE_META[notification.type] || TYPE_META.INFO;
  const Icon = meta.icon;
  const unread = !notification.read_status;

  return (
    <button
      type="button"
      onClick={onRead}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border/60 px-3 py-2.5 text-left text-xs transition-colors hover:bg-muted/50 cursor-pointer last:border-b-0",
        unread && "bg-accent/5"
      )}
    >
      <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", meta.cls)}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className={cn("truncate text-foreground", unread ? "font-semibold" : "font-medium")}>
            {notification.title}
          </p>
          <ModuleBadge source={notification.module_source} />
        </div>
        <p className="mt-0.5 line-clamp-2 text-muted-foreground">{notification.message}</p>
        <div className="mt-1 flex items-center gap-2">
          {notification.created_at && (
            <span className="text-[10px] text-muted-foreground/70">
              {new Date(notification.created_at).toLocaleString()}
            </span>
          )}
          {notification.entity_ref && (
            <span className="font-mono text-[10px] text-primary/80">{notification.entity_ref}</span>
          )}
        </div>
      </div>
      {unread && (
        <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      )}
      {!unread && <Check className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/50" />}
    </button>
  );
}

export { TYPE_META };
