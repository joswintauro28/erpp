"use client";

import Dashboard from "@/features/dashboard/Dashboard";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  return <Dashboard user={user} />;
}
