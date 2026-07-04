"use client";

import { useEffect, useState } from "react";
import warehouseService from "@/services/warehouseService";
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
import { ArrowRightLeft, Edit, Eye, Plus, Trash2, Warehouse } from "lucide-react";
import "@/app/(dashboard)/_styles/Clients.css";

const emptyWarehouse = { name: "", code: "", address: "", city: "", state: "", country: "", status: "active" };
const emptyTransfer = { source_warehouse_id: "", destination_warehouse_id: "", product_id: "", quantity: "" };

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stockRows, setStockRows] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [warehouseModal, setWarehouseModal] = useState(false);
  const [stockModal, setStockModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyWarehouse);
  const [transfer, setTransfer] = useState(emptyTransfer);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canManage = usePermission("inventory.warehouses.manage");

  const fetchWarehouses = async () => {
    try {
      const res = await warehouseService.getAll();
      setWarehouses(res.data.data || []);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    productService.getAll().then((res: any) => setProducts(res.data.data || [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyWarehouse);
    setWarehouseModal(true);
  };

  const openEdit = (warehouse: any) => {
    setEditing(warehouse);
    setForm({
      name: warehouse.name || "",
      code: warehouse.code || "",
      address: warehouse.address || "",
      city: warehouse.city || "",
      state: warehouse.state || "",
      country: warehouse.country || "",
      status: warehouse.status || "active",
    });
    setWarehouseModal(true);
  };

  const saveWarehouse = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) await warehouseService.update(editing.id, form);
      else await warehouseService.create(form);
      setWarehouseModal(false);
      fetchWarehouses();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteWarehouse = async (warehouse: any) => {
    if (!window.confirm(`Delete ${warehouse.name}?`)) return;
    try {
      await warehouseService.delete(warehouse.id);
      fetchWarehouses();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Delete failed");
    }
  };

  const openStock = async (warehouse: any) => {
    setSelectedWarehouse(warehouse);
    setStockRows([]);
    setStockModal(true);
    try {
      const res = await warehouseService.getStock(warehouse.id);
      setStockRows(res.data.data || []);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to load warehouse stock");
    }
  };

  const openTransfer = () => {
    setTransfer(emptyTransfer);
    setTransferModal(true);
  };

  const saveTransfer = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    try {
      await warehouseService.transfer({
        source_warehouse_id: parseInt(transfer.source_warehouse_id),
        destination_warehouse_id: parseInt(transfer.destination_warehouse_id),
        product_id: parseInt(transfer.product_id),
        quantity: parseFloat(transfer.quantity),
      });
      setTransferModal(false);
      fetchWarehouses();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Transfer failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner size="lg" message="Loading warehouses..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Warehouses</h1>
          <p>Manage warehouse locations and stock transfers</p>
        </div>
        <div className="page__actions">
          {canManage && <Button variant="outline" onClick={openTransfer}><ArrowRightLeft size={16} /> Transfer</Button>}
          {canManage && <Button variant="primary" onClick={openCreate}><Plus size={16} /> Add Warehouse</Button>}
        </div>
      </div>

      {error && <div className="page__error">{error}</div>}

      <Card>
        <CardContent>
          {warehouses.length === 0 ? (
            <div className="page__empty"><Warehouse size={48} /><p>No warehouses found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Qty</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((warehouse: any) => (
                  <TableRow key={warehouse.id}>
                    <TableCell>{warehouse.name}</TableCell>
                    <TableCell>{warehouse.code || "-"}</TableCell>
                    <TableCell>{warehouse.city || "-"}</TableCell>
                    <TableCell><Badge variant={warehouse.status === "active" ? "success" : "secondary"}>{warehouse.status}</Badge></TableCell>
                    <TableCell>{Number(warehouse.total_quantity || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="page__actions">
                        <Button variant="ghost" size="icon" onClick={() => openStock(warehouse)}><Eye size={15} /></Button>
                        {canManage && <Button variant="ghost" size="icon" onClick={() => openEdit(warehouse)}><Edit size={15} /></Button>}
                        {canManage && warehouse.code !== "MAIN" && <Button variant="ghost" size="icon" onClick={() => deleteWarehouse(warehouse)}><Trash2 size={15} color="var(--destructive)" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={warehouseModal} onClose={() => setWarehouseModal(false)} title={editing ? "Edit Warehouse" : "Add Warehouse"}>
        <form onSubmit={saveWarehouse} className="form-grid two">
          <Input label="Name" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Code" value={form.code} onChange={(e: any) => setForm({ ...form, code: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} />
          <Input label="City" value={form.city} onChange={(e: any) => setForm({ ...form, city: e.target.value })} />
          <Input label="State" value={form.state} onChange={(e: any) => setForm({ ...form, state: e.target.value })} />
          <Input label="Country" value={form.country} onChange={(e: any) => setForm({ ...form, country: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
          <div className="form-actions">
            <Button variant="outline" onClick={() => setWarehouseModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={stockModal} onClose={() => setStockModal(false)} title={`${selectedWarehouse?.name || "Warehouse"} Stock`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Reorder Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockRows.map((row: any) => (
              <TableRow key={row.id}>
                <TableCell>{row.product_name}</TableCell>
                <TableCell>{row.sku}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>{row.reorder_level}</TableCell>
              </TableRow>
            ))}
            {stockRows.length === 0 && <TableRow><TableCell colSpan={4}>No stock in this warehouse</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Modal>

      <Modal isOpen={transferModal} onClose={() => setTransferModal(false)} title="Transfer Stock">
        <form onSubmit={saveTransfer} className="form-grid">
          <Select label="Source Warehouse" value={transfer.source_warehouse_id} onChange={(e: any) => setTransfer({ ...transfer, source_warehouse_id: e.target.value })} options={warehouses.map((w: any) => ({ value: w.id, label: w.name }))} required />
          <Select label="Destination Warehouse" value={transfer.destination_warehouse_id} onChange={(e: any) => setTransfer({ ...transfer, destination_warehouse_id: e.target.value })} options={warehouses.map((w: any) => ({ value: w.id, label: w.name }))} required />
          <Select label="Product" value={transfer.product_id} onChange={(e: any) => setTransfer({ ...transfer, product_id: e.target.value })} options={products.map((p: any) => ({ value: p.id, label: `${p.name} (${p.sku})` }))} required />
          <Input label="Quantity" type="number" min="0.01" step="0.01" value={transfer.quantity} onChange={(e: any) => setTransfer({ ...transfer, quantity: e.target.value })} required />
          <div className="form-actions">
            <Button variant="outline" onClick={() => setTransferModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Transferring..." : "Transfer"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
