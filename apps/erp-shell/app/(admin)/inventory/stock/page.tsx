"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Stock Movements
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Track all stock inflows, outflows, and adjustments
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
          <Input placeholder="Search by product ID..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {["", "in", "out", "adjustment"].map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(t)}
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

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-[--shell-muted]">
              <p className="text-sm">No stock movements found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Product ID</TableHead>
                  <TableHead className="text-right">Warehouse ID</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="max-w-xs">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs text-[--shell-muted]">
                      {m.created_at.split("T")[0]}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: typeColors[m.type], color: typeColors[m.type] }}
                      >
                        {m.type === "in" && <ArrowDown className="mr-0.5 h-3 w-3 inline" />}
                        {m.type === "out" && <ArrowUp className="mr-0.5 h-3 w-3 inline" />}
                        {typeLabels[m.type] || m.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-right">#{m.product_id}</TableCell>
                    <TableCell className="font-mono text-sm text-right">#{m.warehouse_id}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{m.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted] max-w-xs truncate">{m.notes ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
