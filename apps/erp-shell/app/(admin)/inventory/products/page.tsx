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
import ProductsLoading from "./loading";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiProduct[]>("/products")
      .then(setApiProducts)
      .catch(() => setApiProducts([]))
      .finally(() => setLoading(false));
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

  if (loading) {
    return <ProductsLoading />;
  }

  return (
    <div className="relative space-y-8">
      {/* Brand Sweep Line */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[--shell-brand] shimmer-glow" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Products
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Manage inventory products and pricing
          </p>
        </div>
        <Button size="sm" className="bg-[--shell-brand] hover:bg-[--shell-brand]/90 text-white">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Product
        </Button>
      </div>

      {/* Product Overview KPIs */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-medium uppercase tracking-[0.12em] text-[--shell-muted]">
            Product Overview
          </h2>
          <div className="h-px flex-1 bg-[--shell-border]/20" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Total Products", value: String(apiProducts.length),
              subtitle: `${categories.length} categories`,
              icon: Package, color: "var(--shell-brand)",
            },
            {
              label: "Active", value: String(activeCount),
              subtitle: `${apiProducts.length - activeCount} inactive`,
              icon: Tag, color: "var(--shell-accent)",
            },
            {
              label: "Inventory Tracked", value: String(trackedCount),
              subtitle: `${serialTrackedCount} serial-tracked`,
              icon: Barcode, color: "var(--shell-accent)",
            },
            {
              label: "Costing Method", value: "FIFO",
              subtitle: "Default costing",
              icon: Layers, color: "var(--shell-brand)",
            },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[--shell-border] bg-[--shell-surface] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">
                  {kpi.label}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[--shell-border]/40 bg-[--shell-surface-alt]">
                  <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                </div>
              </div>
              <span className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">
                {kpi.value}
              </span>
              <span className="text-xs text-[--shell-muted]">{kpi.subtitle}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Product Registry */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-medium uppercase tracking-[0.12em] text-[--shell-muted]">
            Product Registry
          </h2>
          <div className="h-px flex-1 bg-[--shell-border]/20" />
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
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

        <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
                <Package className="h-12 w-12" />
                <p className="text-base font-medium text-[--shell-foreground]">
                  {apiProducts.length === 0 ? "No products yet" : "No products match your search"}
                </p>
                <p className="text-sm">
                  {apiProducts.length === 0
                    ? "Add your first product to start tracking inventory."
                    : "Try adjusting your search or category filter."}
                </p>
                {apiProducts.length === 0 && (
                  <Button size="sm" className="mt-2 bg-[--shell-brand] hover:bg-[--shell-brand]/90 text-white">
                    <Plus className="mr-1 h-4 w-4" /> Add Product
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">SKU</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Product Name</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Category</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Unit</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Price</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Cost</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right">Tax</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Tracking</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted]">Status</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[--shell-muted] text-right w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} className="hover:bg-[--shell-surface-alt]/30 transition-colors">
                      <TableCell>
                        <span className="font-mono text-xs text-[--shell-muted]">{p.sku ?? "—"}</span>
                      </TableCell>
                      <TableCell className="font-medium text-[--shell-foreground]">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant={categoryVariant(p.category ?? "")} className="uppercase text-[10px]">
                          {p.category ?? "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[--shell-muted] text-xs">{p.unit}</TableCell>
                      <TableCell className="font-mono text-sm text-right text-[--shell-foreground]">
                        {money(p.price)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-right text-[--shell-muted]">
                        {money(p.cost_price)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right text-[--shell-muted]">
                        {p.tax_rate}%
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {p.track_inventory && (
                            <Badge variant="default" className="text-[10px] bg-[--shell-brand]/10 text-[--shell-brand] border-[--shell-brand]/20">Stock</Badge>
                          )}
                          {p.uses_serial_tracking && (
                            <Badge variant="secondary" className="text-[10px] bg-[--shell-accent]/10 text-[--shell-accent] border-[--shell-accent]/20">Serial</Badge>
                          )}
                          {p.uses_batch_tracking && (
                            <Badge variant="outline" className="text-[10px]">Batch</Badge>
                          )}
                          {!p.track_inventory && !p.uses_serial_tracking && !p.uses_batch_tracking && (
                            <span className="text-xs text-[--shell-muted]">None</span>
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
                          <Button variant="ghost" size="icon-sm" className="hover:bg-[--shell-surface-alt]">
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
