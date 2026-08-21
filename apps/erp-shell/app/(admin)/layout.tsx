"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ToastContainer from "@/components/ToastContainer";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessToken } from "@datavex/auth-middleware";
import { ConfirmProvider } from "@datavex/ui-theme";

const BILLING_URL = process.env.NEXT_PUBLIC_BILLING_APP_URL || "http://localhost:3002";
const CRM_URL = process.env.NEXT_PUBLIC_CRM_APP_URL || "http://localhost:3001";
const INVENTORY_URL = process.env.NEXT_PUBLIC_INVENTORY_APP_URL || "http://localhost:3004";

const WORKSTATION_ROUTES: Record<string, string> = {
  "Sales Executive": `${CRM_URL}/dashboard`,
  "Accountant": `${BILLING_URL}/dashboard`,
  "Auditor": `${BILLING_URL}/dashboard`,
  "Inventory Manager": `${INVENTORY_URL}/dashboard`,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const target = WORKSTATION_ROUTES[user?.role ?? ""];
    if (target) {
      const token = getAccessToken();
      window.location.href = token ? `${target}?token=${token}` : target;
    }
  }, [mounted, loading, isAuthenticated, user?.role, router]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--shell-header)]">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const sidebarWidth = sidebarCollapsed ? "64px" : "var(--sidebar-width)";

  return (
    <ConfirmProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />
          <main className="flex-1 overflow-y-auto bg-[var(--shell-bg)] p-6 lg:p-8">
            {children}
          </main>
        </div>
        <ToastContainer />
      </div>
    </ConfirmProvider>
  );
}
