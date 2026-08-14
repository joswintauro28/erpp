"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ScanBarcode, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import { toastError } from "@/utils/toast";
import type { ApiSerialNumber, ApiProduct, ApiWarehouse } from "@/types/inventory";
import SerialsLoading from "./loading";

const statusColors: Record<string, string> = {
  in_stock: "var(--shell-success)",
  sold: "var(--chart-3)",
  returned: "var(--chart-4)",
  warranty: "var(--chart-2)",
  scrapped: "var(--shell-danger)",
};

const statusLabels: Record<string, string> = {
  in_stock: "In Stock",
  sold: "Sold",
  returned: "Returned",
  warranty: "Warranty",
  scrapped: "Scrapped",
};

export default function Serials() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [serials, setSerials] = useState<ApiSerialNumber[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [ready, setReady] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSerial, setEditingSerial] = useState<ApiSerialNumber | null>(null);
  const [serialToDelete, setSerialToDelete] = useState<ApiSerialNumber | null>(null);
  const [formSerialNumber, setFormSerialNumber] = useState("");
  const [formProductId, setFormProductId] = useState(0);
  const [formWarehouseId, setFormWarehouseId] = useState(0);
  const [formStatus, setFormStatus] = useState("in_stock");

  const fetchSerials = () => {
    api.get<ApiSerialNumber[]>("/serial-numbers")
      .then((data) => setSerials(data))
      .catch(() => setSerials([]));
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<ApiSerialNumber[]>("/serial-numbers"),
      api.get<ApiProduct[]>("/products"),
      api.get<ApiWarehouse[]>("/warehouses"),
    ]).then(([s, p, w]) => {
      if (!cancelled) { setSerials(s); setProducts(p); setWarehouses(w); }
    }).catch(() => { if (!cancelled) { setSerials([]); setProducts([]); setWarehouses([]); } })
    .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!formSerialNumber || !formProductId) return;
    try {
      await api.post("/serial-numbers", {
        serial_number: formSerialNumber,
        product_id: formProductId,
        warehouse_id: formWarehouseId || 1,
        status: formStatus,
      });
      setIsAddOpen(false); setFormSerialNumber(""); fetchSerials();
    } catch (err) { console.error(err); }
  };

  const handleUpdate = async () => {
    if (!editingSerial) return;
    try {
      await api.put(`/serial-numbers/${editingSerial.id}`, {
        status: formStatus,
        warehouse_id: formWarehouseId || editingSerial.warehouse_id,
      });
      setEditingSerial(null); fetchSerials();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!serialToDelete) return;
    try { await api.delete(`/serial-numbers/${serialToDelete.id}`); setSerialToDelete(null); fetchSerials(); }
    catch { toastError("Failed to delete serial number."); }
  };

  const filtered = useMemo(() => {
    let res = serials;
    if (statusFilter) res = res.filter((s) => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter((s) => s.serial_number.toLowerCase().includes(q));
    }
    return res;
  }, [serials, search, statusFilter]);

  if (!ready) {
    return <SerialsLoading />;
  }

  if (ready && serials.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">Serial Numbers</h1>
            <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Serial number tracking for inventory items</p>
          </div>
          <Button size="sm" onClick={() => setIsAddOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Serial</Button>
        </div>
        <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
          <ScanBarcode className="h-12 w-12" />
          <p className="text-base font-medium text-[var(--shell-foreground)]">No serial numbers yet</p>
          <p className="text-sm">Serial numbers are created when products with serial tracking are received.</p>
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
            Serial Numbers
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Serial number tracking for inventory items
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)} className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Serial
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
          <Input placeholder="Search by serial number..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {["", "in_stock", "sold", "returned", "warranty", "scrapped"].map((s) => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="text-xs capitalize"
              onClick={() => setStatusFilter(s)}>{s ? statusLabels[s] : "All"}</Button>
          ))}
        </div>
      </div>

      <Card className="hover:shadow-md transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
              <ScanBarcode className="h-12 w-12" />
              <p className="text-base font-medium text-[var(--shell-foreground)]">
                {serials.length === 0 ? "No serial numbers yet" : "No serials match your search"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Serial #</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Product</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Warehouse</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Status</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">PO Ref</TableHead>
                  <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="hover:bg-[var(--shell-surface-alt)]/30 transition-colors">
                    <TableCell className="font-mono text-xs font-medium text-[var(--shell-foreground)]">{s.serial_number}</TableCell>
                    <TableCell className="text-xs">
                      {products.find((p) => p.id === s.product_id)?.name || `#${s.product_id}`}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--shell-muted)]">
                      {warehouses.find((w) => w.id === s.warehouse_id)?.name || `#${s.warehouse_id}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs" style={{ borderColor: statusColors[s.status], color: statusColors[s.status] }}>
                        {statusLabels[s.status] || s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[var(--shell-muted)]">
                      {s.purchase_order_id ? `PO-${s.purchase_order_id}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => {
                          setEditingSerial(s); setFormStatus(s.status); setFormWarehouseId(s.warehouse_id);
                        }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setSerialToDelete(s)}>
                          <Trash2 className="h-3 w-3 text-[var(--shell-muted)] hover:text-destructive" />
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

      {/* Add Serial Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Serial Number</DialogTitle>
            <DialogDescription>Register a new serial number for tracking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Serial Number</label>
              <input type="text" value={formSerialNumber} onChange={(e) => setFormSerialNumber(e.target.value)}
                placeholder="e.g. SN-2026-001" className="w-full p-2 border border-border rounded bg-background" />
            </div>
            <div>
              <label className="font-medium block mb-1">Product</label>
              <select value={formProductId} onChange={(e) => setFormProductId(Number(e.target.value))}
                className="w-full p-2 border border-border rounded bg-background text-xs font-semibold">
                <option value={0}>Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">Warehouse</label>
              <select value={formWarehouseId} onChange={(e) => setFormWarehouseId(Number(e.target.value))}
                className="w-full p-2 border border-border rounded bg-background text-xs font-semibold">
                <option value={0}>Select warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">Status</label>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background text-xs font-semibold">
                {Object.entries(statusLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} className="bg-[var(--shell-brand)] text-white">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Serial Modal */}
      <Dialog open={!!editingSerial} onOpenChange={(open) => !open && setEditingSerial(null)}>
        {editingSerial && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Serial Number</DialogTitle>
              <DialogDescription>Update serial number status or location.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-2 text-xs">
              <div>
                <label className="font-medium block mb-1">Serial Number</label>
                <p className="font-mono text-sm">{editingSerial.serial_number}</p>
              </div>
              <div>
                <label className="font-medium block mb-1">Warehouse</label>
                <select value={formWarehouseId} onChange={(e) => setFormWarehouseId(Number(e.target.value))}
                  className="w-full p-2 border border-border rounded bg-background text-xs font-semibold">
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-medium block mb-1">Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background text-xs font-semibold">
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setEditingSerial(null)}>Cancel</Button>
              <Button size="sm" onClick={handleUpdate} className="bg-[var(--shell-brand)] text-white">Save Changes</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!serialToDelete} onOpenChange={(open) => !open && setSerialToDelete(null)}>
        {serialToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Delete Serial
              </DialogTitle>
              <DialogDescription>
                Delete <strong>{serialToDelete.serial_number}</strong>? This is permanent.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setSerialToDelete(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete}>Confirm Delete</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}