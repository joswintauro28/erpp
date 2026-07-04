"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import usePermission from "@/hooks/usePermission";
import { Plus, Edit, Trash2, Truck } from "lucide-react";
import "@/app/(dashboard)/_styles/Clients.css";

const emptyForm = { name: "", email: "", phone: "", gst_number: "", address: "", status: "active" };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canCreate = usePermission("suppliers.create");
  const canManage = usePermission("suppliers.manage");

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get("/suppliers/");
      setSuppliers(res.data.data || []);
    } catch { setError("Failed to load suppliers"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ name: s.name, email: s.email || "", phone: s.phone || "", gst_number: s.gst_number || "", address: s.address || "", status: s.status || "active" });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) { await api.put(`/suppliers/${editing.id}`, form); }
      else { await api.post("/suppliers/", form); }
      setModalOpen(false);
      fetch();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Save failed");
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: any) => {
    if (!window.confirm("Delete this supplier?")) return;
    try { await api.delete(`/suppliers/${id}`); fetch(); }
    catch { setError("Delete failed"); }
  };

  if (loading) return <Spinner size="lg" message="Loading suppliers..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Suppliers</h1>
          <p>Manage your supplier directory</p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={openCreate}><Plus size={16} /> Add Supplier</Button>
        )}
      </div>

      {error && <div style={{ color: "var(--destructive)", marginBottom: 16 }}>{error}</div>}

      <Card>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="page__empty">
              <Truck size={48} />
              <p>No suppliers found. Add your first supplier to start.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell style={{ fontWeight: 500 }}>{s.name}</TableCell>
                    <TableCell>{s.email || <span style={{ color: "var(--muted-foreground)" }}>—</span>}</TableCell>
                    <TableCell>{s.phone || <span style={{ color: "var(--muted-foreground)" }}>—</span>}</TableCell>
                    <TableCell>{s.gst_number || <span style={{ color: "var(--muted-foreground)" }}>—</span>}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "active" ? "success" : "secondary"}>{s.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="page__actions">
                        {canManage && <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit size={15} /></Button>}
                        {canManage && <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 size={15} color="var(--destructive)" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Supplier" : "Add Supplier"}>
        <form onSubmit={handleSave} className="form-grid">
          <Input label="Name *" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} />
          <Input label="GST Number" value={form.gst_number} onChange={(e: any) => setForm({ ...form, gst_number: e.target.value })} />
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.875rem", fontWeight: 500 }}>Address</label>
            <textarea
              value={form.address}
              onChange={(e: any) => setForm({ ...form, address: e.target.value })}
              rows={3}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", background: "var(--background)", color: "var(--foreground)", resize: "vertical" }}
            />
          </div>
          {error && <div style={{ color: "var(--destructive)", fontSize: "0.875rem", gridColumn: "1 / -1" }}>{error}</div>}
          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
