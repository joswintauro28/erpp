"use client";

import EntityManagement from "@/components/EntityManagement";
import { entities } from "@/lib/entityConfig";
import EntityManagementLoading from "@/components/EntityManagementLoading";

export default function Page() {
  return <EntityManagement config={entities["follow-ups"]} loadingFallback={<EntityManagementLoading />} />;
}
