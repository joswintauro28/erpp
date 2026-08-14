"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Pencil, Truck, Power, PowerOff, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/services/api";
import { toastError } from "@/utils/toast";
import type { ApiSupplier } from "@/types/inventory";
import SuppliersLoading from "./loading";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<ApiSupplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<ApiSupplier | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGst, setFormGst] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPaymentTerms, setFormPaymentTerms] = useState("Net 30");

  const fetchSuppliers = () => {
    api.get<ApiSupplier[]>("/suppliers")
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  };

  useEffect(() => {
    let cancelled = false;
    api.get<ApiSupplier[]>("/suppliers")
      .then((data) => { if (!cancelled) setSuppliers(data); })
      .catch(() => { if (!cancelled) setSuppliers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!formName) return;
    try {
      await api.post("/suppliers", {
        name: formName, email: formEmail, phone: formPhone,
        gst_number: formGst, contact_person: formContact, payment_terms: formPaymentTerms,
        is_active: true,
      });
      setIsAddOpen(false); setFormName(""); fetchSuppliers();
    } catch (err) { console.error(err); }
  };

  const handleUpdate = async () => {
    if (!editingSupplier) return;
    try {
      await api.put(`/suppliers/${editingSupplier.id}`, {
        name: formName, email: formEmail, phone: formPhone,
        gst_number: formGst, contact_person: formContact, payment_terms: formPaymentTerms,
        is_active: editingSupplier.is_active,
      });
      setEditingSupplier(null); fetchSuppliers();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    try { await api.delete(`/suppliers/${supplierToDelete.id}`); setSupplierToDelete(null); fetchSuppliers(); }
    catch { toastError("Failed to delete supplier."); }
  };

  const toggleActive = async (s: ApiSupplier) => {
    try {
      await api.put(`/suppliers/${s.id}`, { is_active: !s.is_active });
      fetchSuppliers();
    } catch { /* ignore */ }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contact_person ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        (s.gst_number ?? "").toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  if (loading) {
    return <SuppliersLoading />;
  }

  if (suppliers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">Suppliers</h1>
            <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Manage vendor and supplier information</p>
          </div>
          <Button size="sm" onClick={() => setIsAddOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Supplier</Button>
        </div>
        <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
          <Truck className="h-12 w-12" />
          <p className="text-base font-medium text-[var(--shell-foreground)]">No suppliers yet</p>
          <p className="text-sm">Add your first supplier to start tracking vendors.</p>
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
            Suppliers
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Manage vendor and supplier information
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)} className="bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Supplier
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" />
        <Input placeholder="Search suppliers..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="hover:shadow-md transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Supplier</TableHead>
                <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Contact</TableHead>
                <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Email</TableHead>
                <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Phone</TableHead>
                <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">GST #</TableHead>
                <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">Terms</TableHead>
                <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] w-16">Status</TableHead>
                <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)] text-right w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className="hover:bg-[var(--shell-surface-alt)]/30 transition-colors">
                  <TableCell className="text-sm font-medium text-[var(--shell-foreground)]">{s.name}</TableCell>
                  <TableCell className="text-xs text-[var(--shell-muted)]">{s.contact_person ?? "-"}</TableCell>
                  <TableCell className="text-xs">{s.email ?? "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{s.phone ?? "-"}</TableCell>
                  <TableCell className="font-mono text-xs text-[var(--shell-muted)]">{s.gst_number ?? "-"}</TableCell>
                  <TableCell className="text-xs text-[var(--shell-muted)]">{s.payment_terms ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => {
                        setEditingSupplier(s); setFormName(s.name); setFormEmail(s.email || "");
                        setFormPhone(s.phone || ""); setFormGst(s.gst_number || "");
                        setFormContact(s.contact_person || ""); setFormPaymentTerms(s.payment_terms || "Net 30");
                      }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => toggleActive(s)}>
                        {s.is_active ? <PowerOff className="h-3 w-3 text-[var(--shell-muted)]" /> : <Power className="h-3 w-3 text-[var(--shell-success)]" />}
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setSupplierToDelete(s)}>
                        <Trash2 className="h-3 w-3 text-[var(--shell-muted)] hover:text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
            <DialogDescription>Register a new vendor.</DialogDescription>
          </DialogHeader>
          <SupplierFormFields name={formName} setName={setFormName} email={formEmail} setEmail={setFormEmail}
            phone={formPhone} setPhone={setFormPhone} gst={formGst} setGst={setFormGst}
            contact={formContact} setContact={setFormContact} paymentTerms={formPaymentTerms} setPaymentTerms={setFormPaymentTerms} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} className="bg-[var(--shell-brand)] text-white">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingSupplier} onOpenChange={(open) => !open && setEditingSupplier(null)}>
        {editingSupplier && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
              <DialogDescription>Modify vendor details.</DialogDescription>
            </DialogHeader>
            <SupplierFormFields name={formName} setName={setFormName} email={formEmail} setEmail={setFormEmail}
              phone={formPhone} setPhone={setFormPhone} gst={formGst} setGst={setFormGst}
              contact={formContact} setContact={setFormContact} paymentTerms={formPaymentTerms} setPaymentTerms={setFormPaymentTerms} />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setEditingSupplier(null)}>Cancel</Button>
              <Button size="sm" onClick={handleUpdate} className="bg-[var(--shell-brand)] text-white">Save Changes</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        {supplierToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Delete Supplier
              </DialogTitle>
              <DialogDescription>
                Delete <strong>{supplierToDelete.name}</strong>? This is permanent.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setSupplierToDelete(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete}>Confirm Delete</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function SupplierFormFields({ name, setName, email, setEmail, phone, setPhone, gst, setGst, contact, setContact, paymentTerms, setPaymentTerms }: {
  name: string; setName: (v: string) => void; email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void; gst: string; setGst: (v: string) => void;
  contact: string; setContact: (v: string) => void; paymentTerms: string; setPaymentTerms: (v: string) => void;
}) {
  return (
    <div className="space-y-3 my-2 text-xs">
      <div>
        <label className="font-medium block mb-1">Company Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Corp"
          className="w-full p-2 border border-border rounded bg-background" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="font-medium block mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-border rounded bg-background" />
        </div>
        <div>
          <label className="font-medium block mb-1">Phone</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full p-2 border border-border rounded bg-background" />
        </div>
      </div>
      <div>
        <label className="font-medium block mb-1">Contact Person</label>
        <input type="text" value={contact} onChange={(e) => setContact(e.target.value)}
          className="w-full p-2 border border-border rounded bg-background" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="font-medium block mb-1">GST Number</label>
          <input type="text" value={gst} onChange={(e) => setGst(e.target.value)}
            className="w-full p-2 border border-border rounded bg-background" />
        </div>
        <div>
          <label className="font-medium block mb-1">Payment Terms</label>
          <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}
            className="w-full p-2 border border-border rounded bg-background" />
        </div>
      </div>
    </div>
  );
}