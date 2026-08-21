"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StockAdjustments() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-[var(--shell-muted)]">
      <SlidersHorizontal className="h-16 w-16 opacity-30" />
      <h2 className="font-heading text-lg font-semibold text-[var(--shell-foreground)]">Stock Adjustments</h2>
      <p className="text-sm max-w-md text-center">
        Stock adjustment management is coming soon. Adjustments are currently logged as stock movements.
      </p>
      <Button variant="outline" size="sm" onClick={() => window.history.back()}>Go Back</Button>
    </div>
  );
}
