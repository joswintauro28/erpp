"use client";

import { useState, useEffect } from "react";
import {
  Boxes, ClipboardList, CheckCircle2, AlertTriangle, Truck,
  Plus, RefreshCw, ArrowUpRight, PackageCheck, ShoppingBag, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import type { ApiProduct, ApiFulfillment } from "@/types/inventory";
import FulfillmentWorkflowModal from "@/components/FulfillmentWorkflowModal";
import FulfillmentLoading from "./loading";

export default function OrderFulfillmentPage() {
  const [orders, setOrders] = useState<ApiFulfillment[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<ApiFulfillment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<ApiFulfillment | null>(null);
  const [newOrderCode, setNewOrderCode] = useState(`SO-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(0);
  const [orderedQty, setOrderedQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  const fetchOrders = async () => {
    setLoading(true);
    try { const res = await api.get<ApiFulfillment[]>("/fulfillment/orders"); setOrders(res || []); }
    catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchOrders();
    api.get<ApiProduct[]>("/products").then(setProducts).catch(() => {});
  }, []);

  const handleIngestOrder = async () => {
    if (!newCustomerName || !selectedProductId || !orderedQty) return;
    try {
      const prod = products.find((p) => p.id === selectedProductId);
      await api.post("/fulfillment/orders", {
        sales_order_code: newOrderCode,
        customer_name: newCustomerName,
        items: [{
          product_id: selectedProductId,
          product_name: prod?.name || "Product",
          sku: prod?.sku || "",
          ordered_quantity: Number(orderedQty),
          unit_price: Number(unitPrice),
        }],
      });
      setIsIngestOpen(false);
      setNewOrderCode(`SO-${Math.floor(1000 + Math.random() * 9000)}`);
      setNewCustomerName("");
      fetchOrders();
    } catch { alert("Failed to create fulfillment order."); }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try { await api.delete(`/fulfillment/orders/${orderToDelete.id}`); setOrderToDelete(null); fetchOrders(); }
    catch { alert("Failed to delete fulfillment order."); }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "QUEUE") return o.status === "QUEUED";
    if (activeTab === "RESERVED") return o.status === "RESERVED";
    if (activeTab === "PICK_PACK") return o.status === "PICKING" || o.status === "PACKED";
    if (activeTab === "DISPATCHED") return o.status === "DISPATCHED" || o.status === "COMPLETED";
    if (activeTab === "SHORTAGE") return o.status === "SHORTAGE" || o.status === "PO_CREATED";
    return true;
  });

  const queuedCount = orders.filter((o) => o.status === "QUEUED").length;
  const reservedCount = orders.filter((o) => o.status === "RESERVED").length;
  const pickPackCount = orders.filter((o) => o.status === "PICKING" || o.status === "PACKED").length;
  const dispatchedCount = orders.filter((o) => o.status === "DISPATCHED" || o.status === "COMPLETED").length;
  const shortageCount = orders.filter((o) => o.status === "SHORTAGE" || o.status === "PO_CREATED").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "QUEUED": return <Badge variant="secondary">Queue</Badge>;
      case "RESERVED": return <Badge className="bg-blue-600 text-white">Reserved</Badge>;
      case "PICKING": return <Badge className="bg-amber-600 text-white">Picking</Badge>;
      case "PACKED": return <Badge className="bg-purple-600 text-white">Packed</Badge>;
      case "DISPATCHED": return <Badge className="bg-emerald-600 text-white">Dispatched</Badge>;
      case "SHORTAGE": return <Badge variant="destructive">Shortage</Badge>;
      case "PO_CREATED": return <Badge className="bg-orange-600 text-white">Reorder PO</Badge>;
      case "COMPLETED": return <Badge className="bg-green-700 text-white">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <FulfillmentLoading />;
  }

  return (
    <div className="relative space-y-8">
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Fulfillment
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Sales order fulfillment pipeline — check stock, reserve, pick, pack, dispatch, and bill
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setIsIngestOpen(true)} className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Ingest Order
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-medium uppercase tracking-[0.12em] text-[var(--shell-muted)]">
            Pipeline Overview
          </h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]/20" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: "Queue", value: queuedCount, subtitle: "Awaiting stock check", icon: ClipboardList, color: "var(--shell-muted)" },
            { label: "Reserved", value: reservedCount, subtitle: "Stock locked", icon: CheckCircle2, color: "#2563eb" },
            { label: "Pick & Pack", value: pickPackCount, subtitle: "In warehouse", icon: PackageCheck, color: "#d97706" },
            { label: "Dispatched", value: dispatchedCount, subtitle: "Shipped & billed", icon: Truck, color: "#059669" },
            { label: "Shortages", value: shortageCount, subtitle: "Reorder needed", icon: AlertTriangle, color: "#dc2626" },
          ].map((kpi, i) => (
            <div key={kpi.label}
              className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">{kpi.label}</span>
                <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
              </div>
              <span className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">{kpi.value}</span>
              <span className="text-xs text-[var(--shell-muted)]">{kpi.subtitle}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--shell-border)] pb-2 overflow-x-auto">
        {[
          { key: "ALL", label: "All Orders", count: orders.length },
          { key: "QUEUE", label: "Queue", count: queuedCount },
          { key: "RESERVED", label: "Reserved", count: reservedCount },
          { key: "PICK_PACK", label: "Pick & Pack", count: pickPackCount },
          { key: "DISPATCHED", label: "Dispatched", count: dispatchedCount },
          { key: "SHORTAGE", label: "Shortages", count: shortageCount },
        ].map((tab) => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-[var(--shell-brand)] text-white"
                : "text-[var(--shell-muted)] hover:bg-[var(--shell-surface-alt)]"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <Card className="hover:shadow-md transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--shell-border)] bg-[var(--shell-surface-alt)]/50">
                <th className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] p-3 pl-4 text-left">Sales Order</th>
                <th className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] p-3 text-left">Customer</th>
                <th className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] p-3 text-left">Items</th>
                <th className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] p-3 text-left">Status</th>
                <th className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] p-3 text-left">Carrier</th>
                <th className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] p-3 text-left">Date</th>
                <th className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] p-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--shell-border)]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[var(--shell-muted)] text-xs">
                    No fulfillment orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-[var(--shell-surface-alt)]/30 transition-colors">
                    <td className="p-3 pl-4 font-bold text-[var(--shell-foreground)]">{o.sales_order_code}</td>
                    <td className="p-3 font-medium">{o.customer_name}</td>
                    <td className="p-3 text-xs text-[var(--shell-muted)]">
                      {o.items.map((i) => `${i.product_name} (${i.ordered_quantity})`).join(", ")}
                    </td>
                    <td className="p-3">{getStatusBadge(o.status)}</td>
                    <td className="p-3 text-xs text-[var(--shell-muted)]">
                      {o.shipping_carrier ? `${o.shipping_carrier} (${o.tracking_number})` : "—"}
                    </td>
                    <td className="p-3 text-xs text-[var(--shell-muted)]">
                      {o.created_at?.split("T")[0]}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" onClick={() => { setSelectedOrder(o); setIsModalOpen(true); }}
                          className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-brand)]/90 text-xs">
                          Workflow <ArrowUpRight className="h-3 w-3 ml-1" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setOrderToDelete(o)}>
                          <Trash2 className="h-3.5 w-3.5 text-[var(--shell-muted)] hover:text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Workflow Modal */}
      {selectedOrder && (
        <FulfillmentWorkflowModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedOrder(null); }}
          onUpdate={() => {
            fetchOrders();
            api.get<ApiFulfillment>(`/fulfillment/orders/${selectedOrder.id}`).then(setSelectedOrder).catch(() => {});
          }}
        />
      )}

      {/* Ingest Modal */}
      <Dialog open={isIngestOpen} onOpenChange={setIsIngestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ingest Approved Sales Order</DialogTitle>
            <DialogDescription>Add an approved Sales Order to the fulfillment queue.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Sales Order Code</label>
              <input type="text" value={newOrderCode} onChange={(e) => setNewOrderCode(e.target.value)}
                className="w-full p-2 border border-[var(--shell-border)] rounded bg-[var(--shell-surface)]" />
            </div>
            <div>
              <label className="font-medium block mb-1">Customer Name</label>
              <input type="text" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)}
                className="w-full p-2 border border-[var(--shell-border)] rounded bg-[var(--shell-surface)]" />
            </div>
            <div>
              <label className="font-medium block mb-1">Product</label>
              <select value={selectedProductId} onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedProductId(id);
                const prod = products.find((p) => p.id === id);
                if (prod) setUnitPrice(prod.price);
              }}
                className="w-full p-2 border border-[var(--shell-border)] rounded bg-[var(--shell-surface)] text-xs font-semibold">
                <option value={0}>Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Quantity</label>
                <input type="number" value={orderedQty} onChange={(e) => setOrderedQty(Number(e.target.value))}
                  className="w-full p-2 border border-[var(--shell-border)] rounded bg-[var(--shell-surface)]" />
              </div>
              <div>
                <label className="font-medium block mb-1">Unit Price (₹)</label>
                <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))}
                  className="w-full p-2 border border-[var(--shell-border)] rounded bg-[var(--shell-surface)]" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsIngestOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleIngestOrder} className="bg-[var(--shell-brand)] text-white">Add to Queue</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        {orderToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Delete Fulfillment Order
              </DialogTitle>
              <DialogDescription className="text-xs">
                Delete <strong>{orderToDelete.sales_order_code}</strong> from the fulfillment queue?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setOrderToDelete(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteOrder}>Confirm Delete</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}