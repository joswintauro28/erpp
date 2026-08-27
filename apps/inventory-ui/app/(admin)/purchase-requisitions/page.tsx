"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  FileText,
  Loader2,
  Search,
  Send,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trash2,
  ClipboardCheck,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import { handleError } from "@datavex/ui-theme";
import { toastError, toastWarning } from "@/utils/toast";
import { money } from "@/utils/format";

interface ReqItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  estimated_price: number;
}

interface Requisition {
  id: number;
  pr_number: string;
  title: string;
  requested_by: string | null;
  department: string | null;
  priority: string;
  need_by_date?: string | null;
  notes?: string | null;
  status: string;
  approved_by?: string | null;
  rejected_reason?: string | null;
  purchase_order_id?: number | null;
  created_at: string;
  items?: ReqItem[];
}

interface Supplier {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  SUBMITTED: { label: "Submitted", cls: "bg-amber-600 text-white" },
  APPROVED: { label: "Approved", cls: "bg-blue-600 text-white" },
  REJECTED: { label: "Rejected", cls: "bg-red-600 text-white" },
  CONVERTED: { label: "Converted to PO", cls: "bg-emerald-600 text-white" },
  CANCELLED: { label: "Cancelled", cls: "bg-muted text-muted-foreground" },
};

export default function PurchaseRequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [reqToDelete, setReqToDelete] = useState<Requisition | null>(null);

  // Create form
  const [title, setTitle] = useState("Stock replenishment");
  const [department, setDepartment] = useState("Operations");
  const [priority, setPriority] = useState("MEDIUM");
  const [itemName, setItemName] = useState("Industrial Hydraulic Pump Parts");
  const [itemQty, setItemQty] = useState(25);
  const [itemPrice, setItemPrice] = useState(4500);
  const [reqNotes, setReqNotes] = useState("");

  // Convert form
  const [convertSupplier, setConvertSupplier] = useState<number | 0>(0);
  const [convertWarehouse, setConvertWarehouse] = useState<number | 0>(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const [reqData, supData, whData] = await Promise.all([
        api.get<Requisition[]>(`/purchase-requisitions${params}`),
        api.get<Supplier[]>("/suppliers"),
        api.get<Warehouse[]>("/warehouses"),
      ]);
      setRequisitions(reqData || []);
      setSuppliers(supData || []);
      setWarehouses(whData || []);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleCreate = async () => {
    try {
      await api.post("/purchase-requisitions", {
        title,
        department,
        priority,
        notes: reqNotes,
        items: [{ product_name: itemName, quantity: Number(itemQty), estimated_price: Number(itemPrice) }],
      });
      setIsAddOpen(false);
      fetchData();
    } catch (err) {
      handleError(err);
      toastError("Failed to create requisition", "Unknown product names must first exist in the product catalog.");
    }
  };

  const runStatus = async (id: number, action: "submit" | "approve" | "reject") => {
    try {
      await api.post(`/purchase-requisitions/${id}/${action}`);
      fetchData();
    } catch (err) {
      handleError(err);
      toastError("Action failed", "Invalid transition?");
    }
  };

  const handleConvert = async () => {
    if (!selectedReq) return;
    if (!convertSupplier || !convertWarehouse) {
      toastWarning("Select a supplier and destination warehouse for the purchase order.");
      return;
    }
    try {
      await api.post(`/purchase-requisitions/${selectedReq.id}/convert`, {
        supplier_id: Number(convertSupplier),
        warehouse_id: Number(convertWarehouse),
      });
      setSelectedReq(null);
      fetchData();
    } catch (err) {
      handleError(err);
      toastError("Conversion failed", "Only APPROVED requisitions can become purchase orders.");
    }
  };

  const handleDelete = async () => {
    if (!reqToDelete) return;
    try {
      await api.delete(`/purchase-requisitions/${reqToDelete.id}`);
      setReqToDelete(null);
      fetchData();
    } catch (err) {
      handleError(err);
      toastError("Failed to delete requisition.");
    }
  };

  const totalEstimate = (r: Requisition) =>
    (r.items || []).reduce((sum, i) => sum + i.quantity * i.estimated_price, 0);

  const filtered = requisitions.filter(
    (r) =>
      !search ||
      r.pr_number.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground] flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-[var(--shell-brand)]" />
            Purchase Requisitions
          </h1>
          <p className="mt-1 text-sm text-[--shell-muted]">
            Capture internal buy requests, route them through approval, and convert approved requests into purchase orders.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)} className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-action)]">
          <Plus className="h-4 w-4 mr-2" /> Create Requisition
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search requisition, title..."
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
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CONVERTED">Converted</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Requisition Registry</span>
            <span className="text-xs text-muted-foreground font-medium">Total: {requisitions.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No requisitions found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase">
                  <TableHead>Requisition</TableHead>
                  <TableHead>Title / Items</TableHead>
                  <TableHead className="text-center">Priority</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Est. Value</TableHead>
                  <TableHead className="text-right">Requested</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-bold text-[var(--shell-brand)]">{r.pr_number}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground text-xs">{r.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {(r.items || []).map((i) => `${i.product_name} ×${i.quantity}`).join(", ") || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px]">{r.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${STATUS_BADGES[r.status]?.cls || "bg-muted"} text-[10px]`}>
                        {STATUS_BADGES[r.status]?.label || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground text-xs">{money(totalEstimate(r))}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button variant="ghost" size="xs" onClick={() => setSelectedReq(r)}>
                          <FileText className="h-3.5 w-3.5 text-muted-foreground hover:text-[var(--shell-brand)]" />
                        </Button>
                        {r.status === "DRAFT" && (
                          <Button variant="ghost" size="xs" title="Submit for approval" onClick={() => runStatus(r.id, "submit")}>
                            <Send className="h-3.5 w-3.5 text-[var(--shell-info)]" />
                          </Button>
                        )}
                        {r.status === "SUBMITTED" && (
                          <>
                            <Button variant="ghost" size="xs" title="Approve" onClick={() => runStatus(r.id, "approve")}>
                              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--shell-success)]" />
                            </Button>
                            <Button variant="ghost" size="xs" title="Reject" onClick={() => runStatus(r.id, "reject")}>
                              <XCircle className="h-3.5 w-3.5 text-[var(--shell-danger)]" />
                            </Button>
                          </>
                        )}
                        {["DRAFT", "REJECTED", "CANCELLED"].includes(r.status) && (
                          <Button variant="ghost" size="xs" onClick={() => setReqToDelete(r)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
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
            <DialogTitle>Create Purchase Requisition</DialogTitle>
            <DialogDescription>Request stock from an internal buy list. Approved requests convert into formal purchase orders.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-border rounded bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Department</label>
                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full p-2 border border-border rounded bg-background" />
              </div>
              <div>
                <label className="font-medium block mb-1">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full p-2 border border-border rounded bg-background text-xs font-semibold">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="font-medium block mb-1">Item (must exist in Product Catalog)</label>
              <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full p-2 border border-border rounded bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Quantity</label>
                <input type="number" value={itemQty} onChange={(e) => setItemQty(Number(e.target.value))} className="w-full p-2 border border-border rounded bg-background" />
              </div>
              <div>
                <label className="font-medium block mb-1">Est. Unit Price (₹)</label>
                <input type="number" value={itemPrice} onChange={(e) => setItemPrice(Number(e.target.value))} className="w-full p-2 border border-border rounded bg-background" />
              </div>
            </div>
            <div>
              <label className="font-medium block mb-1">Notes</label>
              <input type="text" value={reqNotes} onChange={(e) => setReqNotes(e.target.value)} className="w-full p-2 border border-border rounded bg-background" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} className="bg-[var(--shell-brand)] text-white">Create Requisition</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail / convert modal */}
      <Dialog open={!!selectedReq} onOpenChange={(open) => !open && setSelectedReq(null)}>
        {selectedReq && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[var(--shell-brand)]" /> {selectedReq.pr_number}
                </span>
                <Badge className={`${STATUS_BADGES[selectedReq.status]?.cls || "bg-muted"} text-[10px]`}>
                  {STATUS_BADGES[selectedReq.status]?.label || selectedReq.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>{selectedReq.title}</DialogDescription>
            </DialogHeader>

            <div className="text-xs space-y-1.5 my-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Requested by</span><span className="font-medium">{selectedReq.requested_by || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span className="font-medium">{selectedReq.department || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Estimated total</span><span className="font-bold">{money(totalEstimate(selectedReq))}</span></div>
              {selectedReq.approved_by && (
                <div className="flex justify-between"><span className="text-muted-foreground">Approved by</span><span className="font-medium">{selectedReq.approved_by}</span></div>
              )}
              {selectedReq.rejected_reason && (
                <div className="flex justify-between"><span className="text-muted-foreground">Reject reason</span><span className="font-medium text-[var(--shell-danger)]">{selectedReq.rejected_reason}</span></div>
              )}
            </div>

            <div className="space-y-1.5 my-2 text-xs max-h-40 overflow-y-auto">
              {(selectedReq.items || []).map((i) => (
                <div key={i.id} className="flex justify-between border border-border rounded-md p-2">
                  <span className="font-medium">{i.product_name}</span>
                  <span className="text-muted-foreground">×{i.quantity} @ {money(i.estimated_price)}</span>
                </div>
              ))}
            </div>

            {selectedReq.status === "APPROVED" && (
              <div className="p-3 bg-[var(--shell-info-surface)]  border border-[var(--shell-info)]/30 rounded-md text-xs space-y-2">
                <p className="font-bold uppercase tracking-wide text-muted-foreground">Convert to Purchase Order</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-medium block mb-1">Supplier</label>
                    <select
                      value={convertSupplier}
                      onChange={(e) => setConvertSupplier(Number(e.target.value))}
                      className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
                    >
                      <option value={0}>Select supplier...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-medium block mb-1">Destination Warehouse</label>
                    <select
                      value={convertWarehouse}
                      onChange={(e) => setConvertWarehouse(Number(e.target.value))}
                      className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
                    >
                      <option value={0}>Select warehouse...</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button size="sm" onClick={handleConvert} className="bg-[var(--shell-brand)] text-white w-full">
                  <ArrowRight className="h-4 w-4 mr-2" /> Generate Purchase Order
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4 border-t border-border pt-3">
              {selectedReq.status === "SUBMITTED" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => runStatus(selectedReq.id, "reject")}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => runStatus(selectedReq.id, "approve")} className="bg-[var(--shell-brand)] text-white">
                    Approve
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedReq(null)}>Close</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete modal */}
      <Dialog open={!!reqToDelete} onOpenChange={(open) => !open && setReqToDelete(null)}>
        {reqToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" /> Delete Requisition
              </DialogTitle>
              <DialogDescription className="text-xs">
                Delete <span className="font-bold">{reqToDelete.pr_number}</span>? Only DRAFT, REJECTED, or CANCELLED requisitions can be deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setReqToDelete(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete}>Confirm Delete</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
