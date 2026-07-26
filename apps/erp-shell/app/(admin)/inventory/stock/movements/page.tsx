"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ArrowDown, ArrowUp, ArrowUpDown, ArrowRightLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import type { ApiStockMovement } from "@/types/inventory";
import StockMovementsLoading from "./loading";

const typeLabels: Record<string, string> = {
  in: "In",
  out: "Out",
  adjustment: "Adjustment",
};

const typeColors: Record<string, string> = {
  in: "var(--shell-success)",
  out: "var(--shell-action)",
  adjustment: "var(--chart-4)",
};

export default function StockMovements() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [movements, setMovements] = useState<ApiStockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get<ApiStockMovement[]>("/stock/movements")
      .then((data) => { if (!cancelled) setMovements(data); })
      .catch(() => { if (!cancelled) setMovements([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let res = movements;
    if (typeFilter) res = res.filter((m) => m.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter((m) => `#${m.product_id}`.includes(q));
    }
    return [...res].sort((a, b) => {
      const cmp = a.created_at.localeCompare(b.created_at);
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [movements, search, typeFilter, sortDir]);

  if (loading) {
    return <StockMovementsLoading />;
  }

  return (
    <div className="relative space-y-8">
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Stock Movements
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Track all stock inflows, outflows, and adjustments
          </p>
        </div>
      </div>

      {/* Filters */}
      <section>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
            <Input
              placeholder="Search by product ID..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {["", "in", "out", "adjustment"].map((t) => (
              <Button
                key={t}
                variant={typeFilter === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(t)}
                className="text-xs"
              >
                {t === "in" && <ArrowDown className="mr-1 h-3 w-3" />}
                {t === "out" && <ArrowUp className="mr-1 h-3 w-3" />}
                {t ? typeLabels[t] : "All"}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}>
            <ArrowUpDown className="mr-1.5 h-3 w-3" />
            {sortDir === "desc" ? "Newest" : "Oldest"}
          </Button>
        </div>

        <Card className="hover:shadow-md transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
                <ArrowRightLeft className="h-12 w-12" />
                <p className="text-base font-medium text-[var(--shell-foreground)]">
                  {movements.length === 0 ? "No stock movements yet" : "No movements match your search"}
                </p>
                <p className="text-sm">
                  Stock movements are logged automatically when stock is received, dispatched, or adjusted.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Date</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Type</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Product ID</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Warehouse ID</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Qty</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id} className="hover:bg-[var(--shell-surface-alt)]/30 transition-colors">
                      <TableCell className="font-mono text-xs text-[var(--shell-muted)]">
                        {m.created_at.split("T")[0]}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{ borderColor: typeColors[m.type], color: typeColors[m.type] }}
                        >
                          {typeLabels[m.type] || m.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-right text-[var(--shell-foreground)]">
                        #{m.product_id}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-right text-[var(--shell-foreground)]">
                        #{m.warehouse_id}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-right text-[var(--shell-foreground)]">
                        {m.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--shell-muted)] max-w-xs truncate">
                        {m.notes ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}