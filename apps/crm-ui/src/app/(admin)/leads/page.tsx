"use client";

import { useState } from "react";
import LeadManagement from "@/features/leads/LeadManagement";
import LeadDiscovery from "@/features/lead-generation/LeadDiscovery";

export default function LeadsPage() {
  const [view, setView] = useState("Leads");
  const [discoveryQuery, setDiscoveryQuery] = useState<string | null>(null);

  if (view === "LeadDiscovery") {
    return (
      <LeadDiscovery 
        initialQuery={discoveryQuery} 
        onImportComplete={() => setView("Leads")} 
      />
    );
  }

  return (
    <LeadManagement 
      setCurrentView={(v) => {
        if (v === "LeadDiscovery") setView("LeadDiscovery");
      }} 
      setDiscoveryQuery={setDiscoveryQuery} 
    />
  );
}
