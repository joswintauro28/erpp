"use client";

import { useEffect, useState } from "react";
import purchaseOrderService from "@/services/purchaseOrderService";
import productService from "@/services/productService";
import warehouseService from "@/services/warehouseService";
import api from "@/services/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import usePermission from "@/hooks/usePermission";
import { ClipboardList, PackageCheck, Plus, Trash2 } from "lucide-react";
import "@/app/(dashboard)/_styles/Clients.css";

const emptyPo = { supplier_id: "", po_number: "", status: "draft", expected_date: "", notes: "", items: [] as any[] };
const emptyLine = { product_id: "", quantity: "1", unit_cost: "0" };

const asNumber = (value: any) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};
const money = (value: any) => `Rs.${asNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const lineTotal = (item: any) => asNumber(item.quantity) * asNumber(item.unit_cost);
const defaultUnitCost = (product: any) => String(product?.cost_price ?? product?.price ?? 0);

const badgeVariant = (status: any) => {
  if (status === "received") return "success";
  if (status === "partially_received") return "warning";
  if (status === "cancelled") return "destructive";
  return "secondary";
};

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [receiveModal, setReceiveModal] = useState(false);
  const [form, setForm] = useState(emptyPo);
  const [receiveForm, setReceiveForm] = useState({ warehouse_id: "", items: [] });
  const [receivingPo, setReceivingPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canCreate = usePermission("purchase_orders.create");
  const canManage = usePermission("purchase_orders.manage");
  const grandTotal = form.items.reduce((sum: any, item: any) => sum + lineTotal(item), 0);

  const fetchData = async () => {
    try {
      const [poRes, productRes, warehouseRes, supplierRes] = await Promise.all([
        purchaseOrderService.getAll(),
        productService.getAll(),
        warehouseService.getAll(),
        api.get("/suppliers/"),
      ]);
      setPurchaseOrders(poRes.data.data || []);
      setProducts(productRes.data.data || []);
      setWarehouses(warehouseRes.data.data || []);
      setSuppliers(supplierRes.data.data || []);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addLine = () => setForm((prev: any) => ({ ...prev, items: [...prev.items, { ...emptyLine }] }));
  const updateLine = (index: any, patch: any) => {
    setForm((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, i: any) => (i === index ? { ...item, ...patch } : item)),
    }));
  };
  const removeLine = (index: any) => setForm((prev: any) => ({ ...prev, items: prev.items.filter((_: any, i: any) => i !== index) }));

  const updateSelectedProduct = (index: any, productId: any) => {
    const product = products.find((p: any) => String(p.id) === String(productId));
    updateLine(index, {
      product_id: productId,
      unit_cost: product ? defaultUnitCost(product) : "0",
      unit_cost_touched: false,
    });
  };

  const updateQuantity = (index: any, quantity: any) => {
    const item = form.items[index];
    const product = products.find((p: any) => String(p.id) === String(item?.product_id));
    updateLine(index, {
      quantity,
      ...(product && !item?.unit_cost_touched ? { unit_cost: defaultUnitCost(product) } : {}),
    });
  };

  const openCreate = () => {
    setForm({ ...emptyPo, items: [{ ...emptyLine }] });
    setModalOpen(true);
  };

  const savePo = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    try {
      await purchaseOrderService.create({
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
        po_number: form.po_number || null,
        status: form.status,
        expected_date: form.expected_date || null,
        notes: form.notes,
        items: form.items.map((item: any) => ({
          product_id: parseInt(item.product_id),
          quantity: parseFloat(item.quantity),
          unit_cost: parseFloat(item.unit_cost),
        })),
      });
      setModalOpen(false);
      fetchData();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openReceive = async (po: any) => {
    try {
      const res = await purchaseOrderService.getById(po.id);
      const detail = res.data.data;
      setReceivingPo(detail);
      setReceiveForm({
        warehouse_id: warehouses[0]?.id || "",
        items: (detail.items || []).map((item: any) => {
          const remaining = Number(item.quantity || 0) - Number(item.received_quantity || 0);
          return {
            purchase_order_item_id: item.id,
            product_name: item.product_name,
            quantity: remaining > 0 ? String(remaining) : "0",
            remaining,
            batch_number: "",
            expiry_date: "",
            serial_numbers: "",
          };
        }),
      });
      setReceiveModal(true);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to load purchase order");
    }
  };

  const updateReceiveLine = (index: any, patch: any) => {
    setReceiveForm((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, i: any) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const saveReceive = async (event: any) => {
    event.preventDefault();
    setSaving(true);
    try {
      await purchaseOrderService.receive(receivingPo.id, {
        warehouse_id: parseInt(receiveForm.warehouse_id),
        items: receiveForm.items
          .filter((item: any) => Number(item.quantity) > 0)
          .map((item: any) => ({
            purchase_order_item_id: item.purchase_order_item_id,
            quantity: parseFloat(item.quantity),
            batch_number: item.batch_number || null,
            expiry_date: item.expiry_date || null,
            serial_numbers: item.serial_numbers.split("\n").map((s: any) => s.trim()).filter(Boolean),
          })),
      });
      setReceiveModal(false);
      fetchData();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Receive failed");
    } finally {
      setSaving(false);
    }
  };

  const deletePo = async (po: any) => {
    if (!window.confirm(`Delete ${po.po_number}?`)) return;
    try {
      await purchaseOrderService.delete(po.id);
      fetchData();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Delete failed");
    }
  };

  if (loading) return <Spinner size="lg" message="Loading purchase orders..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Purchase Orders</h1>
          <p>Create purchase orders and receive inventory</p>
        </div>
        {canCreate && <Button onClick={openCreate}><Plus size={16} /> New PO</Button>}
      </div>

      {error && <div className="page__error">{error}</div>}

      <Card>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <div className="page__empty"><ClipboardList size={48} /><p>No purchase orders found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell style={{ fontWeight: 500 }}>{po.po_number}</TableCell>
                    <TableCell>{suppliers.find((s: any) => s.id === po.supplier_id)?.name || (po.supplier_id ? `#${po.supplier_id}` : "—")}</TableCell>
                    <TableCell><Badge variant={badgeVariant(po.status)}>{po.status}</Badge></TableCell>
                    <TableCell>{po.expected_date || "-"}</TableCell>
                    <TableCell>{money(po.total)}</TableCell>
                    <TableCell>{po.item_count || 0}</TableCell>
                    <TableCell>
                      <div className="page__actions">
                        {canManage && po.status !== "received" && po.status !== "cancelled" && <Button variant="outline" size="sm" onClick={() => openReceive(po)}><PackageCheck size={15} /> Receive</Button>}
                        {canManage && po.status !== "received" && po.status !== "partially_received" && <Button variant="ghost" size="icon" onClick={() => deletePo(po)}><Trash2 size={15} color="var(--destructive)" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Purchase Order" size="lg">
        <form onSubmit={savePo} className="form-grid">
          <div className="form-grid two">
            <Input label="PO Number" value={form.po_number} onChange={(e: any) => setForm({ ...form, po_number: e.target.value })} placeholder="Auto-generated if blank" />
            <div>
              <label style={{ display: "block", marginBottom: 4, fontSize: "0.875rem", fontWeight: 500 }}>Supplier</label>
              <select
                value={form.supplier_id}
                onChange={(e: any) => setForm({ ...form, supplier_id: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", background: "var(--background)", color: "var(--foreground)" }}
              >
                <option value="">— No Supplier —</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Select label="Status" value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })} options={[{ value: "draft", label: "Draft" }, { value: "sent", label: "Sent" }]} />
            <Input label="Expected Date" type="date" value={form.expected_date} onChange={(e: any) => setForm({ ...form, expected_date: e.target.value })} />
          </div>
          <Input label="Notes" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} />
          <div className="line-items">
            {form.items.map((item: any, index: any) => (
              <div className="line-item-row po-line-item-row" key={index}>
                <Select label="Product" value={item.product_id} onChange={(e: any) => updateSelectedProduct(index, e.target.value)} options={products.map((p: any) => ({ value: p.id, label: `${p.name} (${p.sku})` }))} required />
                <Input label="Qty" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e: any) => updateQuantity(index, e.target.value)} required />
                <Input label="Unit Cost" type="number" min="0" step="0.01" value={item.unit_cost} onChange={(e: any) => updateLine(index, { unit_cost: e.target.value, unit_cost_touched: true })} required />
                <Input label="Line Total" value={money(lineTotal(item))} disabled />
                <Button variant="ghost" size="icon" onClick={() => removeLine(index)}><Trash2 size={15} /></Button>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={addLine}><Plus size={15} /> Add Item</Button>
          <div className="totals-box">
            <div><span>Subtotal</span><strong>{money(grandTotal)}</strong></div>
            <div className="grand"><span>Grand Total</span><strong>{money(grandTotal)}</strong></div>
          </div>
          <div className="form-actions">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={receiveModal} onClose={() => setReceiveModal(false)} title={`Receive ${receivingPo?.po_number || "PO"}`} size="lg">
        <form onSubmit={saveReceive} className="form-grid">
          <Select label="Warehouse" value={receiveForm.warehouse_id} onChange={(e: any) => setReceiveForm({ ...receiveForm, warehouse_id: e.target.value })} options={warehouses.map((w: any) => ({ value: w.id, label: w.name }))} required />
          <div className="line-items">
            {receiveForm.items.map((item: any, index: any) => (
              <div className="line-item-row" key={item.purchase_order_item_id}>
                <Input label="Product" value={item.product_name} disabled />
                <Input label={`Receive Qty (${item.remaining} remaining)`} type="number" min="0" step="0.01" max={item.remaining} value={item.quantity} onChange={(e: any) => updateReceiveLine(index, { quantity: e.target.value })} />
                <Input label="Batch Number" value={item.batch_number} onChange={(e: any) => updateReceiveLine(index, { batch_number: e.target.value })} />
                <Input label="Expiry Date" type="date" value={item.expiry_date} onChange={(e: any) => updateReceiveLine(index, { expiry_date: e.target.value })} />
                <div className="input-group">
                  <label className="input-label">Serials</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="One per line"
                    value={item.serial_numbers}
                    onChange={(e: any) => updateReceiveLine(index, { serial_numbers: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <Button variant="outline" onClick={() => setReceiveModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Receiving..." : "Receive Stock"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
