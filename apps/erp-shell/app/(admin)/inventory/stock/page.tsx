"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search, Warehouse, SlidersHorizontal, TrendingUp, Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import { number } from "@/utils/format";
import type { ApiStockLevel, ApiFulfillment, ApiPurchaseOrder } from "@/types/inventory";
import StockLoading from "./loading";

export default function StockLevels() {
  const [stock, setStock] = useState<ApiStockLevel[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState(1);
  const [adjustWarehouseId, setAdjustWarehouseId] = useState(1);
  const [adjustQty, setAdjustQty] = useState(50);
  const [adjustNotes, setAdjustNotes] = useState("Manual stock count reconciliation");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ApiStockLevel | null>(null);
  const [fulfillmentHistory, setFulfillmentHistory] = useState<ApiFulfillment[]>([]);
  const [poHistory, setPoHistory] = useState<ApiPurchaseOrder[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchStock = () => {
    setLoading(true);
    api.get<ApiStockLevel[]>("/stock")
      .then(setStock)
      .catch(() => setStock([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchOrderHistory = async (item: ApiStockLevel) => {
    setSelectedHistoryItem(item);
    setHistoryLoading(true);
    try {
      const [fRes, pRes] = await Promise.all([
        api.get<ApiFulfillment[]>("/fulfillment/orders"),
        api.get<ApiPurchaseOrder[]>("/purchase-orders"),
      ]);
      setFulfillmentHistory(
        (fRes || []).filter((o) => o.items?.some((i) => i.product_id === item.product_id))
      );
      setPoHistory(
        (pRes || []).filter((po) => po.items?.some((i) => i.product_id === item.product_id))
      );
    } catch {
      setFulfillmentHistory([]);
      setPoHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    try {
      await api.put("/stock/adjust", {
        product_id: adjustProductId,
        warehouse_id: adjustWarehouseId,
        new_quantity: adjustQty,
        notes: adjustNotes,
      });
      setIsAdjustOpen(false);
      fetchStock();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return stock;
    const q = search.toLowerCase();
    return stock.filter(
      (s) =>
        (s.product_name ?? "").toLowerCase().includes(q) ||
        (s.sku ?? "").toLowerCase().includes(q) ||
        (s.warehouse_name ?? "").toLowerCase().includes(q)
    );
  }, [stock, search]);

  const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);
  const totalReserved = stock.reduce((sum, s) => sum + s.reserved_quantity, 0);
  const totalAvailable = totalStock - totalReserved;

  if (loading) {
    return <StockLoading />;
  }

  return (
    <div className="relative space-y-8">
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Stock Levels
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Real-time physical stock levels, reserved items, and available inventory
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAdjustOpen(true)}
          className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white"
        >
          <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
          Adjust Stock
        </Button>
      </div>

      {/* KPI Cards */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-medium uppercase tracking-[0.12em] text-[var(--shell-muted)]">
            Inventory Overview
          </h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]/20" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total Physical Stock", value: `${number(totalStock)} units`,
              subtitle: "Combined across all warehouses",
              icon: Package, color: "var(--shell-brand)",
            },
            {
              label: "Reserved for Orders", value: `${number(totalReserved)} units`,
              subtitle: "Locked in fulfillment pipeline",
              icon: Package, color: "var(--shell-accent)",
            },
            {
              label: "Available to Sell", value: `${number(totalAvailable)} units`,
              subtitle: "Ready for immediate sales",
              icon: Package, color: "var(--shell-brand)",
            },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">
                  {kpi.label}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--shell-border)]/40 bg-[var(--shell-surface-alt)]">
                  <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                </div>
              </div>
              <span className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">
                {kpi.value}
              </span>
              <span className="text-xs text-[var(--shell-muted)]">{kpi.subtitle}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Stock Table */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-medium uppercase tracking-[0.12em] text-[var(--shell-muted)]">
            Stock Registry
          </h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]/20" />
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
            <Input
              placeholder="Search product, SKU, or warehouse..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Card className="hover:shadow-md transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
                <Warehouse className="h-12 w-12" />
                <p className="text-base font-medium text-[var(--shell-foreground)]">
                  {stock.length === 0 ? "No stock records yet" : "No stock matches your search"}
                </p>
                <p className="text-sm">Add products and purchase orders to see stock levels.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Product</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">SKU</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Warehouse</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Physical</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Reserved</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Available</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Status</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    const avail = s.quantity - s.reserved_quantity;
                    const isLow = avail <= 10;
                    return (
                      <TableRow key={s.id} className="hover:bg-[var(--shell-surface-alt)]/30 transition-colors">
                        <TableCell className="font-medium text-[var(--shell-foreground)]">
                          {s.product_name || `Product #${s.product_id}`}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[var(--shell-muted)]">
                          {s.sku || "N/A"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.warehouse_name || `WH #${s.warehouse_id}`}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-right text-[var(--shell-foreground)]">
                          {number(s.quantity)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-right text-[var(--shell-accent)]">
                          {number(s.reserved_quantity)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-right text-emerald-600 font-semibold">
                          {number(avail)}
                        </TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge variant="destructive" className="text-[10px]">Low Stock</Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px] bg-emerald-600/10 text-emerald-600 border-emerald-600/20">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="hover:bg-[var(--shell-surface-alt)]"
                            onClick={() => fetchOrderHistory(s)}
                            title="View order history"
                          >
                            <TrendingUp className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Adjust Stock Modal */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Physical Stock Count</DialogTitle>
            <DialogDescription>Reconcile stock count for inventory audits and manual adjustments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Product ID</label>
              <input type="number" value={adjustProductId} onChange={(e) => setAdjustProductId(Number(e.target.value))} className="w-full p-2 border border-border rounded bg-background" />
            </div>
            <div>
              <label className="font-medium block mb-1">Warehouse ID</label>
              <input type="number" value={adjustWarehouseId} onChange={(e) => setAdjustWarehouseId(Number(e.target.value))} className="w-full p-2 border border-border rounded bg-background" />
            </div>
            <div>
              <label className="font-medium block mb-1">New Physical Quantity</label>
              <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} className="w-full p-2 border border-border rounded bg-background" />
            </div>
            <div>
              <label className="font-medium block mb-1">Notes</label>
              <input type="text" value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} className="w-full p-2 border border-border rounded bg-background" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAdjustOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdjustStock} className="bg-[var(--shell-brand)] text-white">Save Adjustment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order History Dialog */}
      <Dialog open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
        {selectedHistoryItem && (
          <DialogContent className="w-full max-w-4xl sm:max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[var(--shell-brand)]" />
                Order History: {selectedHistoryItem.product_name || `Product #${selectedHistoryItem.product_id}`}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Sales fulfillments and purchase replenishment orders for this product.
              </DialogDescription>
            </DialogHeader>

            {historyLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--shell-brand)] border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-2 text-xs">
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[var(--shell-foreground)] border-b border-border pb-1">
                    Sales Fulfillments ({fulfillmentHistory.length})
                  </h4>
                  {fulfillmentHistory.length === 0 ? (
                    <p className="text-[var(--shell-muted)] italic py-4">No fulfillment history found.</p>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {fulfillmentHistory.map((o) => {
                        const item = o.items?.find((i) => i.product_id === selectedHistoryItem.product_id);
                        return (
                          <div key={o.id} className="p-3 border border-border rounded-lg bg-card space-y-1 hover:shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[var(--shell-foreground)]">{o.sales_order_code}</span>
                              <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                            </div>
                            <div className="text-[var(--shell-muted)] text-[11px]">
                              Customer: <span className="font-semibold text-[var(--shell-foreground)]">{o.customer_name}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] pt-1">
                              <span className="text-amber-600 font-medium">Qty: {item?.ordered_quantity || 0}</span>
                              <span className="text-[var(--shell-muted)]">{o.created_at?.split("T")[0]}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[var(--shell-foreground)] border-b border-border pb-1">
                    Purchase Orders ({poHistory.length})
                  </h4>
                  {poHistory.length === 0 ? (
                    <p className="text-[var(--shell-muted)] italic py-4">No purchase history found.</p>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {poHistory.map((po) => {
                        const item = po.items?.find((i) => i.product_id === selectedHistoryItem.product_id);
                        return (
                          <div key={po.id} className="p-3 border border-border rounded-lg bg-card space-y-1 hover:shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[var(--shell-foreground)]">{po.order_number}</span>
                              <Badge variant="outline" className="text-[10px]">{po.status}</Badge>
                            </div>
                            <div className="flex justify-between items-center text-[11px] pt-1">
                              <span className="text-blue-600 font-medium">Qty: {item?.quantity || 0}</span>
                              <span className="text-[var(--shell-muted)]">{po.created_at?.split("T")[0]}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end pt-2 border-t border-border mt-4">
              <Button size="sm" onClick={() => setSelectedHistoryItem(null)} className="bg-[var(--shell-brand)] text-white">Close</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}