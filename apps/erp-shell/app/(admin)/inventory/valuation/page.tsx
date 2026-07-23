"use client";

import { BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InventoryValuation() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-[var(--shell-muted)]">
      <BarChart2 className="h-16 w-16 opacity-30" />
      <h2 className="font-heading text-lg font-semibold text-[var(--shell-foreground)]">Inventory Valuation</h2>
      <p className="text-sm max-w-md text-center">
        Inventory valuation reports are coming soon.
      </p>
      <Button variant="outline" size="sm" onClick={() => window.history.back()}>Go Back</Button>
    </div>
  );
}
