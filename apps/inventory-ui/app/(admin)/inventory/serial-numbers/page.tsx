"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ScanBarcode,
  Loader2,
  Search,
  Plus,
  Edit3,
  Trash2,
  Boxes,
  PackageOpen,
  PackageCheck,
  ShieldCheck,
  Tag,
  Wrench,
  Archive,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";

interface SerialNumber {
  id: number;
  product_id: number;
  product_name?: string | null;
  sku?: string | null;
  warehouse_id: number;
  warehouse_name?: string | null;
  serial_number: string;
  status: string;
  purchase_order_id?: number | null;
  sales_order_code?: string | null;
  warranty_until?: string | null;
  activated_at?: string | null;
  sold_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

interface SerialStats {
  total: number;
  in_stock: number;
  reserved: number;
  sold: number;
  returned: number;
  repair: number;
  damaged: number;
  retired: number;
  in_transit: number;
}

interface Product {
  id: number;
  name: string;
  sku?: string;
}

interface Warehouse {
  id: number;
  name: string;
}

const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  in_stock: { label: "In Stock", dot: "bg-emerald-500", badge: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/20" },
  reserved: { label: "Reserved", dot: "bg-blue-500", badge: "bg-blue-600/15 text-blue-700 dark:text-blue-400 border-blue-600/20" },
  sold: { label: "Sold", dot: "bg-slate-500", badge: "bg-slate-600/15 text-slate-700 dark:text-slate-300 border-slate-600/20" },
  returned: { label: "Returned", dot: "bg-amber-500", badge: "bg-amber-600/15 text-amber-700 dark:text-amber-400 border-amber-600/20" },
  repair: { label: "In Repair", dot: "bg-purple-500", badge: "bg-purple-600/15 text-purple-700 dark:text-purple-400 border-purple-600/20" },
  damaged: { label: "Damaged", dot: "bg-red-500", badge: "bg-red-600/15 text-red-700 dark:text-red-400 border-red-600/20" },
  retired: { label: "Retired", dot: "bg-zinc-400", badge: "bg-zinc-600/15 text-zinc-700 dark:text-zinc-300 border-zinc-600/20" },
  in_transit: { label: "In Transit", dot: "bg-cyan-500", badge: "bg-cyan-600/15 text-cyan-700 dark:text-cyan-400 border-cyan-600/20" },
};

const STATUS_ORDER = ["in_stock", "reserved", "in_transit", "sold", "returned", "repair", "damaged", "retired"];

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function SerialRegistryPage() {
  const [serials, setSerials] = useState<SerialNumber[]>([]);
  const [stats, setStats] = useState<SerialStats>({
    total: 0, in_stock: 0, reserved: 0, sold: 0, returned: 0,
    repair: 0, damaged: 0, retired: 0, in_transit: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSerial, setEditingSerial] = useState<SerialNumber | null>(null);
  const [serialToDelete, setSerialToDelete] = useState<SerialNumber | null>(null);

  // Form states
  const [form, setForm] = useState({
    product_id: "",
    warehouse_id: "",
    serial_number: "",
    sku: "",
    status: "in_stock",
    warranty_until: "",
    activated_at: "",
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [serialsData, statsData, productsData, warehousesData] = await Promise.all([
        api.get<SerialNumber[]>("/serial-numbers"),
        api.get<SerialStats>("/serial-numbers/stats"),
        api.get<Product[]>("/products"),
        api.get<Warehouse[]>("/warehouses"),
      ]);
      setSerials(serialsData || []);
      setStats(statsData || {});
      setProducts(productsData || []);
      setWarehouses(warehousesData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setForm({
      product_id: products[0]?.id?.toString() || "",
      warehouse_id: warehouses[0]?.id?.toString() || "",
      serial_number: "",
      sku: products[0]?.sku || "",
      status: "in_stock",
      warranty_until: "",
      activated_at: "",
      notes: "",
    });
  };

  const openAdd = () => {
    setForm({
      product_id: products[0]?.id?.toString() || "",
      warehouse_id: warehouses[0]?.id?.toString() || "",
      serial_number: "",
      sku: products[0]?.sku || "",
      status: "in_stock",
      warranty_until: "",
      activated_at: "",
      notes: "",
    });
    setIsAddOpen(true);
  };

  const openEdit = (s: SerialNumber) => {
    setEditingSerial(s);
    setForm({
      product_id: s.product_id.toString(),
      warehouse_id: s.warehouse_id.toString(),
      serial_number: s.serial_number,
      sku: s.sku || "",
      status: s.status,
      warranty_until: s.warranty_until ? s.warranty_until.slice(0, 10) : "",
      activated_at: s.activated_at ? s.activated_at.slice(0, 10) : "",
      notes: s.notes || "",
    });
  };

  const handleProductChange = (productId: string) => {
    const prod = products.find((p) => p.id === Number(productId));
    setForm((f) => ({ ...f, product_id: productId, sku: prod?.sku || "" }));
  };

  const handleCreate = async () => {
    if (!form.serial_number || !form.product_id || !form.warehouse_id) {
      alert("Serial tag, model, and warehouse are required.");
      return;
    }
    try {
      await api.post("/serial-numbers", {
        product_id: Number(form.product_id),
        warehouse_id: Number(form.warehouse_id),
        serial_number: form.serial_number,
        sku: form.sku || null,
        status: form.status,
        warranty_until: form.warranty_until || null,
        activated_at: form.activated_at || null,
        notes: form.notes || null,
      });
      setIsAddOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to register serial unit. Check backend logs.");
    }
  };

  const handleUpdate = async () => {
    if (!editingSerial) return;
    try {
      await api.put(`/serial-numbers/${editingSerial.id}`, {
        product_id: Number(form.product_id),
        warehouse_id: Number(form.warehouse_id),
        serial_number: form.serial_number,
        sku: form.sku || null,
        status: form.status,
        warranty_until: form.warranty_until || null,
        activated_at: form.activated_at || null,
        notes: form.notes || null,
      });
      setEditingSerial(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to update serial unit.");
    }
  };

  const handleDelete = async () => {
    if (!serialToDelete) return;
    try {
      await api.delete(`/serial-numbers/${serialToDelete.id}`);
      setSerialToDelete(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return serials.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (!term) return true;
      return (
        s.serial_number.toLowerCase().includes(term) ||
        (s.sku || "").toLowerCase().includes(term) ||
        (s.product_name || "").toLowerCase().includes(term) ||
        (s.warehouse_name || "").toLowerCase().includes(term) ||
        (s.sales_order_code || "").toLowerCase().includes(term)
      );
    });
  }, [serials, search, statusFilter]);

  const kpis = [
    { label: "REGISTERED UNITS", value: stats.total, icon: ScanBarcode, tone: "text-[#8C1D24]" },
    { label: "IN STOCK", value: stats.in_stock, icon: PackageOpen, tone: "text-emerald-600" },
    { label: "RESERVED", value: stats.reserved, icon: ShieldCheck, tone: "text-blue-600" },
    { label: "SOLD", value: stats.sold, icon: PackageCheck, tone: "text-slate-600" },
    { label: "RETURNS & REPAIRS", value: (stats.returned || 0) + (stats.repair || 0) + (stats.damaged || 0), icon: Wrench, tone: "text-amber-600" },
  ];

  const getStatusMeta = (status: string) => STATUS_META[status] || { label: status, dot: "bg-zinc-400", badge: "" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#E5B83C]">Hardware Unit Ledger</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground] flex items-center gap-2">
            Serial Registry
          </h1>
          <p className="mt-1 text-sm text-[--shell-muted]">
            Every serial tag mapped to its model/SKU, tracked across its lifecycle from receipt to retirement.
          </p>
        </div>
        <Button size="sm" onClick={openAdd} className="bg-[#8C1D24] text-white hover:bg-[#70171d]">
          <Plus className="h-4 w-4 mr-2" /> Register Unit
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k, idx) => (
          <Card key={k.label} className="kpi-enter border-border" style={{ animationDelay: `${idx * 60}ms` }}>
            <CardContent className="p-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[--shell-muted]">{k.label}</p>
                <p className="text-2xl font-bold tracking-tight mt-1">{k.value ?? 0}</p>
              </div>
              <k.icon className={`h-5 w-5 ${k.tone}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanBarcode className="h-4 w-4 text-[#8C1D24]" />
              Serial Tag Registry
            </CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tag, model/SKU, product, warehouse..."
                  className="pl-9 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <CardDescription>
            Serial tags are unique physical identities for hardware units; each is bound to the product model it represents.
          </CardDescription>

          {/* Lifecycle status chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors border ${
                statusFilter === "ALL"
                  ? "bg-[#8C1D24] text-white border-[#8C1D24]"
                  : "border-border text-[--shell-muted] hover:bg-muted"
              }`}
            >
              All Lifecycles ({serials.length})
            </button>
            {STATUS_ORDER.map((st) => {
              const meta = getStatusMeta(st);
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(active ? "ALL" : st)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors border ${
                    active
                      ? "bg-[#8C1D24] text-white border-[#8C1D24]"
                      : "border-border text-[--shell-muted] hover:bg-muted"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${active ? "bg-white" : ""}`} />
                  {meta.label} ({stats[st as keyof SerialStats] ?? 0})
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#E5B83C]" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Archive className="h-8 w-8 mx-auto text-[--shell-muted]" />
              <p className="text-sm text-muted-foreground">
                {serials.length === 0 ? "No serial units registered yet." : "No serial units match the current filters."}
              </p>
              {serials.length === 0 && (
                <Button size="sm" variant="outline" onClick={openAdd} className="mt-1">
                  <Plus className="h-4 w-4 mr-2" /> Register the first unit
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs uppercase">
                    <TableHead>Serial Tag</TableHead>
                    <TableHead>Model / SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Lifecycle</TableHead>
                    <TableHead>Warranty</TableHead>
                    <TableHead className="hidden lg:table-cell">SO / Notes</TableHead>
                    <TableHead className="hidden xl:table-cell">Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    const meta = getStatusMeta(s.status);
                    const warrantyExpired = s.warranty_until && new Date(s.warranty_until) < new Date();
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs font-semibold text-foreground">{s.serial_number}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C1D24]">
                            <Tag className="h-3 w-3" />
                            {s.sku || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{s.product_name || `Product #${s.product_id}`}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.warehouse_name || `WH #${s.warehouse_id}`}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.warranty_until ? (
                            <span className={warrantyExpired ? "text-destructive font-semibold" : "text-muted-foreground"}>
                              {formatDate(s.warranty_until)}
                              {warrantyExpired ? " · Expired" : ""}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[180px] truncate" title={s.notes || ""}>
                          {s.sales_order_code ? (
                            <span className="font-medium text-foreground">SO {s.sales_order_code}</span>
                          ) : s.notes ? (
                            s.notes
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{formatDate(s.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="xs" onClick={() => openEdit(s)}>
                              <Edit3 className="h-3.5 w-3.5 text-muted-foreground hover:text-[#8C1D24]" />
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => setSerialToDelete(s)}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5 text-[#8C1D24]" /> Register Serial Unit
            </DialogTitle>
            <DialogDescription>
              Register a unique hardware unit and bind it to its model/SKU. The SKU is mapped automatically from the selected product.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <Label className="mb-1 block">Product Model</Label>
              <select
                value={form.product_id}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block">Model / SKU</Label>
              <Input
                type="text"
                value={form.sku}
                readOnly
                placeholder="Mapped from product"
                className="text-xs bg-muted"
              />
              <p className="text-[10px] text-muted-foreground mt-1">SKU is bound to the selected product and cannot be changed.</p>
            </div>
            <div>
              <Label className="mb-1 block">Serial Tag <span className="text-destructive">*</span></Label>
              <Input
                type="text"
                value={form.serial_number}
                onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                placeholder="e.g. HV-8C1D-2408-001"
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label className="mb-1 block">Warehouse Location</Label>
              <select
                value={form.warehouse_id}
                onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))}
                className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="mb-1 block">Lifecycle Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
                >
                  {STATUS_ORDER.map((st) => (
                    <option key={st} value={st}>{STATUS_META[st].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block">Activated</Label>
                <Input
                  type="date"
                  value={form.activated_at}
                  onChange={(e) => setForm((f) => ({ ...f, activated_at: e.target.value }))}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="mb-1 block">Warranty Until</Label>
                <Input
                  type="date"
                  value={form.warranty_until}
                  onChange={(e) => setForm((f) => ({ ...f, warranty_until: e.target.value }))}
                  className="text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Batch, invoice ref, condition remarks..."
                className="text-xs"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} className="bg-[#8C1D24] text-white">Register Unit</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingSerial} onOpenChange={(open) => !open && setEditingSerial(null)}>
        {editingSerial && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Serial Unit</DialogTitle>
              <DialogDescription>Update lifecycle status, location, or warranty for this serial tag.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-2 text-xs">
              <div>
                <Label className="mb-1 block">Product Model</Label>
                <select
                  value={form.product_id}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block">Model / SKU</Label>
                <Input
                  type="text"
                  value={form.sku}
                  readOnly
                  className="text-xs bg-muted"
                />
              </div>
              <div>
                <Label className="mb-1 block">Serial Tag</Label>
                <Input
                  type="text"
                  value={form.serial_number}
                  onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="mb-1 block">Warehouse Location</Label>
                <select
                  value={form.warehouse_id}
                  onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))}
                  className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1 block">Lifecycle Status</Label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
                  >
                    {STATUS_ORDER.map((st) => (
                      <option key={st} value={st}>{STATUS_META[st].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block">Activated</Label>
                  <Input
                    type="date"
                    value={form.activated_at}
                    onChange={(e) => setForm((f) => ({ ...f, activated_at: e.target.value }))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Warranty Until</Label>
                  <Input
                    type="date"
                    value={form.warranty_until}
                    onChange={(e) => setForm((f) => ({ ...f, warranty_until: e.target.value }))}
                    className="text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1 block">Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="text-xs"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setEditingSerial(null)}>Cancel</Button>
              <Button size="sm" onClick={handleUpdate} className="bg-[#8C1D24] text-white">Save Changes</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!serialToDelete} onOpenChange={(open) => !open && setSerialToDelete(null)}>
        {serialToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Retire this serial tag?</DialogTitle>
              <DialogDescription>
                This permanently removes serial tag <strong className="font-mono">{serialToDelete.serial_number}</strong> ({serialToDelete.sku || "no SKU"}) from the registry. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setSerialToDelete(null)}>Cancel</Button>
              <Button size="sm" onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Delete Tag</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
