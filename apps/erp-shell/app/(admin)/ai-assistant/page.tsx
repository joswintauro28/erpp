"use client";

import { AIChat } from "@datavex/ui-theme";

export default function AIAssistantPage() {
  return (
    <div className="h-[calc(100vh-7rem)]">
      <AIChat module="admin" />
    </div>
  );
}
