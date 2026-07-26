"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, MapPin, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import type { ApiWarehouse } from "@/types/inventory";
import WarehousesLoading from "./loading";

export default function Warehouses() {
  const [search, setSearch] = useState("");
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [ready, setReady] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<ApiWarehouse | null>(null);
  const [warehouseToDelete, setWarehouseToDelete] = useState<ApiWarehouse | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("Bangalore");
  const [formState, setFormState] = useState("Karnataka");

  const fetchWarehouses = () => {
    api.get<ApiWarehouse[]>("/warehouses")
      .then(setWarehouses)
      .catch(() => setWarehouses([]));
  };

  useEffect(() => {
    let cancelled = false;
    api.get<ApiWarehouse[]>("/warehouses")
      .then((data) => { if (!cancelled) setWarehouses(data); })
      .catch(() => { if (!cancelled) setWarehouses([]); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!formName) return;
    try {
      await api.post("/warehouses", {
        name: formName,
        code: formCode || `WH-${Math.floor(100 + Math.random() * 900)}`,
        address: formAddress || "Industrial Area",
        city: formCity,
        state: formState,
        country: "India",
      });
      setIsAddOpen(false); setFormName(""); setFormCode(""); fetchWarehouses();
    } catch (err) { console.error(err); }
  };

  const handleUpdate = async () => {
    if (!editingWarehouse) return;
    try {
      await api.put(`/warehouses/${editingWarehouse.id}`, {
        name: formName, code: formCode, address: formAddress,
        city: formCity, state: formState, country: "India",
        is_active: editingWarehouse.is_active,
      });
      setEditingWarehouse(null); fetchWarehouses();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!warehouseToDelete) return;
    try { await api.delete(`/warehouses/${warehouseToDelete.id}`); setWarehouseToDelete(null); fetchWarehouses(); }
    catch { alert("Failed to delete warehouse."); }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return warehouses;
    const q = search.toLowerCase();
    return warehouses.filter(
      (w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q)
    );
  }, [warehouses, search]);

  if (!ready) {
    return <WarehousesLoading />;
  }

  if (ready && warehouses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">Warehouses</h1>
            <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Manage warehouse locations</p>
          </div>
          <Button size="sm" onClick={() => setIsAddOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Warehouse</Button>
        </div>
        <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
          <MapPin className="h-12 w-12" />
          <p className="text-base font-medium text-[var(--shell-foreground)]">No warehouses yet</p>
          <p className="text-sm">Add your first warehouse to start tracking inventory locations.</p>
        </div>
        {/* Add Modal */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Warehouse</DialogTitle>
              <DialogDescription>Register a new facility.</DialogDescription>
            </DialogHeader>
            <WarehouseFormFields name={formName} setName={setFormName} code={formCode} setCode={setFormCode}
              address={formAddress} setAddress={setFormAddress} city={formCity} setCity={setFormCity} state={formState} setState={setFormState} />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} className="bg-[var(--shell-brand)] text-white">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-[var(--shell-brand)] shimmer-glow" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Warehouses
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Manage warehouse locations
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)} className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Warehouse
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
        <Input placeholder="Search warehouses..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((w) => (
          <Card key={w.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--shell-action)] shrink-0" />
                    <h3 className="font-heading text-sm font-semibold text-[var(--shell-foreground)] truncate">{w.name}</h3>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--shell-muted)] font-mono">{w.code}</p>
                  <p className="mt-1 text-xs text-[var(--shell-muted)] truncate">
                    {[w.address, w.city, w.state, w.country].filter(Boolean).join(", ") || "No address"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={w.is_active ? "default" : "secondary"} className="text-xs">
                    {w.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => {
                      setEditingWarehouse(w); setFormName(w.name); setFormCode(w.code);
                      setFormAddress(w.address || ""); setFormCity(w.city || "Bangalore"); setFormState(w.state || "Karnataka");
                    }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setWarehouseToDelete(w)}>
                      <Trash2 className="h-3 w-3 text-[var(--shell-muted)] hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Warehouse</DialogTitle>
            <DialogDescription>Register a new facility.</DialogDescription>
          </DialogHeader>
          <WarehouseFormFields name={formName} setName={setFormName} code={formCode} setCode={setFormCode}
            address={formAddress} setAddress={setFormAddress} city={formCity} setCity={setFormCity} state={formState} setState={setFormState} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} className="bg-[var(--shell-brand)] text-white">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingWarehouse} onOpenChange={(open) => !open && setEditingWarehouse(null)}>
        {editingWarehouse && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Warehouse</DialogTitle>
              <DialogDescription>Modify facility details.</DialogDescription>
            </DialogHeader>
            <WarehouseFormFields name={formName} setName={setFormName} code={formCode} setCode={setFormCode}
              address={formAddress} setAddress={setFormAddress} city={formCity} setCity={setFormCity} state={formState} setState={setFormState} />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setEditingWarehouse(null)}>Cancel</Button>
              <Button size="sm" onClick={handleUpdate} className="bg-[var(--shell-brand)] text-white">Save Changes</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!warehouseToDelete} onOpenChange={(open) => !open && setWarehouseToDelete(null)}>
        {warehouseToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Delete Warehouse
              </DialogTitle>
              <DialogDescription>
                Delete <strong>{warehouseToDelete.name}</strong>? This is permanent.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setWarehouseToDelete(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete}>Confirm Delete</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function WarehouseFormFields({ name, setName, code, setCode, address, setAddress, city, setCity, state, setState }: {
  name: string; setName: (v: string) => void; code: string; setCode: (v: string) => void;
  address: string; setAddress: (v: string) => void; city: string; setCity: (v: string) => void;
  state: string; setState: (v: string) => void;
}) {
  return (
    <div className="space-y-3 my-2 text-xs">
      <div>
        <label className="font-medium block mb-1">Facility Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Peenya Hub" className="w-full p-2 border border-border rounded bg-background" />
      </div>
      <div>
        <label className="font-medium block mb-1">Code</label>
        <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. WH-PEENYA" className="w-full p-2 border border-border rounded bg-background" />
      </div>
      <div>
        <label className="font-medium block mb-1">Address</label>
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder="Plot 45, Industrial Area" className="w-full p-2 border border-border rounded bg-background" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="font-medium block mb-1">City</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
            placeholder="Bangalore" className="w-full p-2 border border-border rounded bg-background" />
        </div>
        <div>
          <label className="font-medium block mb-1">State</label>
          <input type="text" value={state} onChange={(e) => setState(e.target.value)}
            placeholder="Karnataka" className="w-full p-2 border border-border rounded bg-background" />
        </div>
      </div>
    </div>
  );
}