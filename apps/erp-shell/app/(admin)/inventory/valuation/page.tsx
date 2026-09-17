"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart2, RotateCw, Download, TrendingUp, TrendingDown, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader, SectionHeading, KpiCard, EmptyState, handleError } from "@datavex/ui-theme";
import { api } from "@/services/api";
import { money } from "@/utils/format";
import { useSearch, useExport } from "@/hooks";

interface ValuationItem {
  id: number;
  product_name: string;
  sku: string;
  category: string;
  total_quantity: number;
  cost_price: number;
  price: number;
  total_cost: number;
  total_value: number;
  margin: number;
  warehouse_count: number;
}

export default function InventoryValuationPage() {
  const [items, setItems] = useState<ValuationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Aggregate stock levels with product costs for valuation
      const [products, stockLevels] = await Promise.all([
        api.get<any[]>("/products"),
        api.get<any[]>("/stock"),
      ]);

      const stockMap = new Map<number, number>();
      stockLevels.forEach((s: any) => {
        stockMap.set(s.product_id, (stockMap.get(s.product_id) || 0) + s.quantity);
      });

      const valuation: ValuationItem[] = products
        .filter((p: any) => p.track_inventory)
        .map((p: any) => {
          const qty = stockMap.get(p.id) || 0;
          const totalCost = qty * (p.cost_price || 0);
          const totalValue = qty * (p.price || 0);
          const margin = totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;
          return {
            id: p.id,
            product_name: p.name,
            sku: p.sku || "—",
            category: p.category || "General",
            total_quantity: qty,
            cost_price: p.cost_price || 0,
            price: p.price || 0,
            total_cost: totalCost,
            total_value: totalValue,
            margin,
            warehouse_count: 1,
          };
        })
        .filter((v: ValuationItem) => v.total_quantity > 0);

      setItems(valuation);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { search, setSearch, filtered } = useSearch(items, {
    keys: ["product_name", "sku", "category"],
  });

  const { exportCSV } = useExport();

  const summary = useMemo(() => ({
    totalQty: items.reduce((s, i) => s + i.total_quantity, 0),
    totalCost: items.reduce((s, i) => s + i.total_cost, 0),
    totalValue: items.reduce((s, i) => s + i.total_value, 0),
    avgMargin: items.length > 0 ? items.reduce((s, i) => s + i.margin, 0) / items.length : 0,
    skuCount: items.length,
  }), [items]);

  if (loading) return <div className="flex h-full items-center justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        title="Inventory Valuation"
        subtitle="Analyze inventory at cost and retail value with margin analysis across your product catalog."
        badge="Inventory Center"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCSV(filtered, [
              { header: "Product", accessor: "product_name" },
              { header: "SKU", accessor: "sku" },
              { header: "Category", accessor: "category" },
              { header: "Qty", accessor: "total_quantity" },
              { header: "Unit Cost", accessor: "cost_price", format: (v) => money(v as number) },
              { header: "Unit Price", accessor: "price", format: (v) => money(v as number) },
              { header: "Total Cost", accessor: "total_cost", format: (v) => money(v as number) },
              { header: "Total Value", accessor: "total_value", format: (v) => money(v as number) },
              { header: "Margin %", accessor: "margin", format: (v) => `${(v as number).toFixed(1)}%` },
            ], "inventory-valuation")}
          >
            <Download size={14} className="mr-1.5" /> Export
          </Button>
        }
      />

      <section>
        <SectionHeading label="Valuation Summary" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <KpiCard label="SKUs in Stock" value={summary.skuCount} subtitle="Tracked products" icon={BarChart2} color="var(--chart-1)" index={0} />
          <KpiCard label="Total Units" value={summary.totalQty} subtitle="Across warehouses" icon={BarChart2} color="var(--chart-2)" index={1} />
          <KpiCard label="At Cost" value={money(summary.totalCost)} subtitle="Total cost basis" icon={TrendingDown} color="var(--chart-3)" index={2} />
          <KpiCard label="At Retail" value={money(summary.totalValue)} subtitle="Total selling value" icon={TrendingUp} color="var(--chart-4)" index={3} />
          <KpiCard label="Avg Margin" value={`${summary.avgMargin.toFixed(1)}%`} subtitle="Profit margin" icon={BarChart2} color="var(--chart-5)" index={4} />
        </div>
      </section>

      <section>
        <SectionHeading label="Product Valuation Detail" />
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search products..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <span className="text-xs text-muted-foreground">{filtered.length} products</span>
            </div>
            {filtered.length === 0 ? (
              <EmptyState icon={BarChart2} title="No inventory valuation data" description="Valuation data appears here once products have stock." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Product</TableHead>
                    <TableHead className="text-[11px]">SKU</TableHead>
                    <TableHead className="text-[11px]">Category</TableHead>
                    <TableHead className="text-[11px] text-right">Qty</TableHead>
                    <TableHead className="text-[11px] text-right">Unit Cost</TableHead>
                    <TableHead className="text-[11px] text-right">Unit Price</TableHead>
                    <TableHead className="text-[11px] text-right">Total Cost</TableHead>
                    <TableHead className="text-[11px] text-right">Total Value</TableHead>
                    <TableHead className="text-[11px] text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{item.sku}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{item.category}</Badge></TableCell>
                      <TableCell className="text-right text-sm font-mono">{item.total_quantity}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{money(item.cost_price)}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{money(item.price)}</TableCell>
                      <TableCell className="text-right text-sm font-mono font-medium">{money(item.total_cost)}</TableCell>
                      <TableCell className="text-right text-sm font-mono font-medium">{money(item.total_value)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.margin >= 30 ? "secondary" : item.margin >= 15 ? "default" : "destructive"} className="text-[10px]">
                          {item.margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold border-t-2">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right font-mono">{summary.totalQty}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right font-mono">{money(summary.totalCost)}</TableCell>
                    <TableCell className="text-right font-mono">{money(summary.totalValue)}</TableCell>
                    <TableCell className="text-right">{summary.avgMargin.toFixed(1)}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
