"use client";

import { useState, useMemo } from "react";
import { Search, ArrowUpDown, ArrowDown, ArrowUp, Warehouse } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { StockMovement } from "@/types/inventory";

export default function StockMovements() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"In" | "Out" | "">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  const filtered = useMemo(() => {
    let res = stockMovements;
    if (typeFilter) res = res.filter((m) => m.movement_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(
        (m) =>
          m.product_name.toLowerCase().includes(q) ||
          m.sku.toLowerCase().includes(q) ||
          m.reference.toLowerCase().includes(q) ||
          m.warehouse.toLowerCase().includes(q)
      );
    }
    return [...res].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [search, typeFilter, sortDir]);

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="max-w-xs">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{m.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant={m.movement_type === "In" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {m.movement_type === "In" ? <ArrowDown className="mr-0.5 h-3 w-3 inline" /> : <ArrowUp className="mr-0.5 h-3 w-3 inline" />}
                      {m.movement_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{m.product_name}</TableCell>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{m.sku}</TableCell>
                  <TableCell className="font-mono text-sm text-right">{m.quantity.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-[--shell-muted]">{m.reference_type}</span>
                    <span className="ml-1 font-mono text-xs">{m.reference}</span>
                  </TableCell>
                  <TableCell className="text-xs">{m.warehouse}</TableCell>
                  <TableCell className="text-xs text-[--shell-muted] max-w-xs truncate">{m.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
