"use client";

import EntityManagement from "@/components/EntityManagement";
import { entities } from "@/lib/entityConfig";
import LeadsLoading from "./loading";

export default function Page() {
  return <EntityManagement config={entities["leads"]} loadingFallback={<LeadsLoading />} />;
}
