"use client";

import { useEffect, useState } from "react";
import { ScanBarcode, Loader2, Search, Plus, Edit3, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";

interface SerialNumber {
  id: number;
  product_id: number;
  warehouse_id: number;
  serial_number: string;
  status: string;
  created_at: string;
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

const statusVariant = (s: string) => {
  const normalized = s.toLowerCase();
  if (normalized === "in_stock" || normalized === "in-stock" || normalized === "instock") return "default" as const;
  if (normalized === "sold") return "secondary" as const;
  if (normalized === "returned" || normalized === "damaged") return "destructive" as const;
  return "outline" as const;
};

export default function SerialNumbersPage() {
  const [serials, setSerials] = useState<SerialNumber[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSerial, setEditingSerial] = useState<SerialNumber | null>(null);
  const [serialToDelete, setSerialToDelete] = useState<SerialNumber | null>(null);

  // Form states
  const [serialNumber, setSerialNumber] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [status, setStatus] = useState("in_stock");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [serialsData, productsData, warehousesData] = await Promise.all([
        api.get<SerialNumber[]>("/serial-numbers"),
        api.get<Product[]>("/products"),
        api.get<Warehouse[]>("/warehouses"),
      ]);
      setSerials(serialsData || []);
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

  const handleCreate = async () => {
    if (!serialNumber || !selectedProductId || !selectedWarehouseId) {
      alert("Please fill in all fields.");
      return;
    }
    try {
      await api.post("/serial-numbers", {
        product_id: Number(selectedProductId),
        warehouse_id: Number(selectedWarehouseId),
        serial_number: serialNumber,
        status: status,
      });
      setIsAddOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!editingSerial || !serialNumber || !selectedProductId || !selectedWarehouseId) {
      alert("Please fill in all fields.");
      return;
    }
    try {
      await api.put(`/serial-numbers/${editingSerial.id}`, {
        product_id: Number(selectedProductId),
        warehouse_id: Number(selectedWarehouseId),
        serial_number: serialNumber,
        status: status,
      });
      setEditingSerial(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
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

  const resetForm = () => {
    setSerialNumber("");
    setSelectedProductId(products[0]?.id?.toString() || "");
    setSelectedWarehouseId(warehouses[0]?.id?.toString() || "");
    setStatus("in_stock");
  };

  const openAdd = () => {
    setSelectedProductId(products[0]?.id?.toString() || "");
    setSelectedWarehouseId(warehouses[0]?.id?.toString() || "");
    setSerialNumber("");
    setStatus("in_stock");
    setIsAddOpen(true);
  };

  const openEdit = (s: SerialNumber) => {
    setEditingSerial(s);
    setSerialNumber(s.serial_number);
    setSelectedProductId(s.product_id.toString());
    setSelectedWarehouseId(s.warehouse_id.toString());
    setStatus(s.status);
  };

  const filtered = serials.filter((s) => {
    const term = search.toLowerCase();
    const prodName = products.find(p => p.id === s.product_id)?.name?.toLowerCase() || "";
    const whName = warehouses.find(w => w.id === s.warehouse_id)?.name?.toLowerCase() || "";
    return (
      !search ||
      s.serial_number.toLowerCase().includes(term) ||
      prodName.includes(term) ||
      whName.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">Serial Numbers</h1>
          <p className="mt-1 text-sm text-[--shell-muted]">{serials.length} tracked serials</p>
        </div>
        <Button size="sm" onClick={openAdd} className="bg-[#8C1D24] text-white hover:bg-[#70171d]">
          <Plus className="h-4 w-4 mr-2" /> Add Serial Number
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanBarcode className="h-4 w-4 text-[#8C1D24]" />
            Serial Tracking Registry
          </CardTitle>
          <CardDescription>Track and manage unique hardware units by serial tags</CardDescription>
          <div className="relative w-full max-w-xs mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search serials, products..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No serial numbers found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase">
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Warehouse Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const prod = products.find((p) => p.id === s.product_id);
                  const wh = warehouses.find((w) => w.id === s.warehouse_id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs font-semibold">{s.serial_number}</TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {prod ? `${prod.name} (${prod.sku || "N/A"})` : `Product #${s.product_id}`}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {wh ? wh.name : `Warehouse #${s.warehouse_id}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(s.status)} className="text-[10px] scale-90 uppercase">
                          {s.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
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
          )}
        </CardContent>
      </Card>

      {/* Add Serial Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Serial Number</DialogTitle>
            <DialogDescription>Assign a unique serial number identifier to a product batch.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">Warehouse Location</label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">Serial Number Tag</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. SN-89201827"
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Inventory Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
              >
                <option value="in_stock">In Stock</option>
                <option value="sold">Sold</option>
                <option value="returned">Returned / Damaged</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} className="bg-[#8C1D24] text-white">
              Save Serial
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Serial Dialog */}
      <Dialog open={!!editingSerial} onOpenChange={(open) => !open && setEditingSerial(null)}>
        {editingSerial && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Serial Identifier</DialogTitle>
              <DialogDescription>Modify status or location assignment for this serial number.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-2 text-xs">
              <div>
                <label className="font-medium block mb-1">Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-medium block mb-1">Warehouse Location</label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-medium block mb-1">Serial Number Tag</label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Inventory Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background text-xs font-semibold"
                >
                  <option value="in_stock">In Stock</option>
                  <option value="sold">Sold</option>
                  <option value="returned">Returned / Damaged</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setEditingSerial(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpdate} className="bg-[#8C1D24] text-white">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!serialToDelete} onOpenChange={(open) => !open && setSerialToDelete(null)}>
        {serialToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Serial Tag?</DialogTitle>
              <DialogDescription>
                This will permanently delete serial tag <strong>{serialToDelete.serial_number}</strong>. This action is irreversible.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setSerialToDelete(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
                Confirm Delete
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
