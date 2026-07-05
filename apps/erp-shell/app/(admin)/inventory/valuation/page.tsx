"use client";

import { useMemo, useState } from "react";
import { Search, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { money } from "@/utils/format";
import type { ValuationRow } from "@/types/inventory";

export default function InventoryValuation() {
  const [search, setSearch] = useState("");
  const [valuationData, setValuationData] = useState<ValuationRow[]>([]);

  const filtered = useMemo(() => {
    if (!search.trim()) return valuationData;
    const q = search.toLowerCase();
    return valuationData.filter(
      (v) =>
        v.product_name.toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q)
    );
  }, [search, valuationData]);

  const totalValue = valuationData.reduce((s, v) => s + v.total_value, 0);
  const totalQty = valuationData.reduce((s, v) => s + v.quantity, 0);

  const categorySummary = useMemo(() => {
    const map = new Map<string, { qty: number; value: number }>();
    valuationData.forEach((v) => {
      const cur = map.get(v.category) || { qty: 0, value: 0 };
      cur.qty += v.quantity;
      cur.value += v.total_value;
      map.set(v.category, cur);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].value - a[1].value);
  }, [valuationData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Inventory Valuation
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Stock value summary at weighted average cost
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{money(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Total Units</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{totalQty.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Product Types</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{valuationData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Categories</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{categorySummary.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {categorySummary.map(([cat, info]) => (
          <Card key={cat}>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">{cat}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <p className="font-mono text-sm font-semibold text-[--shell-foreground]">{money(info.value)}</p>
              <p className="text-xs text-[--shell-muted]">{info.qty.toLocaleString()} units</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b border-[--shell-border] p-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
              <Input placeholder="Search by name, SKU, or category..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{v.product_name}</TableCell>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{v.sku}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{v.category}</Badge></TableCell>
                  <TableCell className="font-mono text-sm text-right">{v.quantity.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-sm text-right">{money(v.unit_cost)}</TableCell>
                  <TableCell className="font-mono text-sm text-right font-semibold">{money(v.total_value)}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-xs text-[--shell-muted]">{((v.total_value / totalValue) * 100).toFixed(1)}%</span>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold">
                <TableCell colSpan={3} className="text-sm text-[--shell-muted]">Total</TableCell>
                <TableCell className="font-mono text-sm text-right">{totalQty.toLocaleString()}</TableCell>
                <TableCell />
                <TableCell className="font-mono text-sm text-right">{money(totalValue)}</TableCell>
                <TableCell className="text-right text-xs text-[--shell-muted]">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
