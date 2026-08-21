"use client";

import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Batches() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-[var(--shell-muted)]">
      <Boxes className="h-16 w-16 opacity-30" />
      <h2 className="font-heading text-lg font-semibold text-[var(--shell-foreground)]">Batch Tracking</h2>
      <p className="text-sm max-w-md text-center">
        Batch and expiry tracking is coming soon.
      </p>
      <Button variant="outline" size="sm" onClick={() => window.history.back()}>Go Back</Button>
    </div>
  );
}
