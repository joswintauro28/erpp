"use client";

import { useEffect, useState } from "react";
import inventoryService from "@/services/inventoryService";
import productService from "@/services/productService";
import warehouseService from "@/services/warehouseService";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import usePermission from "@/hooks/usePermission";
import { Boxes, Plus, Trash2 } from "lucide-react";
import "@/app/(dashboard)/_styles/Clients.css";

interface Batch {
  id: number;
  batch_number: string;
  product_name: string;
  warehouse_name: string;
  quantity: number;
  expiry_date?: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
}

interface Warehouse {
  id: number;
  name: string;
}

const emptyForm = { product_id: "", warehouse_id: "", batch_number: "", manufacture_date: "", expiry_date: "", quantity: "", purchase_price: "" };

export default function BatchManagement() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [expiring, setExpiring] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const canManage = usePermission("inventory.batch.manage");

  const fetchData = async () => {
    try {
      const [batchRes, expiringRes, productRes, warehouseRes] = await Promise.all([
        inventoryService.getBatches(),
        inventoryService.getExpiring(30),
        productService.getAll(),
        warehouseService.getAll(),
      ]);
      setBatches(batchRes.data.data || []);
      setExpiring(expiringRes.data.data || []);
      setProducts(productRes.data.data || []);
      setWarehouses(warehouseRes.data.data || []);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to load batches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await inventoryService.createBatch({
        product_id: parseInt(form.product_id),
        warehouse_id: parseInt(form.warehouse_id),
        batch_number: form.batch_number,
        manufacture_date: form.manufacture_date || null,
        expiry_date: form.expiry_date || null,
        quantity: parseFloat(form.quantity),
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      });
      setModalOpen(false);
      setForm(emptyForm);
      fetchData();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteBatch = async (id: number) => {
    if (!window.confirm("Delete this batch?")) return;
    try {
      await inventoryService.deleteBatch(id);
      fetchData();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Delete failed");
    }
  };

  if (loading) return <Spinner size="lg" message="Loading batches..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Batch Management</h1>
          <p>Track product batches and expiry dates</p>
        </div>
        {canManage && <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Add Batch</Button>}
      </div>

      {error && <div className="page__error">{error}</div>}

      <div className="page__grid">
        <Card>
          <CardContent>
            <div className="page__metric">Expiring in 30 days<strong>{expiring.length}</strong></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          {batches.length === 0 ? (
            <div className="page__empty"><Boxes size={48} /><p>No batches found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch: Batch) => {
                  const expiresSoon = expiring.some((item: Batch) => item.id === batch.id);
                  return (
                    <TableRow key={batch.id}>
                      <TableCell>{batch.batch_number}</TableCell>
                      <TableCell>{batch.product_name}</TableCell>
                      <TableCell>{batch.warehouse_name}</TableCell>
                      <TableCell>{batch.quantity}</TableCell>
                      <TableCell>{batch.expiry_date || "-"}</TableCell>
                      <TableCell>{expiresSoon ? <Badge variant="warning">Expiring</Badge> : <Badge variant="secondary">Tracked</Badge>}</TableCell>
                      <TableCell>
                        {canManage && <Button variant="ghost" size="icon" onClick={() => deleteBatch(batch.id)}><Trash2 size={15} color="var(--destructive)" /></Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Batch">
        <form onSubmit={saveBatch} className="form-grid two">
          <Select label="Product" value={form.product_id} onChange={(e: any) => setForm({ ...form, product_id: e.target.value })} options={products.map((p: Product) => ({ value: String(p.id), label: `${p.name} (${p.sku})` }))} required />
          <Select label="Warehouse" value={form.warehouse_id} onChange={(e: any) => setForm({ ...form, warehouse_id: e.target.value })} options={warehouses.map((w: Warehouse) => ({ value: String(w.id), label: w.name }))} required />
          <Input label="Batch Number" value={form.batch_number} onChange={(e: any) => setForm({ ...form, batch_number: e.target.value })} required />
          <Input label="Quantity" type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e: any) => setForm({ ...form, quantity: e.target.value })} required />
          <Input label="Manufacture Date" type="date" value={form.manufacture_date} onChange={(e: any) => setForm({ ...form, manufacture_date: e.target.value })} />
          <Input label="Expiry Date" type="date" value={form.expiry_date} onChange={(e: any) => setForm({ ...form, expiry_date: e.target.value })} />
          <Input label="Purchase Price" type="number" min="0" step="0.01" value={form.purchase_price} onChange={(e: any) => setForm({ ...form, purchase_price: e.target.value })} />
          <div className="form-actions">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
