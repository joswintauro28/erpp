import { useEffect, useState } from "react";
import inventoryService from "../services/inventoryService";
import productService from "../services/productService";
import warehouseService from "../services/warehouseService";
import { Card, CardContent } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import usePermission from "../hooks/usePermission";
import { Plus, ScanBarcode, Trash2 } from "lucide-react";
import "./Clients.css";

const emptyForm = { product_id: "", warehouse_id: "", serial_number: "", status: "available" };
const statuses = ["available", "reserved", "sold", "returned", "damaged"];

const variantForStatus = (status) => {
  if (status === "available") return "success";
  if (status === "sold" || status === "damaged") return "destructive";
  if (status === "reserved") return "warning";
  return "secondary";
};

export default function SerialManagement() {
  const [serials, setSerials] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const canManage = usePermission("inventory.serial.manage");

  const fetchData = async () => {
    try {
      const [serialRes, productRes, warehouseRes] = await Promise.all([
        inventoryService.getSerials(),
        productService.getAll(),
        warehouseService.getAll(),
      ]);
      setSerials(serialRes.data.data || []);
      setProducts(productRes.data.data || []);
      setWarehouses(warehouseRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load serials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveSerial = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await inventoryService.createSerial({
        product_id: parseInt(form.product_id),
        warehouse_id: parseInt(form.warehouse_id),
        serial_number: form.serial_number,
        status: form.status,
      });
      setModalOpen(false);
      setForm(emptyForm);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (serial, status) => {
    try {
      await inventoryService.updateSerialStatus(serial.id, status);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || "Status update failed");
    }
  };

  const deleteSerial = async (id) => {
    if (!window.confirm("Delete this serial number?")) return;
    try {
      await inventoryService.deleteSerial(id);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || "Delete failed");
    }
  };

  if (loading) return <Spinner size="lg" message="Loading serials..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Serial Management</h1>
          <p>Track serialized inventory by product and warehouse</p>
        </div>
        {canManage && <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Register Serial</Button>}
      </div>

      {error && <div className="page__error">{error}</div>}

      <Card>
        <CardContent>
          {serials.length === 0 ? (
            <div className="page__empty"><ScanBarcode size={48} /><p>No serial numbers found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serials.map((serial) => (
                  <TableRow key={serial.id}>
                    <TableCell>{serial.serial_number}</TableCell>
                    <TableCell>{serial.product_name}</TableCell>
                    <TableCell>{serial.warehouse_name}</TableCell>
                    <TableCell><Badge variant={variantForStatus(serial.status)}>{serial.status}</Badge></TableCell>
                    <TableCell>{serial.sold_invoice_id || "-"}</TableCell>
                    <TableCell>
                      <div className="page__actions">
                        {canManage && (
                          <Select
                            value={serial.status}
                            onChange={(e) => updateStatus(serial, e.target.value)}
                            options={statuses.map((status) => ({ value: status, label: status }))}
                          />
                        )}
                        {canManage && <Button variant="ghost" size="icon" onClick={() => deleteSerial(serial.id)}><Trash2 size={15} color="var(--destructive)" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register Serial">
        <form onSubmit={saveSerial} className="form-grid two">
          <Select label="Product" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))} required />
          <Select label="Warehouse" value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} options={warehouses.map((w) => ({ value: w.id, label: w.name }))} required />
          <Input label="Serial Number" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} required />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={statuses.map((status) => ({ value: status, label: status }))} />
          <div className="form-actions">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
