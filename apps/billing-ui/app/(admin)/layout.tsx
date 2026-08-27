"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@datavex/ui-theme";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ConfirmProvider>
      <ToastProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <Sidebar collapsed={sidebarCollapsed} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />
            <a href="#main-content" className="skip-to-content">Skip to content</a>
          <main id="main-content" className="flex-1 overflow-y-auto bg-[--shell-bg] p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </ConfirmProvider>
  );
}
