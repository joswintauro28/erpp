"use client";

import { useEffect, useState } from "react";
import { Plus, Truck, Loader2, Search, Building2, Phone, Mail, MapPin, Edit3, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import { toastError } from "@/utils/toast";

interface Supplier {
  id: number;
  name: string;
  code?: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  gst_number?: string | null;
  contact_person?: string | null;
  is_active: boolean;
  status?: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  const getStatusBadge = (s?: string, isActive?: boolean) => {
    const st = (s || (isActive !== false ? "ACTIVE" : "INACTIVE")).toUpperCase();
    if (st === "ACTIVE") return <Badge className="bg-emerald-600 text-white text-[10px]">Active Vendor</Badge>;
    if (st === "SUSPENDED") return <Badge variant="destructive" className="text-[10px]">Suspended</Badge>;
    return <Badge className="bg-muted text-muted-foreground text-[10px]">Inactive</Badge>;
  };

  const fetchSuppliers = () => {
    setLoading(true);
    api.get<Supplier[]>("/suppliers").then(setSuppliers).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleCreateSupplier = async () => {
    if (!name) return;
    try {
      await api.post("/suppliers", {
        name,
        email: email || "supplier@vendor.com",
        phone: phone || "+91 9876543210",
        city: city || "Bangalore",
        state: state || "Karnataka",
        contact_person: contactPerson || "Account Manager",
        gst_number: gstNumber || "29AAAAA0000A1Z5",
      });
      setIsAddOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return;
    try {
      await api.put(`/suppliers/${editingSupplier.id}`, {
        name,
        email,
        phone,
        city,
        state,
        contact_person: contactPerson,
        gst_number: gstNumber,
        status,
      });
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    try {
      await api.delete(`/suppliers/${supplierToDelete.id}`);
      setSupplierToDelete(null);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
      toastError("Failed to delete supplier.");
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground] flex items-center gap-2">
            <Truck className="h-6 w-6 text-[var(--shell-brand)]" />
            Supplier Vendor Directory
          </h1>
          <p className="mt-1 text-sm text-[--shell-muted]">
            Registered vendors, contact details, payment terms, and reordering history.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-action)]">
          <Plus className="h-4 w-4 mr-2" /> Add New Supplier
        </Button>
      </div>

      {/* Supplier List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search suppliers by name or city..."
                className="pl-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Total Suppliers: {suppliers.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No suppliers found in directory</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase">
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email & Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold text-foreground">{s.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.contact_person || "Vendor Rep"}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="font-medium text-foreground">{s.email || "N/A"}</div>
                        <div className="text-muted-foreground">{s.phone || "N/A"}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[s.city, s.state].filter(Boolean).join(", ") || "India"}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(s.status, s.is_active)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setEditingSupplier(s);
                            setName(s.name);
                            setEmail(s.email || "");
                            setPhone(s.phone || "");
                            setCity(s.city || "");
                            setState(s.state || "");
                            setContactPerson(s.contact_person || "");
                            setGstNumber(s.gst_number || "");
                            setStatus((s.status || (s.is_active !== false ? "ACTIVE" : "INACTIVE")).toUpperCase());
                          }}
                        >
                          <Edit3 className="h-3.5 w-3.5 text-muted-foreground hover:text-[var(--shell-brand)]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setSupplierToDelete(s)}
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

      {/* Add Supplier Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>Register a new vendor for procurement and reordering.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-medium block mb-1">Company / Supplier Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tata Steel Industrial Supply"
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full p-2 border border-border rounded bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendor@tatasteel.com"
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Jamshedpur"
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Jharkhand"
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateSupplier} className="bg-[var(--shell-brand)] text-white">
              Save Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Modal */}
      <Dialog open={!!editingSupplier} onOpenChange={(open) => !open && setEditingSupplier(null)}>
        {editingSupplier && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Supplier Details</DialogTitle>
              <DialogDescription>Modify vendor details and registry parameters.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-2 text-xs">
              <div>
                <label className="font-medium block mb-1">Company / Supplier Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-background"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-background"
                  />
                </div>
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
              <div>
                <label className="font-medium block mb-1">Vendor Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                >
                  <option value="ACTIVE">Active Vendor</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setEditingSupplier(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpdateSupplier} className="bg-[var(--shell-brand)] text-white">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Supplier Confirmation Modal */}
      <Dialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        {supplierToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Delete Supplier
              </DialogTitle>
              <DialogDescription className="text-xs">
                Are you sure you want to delete supplier <span className="font-bold">{supplierToDelete.name}</span>? This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setSupplierToDelete(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteSupplier}>
                Confirm Delete
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}