"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search, Package, Plus, Pencil, PackageCheck, Layers,
  Barcode, Tag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { money } from "@/utils/format";
import { api } from "@/services/api";
import type { ApiProduct } from "@/types/inventory";

const categoryVariant = (cat: string) => {
  const c = cat.toLowerCase();
  if (c === "raw material" || c === "raw" || c === "raw materials") return "default" as const;
  if (c === "finished good" || c === "finished") return "secondary" as const;
  if (c === "service") return "destructive" as const;
  return "outline" as const;
};

export default function Products() {
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    api.get<ApiProduct[]>("/products")
      .then(setApiProducts)
      .catch(() => setApiProducts([]));
  }, []);

  const categories = useMemo(
    () => [...new Set(apiProducts.map((p) => p.category ?? "Uncategorized"))].sort(),
    [apiProducts],
  );

  const filtered = useMemo(() => {
    let res = apiProducts;
    if (categoryFilter) res = res.filter((p) => (p.category ?? "Uncategorized") === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").includes(q),
      );
    }
    return res;
  }, [apiProducts, search, categoryFilter]);

  const activeCount = apiProducts.filter((p) => p.is_active).length;
  const trackedCount = apiProducts.filter((p) => p.track_inventory).length;
  const serialTrackedCount = apiProducts.filter((p) => p.uses_serial_tracking).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Products
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage inventory products and pricing
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Product
        </Button>
      </div>

      {/* Product Overview KPIs */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-muted-foreground">
            Product Overview
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Total Products", value: String(apiProducts.length),
              subtitle: `${categories.length} categories`,
              icon: Package, color: "var(--chart-1)",
            },
            {
              label: "Active", value: String(activeCount),
              subtitle: `${apiProducts.length - activeCount} inactive`,
              icon: Tag, color: "var(--chart-2)",
            },
            {
              label: "Inventory Tracked", value: String(trackedCount),
              subtitle: `${serialTrackedCount} serial-tracked`,
              icon: Barcode, color: "var(--chart-4)",
            },
            {
              label: "Costing Method", value: "FIFO",
              subtitle: "Default costing",
              icon: Layers, color: "var(--chart-3)",
            },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {kpi.label}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background">
                  <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                </div>
              </div>
              <span className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                {kpi.value}
              </span>
              <span className="text-xs text-muted-foreground">{kpi.subtitle}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Product Registry */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-muted-foreground">
            Product Registry
          </h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or barcode..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => v !== null && setCategoryFilter(v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="hover:shadow-md transition-shadow duration-200 border-border bg-card">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
                <Package className="h-12 w-12" />
                <p className="text-base font-medium text-foreground">
                  {apiProducts.length === 0 ? "No products yet" : "No products match your search"}
                </p>
                <p className="text-sm">
                  {apiProducts.length === 0
                    ? "Add your first product to start tracking inventory."
                    : "Try adjusting your search or category filter."}
                </p>
                {apiProducts.length === 0 && (
                  <Button size="sm" className="mt-2">
                    <Plus className="mr-1 h-4 w-4" /> Add Product
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">SKU</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Product Name</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Category</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Unit</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground text-right">Price</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground text-right">Cost</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground text-right">Tax</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Tracking</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground text-right w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">{p.sku ?? "—"}</span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant={categoryVariant(p.category ?? "")} className="uppercase text-[10px]">
                          {p.category ?? "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{p.unit}</TableCell>
                      <TableCell className="font-mono text-sm text-right text-foreground">
                        {money(p.price)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-right text-muted-foreground">
                        {money(p.cost_price)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right text-muted-foreground">
                        {p.tax_rate}%
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {p.track_inventory && (
                            <Badge variant="default" className="text-[10px]">Stock</Badge>
                          )}
                          {p.uses_serial_tracking && (
                            <Badge variant="secondary" className="text-[10px]">Serial</Badge>
                          )}
                          {p.uses_batch_tracking && (
                            <Badge variant="outline" className="text-[10px]">Batch</Badge>
                          )}
                          {!p.track_inventory && !p.uses_serial_tracking && !p.uses_batch_tracking && (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "outline"} className="text-[10px]">
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
