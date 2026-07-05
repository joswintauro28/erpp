"use client";

import { useState, useMemo } from "react";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import type { StockAdjustment } from "@/types/inventory";

const statusColors: Record<string, string> = {
  approved: "var(--shell-success)",
  draft: "var(--chart-4)",
  rejected: "var(--shell-danger)",
};

export default function StockAdjustments() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filtered = useMemo(() => {
    let res = adjustments;
    if (statusFilter) res = res.filter((a) => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(
        (a) =>
          a.product_name.toLowerCase().includes(q) ||
          a.sku.toLowerCase().includes(q) ||
          a.reason.toLowerCase().includes(q) ||
          a.reference.toLowerCase().includes(q)
      );
    }
    return res;
  }, [adjustments, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Stock Adjustments
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Inventory corrections and adjustments
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Adjustment
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
          <Input placeholder="Search adjustments..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {["", "approved", "draft", "rejected"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="text-xs capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s || "All"}
            </Button>
          ))}
        </div>
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
                <TableHead>Reason</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{a.date}</TableCell>
                  <TableCell>
                    <Badge variant={a.adjustment_type === "Addition" ? "default" : "secondary"} className="text-xs">
                      {a.adjustment_type === "Addition" ? "+" : "-"} {a.adjustment_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{a.product_name}</TableCell>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{a.sku}</TableCell>
                  <TableCell className="font-mono text-sm text-right">{a.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-[--shell-muted] max-w-xs truncate">{a.reason}</TableCell>
                  <TableCell className="text-xs">{a.warehouse}</TableCell>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{a.reference}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize" style={{ borderColor: statusColors[a.status], color: statusColors[a.status] }}>
                      {a.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
