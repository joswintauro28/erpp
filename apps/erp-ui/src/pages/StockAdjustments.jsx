import { useEffect, useState } from "react";
import api from "../services/api";
import productService from "../services/productService";
import { Card, CardContent } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import Badge from "../components/ui/Badge";
import usePermission from "../hooks/usePermission";
import { Plus, TrendingUp, TrendingDown, SlidersHorizontal } from "lucide-react";
import "./Clients.css";

const REASONS = [
  "Physical count correction",
  "Damaged goods",
  "Expired goods removed",
  "Theft / loss",
  "Return from customer",
  "Supplier return",
  "Production use",
  "Opening stock entry",
  "Other",
];

const emptyForm = {
  product_id: "", warehouse_id: "",
  adjustment_type: "increase",
  quantity: "", reason: "", notes: "",
};

export default function StockAdjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canAdjust = usePermission("stock.adjust");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [adjRes, prodRes, whRes] = await Promise.all([
        api.get("/stock/adjustments"),
        productService.getAll(),
        api.get("/warehouses/"),
      ]);
      setAdjustments(adjRes.data.data || []);
      // Only inventory-tracked products
      setProducts((prodRes.data.data || []).filter(p => p.track_inventory !== false));
      setWarehouses(whRes.data.data || []);
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        product_id: parseInt(form.product_id),
        warehouse_id: form.warehouse_id ? parseInt(form.warehouse_id) : null,
        adjustment_type: form.adjustment_type,
        quantity: parseFloat(form.quantity),
        reason: form.reason,
        notes: form.notes || null,
      };
      await api.post("/stock/adjustments", payload);
      setSuccess(`Stock ${form.adjustment_type}d successfully`);
      setModalOpen(false);
      setForm(emptyForm);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Adjustment failed");
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner size="lg" message="Loading stock adjustments..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Stock Adjustments</h1>
          <p>Manual stock corrections with full audit trail</p>
        </div>
        {canAdjust && (
          <Button variant="primary" onClick={() => { setForm(emptyForm); setError(""); setModalOpen(true); }}>
            <Plus size={16} /> New Adjustment
          </Button>
        )}
      </div>

      {error && <div style={{ color: "var(--destructive)", marginBottom: 12, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>{error}</div>}
      {success && <div style={{ color: "#16a34a", marginBottom: 12, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>{success}</div>}

      <Card>
        <CardContent>
          {adjustments.length === 0 ? (
            <div className="page__empty">
              <SlidersHorizontal size={48} />
              <p>No stock adjustments yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Adjusted By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell style={{ whiteSpace: "nowrap" }}>
                      {new Date(a.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <div style={{ fontWeight: 500 }}>{a.product_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{a.sku}</div>
                    </TableCell>
                    <TableCell>{a.warehouse_name || "—"}</TableCell>
                    <TableCell>
                      {a.adjustment_type === "increase" ? (
                        <Badge variant="success"><TrendingUp size={12} style={{ marginRight: 4 }} />Increase</Badge>
                      ) : (
                        <Badge variant="destructive"><TrendingDown size={12} style={{ marginRight: 4 }} />Decrease</Badge>
                      )}
                    </TableCell>
                    <TableCell style={{ fontWeight: 600 }}>
                      <span style={{ color: a.adjustment_type === "increase" ? "#16a34a" : "#dc2626" }}>
                        {a.adjustment_type === "increase" ? "+" : "−"}{a.quantity}
                      </span>
                    </TableCell>
                    <TableCell style={{ maxWidth: 220 }}>
                      <div style={{ fontWeight: 500 }}>{a.reason}</div>
                      {a.notes && <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{a.notes}</div>}
                    </TableCell>
                    <TableCell style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                      {a.adjusted_by_email || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Stock Adjustment" size="default">
        <form onSubmit={handleSave} className="form-grid">
          {/* Product */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.875rem", fontWeight: 500 }}>Product *</label>
            <select
              required
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", background: "var(--background)", color: "var(--foreground)" }}
            >
              <option value="">— Select product —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.stock}</option>)}
            </select>
          </div>

          {/* Warehouse */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.875rem", fontWeight: 500 }}>Warehouse</label>
            <select
              value={form.warehouse_id}
              onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", background: "var(--background)", color: "var(--foreground)" }}
            >
              <option value="">— Default (Main Warehouse) —</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
            </select>
          </div>

          {/* Adjustment Type */}
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12 }}>
            {["increase", "decrease"].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setForm({ ...form, adjustment_type: type })}
                style={{
                  flex: 1, padding: "10px 0", border: "2px solid",
                  borderColor: form.adjustment_type === type ? (type === "increase" ? "#16a34a" : "#dc2626") : "var(--border)",
                  borderRadius: 8, background: form.adjustment_type === type
                    ? (type === "increase" ? "#f0fdf4" : "#fef2f2") : "var(--card)",
                  color: form.adjustment_type === type ? (type === "increase" ? "#16a34a" : "#dc2626") : "var(--foreground)",
                  cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "all 0.15s",
                }}
              >
                {type === "increase" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {type === "increase" ? "Increase Stock" : "Decrease Stock"}
              </button>
            ))}
          </div>

          <Input
            label="Quantity *"
            type="number"
            min="0.01"
            step="0.01"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            required
          />

          {/* Reason */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.875rem", fontWeight: 500 }}>Reason *</label>
            <select
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", background: "var(--background)", color: "var(--foreground)" }}
            >
              <option value="">— Select reason —</option>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.875rem", fontWeight: 500 }}>Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", background: "var(--background)", color: "var(--foreground)", resize: "vertical" }}
            />
          </div>

          {error && <div style={{ color: "var(--destructive)", fontSize: "0.875rem", gridColumn: "1 / -1" }}>{error}</div>}

          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving || !form.product_id || !form.quantity || !form.reason}>
              {saving ? "Adjusting..." : `${form.adjustment_type === "increase" ? "Increase" : "Decrease"} Stock`}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
