"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, ShoppingCart, Eye, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { money } from "@/utils/format";
import { api } from "@/services/api";
import type { ApiPurchaseOrder, ApiSupplier, ApiProduct } from "@/types/inventory";
import PurchaseOrdersLoading from "./loading";

const statusColors: Record<string, string> = {
  draft: "var(--chart-4)",
  ordered: "var(--chart-3)",
  received: "var(--shell-success)",
};

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<ApiPurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<ApiPurchaseOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<ApiPurchaseOrder | null>(null);
  const [formSupplierId, setFormSupplierId] = useState(0);
  const [formWarehouseId, setFormWarehouseId] = useState(1);
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<{ product_id: number; quantity: number; unit_price: number }[]>([
    { product_id: 1, quantity: 10, unit_price: 500 },
  ]);

  const fetchOrders = () => {
    api.get<ApiPurchaseOrder[]>("/purchase-orders")
      .then((data) => setOrders(data))
      .catch(() => setOrders([]));
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<ApiPurchaseOrder[]>("/purchase-orders"),
      api.get<ApiSupplier[]>("/suppliers"),
      api.get<ApiProduct[]>("/products"),
    ]).then(([o, s, p]) => {
      if (!cancelled) { setOrders(o); setSuppliers(s); setProducts(p); }
    }).catch(() => { if (!cancelled) { setOrders([]); setSuppliers([]); setProducts([]); } })
    .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!formSupplierId) return;
    try {
      await api.post("/purchase-orders", {
        supplier_id: formSupplierId,
        warehouse_id: formWarehouseId,
        notes: formNotes,
        items: formItems,
      });
      setIsAddOpen(false);
      setFormSupplierId(0); setFormItems([{ product_id: 1, quantity: 10, unit_price: 500 }]);
      fetchOrders();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    try { await api.delete(`/purchase-orders/${orderToDelete.id}`); setOrderToDelete(null); fetchOrders(); }
    catch { alert("Failed to delete PO."); }
  };

  const handleStatusUpdate = async (po: ApiPurchaseOrder, status: string) => {
    try { await api.put(`/purchase-orders/${po.id}/status`, { status }); fetchOrders(); }
    catch { alert("Failed to update status."); }
  };

  const filtered = useMemo(() => {
    let res = orders;
    if (statusFilter) res = res.filter((o) => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(
        (o) => o.order_number.toLowerCase().includes(q) || `#${o.supplier_id}`.includes(q) || (o.notes ?? "").toLowerCase().includes(q)
      );
    }
    return res;
  }, [orders, search, statusFilter]);

  if (!ready) {
    return <PurchaseOrdersLoading />;
  }

  if (ready && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">Purchase Orders</h1>
            <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Manage purchase orders and supplier deliveries</p>
          </div>
          <Button size="sm" onClick={() => setIsAddOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />New PO</Button>
        </div>
        <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
          <ShoppingCart className="h-12 w-12" />
          <p className="text-base font-medium text-[var(--shell-foreground)]">No purchase orders yet</p>
          <p className="text-sm">Create your first purchase order to start tracking procurement.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Purchase Orders
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Manage purchase orders and supplier deliveries
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)} className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New PO
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
          <Input placeholder="Search POs..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {["", "draft", "ordered", "received"].map((s) => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="text-xs capitalize"
              onClick={() => setStatusFilter(s)}>{s || "All"}</Button>
          ))}
        </div>
      </div>

      <Card className="hover:shadow-md transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-[var(--shell-muted)]">
              <p className="text-sm">No purchase orders match your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">PO #</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Supplier</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Order Date</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Expected</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Items</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right">Total</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Status</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id} className="hover:bg-[var(--shell-surface-alt)]/30 transition-colors">
                    <TableCell className="font-mono text-xs font-medium text-[var(--shell-foreground)]">{o.order_number}</TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">
                      {suppliers.find((s) => s.id === o.supplier_id)?.name || `#${o.supplier_id}`}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[var(--shell-muted)]">
                      {o.ordered_at ? o.ordered_at.split("T")[0] : o.created_at.split("T")[0]}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[var(--shell-muted)]">
                      {o.expected_at ? o.expected_at.split("T")[0] : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-right">{o.items.length}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(o.total)}</TableCell>
                    <TableCell>
                      {o.status === "draft" ? (
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs capitalize" style={{ borderColor: statusColors[o.status], color: statusColors[o.status] }}>
                            {o.status}
                          </Badge>
                          <Button variant="ghost" size="xs" className="text-[10px] h-5 px-1"
                            onClick={() => handleStatusUpdate(o, "ordered")}>
                            Order
                          </Button>
                        </div>
                      ) : o.status === "ordered" ? (
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs capitalize" style={{ borderColor: statusColors[o.status], color: statusColors[o.status] }}>
                            {o.status}
                          </Badge>
                          <Button variant="ghost" size="xs" className="text-[10px] h-5 px-1"
                            onClick={() => handleStatusUpdate(o, "received")}>
                            Receive
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs capitalize" style={{ borderColor: statusColors[o.status], color: statusColors[o.status] }}>
                          {o.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setViewingOrder(o)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setOrderToDelete(o)}>
                          <Trash2 className="h-3.5 w-3.5 text-[var(--shell-muted)] hover:text-destructive" />
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

      {/* Create PO Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
            <DialogDescription>Create a purchase order for supplier replenishment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Supplier</label>
              <select value={formSupplierId} onChange={(e) => setFormSupplierId(Number(e.target.value))}
                className="w-full p-2 border border-border rounded bg-background text-xs font-semibold">
                <option value={0}>Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">Warehouse ID</label>
              <input type="number" value={formWarehouseId} onChange={(e) => setFormWarehouseId(Number(e.target.value))}
                className="w-full p-2 border border-border rounded bg-background" />
            </div>
            <div>
              <label className="font-medium block mb-1">Notes</label>
              <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium">Line Items</label>
                <Button variant="outline" size="xs" onClick={() => setFormItems([...formItems, { product_id: 1, quantity: 1, unit_price: 0 }])}>
                  + Add Item
                </Button>
              </div>
              {formItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                  <div className="col-span-2">
                    <select value={item.product_id} onChange={(e) => {
                      const items = [...formItems]; items[idx].product_id = Number(e.target.value);
                      const prod = products.find((p) => p.id === Number(e.target.value));
                      if (prod) items[idx].unit_price = prod.price;
                      setFormItems(items);
                    }} className="w-full p-2 border border-border rounded bg-background text-xs">
                      <option value={0}>Select...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input type="number" value={item.quantity} onChange={(e) => {
                      const items = [...formItems]; items[idx].quantity = Number(e.target.value); setFormItems(items);
                    }} className="w-full p-2 border border-border rounded bg-background" placeholder="Qty" />
                  </div>
                  <div className="flex gap-1">
                    <input type="number" value={item.unit_price} onChange={(e) => {
                      const items = [...formItems]; items[idx].unit_price = Number(e.target.value); setFormItems(items);
                    }} className="w-full p-2 border border-border rounded bg-background" placeholder="Price" />
                    {formItems.length > 1 && (
                      <Button variant="ghost" size="xs" onClick={() => setFormItems(formItems.filter((_, i) => i !== idx))}>
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} className="bg-[var(--shell-brand)] text-white">Create PO</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View PO Modal */}
      <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
        {viewingOrder && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{viewingOrder.order_number}</DialogTitle>
              <DialogDescription>
                Supplier: {suppliers.find((s) => s.id === viewingOrder.supplier_id)?.name || `#${viewingOrder.supplier_id}`} | Status: {viewingOrder.status}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-2 text-xs">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div><span className="font-medium text-[var(--shell-muted)]">Order Date:</span> {viewingOrder.ordered_at?.split("T")[0] || viewingOrder.created_at.split("T")[0]}</div>
                <div><span className="font-medium text-[var(--shell-muted)]">Expected:</span> {viewingOrder.expected_at?.split("T")[0] || "-"}</div>
                <div><span className="font-medium text-[var(--shell-muted)]">Warehouse ID:</span> {viewingOrder.warehouse_id}</div>
                <div><span className="font-medium text-[var(--shell-muted)]">Notes:</span> {viewingOrder.notes || "-"}</div>
              </div>
              <table className="w-full text-xs border border-border rounded-lg">
                <thead className="bg-[var(--shell-surface-alt)] text-[var(--shell-muted)] uppercase">
                  <tr>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {viewingOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2">{products.find((p) => p.id === item.product_id)?.name || `#${item.product_id}`}</td>
                      <td className="p-2 text-right">{item.quantity}</td>
                      <td className="p-2 text-right">{money(item.unit_price)}</td>
                      <td className="p-2 text-right">{money(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[var(--shell-surface-alt)]/50 font-semibold">
                  <tr>
                    <td colSpan={3} className="p-2 text-right">Subtotal:</td>
                    <td className="p-2 text-right">{money(viewingOrder.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-2 text-right">Tax:</td>
                    <td className="p-2 text-right">{money(viewingOrder.tax_amount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-2 text-right">Total:</td>
                    <td className="p-2 text-right font-bold">{money(viewingOrder.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex justify-end pt-2 border-t border-border mt-4">
              <Button size="sm" onClick={() => setViewingOrder(null)} className="bg-[var(--shell-brand)] text-white">Close</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        {orderToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Delete PO
              </DialogTitle>
              <DialogDescription>
                Delete <strong>{orderToDelete.order_number}</strong>? This is permanent.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setOrderToDelete(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete}>Confirm Delete</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}