"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ArrowUpDown, ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";

interface StockMovement {
  id: number; date: string; product_name: string;
  movement_type: "In" | "Out"; quantity: number; notes: string | null;
}

export default function StockMovements() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"In" | "Out" | "">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any[]>("/dashboard/inventory/movements")
      .then((data) => setStockMovements(data.map((m) => ({
        id: m.id,
        date: m.created_at ? m.created_at.split("T")[0] : "",
        product_name: m.product_name ?? `Product #${m.product_id}`,
        movement_type: (m.type === "in" ? "In" : m.type === "out" ? "Out" : "In") as "In" | "Out",
        quantity: m.quantity,
        notes: m.notes ?? null,
      }))))
      .catch(() => setStockMovements([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let res = stockMovements;
    if (typeFilter) res = res.filter((m) => m.movement_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter((m) => m.product_name.toLowerCase().includes(q));
    }
    return [...res].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [search, typeFilter, sortDir, stockMovements]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[--shell-muted]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Stock Movements
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Track all stock inflows and outflows
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
          <Input placeholder="Search movements..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          <Button variant={typeFilter === "" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("")}>All</Button>
          <Button variant={typeFilter === "In" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("In")}>
            <ArrowDown className="mr-1 h-3 w-3 text-[--shell-success]" /> In
          </Button>
          <Button variant={typeFilter === "Out" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("Out")}>
            <ArrowUp className="mr-1 h-3 w-3 text-[--shell-action]" /> Out
          </Button>
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
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="max-w-xs">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs text-[--shell-muted]">{m.date}</TableCell>
                    <TableCell>
                      <Badge variant={m.movement_type === "In" ? "default" : "secondary"} className="text-xs">
                        {m.movement_type === "In" ? <ArrowDown className="mr-0.5 h-3 w-3 inline" /> : <ArrowUp className="mr-0.5 h-3 w-3 inline" />}
                        {m.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{m.product_name}</TableCell>
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
