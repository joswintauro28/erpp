"use client";

import { useEffect, useState } from "react";
import stockService from "@/services/stockService";
import productService from "@/services/productService";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { Plus, Warehouse } from "lucide-react";
import "@/app/(dashboard)/_styles/Clients.css";

export default function Stock() {
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", movement_type: "In", quantity: "", location: "", reference: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchMovements = async () => {
    try {
      const res = await stockService.getAll();
      setMovements(res.data.data || []);
    } catch { setError("Failed to load stock movements"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMovements(); }, []);

  const openCreate = async () => {
    try {
      const res = await productService.getAll();
      setProducts(res.data.data || []);
    } catch { /* ignore */ }
    setForm({ product_id: "", movement_type: "In", quantity: "", location: "", reference: "" });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await stockService.create({
        product_id: parseInt(form.product_id),
        movement_type: form.movement_type,
        quantity: parseInt(form.quantity),
        location: form.location,
        reference: form.reference,
      });
      setModalOpen(false);
      fetchMovements();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Create failed");
    }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner size="lg" message="Loading stock movements..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Stock</h1>
          <p>Track inventory movements</p>
        </div>
        <Button variant="primary" onClick={openCreate}><Plus size={16} /> Add Movement</Button>
      </div>

      {error && <div style={{ color: "var(--destructive)", marginBottom: 16 }}>{error}</div>}

      <Card>
        <CardContent>
          {movements.length === 0 ? (
            <div className="page__empty"><Warehouse size={48} /><p>No stock movements found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(movements || []).map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.product_name || m.product_id}</TableCell>
                    <TableCell><code style={{ fontSize: "0.8125rem", background: "var(--muted)", padding: "2px 6px", borderRadius: 4 }}>{m.sku || "—"}</code></TableCell>
                    <TableCell>
                      <Badge variant={m.movement_type === "In" ? "success" : "destructive"}>
                        {m.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.quantity}</TableCell>
                    <TableCell>{m.location}</TableCell>
                    <TableCell>{m.reference}</TableCell>
                    <TableCell>{m.invoice_id || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Stock Movement">
        <form onSubmit={handleSave} className="form-grid">
          <Select
            label="Product"
            value={form.product_id}
            onChange={(e: any) => setForm({ ...form, product_id: e.target.value })}
            options={(products || []).map((p: any) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
            placeholder="Select product..."
            required
          />
          <Select
            label="Movement Type"
            value={form.movement_type}
            onChange={(e: any) => setForm({ ...form, movement_type: e.target.value })}
            options={[{ value: "In", label: "Stock In" }, { value: "Out", label: "Stock Out" }]}
          />
          <Input label="Quantity" type="number" min="1" value={form.quantity} onChange={(e: any) => setForm({ ...form, quantity: e.target.value })} required />
          <Input label="Location" value={form.location} onChange={(e: any) => setForm({ ...form, location: e.target.value })} required />
          <Input label="Reference" placeholder="PO number, invoice, etc." value={form.reference} onChange={(e: any) => setForm({ ...form, reference: e.target.value })} required />
          <div className="form-actions">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
