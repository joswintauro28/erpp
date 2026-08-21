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
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import DashboardLoading from "./loading";

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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function KpiCard({ label, value, subtitle, icon: Icon, color, index }: {
  label: string; value: string; subtitle?: string; icon: typeof Package; color: string; index: number;
}) {
  return (
    <div
      className="animate-kpi flex flex-col gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 hover:-translate-y-1 hover:shadow-engineered transition-all duration-300 relative overflow-hidden group"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <span 
        className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover:w-1.5"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--shell-muted)]">
          {label}
        </span>
        <div 
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--shell-border)] transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}10`, borderColor: `${color}25` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <span className="font-heading text-2xl font-bold tracking-tight text-[var(--shell-foreground)] mt-1">
        {value}
      </span>
      {subtitle && <span className="text-xs text-[var(--shell-muted)] font-medium mt-1">{subtitle}</span>}
    </div>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">
        {label}
      </h2>
      <div className="h-px flex-1 bg-[var(--shell-border)]" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
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
    return <DashboardLoading />;
  }

  const hasLowStockAlerts = lowStock.length > 0 || (kpis?.low_stock_count ?? 0) > 0;

  return (
    <div className="space-y-10 lg:space-y-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--shell-border)] pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            {getGreeting()}, {user?.full_name || user?.email || "Inventory Manager"}
          </h1>
          <p className="text-sm text-[var(--shell-muted)]">
            Real-time stock monitoring, sales order fulfillment pipeline, and supplier procurement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-xs border-[var(--shell-brand)]/40 text-[var(--shell-brand)] bg-[var(--shell-brand)]/5 font-medium">
            Inventory Control & Fulfillment Center
          </Badge>
          <Link href="/fulfillment">
            <Button className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-brand)]/90 gap-1.5 text-xs shadow-sm">
              <ClipboardList className="h-4 w-4" /> Open Fulfillment Queue <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Alert Banner */}
      {hasLowStockAlerts && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--shell-accent)]/20 bg-gradient-to-r from-[var(--shell-accent)]/5 to-transparent px-5 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--shell-accent)]/10">
            <AlertTriangle className="h-4 w-4 text-[var(--shell-accent)]" />
          </div>
          <span className="text-sm font-medium text-[var(--shell-accent-text)]">
            {kpis?.low_stock_count ?? lowStock.length} item{(kpis?.low_stock_count ?? lowStock.length) !== 1 ? "s" : ""} below reorder threshold require attention
          </span>
          <Badge variant="destructive" className="text-xs">
            Stockout Risk
          </Badge>
        </div>
      )}

      {/* KPI Overview Grid */}
      <section>
        <SectionHeading label="Overview" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Products" value={number(kpis?.total_products ?? 0)} subtitle="Active Catalog" icon={PackageOpen} color="var(--chart-1)" index={0} />
          <KpiCard label="Warehouses" value={number(kpis?.total_warehouses ?? 0)} subtitle="Locations" icon={Building2} color="var(--chart-2)" index={1} />
          <KpiCard label="Suppliers" value={number(kpis?.total_suppliers ?? 0)} subtitle="Approved Vendors" icon={Truck} color="var(--chart-3)" index={2} />
          <KpiCard label="Physical Stock" value={number(kpis?.total_stock_units ?? 0)} subtitle="Total Units" icon={Package} color="var(--chart-4)" index={3} />
          <KpiCard label="Stock Alerts" value={number(kpis?.low_stock_count ?? 0)} subtitle={(kpis?.low_stock_count ?? 0) > 0 ? "Requires reorder" : "Healthy levels"} icon={AlertTriangle} color={(kpis?.low_stock_count ?? 0) > 0 ? "var(--shell-danger)" : "var(--chart-2)"} index={4} />
          <KpiCard label="Pending POs" value={number(kpis?.pending_purchase_orders ?? 0)} subtitle="Awaiting Receipt" icon={ClipboardList} color="var(--chart-5)" index={5} />
        </div>
      </section>

      {/* Quick Action Navigation Strip */}
      <section>
        <SectionHeading label="Quick Actions" />
        <div className="flex flex-wrap gap-2">
          <Link href="/fulfillment">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <ClipboardList className="h-3.5 w-3.5 text-[var(--shell-brand)]" /> Fulfill Sales Orders
            </Button>
          </Link>
          <Link href="/stock">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Warehouse className="h-3.5 w-3.5 text-[var(--shell-info)]" /> Stock Levels & Locations
            </Button>
          </Link>
          <Link href="/products">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <PackageOpen className="h-3.5 w-3.5 text-purple-600" /> Product Catalog
            </Button>
          </Link>
          <Link href="/purchase-orders">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Truck className="h-3.5 w-3.5 text-[var(--shell-success)]" /> Reorder Purchase Orders
            </Button>
          </Link>
        </div>
      </section>

      {/* Grid: Low Stock Alerts & Recent Movements */}
      <section>
        <SectionHeading label="Inventory Operations" />
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Low Stock Alerts */}
          <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-[var(--shell-danger)]" />
                    Low Stock Alerts & Reorder Needed
                  </CardTitle>
                  <CardDescription>Products requiring purchase reorders to prevent stockouts</CardDescription>
                </div>
                <Link href="/purchase-orders">
                  <Button size="sm" variant="outline" className="text-xs">
                    Reorder Stock <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {lowStock.length === 0 ? (
                <p className="text-xs text-[var(--shell-muted)] py-6 text-center">All inventory levels are healthy.</p>
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
                        <TableCell className="font-medium text-[var(--shell-foreground)] text-xs">{item.product_name}</TableCell>
                        <TableCell className="text-[var(--shell-muted)] text-xs">{item.sku || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive" className="text-[10px]">
                            {item.current_stock} units
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-[var(--shell-muted)] font-semibold">
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
          <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-[var(--shell-success)]" />
                    Recent Stock Transactions
                  </CardTitle>
                  <CardDescription>Latest customer dispatches, supplier receipts, and adjustments</CardDescription>
                </div>
                <Link href="/stock/movements">
                  <Button size="sm" variant="outline" className="text-xs">
                    Full History <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-xs text-[var(--shell-muted)] py-6 text-center">No recent stock movements.</p>
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
                        <TableCell className="font-medium text-xs text-[var(--shell-foreground)]">{m.product_name}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              m.type.toLowerCase() === "in"
                                ? "bg-[var(--shell-success)] text-white text-[10px]"
                                : m.type.toLowerCase() === "out"
                                ? "bg-[var(--shell-danger)] text-white text-[10px]"
                                : "bg-muted text-muted-foreground text-[10px]"
                            }
                          >
                            {m.type.toLowerCase() === "in" ? "Receipt (IN)" : m.type.toLowerCase() === "out" ? "Dispatch (OUT)" : "Audit"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs">
                          <span className={m.quantity > 0 ? "text-[var(--shell-success)]" : "text-[var(--shell-danger)]"}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-[var(--shell-muted)] text-right">
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
      </section>
    </div>
  );
}
