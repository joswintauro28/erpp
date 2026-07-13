"use client";

import Dashboard from "@/components/Dashboard";
import DashboardLoading from "./loading";

export default function Page() {
  return <Dashboard loadingFallback={<DashboardLoading />} />;
}