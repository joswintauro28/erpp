"use client";

import EntityManagement from "@/components/EntityManagement";
import { entities } from "@/lib/entityConfig";

export default function Page() {
  return <EntityManagement config={entities["sales-orders"]} />;
}
