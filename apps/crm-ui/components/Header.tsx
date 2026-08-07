"use client";

import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/notification-bell";

export default function Header({
  collapsed,
  onToggleSidebar,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between border-b border-border bg-background px-6 shadow-engineered">
      <span
        className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-[200%]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--shell-accent) 25%, var(--shell-border) 50%, var(--shell-accent) 75%, transparent 100%)",
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
          CRM Center
        </h1>

        <span className="hidden rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-foreground sm:inline-block">
          Live
        </span>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
      </div>
    </header>
  );
}
