"use client";

import { useState, useEffect } from "react";
import {
  Boxes,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  PackageCheck,
  Building2,
  FileText,
  Trash2,
  Layers,
} from "lucide-react";
import { Button } from "@datavex/ui-theme";
import { Badge } from "@datavex/ui-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@datavex/ui-theme";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@datavex/ui-theme";
import { api } from "@/services/api";
import FulfillmentWorkflowModal, { FulfillmentOrder } from "@/components/FulfillmentWorkflowModal";

interface MasterProduct {
  id: number;
  name: string;
  sku: string | null;
  price: number;
}

export default function OrderFulfillmentPage() {
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<FulfillmentOrder | null>(null);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([]);
  const [lastBatch, setLastBatch] = useState<string | null>(null);

  // New Order Form state
  const [newOrderCode, setNewOrderCode] = useState(`SO-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newCustomerName, setNewCustomerName] = useState("Acme Corporation");
  const [selectedProduct, setSelectedProduct] = useState("Industrial Hydraulic Pump");
  const [orderedQty, setOrderedQty] = useState(5);
  const [unitPrice, setUnitPrice] = useState(12500);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get<FulfillmentOrder[]>("/fulfillment/orders");
      setOrders(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    api.get<MasterProduct[]>("/products").then(setMasterProducts).catch(() => {});
  }, []);

  const handleCreateDemoOrder = async () => {
    try {
      await api.post("/fulfillment/orders", {
        sales_order_code: newOrderCode,
        customer_name: newCustomerName,
        items: [
          {
            product_name: selectedProduct,
            sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
            ordered_quantity: Number(orderedQty),
            unit_price: Number(unitPrice),
          },
        ],
      });
      setIsIngestOpen(false);
      setNewOrderCode(`SO-${Math.floor(1000 + Math.random() * 9000)}`);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to create sales order. Please check backend logs.");
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await api.delete(`/fulfillment/orders/${orderToDelete.id}`);
      setOrderToDelete(null);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to delete fulfillment order.");
    }
  };

  const reservedOrders = orders.filter((o) => o.status === "RESERVED");

  const handleCreateBatch = async () => {
    if (selectedBatchIds.length === 0) {
      alert("Select at least one RESERVED order for the picking wave.");
      return;
    }
    try {
      const res = await api.post<{ batch_no: string }>("/fulfillment/batches", {
        fulfillment_ids: selectedBatchIds,
      });
      setLastBatch(res?.batch_no || null);
      setIsBatchOpen(false);
      setSelectedBatchIds([]);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Batch creation failed — only RESERVED orders can be batched.");
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "QUEUE") return o.status === "QUEUED";
    if (activeTab === "RESERVED") return o.status === "RESERVED";
    if (activeTab === "PICK_PACK") return o.status === "PICKING" || o.status === "PACKED";
    if (activeTab === "DISPATCHED") return o.status === "DISPATCHED" || o.status === "COMPLETED";
    if (activeTab === "SHORTAGE") return o.status === "SHORTAGE" || o.status === "PO_CREATED" || o.status === "WO_CREATED";
    return true;
  });

  const queuedCount = orders.filter((o) => o.status === "QUEUED").length;
  const reservedCount = orders.filter((o) => o.status === "RESERVED").length;
  const pickPackCount = orders.filter((o) => o.status === "PICKING" || o.status === "PACKED").length;
  const dispatchedCount = orders.filter((o) => o.status === "DISPATCHED" || o.status === "COMPLETED").length;
  const shortageCount = orders.filter((o) => o.status === "SHORTAGE" || o.status === "PO_CREATED" || o.status === "WO_CREATED").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "QUEUED":
        return <Badge variant="secondary">Order Queue</Badge>;
      case "RESERVED":
        return <Badge className="bg-blue-600 text-white">Stock Reserved</Badge>;
      case "PICKING":
        return <Badge className="bg-amber-600 text-white font-medium">Picking Items</Badge>;
      case "PACKED":
        return <Badge className="bg-purple-600 text-white font-medium">Packed & Ready</Badge>;
      case "DISPATCHED":
        return <Badge className="bg-emerald-600 text-white font-medium">Dispatched</Badge>;
      case "SHORTAGE":
        return <Badge variant="destructive">Stock Shortage</Badge>;
      case "PO_CREATED":
        return <Badge className="bg-orange-600 text-white">Reorder PO Active</Badge>;
      case "WO_CREATED":
        return <Badge className="bg-violet-600 text-white">Work Order Created</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-700 text-white font-medium">Completed & Billed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Boxes className="h-6 w-6 text-[#8C1D24]" />
            Sales Order Fulfillment Workstation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage stock verification, reservations, pick lists, packing, dispatch, and billing handoffs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsBatchOpen(true)}>
            <Layers className="h-4 w-4 mr-2" /> Create Wave Batch ({reservedOrders.length})
          </Button>
          <Button size="sm" onClick={() => setIsIngestOpen(true)} className="bg-[#8C1D24] text-white hover:bg-[#70171d]">
            <Plus className="h-4 w-4 mr-2" /> Ingest Approved Sales Order
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Order Queue</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{queuedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting Stock Check</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Reserved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-600">{reservedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Stock Locked & Allocated</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Pick & Pack</CardTitle>
            <PackageCheck className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600">{pickPackCount}</div>
            <p className="text-xs text-muted-foreground mt-1">In Warehouse Process</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Dispatched</CardTitle>
            <Truck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600">{dispatchedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Shipped & Stock Deducted</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Stock Shortages</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-destructive">{shortageCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Reorder PO Required</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "ALL" ? "bg-[#8C1D24] text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("QUEUE")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "QUEUE" ? "bg-[#8C1D24] text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          Queue ({queuedCount})
        </button>
        <button
          onClick={() => setActiveTab("RESERVED")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "RESERVED" ? "bg-[#8C1D24] text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          Reserved ({reservedCount})
        </button>
        <button
          onClick={() => setActiveTab("PICK_PACK")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "PICK_PACK" ? "bg-[#8C1D24] text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          Pick & Pack ({pickPackCount})
        </button>
        <button
          onClick={() => setActiveTab("DISPATCHED")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "DISPATCHED" ? "bg-[#8C1D24] text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          Dispatched & Billed ({dispatchedCount})
        </button>
        <button
          onClick={() => setActiveTab("SHORTAGE")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === "SHORTAGE" ? "bg-[#8C1D24] text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          Shortages ({shortageCount})
        </button>
      </div>

      {/* Fulfillment Orders Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-left text-xs uppercase font-semibold">
              <tr>
                <th className="p-3 pl-4">Sales Order #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items</th>
                <th className="p-3">Stage Status</th>
                <th className="p-3">Batch</th>
                <th className="p-3">Carrier & Tracking</th>
                <th className="p-3">Created Date</th>
                <th className="p-3 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground text-xs">
                    No fulfillment orders found under selected stage filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 pl-4 font-bold text-foreground">{o.sales_order_code}</td>
                    <td className="p-3 font-medium">{o.customer_name}</td>
                    <td className="p-3 text-xs">
                      {o.items.map((i) => `${i.product_name} (${i.ordered_quantity})`).join(", ")}
                    </td>
                    <td className="p-3">{getStatusBadge(o.status)}</td>
                    <td className="p-3 text-xs">
                      {o.batch_no ? (
                        <Badge variant="outline" className="font-mono text-[10px]">{o.batch_no}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {o.shipping_carrier ? (
                        <span>
                          {o.shipping_carrier} ({o.tracking_number})
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsModalOpen(true);
                          }}
                          className="bg-[#8C1D24] text-white hover:bg-[#70171d] text-xs"
                        >
                          Manage Workflow <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setOrderToDelete(o)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
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

      {/* Fulfillment Workflow Modal */}
      {selectedOrder && (
        <FulfillmentWorkflowModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
          onUpdate={() => {
            fetchOrders();
            // Refresh currently open modal order data
            api.get<FulfillmentOrder>(`/fulfillment/orders/${selectedOrder.id}`).then((res) => {
              setSelectedOrder(res);
            });
          }}
        />
      )}

      {/* Ingest Approved Sales Order Modal */}
      <Dialog open={isIngestOpen} onOpenChange={setIsIngestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ingest Approved Sales Order</DialogTitle>
            <DialogDescription>Add a new approved Sales Order to the Inventory Fulfillment Queue.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Sales Order Code</label>
              <input
                type="text"
                value={newOrderCode}
                onChange={(e) => setNewOrderCode(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Customer Name</label>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  setSelectedProduct(selectedName);
                  const foundProd = masterProducts.find((p) => p.name === selectedName);
                  if (foundProd) {
                    setUnitPrice(foundProd.price);
                  }
                }}
                className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
              >
                {masterProducts.length === 0 ? (
                  <option value="Industrial Hydraulic Pump">Industrial Hydraulic Pump (Default)</option>
                ) : (
                  masterProducts.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} {p.sku ? `(${p.sku})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Quantity</label>
                <input
                  type="number"
                  value={orderedQty}
                  onChange={(e) => setOrderedQty(Number(e.target.value))}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsIngestOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateDemoOrder} className="bg-[#8C1D24] text-white">
              Add to Queue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wave Batch Modal (I7) */}
      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#8C1D24]" /> Create Picking Wave / Batch
            </DialogTitle>
            <DialogDescription className="text-xs">
              Group reserved fulfillments into a single pick list. Batched orders move to Picking status.
            </DialogDescription>
          </DialogHeader>
          {lastBatch && (
            <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-xs text-emerald-700">
              Created batch <span className="font-mono font-bold">{lastBatch}</span>.
            </div>
          )}
          <div className="my-2 text-xs max-h-64 overflow-y-auto space-y-1.5">
            {reservedOrders.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">No RESERVED orders available to batch. Reserve stock first.</p>
            ) : (
              reservedOrders.map((o) => {
                const checked = selectedBatchIds.includes(o.id);
                return (
                  <label
                    key={o.id}
                    className="flex items-center gap-2.5 border border-border rounded-md p-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedBatchIds((prev) =>
                          checked ? prev.filter((x) => x !== o.id) : [...prev, o.id]
                        )
                      }
                      className="h-4 w-4 accent-[#8C1D24]"
                    />
                    <div className="flex-1">
                      <span className="font-mono font-bold">{o.sales_order_code}</span>
                      <span className="text-muted-foreground ml-2">{o.customer_name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {o.items.map((i) => i.ordered_quantity).reduce((a, b) => a + b, 0)} units
                    </span>
                  </label>
                );
              })
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsBatchOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateBatch}
              disabled={selectedBatchIds.length === 0}
              className="bg-[#8C1D24] text-white hover:bg-[#70171d]"
            >
              <Layers className="h-4 w-4 mr-2" /> Create Batch ({selectedBatchIds.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        {orderToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Cancel & Delete Order
              </DialogTitle>
              <DialogDescription className="text-xs">
                Are you sure you want to cancel and delete Sales Order <span className="font-bold">{orderToDelete.sales_order_code}</span> from the fulfillment queue? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setOrderToDelete(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteOrder}>
                Confirm Delete
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
