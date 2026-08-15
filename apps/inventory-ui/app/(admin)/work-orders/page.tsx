"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Factory,
  Loader2,
  Search,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  Layers,
  Wrench,
  Trash2,
  Boxes,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import { toastError, toastWarning } from "@/utils/toast";

interface Operation {
  id: number;
  sequence: number;
  operation_name: string;
  workcenter: string | null;
  status: string;
}

interface Material {
  id: number;
  product_id: number;
  product_name: string;
  quantity_required: number;
  quantity_issued: number;
}

interface WorkOrder {
  id: number;
  work_order_no: string;
  product_id: number;
  product_name: string;
  sku: string | null;
  quantity: number;
  status: string;
  priority: string;
  due_date?: string | null;
  notes?: string | null;
  created_at: string;
  operations?: Operation[];
  materials?: Material[];
}

interface Product {
  id: number;
  name: string;
  sku: string | null;
  make_or_buy?: string;
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  RELEASED: { label: "Released", cls: "bg-blue-600 text-white" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-amber-600 text-white" },
  COMPLETED: { label: "Completed", cls: "bg-emerald-600 text-white" },
  CANCELLED: { label: "Cancelled", cls: "bg-red-600 text-white" },
};

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<WorkOrder | null>(null);

  // Create form
  const [productId, setProductId] = useState<number | 0>(0);
  const [quantity, setQuantity] = useState(10);
  const [priority, setPriority] = useState("MEDIUM");
  const [notes, setNotes] = useState("Manufacturing run");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const [woData, prodData] = await Promise.all([
        api.get<WorkOrder[]>(`/work-orders${params}`),
        api.get<Product[]>("/products"),
      ]);
      setOrders(woData || []);
      setProducts(prodData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleCreate = async () => {
    if (!productId) {
      toastWarning("Select the finished good to produce.");
      return;
    }
    try {
      await api.post("/work-orders", {
        product_id: Number(productId),
        quantity: Number(quantity),
        priority,
        notes,
      });
      setIsAddOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toastError("Failed to create work order.");
    }
  };

  const runAction = async (id: number, action: string) => {
    try {
      await api.post(`/work-orders/${id}/${action}`);
      fetchData();
    } catch (err) {
      console.error(err);
      toastError("Action failed", "Check backend logs.");
    }
  };

  const handleIssueMaterial = async (wo: WorkOrder, mat: Material) => {
    try {
      await api.post(`/work-orders/${wo.id}/issue-material`, {
        product_id: mat.product_id,
        quantity: mat.quantity_required - mat.quantity_issued,
      });
      setSelectedOrder(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toastError("Material issue failed", "Insufficient stock?");
    }
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    try {
      await api.delete(`/work-orders/${orderToDelete.id}`);
      setOrderToDelete(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toastError("Failed to delete work order.");
    }
  };

  const filtered = orders.filter(
    (o) =>
      !search ||
      o.work_order_no.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name.toLowerCase().includes(search.toLowerCase())
  );

  const counts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground] flex items-center gap-2">
            <Factory className="h-6 w-6 text-[var(--shell-brand)]" />
            Manufacturing Work Orders
          </h1>
          <p className="mt-1 text-sm text-[--shell-muted]">
            Plan production runs, release raw materials, route operations, and receive finished goods into stock.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)} className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-action)]">
          <Plus className="h-4 w-4 mr-2" /> Create Work Order
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(["DRAFT", "RELEASED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((s) => (
          <Card key={s}>
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">{STATUS_BADGES[s].label}</span>
              <span className="text-xl font-bold text-[var(--shell-brand)]">{counts[s] || 0}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search work order, product..."
            className="pl-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border border-border rounded bg-background text-xs font-semibold"
        >
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="RELEASED">Released</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Work Order Registry</span>
            <span className="text-xs text-muted-foreground font-medium">Total: {orders.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No work orders found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase">
                  <TableHead>Work Order</TableHead>
                  <TableHead>Finished Good</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Priority</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell className="font-mono text-xs font-bold text-[var(--shell-brand)]">{wo.work_order_no}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground text-xs">{wo.product_name}</div>
                      <div className="text-[10px] text-muted-foreground">{wo.sku || "—"}</div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-semibold">{wo.quantity}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          wo.priority === "HIGH" ? "border-red-300 text-red-600" : wo.priority === "LOW" ? "border-green-300 text-green-600" : ""
                        }`}
                      >
                        {wo.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${STATUS_BADGES[wo.status]?.cls || "bg-muted"} text-[10px]`}>
                        {STATUS_BADGES[wo.status]?.label || wo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(wo.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button variant="ghost" size="xs" onClick={() => setSelectedOrder(wo)}>
                          <Layers className="h-3.5 w-3.5 text-muted-foreground hover:text-[var(--shell-brand)]" />
                        </Button>
                        {wo.status === "DRAFT" && (
                          <Button variant="ghost" size="xs" title="Release (check raw material ATP)" onClick={() => runAction(wo.id, "release")}>
                            <Send className="h-3.5 w-3.5 text-blue-600" />
                          </Button>
                        )}
                        {wo.status === "RELEASED" && (
                          <Button variant="ghost" size="xs" title="Start production" onClick={() => runAction(wo.id, "start")}>
                            <Play className="h-3.5 w-3.5 text-amber-600" />
                          </Button>
                        )}
                        {wo.status === "IN_PROGRESS" && (
                          <Button variant="ghost" size="xs" title="Complete work order (credit finished goods)" onClick={() => runAction(wo.id, "complete")}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        )}
                        {!["COMPLETED", "CANCELLED"].includes(wo.status) && (
                          <Button variant="ghost" size="xs" title="Cancel" onClick={() => runAction(wo.id, "cancel")}>
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                        <Button variant="ghost" size="xs" onClick={() => setOrderToDelete(wo)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
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

      {/* Create modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Manufacturing Work Order</DialogTitle>
            <DialogDescription>Plan production of a finished good. Raw materials and routing operations are tracked on release.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Finished Good (Product)</label>
              <select
                value={productId}
                onChange={(e) => setProductId(Number(e.target.value))}
                className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
              >
                <option value={0}>Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ""} {p.make_or_buy === "make" ? "— Make" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Quantity to Produce</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="font-medium block mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} className="bg-[var(--shell-brand)] text-white">
              Create Work Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail / lifecycle modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[var(--shell-brand)]" /> {selectedOrder.work_order_no}
                </span>
                <Badge className={`${STATUS_BADGES[selectedOrder.status]?.cls || "bg-muted"} text-[10px]`}>
                  {STATUS_BADGES[selectedOrder.status]?.label || selectedOrder.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Producing {selectedOrder.quantity} × {selectedOrder.product_name}
                {selectedOrder.due_date ? ` · due ${new Date(selectedOrder.due_date).toLocaleDateString()}` : ""}
              </DialogDescription>
            </DialogHeader>

            {/* Routing operations */}
            <div className="space-y-2 my-2 text-xs">
              <h4 className="font-bold uppercase tracking-wide text-muted-foreground">Production Routing</h4>
              {(selectedOrder.operations || []).length === 0 ? (
                <p className="text-muted-foreground text-xs">No operations defined.</p>
              ) : (
                (selectedOrder.operations || [])
                  .slice()
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((op) => (
                    <div key={op.id} className="flex items-center justify-between border border-border rounded-md p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">#{op.sequence}</span>
                        <span className="font-medium">{op.operation_name}</span>
                        {op.workcenter && <span className="text-[10px] text-muted-foreground">· {op.workcenter}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {op.status}
                        </Badge>
                        {selectedOrder.status === "IN_PROGRESS" && op.status === "IN_PROGRESS" && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={async () => {
                              await runAction(selectedOrder.id, `operations/${op.id}/complete`);
                              setSelectedOrder(null);
                            }}
                          >
                            Complete
                          </Button>
                        )}
                        {selectedOrder.status === "IN_PROGRESS" && op.status === "PENDING" && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={async () => {
                              await runAction(selectedOrder.id, `operations/${op.id}/start`);
                              setSelectedOrder(null);
                            }}
                          >
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Raw materials */}
            <div className="space-y-2 my-2 text-xs">
              <h4 className="font-bold uppercase tracking-wide text-muted-foreground">Raw Materials (M2 — Issue to Production)</h4>
              {(selectedOrder.materials || []).length === 0 ? (
                <p className="text-muted-foreground text-xs">No raw materials linked. Release will only validate finished-good catalog.</p>
              ) : (
                (selectedOrder.materials || []).map((m) => (
                  <div key={m.id} className="flex items-center justify-between border border-border rounded-md p-2">
                    <div>
                      <span className="font-medium">{m.product_name}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">
                        issued {m.quantity_issued}/{m.quantity_required}
                      </span>
                    </div>
                    {selectedOrder.status !== "COMPLETED" && m.quantity_issued < m.quantity_required && (
                      <Button size="xs" onClick={() => handleIssueMaterial(selectedOrder, m)} className="bg-[var(--shell-brand)] text-white">
                        <Boxes className="h-3 w-3 mr-1" /> Issue Remaining
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            {selectedOrder.status === "RELEASED" && (
              <div className="p-3 bg-amber-50  border border-amber-200 rounded-md text-xs">
                Release succeeded. Start production to open routing operations and issue materials.
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4 border-t border-border pt-3">
              {selectedOrder.status === "IN_PROGRESS" && (
                <Button size="sm" onClick={() => runAction(selectedOrder.id, "complete")} className="bg-[var(--shell-brand)] text-white">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Complete & Credit Finished Goods
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete modal */}
      <Dialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        {orderToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" /> Delete Work Order
              </DialogTitle>
              <DialogDescription className="text-xs">
                Delete <span className="font-bold">{orderToDelete.work_order_no}</span>? Only DRAFT, RELEASED, or CANCELLED orders can be deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setOrderToDelete(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDelete}>
                Confirm Delete
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
