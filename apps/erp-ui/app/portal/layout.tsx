"use client";

import PortalProtectedRoute from "@/components/PortalProtectedRoute";
import ClientPortalLayout from "@/layouts/ClientPortalLayout";

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalProtectedRoute>
      <ClientPortalLayout>{children}</ClientPortalLayout>
    </PortalProtectedRoute>
  );
}
