"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import productService from "@/services/productService";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import usePermission from "@/hooks/usePermission";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import "@/app/(dashboard)/_styles/Clients.css";

const emptyForm = {
  name: "", category: "", sku: "", price: "", cost_price: "0", stock: "0",
  low_stock_threshold: "10", uses_batch_tracking: false, uses_serial_tracking: false,
  track_inventory: true, costing_method: "standard",
};

export default function Products() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canCreate = usePermission("products.create");
  const canEdit = usePermission("products.edit");
  const canDelete = usePermission("products.delete");

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      sku: p.sku,
      price: String(p.price),
      cost_price: String(p.cost_price ?? 0),
      stock: String(p.stock),
      low_stock_threshold: String(p.low_stock_threshold || 10),
      uses_batch_tracking: Boolean(p.uses_batch_tracking),
      uses_serial_tracking: p.uses_serial_tracking || false,
      track_inventory: p.track_inventory !== false,
      costing_method: p.costing_method || "standard",
    });
    setModalOpen(true);
  };

  const fetchProducts = async () => {
    try {
      const res = await productService.getAll();
      setProducts(res.data.data || []);
    } catch { setError("Failed to load products"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    const viewId = searchParams.get("view");
    if (viewId && products.length > 0) {
      const p = products.find((p: any) => String(p.id) === viewId);
      if (p) {
        openEdit(p);
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("view");
        router.replace(`/products?${nextParams.toString()}`);
      }
    }
  }, [products, searchParams, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isService = !form.track_inventory;
      const payload = {
        ...form,
        price: parseFloat(form.price),
        cost_price: parseFloat(form.cost_price || "0"),
        stock: isService ? 0 : parseInt(form.stock),
        low_stock_threshold: isService ? 0 : parseInt(form.low_stock_threshold || "10"),
        uses_batch_tracking: !isService && Boolean(form.uses_batch_tracking),
        uses_serial_tracking: !isService && Boolean(form.uses_serial_tracking),
        track_inventory: form.track_inventory,
      };
      if (editing) { await productService.update(editing.id, payload); }
      else { await productService.create(payload); }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Save failed");
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: any) => {
    if (!window.confirm("Delete this product?")) return;
    try { await productService.delete(id); fetchProducts(); }
    catch { setError("Delete failed"); }
  };

  if (loading) return <Spinner size="lg" message="Loading products..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Products</h1>
          <p>Product catalog management</p>
        </div>
        {canCreate && <Button variant="primary" onClick={openCreate}><Plus size={16} /> Add Product</Button>}
      </div>

      {error && <div style={{ color: "var(--destructive)", marginBottom: 16 }}>{error}</div>}

      <Card>
        <CardContent>
          {products.length === 0 ? (
            <div className="page__empty"><Package size={48} /><p>No products found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell><code style={{ fontSize: "0.8125rem", background: "var(--muted)", padding: "2px 6px", borderRadius: 4 }}>{p.sku}</code></TableCell>
                    <TableCell>
                      {p.track_inventory === false
                        ? <Badge variant="secondary">Service</Badge>
                        : <Badge variant="success">Stock</Badge>}
                    </TableCell>
                    <TableCell>Rs.{Number(p.cost_price || 0).toLocaleString()}</TableCell>
                    <TableCell>Rs.{Number(p.price).toLocaleString()}</TableCell>
                    <TableCell>
                      {p.track_inventory === false ? (
                        <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>N/A</span>
                      ) : (
                        <>
                          {p.stock}
                          {p.stock <= (p.low_stock_threshold || 10) && <Badge variant="warning" className="ml-badge">Low Stock</Badge>}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="page__actions">
                        {canEdit && <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit size={15} /></Button>}
                        {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 size={15} color="var(--destructive)" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "Add Product"} size="lg">
        <form onSubmit={handleSave} className="form-grid">
          <Input label="Name" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Category" value={form.category} onChange={(e: any) => setForm({ ...form, category: e.target.value })} required />
          <Input label="SKU" value={form.sku} onChange={(e: any) => setForm({ ...form, sku: e.target.value })} required />
          <Input label="Cost Price (Rs.)" type="number" min="0" step="0.01" value={form.cost_price} onChange={(e: any) => setForm({ ...form, cost_price: e.target.value })} required />
          <Input label="Price (Rs.)" type="number" min="0" step="0.01" value={form.price} onChange={(e: any) => setForm({ ...form, price: e.target.value })} required />

          {/* Track Inventory Toggle */}
          <div style={{ gridColumn: "1 / -1", padding: "12px 0", borderTop: "1px solid var(--border)", borderBottom: form.track_inventory ? "none" : "1px solid var(--border)" }}>
            <label style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
              <div
                onClick={() => setForm({ ...form, track_inventory: !form.track_inventory })}
                style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: form.track_inventory ? "var(--primary)" : "var(--muted-foreground)",
                  position: "relative", cursor: "pointer", transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 3, left: form.track_inventory ? 22 : 3,
                  width: 18, height: 18, borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>Track Inventory</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                  {form.track_inventory ? "Stock levels will be tracked for this product" : "Service product — no stock tracking"}
                </div>
              </div>
            </label>
          </div>

          {form.track_inventory && (
            <>
              <Input label="Initial Stock" type="number" min="0" value={form.stock} onChange={(e: any) => setForm({ ...form, stock: e.target.value })} required />
              <Input label="Low Stock Threshold" type="number" min="0" value={form.low_stock_threshold} onChange={(e: any) => setForm({ ...form, low_stock_threshold: e.target.value })} required />
              <Select
                label="Costing Method"
                value={form.costing_method}
                onChange={(e: any) => setForm({ ...form, costing_method: e.target.value })}
                options={[
                  { label: "Standard Cost", value: "standard" },
                  { label: "Weighted Average", value: "average" },
                  { label: "FIFO", value: "fifo" }
                ]}
              />
              <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: "0.875rem", fontWeight: 500 }}>
                <input type="checkbox" checked={form.uses_batch_tracking} onChange={(e: any) => setForm({ ...form, uses_batch_tracking: e.target.checked })} />
                Uses Batch Tracking
              </label>
              <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: "0.875rem", fontWeight: 500 }}>
                <input type="checkbox" checked={form.uses_serial_tracking} onChange={(e: any) => setForm({ ...form, uses_serial_tracking: e.target.checked })} />
                Uses Serial Tracking
              </label>
            </>
          )}

          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
