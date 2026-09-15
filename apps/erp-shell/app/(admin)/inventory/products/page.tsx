"use client";

import { useEffect, useState } from "react";
import { Plus, PackageOpen, Loader2, Search, ArrowRight, Boxes, Warehouse, Edit3, Trash2, AlertTriangle, Truck } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import { money } from "@/utils/format";
import { toastError } from "@/utils/toast";
import { PageHeader, KpiCard, SectionHeading, handleError } from "@datavex/ui-theme";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  price: number;
  cost_price: number;
  track_inventory: boolean;
  is_active: boolean;
  make_or_buy?: string;
  qc_required?: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Electronics & Machinery");
  const [price, setPrice] = useState("15000");
  const [costPrice, setCostPrice] = useState("10000");
  const [makeOrBuy, setMakeOrBuy] = useState("buy");
  const [qcRequired, setQcRequired] = useState(false);

  const fetchProducts = () => {
    setLoading(true);
    api.get<Product[]>("/products").then(setProducts).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async () => {
    if (!name) return;
    try {
      await api.post("/products", {
        name,
        sku: sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        category,
        price: Number(price),
        cost_price: Number(costPrice),
        track_inventory: true,
        is_active: true,
        make_or_buy: makeOrBuy,
        qc_required: qcRequired,
      });
      setIsAddOpen(false);
      setName("");
      setSku("");
      setMakeOrBuy("buy");
      setQcRequired(false);
      fetchProducts();
    } catch (err) {
      handleError(err);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    try {
      await api.put(`/products/${editingProduct.id}`, {
        name,
        sku,
        category,
        price: Number(price),
        cost_price: Number(costPrice),
        track_inventory: editingProduct.track_inventory,
        is_active: editingProduct.is_active,
        make_or_buy: makeOrBuy,
        qc_required: qcRequired,
      });
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      handleError(err);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await api.delete(`/products/${productToDelete.id}`);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      handleError(err);
      toastError("Failed to delete product.");
    }
  };

  const filtered = products.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 lg:space-y-12">
      {/* Sticky Header Block */}
      <PageHeader
        title="Product Master Catalog"
        subtitle="Manage master product records, SKU identifiers, selling prices, and cost margins."
        badge="Inventory Center"
        actions={
          <>
            <Link href="/inventory/stock">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Warehouse className="h-3.5 w-3.5" /> View Stock Levels
              </Button>
            </Link>
            <Button size="sm" onClick={() => setIsAddOpen(true)} className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-brand)]/90 gap-1.5 text-xs shadow-sm">
              <Plus className="h-3.5 w-3.5" /> Add New Product
            </Button>
          </>
        }
      />

      {/* Summary KPI Bar */}
      <section>
        <SectionHeading label="Overview" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Total SKUs" value={products.length} subtitle="Catalog Items" icon={Boxes} color="var(--chart-1)" index={0} />
          <KpiCard label="Active Items" value={products.filter((p) => p.is_active).length} subtitle="Ready for Sales" icon={PackageOpen} color="var(--chart-2)" index={1} />
          <KpiCard label="QC Mandatory" value={products.filter((p) => p.qc_required).length} subtitle="Quality Check" icon={AlertTriangle} color="var(--chart-3)" index={2} />
          <KpiCard label="Purchased SKUs" value={products.filter((p) => p.make_or_buy === "buy").length} subtitle="Vendor Sourced" icon={Truck} color="var(--chart-4)" index={3} />
        </div>
      </section>

      {/* Catalog Table */}
      <section>
        <SectionHeading label="Master Catalog" />
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by product name, SKU..."
                className="pl-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Total Products: {products.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No products found in catalog</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase">
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold text-foreground">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{p.sku || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {p.category || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">{money(p.price)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{money(p.cost_price)}</TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={p.is_active ? "active" : "inactive"} category="generic" />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setEditingProduct(p);
                            setName(p.name);
                            setSku(p.sku || "");
                            setCategory(p.category || "General");
                            setPrice(String(p.price));
                            setCostPrice(String(p.cost_price));
                            setMakeOrBuy(p.make_or_buy || "buy");
                            setQcRequired(!!p.qc_required);
                          }}
                        >
                          <Edit3 className="h-3.5 w-3.5 text-muted-foreground hover:text-[var(--shell-brand)]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setProductToDelete(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
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

      {/* Add Product Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Product to Catalog</DialogTitle>
            <DialogDescription>Create a new product record for stock tracking and sales fulfillment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Product Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Industrial Hydraulic Pump"
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">SKU Code</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. HYD-PUMP-900"
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Selling Price (₹)</label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Cost Price (₹)</label>
                <input
                  type="text"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Supply Policy (Make/Buy)</label>
                <select
                  value={makeOrBuy}
                  onChange={(e) => setMakeOrBuy(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
                >
                  <option value="buy">Buy (procure from supplier)</option>
                  <option value="make">Make (manufacture in-house)</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qcRequired}
                    onChange={(e) => setQcRequired(e.target.checked)}
                    className="h-4 w-4 accent-[var(--shell-brand)]"
                  />
                  QC Required on Receipt
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateProduct} className="bg-[var(--shell-brand)] text-white">
              Save Product
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        {editingProduct && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Product Details</DialogTitle>
              <DialogDescription>Modify catalog specifications for this product record.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-2 text-xs">
              <div>
                <label className="font-medium block mb-1">Product Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">SKU Code</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium block mb-1">Selling Price (₹)</label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-background"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Cost Price (₹)</label>
                  <input
                    type="text"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium block mb-1">Supply Policy (Make/Buy)</label>
                  <select
                    value={makeOrBuy}
                    onChange={(e) => setMakeOrBuy(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
                  >
                    <option value="buy">Buy</option>
                    <option value="make">Make</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qcRequired}
                      onChange={(e) => setQcRequired(e.target.checked)}
                      className="h-4 w-4 accent-[var(--shell-brand)]"
                    />
                    QC Required on Receipt
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setEditingProduct(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpdateProduct} className="bg-[var(--shell-brand)] text-white">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Product Confirmation Modal */}
      <Dialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        {productToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Delete Product
              </DialogTitle>
              <DialogDescription className="text-xs">
                Are you sure you want to delete <span className="font-bold">{productToDelete.name}</span>? This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setProductToDelete(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteProduct}>
                Confirm Delete
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
