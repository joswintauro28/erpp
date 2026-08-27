"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AIAssistant() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-[var(--shell-muted)]">
      <Sparkles className="h-16 w-16 opacity-30" />
      <h2 className="font-heading text-lg font-semibold text-[var(--shell-foreground)]">AI Assistant</h2>
      <p className="text-sm max-w-md text-center">
        AI-powered insights and recommendations are coming soon. This feature will help you analyze data, draft responses, and get smart suggestions.
      </p>
      <Button variant="outline" size="sm" onClick={() => window.history.back()}>Go Back</Button>
    </div>
  );
}
