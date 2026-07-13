"use client";

import EntityManagement from "@/components/EntityManagement";
import { entities } from "@/lib/entityConfig";
import CustomersLoading from "./loading";

export default function Page() {
  return <EntityManagement config={entities["customers"]} loadingFallback={<CustomersLoading />} />;
}
