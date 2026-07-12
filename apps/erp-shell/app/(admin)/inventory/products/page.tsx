"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Pencil, Power, PowerOff, Package, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { money } from "@/utils/format";
import { api } from "@/services/api";
import type { ApiProduct, ProductView } from "@/types/inventory";

export default function Products() {
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiProduct[]>("/products")
      .then(setApiProducts)
      .catch(() => setApiProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const products: ProductView[] = useMemo(() =>
    apiProducts.map((p) => ({
      id: p.id, name: p.name, sku: p.sku ?? "-", category: p.category ?? "Uncategorized",
      price: p.price ?? 0, cost: p.cost_price ?? 0, stock: p.stock ?? 0, unit: "pcs",
      reorder_level: p.low_stock_threshold ?? 0, hsn: "", is_active: true,
    })),
  [apiProducts]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);

  const filtered = useMemo(() => {
    let res = products;
    if (categoryFilter) res = res.filter((p) => p.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    return res;
  }, [products, search, categoryFilter]);

  const totalStock = products.reduce((s, p) => s + (p.stock ?? 0), 0);
  const totalValue = products.reduce((s, p) => s + (p.stock ?? 0) * (p.cost ?? 0), 0);
  const lowStock = products.filter((p) => (p.stock ?? 0) <= (p.reorder_level ?? 0)).length;

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
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Products</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Manage inventory products and stock levels</p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Total Products</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{products.length}</p>
            <p className="text-xs text-[--shell-muted]">{categories.length} categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Total Stock</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{totalStock.toLocaleString()} units</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{money(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className={`font-mono text-lg font-semibold ${lowStock > 0 ? "text-[--shell-danger]" : "text-[--shell-foreground]"}`}>{lowStock}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b border-[--shell-border] p-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
              <Input placeholder="Search by name or SKU..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1">
              {categories.map((cat) => (
                <Button key={cat} variant={categoryFilter === cat ? "default" : "outline"}
                  size="sm" className="text-xs"
                  onClick={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}>
                  {cat}
                </Button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[--shell-muted]">
              <Package className="h-12 w-12" />
              <p className="text-base font-medium text-[--shell-foreground]">
                {products.length === 0 ? "No products yet" : "No products match your search"}
              </p>
              <p className="text-sm">
                {products.length === 0
                  ? "Add your first product to start tracking inventory."
                  : "Try adjusting your search or category filter."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="text-sm font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{p.unit}</TableCell>
                    <TableCell className={`font-mono text-sm text-right ${(p.stock ?? 0) <= (p.reorder_level ?? 0) ? "text-[--shell-danger] font-semibold" : ""}`}>
                      {(p.stock ?? 0).toLocaleString()}
                      {(p.stock ?? 0) <= (p.reorder_level ?? 0) && <span className="ml-1 text-xs text-[--shell-danger]">!</span>}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(p.price)}</TableCell>
                    <TableCell className="font-mono text-sm text-right text-[--shell-muted]">{money(p.cost)}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">{p.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm"><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon-sm">
                          {p.is_active ? <PowerOff className="h-3 w-3 text-[--shell-muted]" /> : <Power className="h-3 w-3 text-[--shell-success]" />}
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
    </div>
  );
}
