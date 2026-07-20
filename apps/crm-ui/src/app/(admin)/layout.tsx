"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import Sidebar from "@/features/shared/Sidebar";
import Header from "@/features/shared/Header";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, logout, user } = useAuth();
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

  // Handle logout from headers/sidebars
  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="app-container flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="main-content flex flex-1 flex-col overflow-hidden">
        <Header 
          currentView="" 
          user={user}
          onLogout={handleLogout}
          onGoToAdmin={() => {}}
        />
        <main className="flex-1 overflow-y-auto bg-background p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
