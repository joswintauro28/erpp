"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import productService from "@/services/productService";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { BarChart2, Package, AlertTriangle, Edit } from "lucide-react";
import "@/app/(dashboard)/_styles/Clients.css";

interface Product {
  id: number;
  name: string;
  sku?: string;
  category?: string;
  stock: number;
  cost_price?: number;
  price?: number;
  inventory_value?: number;
  track_inventory?: boolean;
  low_stock_threshold?: number;
}

export default function InventoryValuation() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await productService.getAll();
        setProducts((res.data.data || []).filter((p: Product) => p.track_inventory !== false));
      } catch { setError("Failed to load products"); }
      finally { setLoading(false); }
    })();
  }, []);

  const categories = ["all", ...new Set(products.map((p: Product) => p.category).filter(Boolean))] as string[];

  const filtered = products.filter((p: Product) => {
    const matchCat = category === "all" || p.category === category;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }).filter((p: Product) => Number(p.stock) !== 0 || Number(p.inventory_value ?? (p.stock * (p.cost_price ?? 0))) !== 0);

  const totalValue   = filtered.reduce((sum: number, p: Product) => sum + Number(p.inventory_value ?? (p.stock * (p.cost_price ?? 0))), 0);
  const totalStock   = filtered.reduce((sum: number, p: Product) => sum + Number(p.stock || 0), 0);
  const lowStockCount = filtered.filter((p: Product) => p.stock <= (p.low_stock_threshold || 10)).length;

  // Detect products where cost_price matches price exactly (likely backfilled, not manually set)
  const backfilledCount = filtered.filter(
    (p: Product) => Number(p.cost_price || 0) === Number(p.price || 0) && Number(p.cost_price || 0) > 0
  ).length;
  const zeroCostCount = filtered.filter((p: Product) => !p.cost_price || Number(p.cost_price) === 0).length;

  if (loading) return <Spinner size="lg" message="Loading inventory valuation..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Inventory Valuation</h1>
          <p>Stock value based on cost price (purchase price)</p>
        </div>
      </div>

      {error && <div style={{ color: "var(--destructive)", marginBottom: 16 }}>{error}</div>}

      {/* Warning banner — backfilled products */}
      {(backfilledCount > 0 || zeroCostCount > 0) && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 10,
          padding: "14px 18px", marginBottom: 20,
        }}>
          <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, color: "#b45309", marginBottom: 4 }}>
              Cost prices need your attention
            </div>
            <div style={{ fontSize: "0.875rem", color: "#78350f", lineHeight: 1.6 }}>
              {backfilledCount > 0 && (
                <span>
                  <strong>{backfilledCount} product{backfilledCount > 1 ? "s" : ""}</strong> currently use the <strong>selling price as cost price</strong> (set automatically during migration).
                  Inventory value may be overstated — please edit each product to set the real purchase cost.&nbsp;
                </span>
              )}
              {zeroCostCount > 0 && (
                <span>
                  <strong>{zeroCostCount} product{zeroCostCount > 1 ? "s" : ""}</strong> have <strong>cost price = 0</strong> and contribute Rs.0 to valuation.&nbsp;
                </span>
              )}
              <button
                onClick={() => router.push("/inventory/products")}
                style={{ color: "#b45309", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: "inherit", padding: 0 }}
              >
                Go to Products to update cost prices →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Inventory Value", value: `Rs.${totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, icon: <BarChart2 size={20} />, color: "#6366f1" },
          { label: "Total Stock Units",     value: totalStock.toLocaleString(), icon: <Package size={20} />, color: "#0ea5e9" },
          { label: "Low Stock Items",       value: lowStockCount, icon: <Package size={20} />, color: lowStockCount > 0 ? "#ef4444" : "#22c55e" },
        ].map((card: any) => (
          <Card key={card.label}>
            <CardContent>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${card.color}20`, display: "flex", alignItems: "center", justifyContent: "center", color: card.color }}>
                  {card.icon}
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginBottom: 2 }}>{card.label}</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: card.color }}>{card.value}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <CardContent>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", background: "var(--background)", color: "var(--foreground)" }}
            />
            <select
              value={category}
              onChange={(e: any) => setCategory(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", background: "var(--background)", color: "var(--foreground)" }}
            >
              {categories.map((c: string) => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="page__empty"><Package size={48} /><p>No products found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Stock Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: Product) => {
                  const stockValue = Number(p.inventory_value ?? (p.stock * (p.cost_price ?? 0)));
                  const costPrice  = Number(p.cost_price || 0);
                  const sellPrice  = Number(p.price || 0);
                  const isLow      = p.stock <= (p.low_stock_threshold || 10);
                  // Flag products where cost_price appears to be a backfill (= selling price)
                  const isBackfilled = costPrice > 0 && costPrice === sellPrice;

                  return (
                    <TableRow key={p.id}>
                      <TableCell style={{ fontWeight: 500 }}>
                        {p.name}
                        {isBackfilled && (
                          <span title="Cost price was auto-set from selling price — please update" style={{ marginLeft: 6, cursor: "help", color: "#f59e0b", fontSize: "0.75rem" }}>⚠</span>
                        )}
                      </TableCell>
                      <TableCell><code style={{ fontSize: "0.8125rem", background: "var(--muted)", padding: "2px 6px", borderRadius: 4 }}>{p.sku}</code></TableCell>
                      <TableCell>{p.category || "—"}</TableCell>
                      <TableCell>
                        <span style={{ fontWeight: 600, color: isLow ? "#ef4444" : "inherit" }}>{p.stock}</span>
                        {isLow && <Badge variant="warning">Low</Badge>}
                      </TableCell>
                      <TableCell style={{ color: isBackfilled ? "#b45309" : "inherit" }}>
                        Rs.{costPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        {isBackfilled && <span style={{ fontSize: "0.7rem", marginLeft: 4, color: "#b45309" }}>(est.)</span>}
                      </TableCell>
                      <TableCell>
                        Rs.{sellPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell style={{ fontWeight: 600, color: costPrice === 0 ? "var(--muted-foreground)" : "#6366f1" }}>
                        {costPrice === 0
                          ? <span style={{ fontStyle: "italic", fontWeight: 400 }}>—</span>
                          : `Rs.${stockValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                      </TableCell>
                      <TableCell>
                        {p.stock === 0 ? <Badge variant="destructive">Out of Stock</Badge>
                          : isLow ? <Badge variant="warning">Low Stock</Badge>
                          : <Badge variant="success">In Stock</Badge>}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit cost price"
                          onClick={() => router.push(`/inventory/products?view=${p.id}`)}
                        >
                          <Edit size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow style={{ background: "var(--muted)", fontWeight: 700 }}>
                  <TableCell colSpan={3} style={{ fontWeight: 700 }}>Total ({filtered.length} products)</TableCell>
                  <TableCell style={{ fontWeight: 700 }}>{totalStock.toLocaleString()}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell style={{ fontWeight: 700, color: "#6366f1" }}>
                    Rs.{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>—</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
