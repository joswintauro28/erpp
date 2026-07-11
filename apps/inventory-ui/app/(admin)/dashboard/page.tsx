"use client";

import { useEffect, useState } from "react";
import {
  Package, Warehouse, Truck, AlertTriangle, ClipboardList,
  ArrowUp, Loader2, PackageOpen, Building2, TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from "@/services/api";
import { money, number } from "@/utils/format";

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

const typeVariant = (type: string) => {
  if (type === "in") return "default" as const;
  if (type === "out") return "destructive" as const;
  return "secondary" as const;
};

function KpiCard({ label, value, subtitle, icon: Icon, color, index }: {
  label: string; value: string; subtitle?: string; icon: typeof Package; color: string; index: number;
}) {
  return (
    <div
      className="animate-kpi flex flex-col gap-1 rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[--shell-border] bg-[--shell-bg]">
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
      </div>
      <span className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{value}</span>
      {subtitle && <span className="text-xs text-[--shell-muted]">{subtitle}</span>}
    </div>
  );
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
    ]).then(([k, l, m]) => {
      if (cancelled) return;
      setKpis(k);
      setLowStock(l);
      setMovements(m);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
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
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">Dashboard</h1>
        <p className="mt-1 text-sm text-[--shell-muted]">Inventory overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Products" value={number(kpis?.total_products ?? 0)} icon={PackageOpen} color="var(--shell-accent)" index={0} />
        <KpiCard label="Warehouses" value={number(kpis?.total_warehouses ?? 0)} icon={Building2} color="var(--chart-2)" index={1} />
        <KpiCard label="Suppliers" value={number(kpis?.total_suppliers ?? 0)} icon={Truck} color="var(--chart-3)" index={2} />
        <KpiCard label="Total Stock" value={number(kpis?.total_stock_units ?? 0)} subtitle="units across all warehouses" icon={Package} color="var(--chart-4)" index={3} />
        <KpiCard label="Low Stock" value={number(kpis?.low_stock_count ?? 0)} subtitle="items below threshold" icon={AlertTriangle} color="#C81D25" index={4} />
        <KpiCard label="Pending POs" value={number(kpis?.pending_purchase_orders ?? 0)} subtitle="orders awaiting receipt" icon={ClipboardList} color="var(--chart-5)" index={5} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>Products below their minimum stock threshold</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No low stock items</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Threshold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((item) => (
                    <TableRow key={`${item.product_id}-${item.warehouse_id}`}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.sku || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{item.current_stock}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.threshold}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Recent Movements
            </CardTitle>
            <CardDescription>Latest stock movement activity</CardDescription>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent movements</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.product_name}</TableCell>
                      <TableCell>
                        <Badge variant={typeVariant(m.type)}>
                          {m.type === "in" ? "In" : m.type === "out" ? "Out" : "Adj"}
                        </Badge>
                      </TableCell>
                      <TableCell>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
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
