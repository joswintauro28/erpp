"use client";

import Sidebar from "@/layouts/Sidebar";
import Header from "@/layouts/Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import "@/layouts/DashboardLayout.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="layout">
        <Sidebar />
        <div className="layout__main">
          <Header />
          <main className="layout__content">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
