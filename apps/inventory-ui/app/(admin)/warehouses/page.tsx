"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, Loader2, MapPin, Search, Edit3, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import { toastError } from "@/utils/toast";

interface Warehouse {
  id: number;
  name: string;
  code: string;
  address?: string | null;
  city: string | null;
  state: string | null;
  country?: string | null;
  is_active: boolean;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [state, setState] = useState("Karnataka");

  const fetchWarehouses = () => {
    setLoading(true);
    api.get<Warehouse[]>("/warehouses").then(setWarehouses).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreateWarehouse = async () => {
    if (!name) return;
    try {
      await api.post("/warehouses", {
        name,
        code: code || `WH-${Math.floor(100 + Math.random() * 900)}`,
        address: address || "Industrial Area",
        city,
        state,
        country: "India",
      });
      setIsAddOpen(false);
      setName("");
      setCode("");
      fetchWarehouses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateWarehouse = async () => {
    if (!editingWarehouse) return;
    try {
      await api.put(`/warehouses/${editingWarehouse.id}`, {
        name,
        code,
        address,
        city,
        state,
        country: "India",
        is_active: editingWarehouse.is_active,
      });
      setEditingWarehouse(null);
      fetchWarehouses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!warehouseToDelete) return;
    try {
      await api.delete(`/warehouses/${warehouseToDelete.id}`);
      setWarehouseToDelete(null);
      fetchWarehouses();
    } catch (err) {
      console.error(err);
      toastError("Failed to delete warehouse.");
    }
  };

  const filtered = warehouses.filter(
    (w) =>
      !search ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground] flex items-center gap-2">
            <Building2 className="h-6 w-6 text-[var(--shell-brand)]" />
            Warehouse Locations & Distribution Hubs
          </h1>
          <p className="mt-1 text-sm text-[--shell-muted]">
            Manage physical warehouse facilities, storage codes, and regional distribution centers.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-action)]">
          <Plus className="h-4 w-4 mr-2" /> Add New Warehouse
        </Button>
      </div>

      {/* Warehouse List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search warehouse name, code..."
                className="pl-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Total Locations: {warehouses.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No warehouse facilities found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase">
                  <TableHead>Facility Name</TableHead>
                  <TableHead>Location Code</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>City & State</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-semibold text-foreground">{w.name}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-[var(--shell-brand)]">{w.code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{w.address || "Industrial Layout"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[w.city, w.state].filter(Boolean).join(", ") || "India"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={w.is_active !== false ? "bg-emerald-600 text-white text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                        {w.is_active !== false ? "Operational" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setEditingWarehouse(w);
                            setName(w.name);
                            setCode(w.code);
                            setAddress(w.address || "");
                            setCity(w.city || "Bangalore");
                            setState(w.state || "Karnataka");
                          }}
                        >
                          <Edit3 className="h-3.5 w-3.5 text-muted-foreground hover:text-[var(--shell-brand)]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setWarehouseToDelete(w)}
                        >
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

      {/* Add Warehouse Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Warehouse Location</DialogTitle>
            <DialogDescription>Register a new warehouse facility for inventory tracking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Facility Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Peenya Central Distribution Hub"
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Warehouse Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. WH-PEENYA"
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plot 45, Phase 2, Industrial Area"
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bangalore"
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Karnataka"
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateWarehouse} className="bg-[var(--shell-brand)] text-white">
              Save Warehouse
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Warehouse Modal */}
      <Dialog open={!!editingWarehouse} onOpenChange={(open) => !open && setEditingWarehouse(null)}>
        {editingWarehouse && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Warehouse Details</DialogTitle>
              <DialogDescription>Modify storage configurations and regional details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-2 text-xs">
              <div>
                <label className="font-medium block mb-1">Facility Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Warehouse Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-background"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-background"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setEditingWarehouse(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpdateWarehouse} className="bg-[var(--shell-brand)] text-white">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Warehouse Confirmation Modal */}
      <Dialog open={!!warehouseToDelete} onOpenChange={(open) => !open && setWarehouseToDelete(null)}>
        {warehouseToDelete && (
          <DialogContent className="max-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Delete Warehouse Location
              </DialogTitle>
              <DialogDescription className="text-xs">
                Are you sure you want to delete warehouse <span className="font-bold">{warehouseToDelete.name}</span>? This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setWarehouseToDelete(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteWarehouse}>
                Confirm Delete
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
