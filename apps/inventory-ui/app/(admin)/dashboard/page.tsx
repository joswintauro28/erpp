"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Warehouse,
  Truck,
  AlertTriangle,
  ClipboardList,
  Loader2,
  PackageOpen,
  Building2,
  TrendingUp,
  ArrowRight,
  Boxes,
  Plus,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from "@/services/api";
import { money, number } from "@/utils/format";
import Link from "next/link";

interface KpiData {
  total_products: number;
  total_warehouses: number;
  total_suppliers: number;
  total_stock_units: number;
  low_stock_count: number;
  pending_purchase_orders: number;
}

interface LowStockItem {
  product_id: number;
  warehouse_id: number;
  product_name: string;
  sku: string | null;
  current_stock: number;
  threshold: number;
}

interface MovementItem {
  id: number;
  product_id: number;
  product_name: string;
  type: string;
  quantity: number;
  notes: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<KpiData>("/dashboard/inventory"),
      api.get<LowStockItem[]>("/dashboard/inventory/low-stock?limit=5"),
      api.get<MovementItem[]>("/dashboard/inventory/movements?limit=10"),
    ])
      .then(([k, l, m]) => {
        if (cancelled) return;
        setKpis(k);
        setLowStock(l);
        setMovements(m);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground] flex items-center gap-2">
            <Boxes className="h-6 w-6 text-[#8C1D24]" />
            Inventory Control & Fulfillment Center
          </h1>
          <p className="mt-1 text-sm text-[--shell-muted]">
            Real-time stock monitoring, sales order fulfillment pipeline, and supplier procurement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory/fulfillment">
            <Button className="bg-[#8C1D24] text-white hover:bg-[#70171d] shadow-sm">
              <ClipboardList className="h-4 w-4 mr-2" /> Open Order Fulfillment Queue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Action Navigation Strip */}
      <div className="p-4 bg-card border border-border rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold uppercase tracking-wider text-muted-foreground">Quick Actions:</span>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory/fulfillment">
            <Button size="sm" variant="outline" className="text-xs">
              <ClipboardList className="h-3.5 w-3.5 mr-1 text-[#8C1D24]" /> Fulfill Sales Orders
            </Button>
          </Link>
          <Link href="/inventory/stock">
            <Button size="sm" variant="outline" className="text-xs">
              <Warehouse className="h-3.5 w-3.5 mr-1 text-blue-600" /> Stock Levels & Locations
            </Button>
          </Link>
          <Link href="/inventory/products">
            <Button size="sm" variant="outline" className="text-xs">
              <PackageOpen className="h-3.5 w-3.5 mr-1 text-purple-600" /> Product Catalog
            </Button>
          </Link>
          <Link href="/inventory/purchase-orders">
            <Button size="sm" variant="outline" className="text-xs">
              <Truck className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Reorder Purchase Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="border-border">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catalog</span>
            <PackageOpen className="h-4 w-4 text-[#8C1D24]" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{number(kpis?.total_products ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Active Products</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Warehouses</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{number(kpis?.total_warehouses ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Locations</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suppliers</span>
            <Truck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{number(kpis?.total_suppliers ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Approved Vendors</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Physical Stock</span>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{number(kpis?.total_stock_units ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Units in Stock</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-destructive">{number(kpis?.low_stock_count ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Below Threshold</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending POs</span>
            <ClipboardList className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600">{number(kpis?.pending_purchase_orders ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Awaiting Supplier Receipt</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Low Stock Alerts & Recent Movements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Low Stock Alerts & Reorder Needed
                </CardTitle>
                <CardDescription>Products requiring purchase reorders to prevent stockouts</CardDescription>
              </div>
              <Link href="/inventory/purchase-orders">
                <Button size="sm" variant="outline" className="text-xs">
                  Reorder Stock <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">All inventory levels are healthy.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-xs uppercase">
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Reorder Threshold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((item) => (
                    <TableRow key={`${item.product_id}-${item.warehouse_id}`}>
                      <TableCell className="font-medium text-foreground text-xs">{item.product_name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{item.sku || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="text-[10px]">
                          {item.current_stock} units
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground font-semibold">
                        {item.threshold} units
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Stock Movements */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Recent Stock Transactions
                </CardTitle>
                <CardDescription>Latest customer dispatches, supplier receipts, and adjustments</CardDescription>
              </div>
              <Link href="/inventory/stock/movements">
                <Button size="sm" variant="outline" className="text-xs">
                  Full History <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No recent stock movements.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-xs uppercase">
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-xs text-foreground">{m.product_name}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            m.type.toLowerCase() === "in"
                              ? "bg-emerald-600 text-white text-[10px]"
                              : m.type.toLowerCase() === "out"
                              ? "bg-rose-600 text-white text-[10px]"
                              : "bg-secondary text-foreground text-[10px]"
                          }
                        >
                          {m.type.toLowerCase() === "in" ? "Receipt (IN)" : m.type.toLowerCase() === "out" ? "Dispatch (OUT)" : "Audit"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs">
                        <span className={m.quantity > 0 ? "text-emerald-600" : "text-rose-600"}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        {new Date(m.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
