"use client";

import { useEffect, useState } from "react";
import { Plus, ClipboardList, Loader2, Truck, Warehouse as WarehouseIcon, Edit3, Trash2, Calendar, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import { money } from "@/utils/format";

interface PurchaseOrder {
  id: number;
  order_number: string;
  supplier_id: number;
  warehouse_id: number;
  status: string;
  total: number;
  notes?: string | null;
  ordered_at?: string | null;
  expected_at?: string | null;
  received_at?: string | null;
  created_at: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);

  // New PO Form
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(1);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(1);
  const [itemProductName, setItemProductName] = useState("Industrial Hydraulic Pump Parts");
  const [itemQty, setItemQty] = useState(25);
  const [itemPrice, setItemPrice] = useState(4500);
  const [poNotes, setPoNotes] = useState("Reorder stock for inventory replenishment");

  // Edit PO Status Form
  const [editStatus, setEditStatus] = useState("ordered");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [poData, supData, whData] = await Promise.all([
        api.get<PurchaseOrder[]>("/purchase-orders"),
        api.get<Supplier[]>("/suppliers"),
        api.get<Warehouse[]>("/warehouses"),
      ]);
      setOrders(poData || []);
      setSuppliers(supData || []);
      setWarehouses(whData || []);
      if (supData && supData.length > 0) setSelectedSupplierId(supData[0].id);
      if (whData && whData.length > 0) setSelectedWarehouseId(whData[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePurchaseOrder = async () => {
    try {
      let supId = selectedSupplierId;
      if (!supId && suppliers.length > 0) supId = suppliers[0].id;
      let whId = selectedWarehouseId;
      if (!whId && warehouses.length > 0) whId = warehouses[0].id;

      await api.post("/purchase-orders", {
        supplier_id: Number(supId),
        warehouse_id: Number(whId),
        notes: poNotes,
        items: [
          {
            product_name: itemProductName,
            quantity: Number(itemQty),
            unit_price: Number(itemPrice),
          },
        ],
      });
      setIsAddOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to create Purchase Order.");
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    try {
      await api.put(`/purchase-orders/${selectedOrder.id}/status`, {
        status: editStatus,
      });
      setSelectedOrder(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  const handleDeletePO = async () => {
    if (!orderToDelete) return;
    try {
      await api.delete(`/purchase-orders/${orderToDelete.id}`);
      setOrderToDelete(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete purchase order.");
    }
  };

  const getStatusBadge = (s: string) => {
    const st = s.toLowerCase();
    if (st === "ordered" || st === "po_created") {
      return <Badge className="bg-amber-600 text-white text-[10px]">Ordered / Sent</Badge>;
    }
    if (st === "received") {
      return <Badge className="bg-emerald-600 text-white text-[10px]">Goods Received</Badge>;
    }
    if (st === "cancelled") {
      return <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>;
    }
    return <Badge variant="secondary" className="text-[10px]">Draft</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground] flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-[#8C1D24]" />
            Purchase Orders & Reordering
          </h1>
          <p className="mt-1 text-sm text-[--shell-muted]">
            Procure stock from approved suppliers, track receipts, and update stock counts automatically.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-[#8C1D24] text-white hover:bg-[#70171d]">
          <Plus className="h-4 w-4 mr-2" /> Create Purchase Order
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Purchase Orders Registry</span>
            <span className="text-xs text-muted-foreground font-medium">Total Orders: {orders.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No purchase orders created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase">
                  <TableHead>PO Reference</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Destination Warehouse</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Order Date</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((po) => {
                  const supName = suppliers.find((s) => s.id === po.supplier_id)?.name || `Supplier #${po.supplier_id}`;
                  const whName = warehouses.find((w) => w.id === po.warehouse_id)?.name || `Warehouse #${po.warehouse_id}`;
                  return (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-xs font-bold text-[#8C1D24]">{po.order_number}</TableCell>
                      <TableCell className="font-medium text-foreground text-xs">{supName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{whName}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">{money(po.total)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        {new Date(po.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              setSelectedOrder(po);
                              setEditStatus(po.status);
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5 text-muted-foreground hover:text-[#8C1D24]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setOrderToDelete(po)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create PO Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Purchase Order</DialogTitle>
            <DialogDescription>Issue a formal purchase order to a vendor for inventory replenishment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Select Supplier Vendor</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                className="w-full p-2 border border-border rounded bg-background"
              >
                {suppliers.length === 0 ? (
                  <option value={1}>Primary Industrial Supplier (Auto-created)</option>
                ) : (
                  suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">Destination Warehouse Facility</label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
                className="w-full p-2 border border-border rounded bg-background"
              >
                {warehouses.length === 0 ? (
                  <option value={1}>Main Distribution Center (Auto-created)</option>
                ) : (
                  warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">Item Description / Product Name</label>
              <input
                type="text"
                value={itemProductName}
                onChange={(e) => setItemProductName(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Order Quantity</label>
                <input
                  type="number"
                  value={itemQty}
                  onChange={(e) => setItemQty(Number(e.target.value))}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(Number(e.target.value))}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
            </div>
            <div>
              <label className="font-medium block mb-1">Purchase Notes</label>
              <input
                type="text"
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreatePurchaseOrder} className="bg-[#8C1D24] text-white">
              Issue Purchase Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit & Activity Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-base">
                <span>Manage Purchase Order</span>
                <span className="font-mono text-sm text-[#8C1D24]">{selectedOrder.order_number}</span>
              </DialogTitle>
              <DialogDescription>Update procurement lifecycle status and view transaction logs.</DialogDescription>
            </DialogHeader>

            {/* Status Editing */}
            <div className="p-3 bg-muted rounded-lg border border-border my-2 text-xs space-y-2">
              <label className="font-bold block text-foreground uppercase tracking-wide">Procurement Status</label>
              <div className="flex items-center gap-3">
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="p-1.5 border border-border rounded bg-background text-xs font-semibold"
                >
                  <option value="draft">Draft</option>
                  <option value="ordered">Ordered & Sent</option>
                  <option value="received">Goods Received (Stock Added)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <Button size="xs" onClick={handleUpdateStatus} className="bg-[#8C1D24] text-white hover:bg-[#70171d]">
                  Save Status
                </Button>
              </div>
            </div>

            {/* Activity Display Timeline */}
            <div className="space-y-4 my-3 text-xs">
              <h4 className="font-bold text-foreground uppercase tracking-wide">Activity Timeline Log</h4>
              
              <div className="relative border-l border-border pl-4 space-y-4 ml-2">
                {/* Milestone 1: Draft */}
                <div className="relative">
                  <div className="absolute -left-[21px] mt-0.5 bg-background border border-border rounded-full p-0.5">
                    <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Purchase Order Drafted</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* Milestone 2: Ordered */}
                {(selectedOrder.status === "ordered" || selectedOrder.status === "received" || selectedOrder.ordered_at) && (
                  <div className="relative">
                    <div className="absolute -left-[21px] mt-0.5 bg-background border border-border rounded-full p-0.5">
                      <Truck className="h-3 w-3 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Sent to Supplier Vendor</p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedOrder.ordered_at ? new Date(selectedOrder.ordered_at).toLocaleString() : "Confirmed"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Milestone 3: Received */}
                {selectedOrder.status === "received" && (
                  <div className="relative">
                    <div className="absolute -left-[21px] mt-0.5 bg-background border border-border rounded-full p-0.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-600">Goods Received & Stock Incremented</p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedOrder.received_at ? new Date(selectedOrder.received_at).toLocaleString() : "Updated"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Milestone 4: Cancelled */}
                {selectedOrder.status === "cancelled" && (
                  <div className="relative">
                    <div className="absolute -left-[21px] mt-0.5 bg-background border border-border rounded-full p-0.5">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    </div>
                    <div>
                      <p className="font-bold text-destructive">Purchase Order Cancelled</p>
                      <p className="text-[10px] text-muted-foreground">Voided transaction</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 border-t border-border pt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                Close Panel
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        {orderToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Delete Purchase Order
              </DialogTitle>
              <DialogDescription className="text-xs">
                Are you sure you want to delete Purchase Order <span className="font-bold">{orderToDelete.order_number}</span>? This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setOrderToDelete(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDeletePO}>
                Confirm Delete
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
