"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Warehouse,
  Search,
  Loader2,
  ArrowRight,
  ClipboardList,
  SlidersHorizontal,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import { number } from "@/utils/format";
import Link from "next/link";

interface StockItem {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  reserved_quantity: number;
  product_name?: string;
  sku?: string;
  warehouse_name?: string;
}

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState<number>(1);
  const [adjustWarehouseId, setAdjustWarehouseId] = useState<number>(1);
  const [adjustQty, setAdjustQty] = useState<number>(50);
  const [adjustNotes, setAdjustNotes] = useState<string>("Manual stock count reconciliation");

  // History State
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<StockItem | null>(null);
  const [fulfillmentHistory, setFulfillmentHistory] = useState<any[]>([]);
  const [poHistory, setPoHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchOrderHistory = async (item: StockItem) => {
    setSelectedHistoryItem(item);
    setHistoryLoading(true);
    try {
      const [fRes, pRes] = await Promise.all([
        api.get<any[]>("/fulfillment/orders"),
        api.get<any[]>("/purchase-orders")
      ]);
      
      const filteredFulfillments = (fRes || []).filter(order => 
        order.items?.some((i: any) => i.product_id === item.product_id)
      );
      
      const filteredPOs = (pRes || []).filter(po => 
        po.items?.some((i: any) => i.product_id === item.product_id)
      );

      setFulfillmentHistory(filteredFulfillments);
      setPoHistory(filteredPOs);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchStock = () => {
    setLoading(true);
    api
      .get<StockItem[]>("/stock")
      .then(setStock)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const handleAdjustStock = async () => {
    try {
      await api.put("/stock/adjust", {
        product_id: Number(adjustProductId),
        warehouse_id: Number(adjustWarehouseId),
        new_quantity: Number(adjustQty),
        notes: adjustNotes,
      });
      setIsAdjustOpen(false);
      fetchStock();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = stock.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.product_name?.toLowerCase().includes(q) ||
      s.sku?.toLowerCase().includes(q) ||
      s.warehouse_name?.toLowerCase().includes(q)
    );
  });

  const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);
  const totalReserved = stock.reduce((sum, s) => sum + s.reserved_quantity, 0);
  const totalAvailable = totalStock - totalReserved;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground] flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-[#8C1D24]" />
            Stock Levels & Warehouse Inventory
          </h1>
          <p className="mt-1 text-sm text-[--shell-muted]">
            Real-time physical stock levels, reserved items for customer orders, and available inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsAdjustOpen(true)}>
            <SlidersHorizontal className="h-4 w-4 mr-2" /> Adjust Stock Count
          </Button>
          <Link href="/inventory/fulfillment">
            <Button size="sm" className="bg-[#8C1D24] text-white hover:bg-[#70171d]">
              <ClipboardList className="h-4 w-4 mr-2" /> Fulfill Sales Orders <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">Total Physical Stock</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold">{number(totalStock)} units</div>
            <p className="text-xs text-muted-foreground">Combined across all warehouses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">Reserved for Orders</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-amber-600">{number(totalReserved)} units</div>
            <p className="text-xs text-muted-foreground">Locked in Order Fulfillment pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">Available to Sell</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-emerald-600">{number(totalAvailable)} units</div>
            <p className="text-xs text-muted-foreground font-medium">Ready for immediate sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search product, SKU, or warehouse..."
                className="pl-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No stock records found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase">
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse Location</TableHead>
                  <TableHead className="text-right">Physical Qty</TableHead>
                  <TableHead className="text-right">Reserved Qty</TableHead>
                  <TableHead className="text-right">Available Qty</TableHead>
                  <TableHead className="text-center">Stock Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const avail = s.quantity - s.reserved_quantity;
                  const isLow = avail <= 10;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold text-foreground">
                        {s.product_name || `Product #${s.product_id}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{s.sku || "N/A"}</TableCell>
                      <TableCell className="text-xs font-medium">
                        {s.warehouse_name || `Warehouse #${s.warehouse_id}`}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{number(s.quantity)}</TableCell>
                      <TableCell className="text-right text-amber-600 font-medium">{number(s.reserved_quantity)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">{number(avail)}</TableCell>
                      <TableCell className="text-center">
                        {isLow ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Low Stock Alert
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 text-white text-[10px]">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => fetchOrderHistory(s)}
                          className="hover:bg-muted font-medium text-xs text-[#8C1D24] ml-auto flex items-center gap-1"
                        >
                          <TrendingUp className="h-3 w-3" /> View History
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
              <input
                type="number"
                value={adjustProductId}
                onChange={(e) => setAdjustProductId(Number(e.target.value))}
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Warehouse ID</label>
              <input
                type="number"
                value={adjustWarehouseId}
                onChange={(e) => setAdjustWarehouseId(Number(e.target.value))}
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">New Physical Quantity</label>
              <input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Adjustment Notes / Audit Reference</label>
              <input
                type="text"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAdjustOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdjustStock} className="bg-[#8C1D24] text-white">
              Save Adjustment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order History Dialog */}
      <Dialog open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
        {selectedHistoryItem && (
          <DialogContent className="w-full max-w-4xl sm:max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#8C1D24]" />
                Order History: {selectedHistoryItem.product_name || `Product #${selectedHistoryItem.product_id}`}
              </DialogTitle>
              <DialogDescription className="text-xs">
                History of sales fulfillments and purchase replenishment orders for this product.
              </DialogDescription>
            </DialogHeader>

            {historyLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#8C1D24]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-2 text-xs">
                {/* Column 1: Sales Orders / Fulfillments */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-foreground border-b border-border pb-1">
                    Customer Sales Fulfillments ({fulfillmentHistory.length})
                  </h4>
                  {fulfillmentHistory.length === 0 ? (
                    <p className="text-muted-foreground text-xs italic py-4">No sales fulfillment history found.</p>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {fulfillmentHistory.map((order) => {
                        const itemDetail = order.items?.find((i: any) => i.product_id === selectedHistoryItem.product_id);
                        return (
                          <div key={order.id} className="p-3 border border-border rounded-lg bg-card space-y-1 hover:shadow-sm transition-all">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-foreground">{order.sales_order_code}</span>
                              <Badge className="text-[10px] scale-90" variant="outline">{order.status}</Badge>
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                              Customer: <span className="font-semibold text-foreground">{order.customer_name}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] pt-1">
                              <span className="text-amber-600 font-medium">Qty: {itemDetail?.ordered_quantity || 0}</span>
                              <span className="text-muted-foreground">
                                {order.created_at ? new Date(order.created_at).toLocaleDateString() : "N/A"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Column 2: Purchase Orders */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-foreground border-b border-border pb-1">
                    Supplier Purchase Orders ({poHistory.length})
                  </h4>
                  {poHistory.length === 0 ? (
                    <p className="text-muted-foreground text-xs italic py-4">No purchase replenishment history found.</p>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {poHistory.map((po) => {
                        const itemDetail = po.items?.find((i: any) => i.product_id === selectedHistoryItem.product_id);
                        return (
                          <div key={po.id} className="p-3 border border-border rounded-lg bg-card space-y-1 hover:shadow-sm transition-all">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-foreground">PO #{po.order_number}</span>
                              <Badge className="text-[10px] scale-90 bg-blue-50 text-blue-700 border-blue-200" variant="outline">{po.status}</Badge>
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                              Supplier ID: <span className="font-semibold text-foreground">{po.supplier_id || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] pt-1">
                              <span className="text-blue-600 font-medium">Qty: {itemDetail?.quantity || 0}</span>
                              <span className="text-muted-foreground">
                                {po.created_at ? new Date(po.created_at).toLocaleDateString() : "N/A"}
                              </span>
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
              <Button size="sm" onClick={() => setSelectedHistoryItem(null)} className="bg-[#8C1D24] text-white">
                Close
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
