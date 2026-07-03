import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import quotationService from "../services/quotationService";
import clientService from "../services/clientService";
import productService from "../services/productService";
import leadService from "../services/leadService";
import { Card, CardContent } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import usePermission from "../hooks/usePermission";
import { Plus, Download, Trash2, FileText, Search, Edit, Mail, ArrowRight, CheckCircle, XCircle, Send } from "lucide-react";
import "./Clients.css";

const emptyItem = { product_id: "", description: "", quantity: 1, unit_price: "", gst_rate: 18 };
const emptyForm = { client_id: "", lead_id: "", issue_date: "", valid_until: "", gst_treatment: "intrastate", status: "draft", notes: "", items: [{ ...emptyItem }] };
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusVariant = (s) => {
  const v = (s || "").toLowerCase();
  if (v === "accepted") return "success";
  if (v === "rejected") return "destructive";
  if (v === "expired") return "warning";
  if (v === "sent") return "default";
  if (v === "converted") return "purple";
  return "secondary"; // draft
};

export default function Quotations() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [quotations, setQuotations] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canCreate = usePermission("quotations.create");
  const canEdit = usePermission("quotations.edit");
  const canDelete = usePermission("quotations.delete");


  const fetchQuotations = async (nextFilters = filters, isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const params = { ...nextFilters };
      const res = await quotationService.getAll(100, 0, params.search, params.status);
      setQuotations(res.data.data || []);
      setError("");
    } catch { setSuccess(""); setError("Failed to load quotations"); }
    finally { if (isInitial) setLoading(false); }
  };

  useEffect(() => { 
    fetchQuotations(filters, true); 
    const viewId = searchParams.get("view");
    if (viewId) {
      openEdit(viewId);
      searchParams.delete("view");
      setSearchParams(searchParams);
    }
  }, []);

  const loadDependencies = async () => {
    const [clientsRes, productsRes, leadsRes] = await Promise.all([
      clientService.getAll({ limit: 100, skip: 0 }),
      productService.getAll(),
      leadService.getAll()
    ]);
    setClients(clientsRes.data.data || []);
    setProducts(productsRes.data.data || []);
    setLeads(leadsRes.data.data || []);
  };

  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    fetchQuotations(next, false);
  };

  const totals = useMemo(() => {
    return (form.items || []).reduce((acc, item) => {
      const taxable = Number(item.quantity || 0) * Number(item.unit_price || 0);
      const tax = taxable * Number(item.gst_rate || 0) / 100;
      if (form.gst_treatment === "interstate") acc.igst += tax;
      else { acc.cgst += tax / 2; acc.sgst += tax / 2; }
      acc.subtotal += taxable;
      acc.tax_total += tax;
      acc.total += taxable + tax;
      return acc;
    }, { subtotal: 0, cgst: 0, sgst: 0, igst: 0, tax_total: 0, total: 0 });
  }, [form.items, form.gst_treatment]);

  const openCreate = async () => {
    await loadDependencies();
    setEditing(null);
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    setForm({ 
        ...emptyForm, 
        issue_date: today.toISOString().slice(0, 10), 
        valid_until: nextMonth.toISOString().slice(0, 10),
        items: [{ ...emptyItem }] 
    });
    setModalOpen(true);
  };

  const openEdit = async (id) => {
    await loadDependencies();
    const res = await quotationService.getById(id);
    const quote = res.data.data;
    setEditing(quote);
    setForm({
      client_id: String(quote.client_id),
      lead_id: quote.lead_id ? String(quote.lead_id) : "",
      issue_date: quote.issue_date || "",
      valid_until: quote.valid_until || "",
      status: quote.status || "draft",
      gst_treatment: quote.igst > 0 ? "interstate" : "intrastate",
      notes: quote.notes || "",
      items: (quote.items || []).map((item) => ({
        product_id: item.product_id ? String(item.product_id) : "",
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        gst_rate: Number(item.gst_rate),
      })) || [{ ...emptyItem }],
    });
    setModalOpen(true);
  };

  const updateItem = (index, key, value) => {
    setForm((prev) => ({ ...prev, items: (prev.items || []).map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  };

  const updateProduct = (index, productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    setForm((prev) => ({
      ...prev,
      items: (prev.items || []).map((item, i) => i === index ? {
        ...item,
        product_id: productId,
        description: product ? product.name : item.description,
        unit_price: product ? String(product.price) : item.unit_price,
      } : item),
    }));
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (index) => setForm({ ...form, items: (form.items || []).filter((_, i) => i !== index) });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        client_id: parseInt(form.client_id, 10),
        lead_id: form.lead_id ? parseInt(form.lead_id, 10) : null,
        items: (form.items || []).map((item) => ({
          ...item,
          product_id: item.product_id ? parseInt(item.product_id, 10) : null,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          gst_rate: Number(item.gst_rate),
        })),
      };
      if (editing) await quotationService.update(editing.id, payload);
      else await quotationService.create(payload);
      setModalOpen(false);
      fetchQuotations();
    } catch (err) { setError(err.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDownload = async (id) => {
    try {
      const res = await quotationService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotation_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { setError("Download failed"); }
  };

  const handleEmail = async (id) => {
    try { 
        await quotationService.emailQuotation(id); 
        alert("Quotation email sent successfully!"); 
        fetchQuotations(); // To refresh status to "sent"
    }
    catch (err) { setError(err.response?.data?.detail || "Email failed. Check SMTP settings."); }
  };

  const handleConvertToInvoice = async (quote) => {
    if (!window.confirm(`Convert quotation ${quote.quote_number} to a real invoice?`)) return;
    try {
        const res = await quotationService.convertToInvoice(quote.id);
        setSuccess(`Successfully created Invoice: ${res.data.invoice_number}`);
        fetchQuotations();
    } catch (err) { setError(err.response?.data?.detail || "Conversion failed"); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await quotationService.updateStatus(id, newStatus);
      fetchQuotations();
    } catch (err) {
      setError(err.response?.data?.detail || "Status update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quotation?")) return;
    try { await quotationService.delete(id); fetchQuotations(); }
    catch { setError("Delete failed"); }
  };



  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Quotations</h1>
          <p>Create quotes, send to clients, and convert to invoices</p>
        </div>
        {canCreate && <Button variant="primary" onClick={openCreate}><Plus size={16} /> Create Quotation</Button>}
      </div>

      <div className="page__toolbar">
        <Input icon={Search} placeholder="Search quote or client..." value={filters.search} onChange={(e) => updateFilter("search", e.target.value)} />
        <Select label="Status" value={filters.status} onChange={(e) => updateFilter("status", e.target.value)} placeholder="All statuses" options={["draft", "sent", "accepted", "rejected", "expired"].map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
      </div>

      {error && <div className="page__error" style={{ color: "var(--destructive)", marginBottom: 16 }}>{error}</div>}
      {success && <div className="page__success" style={{ color: "var(--success)", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px", borderRadius: "6px", marginBottom: 16 }}>{success}</div>}

      <Card>
        <CardContent>
          {loading ? (
            <div style={{ padding: '40px 0' }}><Spinner size="lg" message="Loading quotations..." /></div>
          ) : quotations.length === 0 ? (
            <div className="page__empty"><FileText size={48} /><p>No quotations found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Quote #</TableHead><TableHead>Client</TableHead><TableHead>Total</TableHead><TableHead>Issue Date</TableHead><TableHead>Valid Until</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {(quotations || []).map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>{quote.quote_number || `QT-${quote.id}`}</TableCell>
                    <TableCell>{quote.client_name}</TableCell>
                    <TableCell>{money(quote.total)}</TableCell>
                    <TableCell>{quote.issue_date}</TableCell>
                    <TableCell>{quote.valid_until || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(quote.status)}>{(quote.status || "draft").toUpperCase()}</Badge>
                      {quote.status === "converted" && quote.invoice_id && (
                        <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--muted-foreground)', fontWeight: 500 }}>
                          → INV-{String(quote.invoice_id).padStart(5, '0')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell><div className="page__actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {canEdit && <Button variant="ghost" size="icon" onClick={() => openEdit(quote.id)} title="Edit"><Edit size={15} /></Button>}
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(quote.id)} title="Download PDF"><Download size={15} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEmail(quote.id)} title="Email Quotation"><Mail size={15} /></Button>
                      {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(quote.id)} title="Delete"><Trash2 size={15} color="var(--destructive)" /></Button>}
                      
                      {["draft", "sent", "accepted"].includes(quote.status) && (
                        <select 
                          className="status-dropdown" 
                          onChange={(e) => {
                            const action = e.target.value;
                            if (action === "sent" || action === "accepted" || action === "rejected") handleStatusChange(quote.id, action);
                            if (action === "convert") handleConvertToInvoice(quote);
                            e.target.value = "";
                          }}
                          defaultValue=""
                          style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', outline: 'none', background: 'var(--background)' }}
                        >
                          <option value="" disabled>Action...</option>
                          {quote.status === "draft" && <option value="sent">Mark as Sent</option>}
                          {quote.status === "sent" && <>
                            <option value="accepted">Mark as Accepted</option>
                            <option value="rejected">Mark as Rejected</option>
                          </>}
                          {quote.status === "accepted" && <option value="convert">Convert to Invoice</option>}
                        </select>
                      )}
                    </div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Quotation" : "Create Quotation"} size="lg">
        <form onSubmit={handleSave} className="form-grid">
          <div className="form-grid two">
            <Select label="Client" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} options={(clients || []).map((c) => ({ value: c.id, label: c.name }))} placeholder="Select client..." required />
            <Select label="Lead (Optional)" value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })} options={(leads || []).map((l) => ({ value: l.id, label: l.company_name }))} placeholder="Associate with Lead..." />
            <Select label="GST Treatment" value={form.gst_treatment} onChange={(e) => setForm({ ...form, gst_treatment: e.target.value })} options={[{ value: "intrastate", label: "Intrastate: CGST + SGST" }, { value: "interstate", label: "Interstate: IGST" }]} required />
            <Input label="Issue Date" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} required />
            <Input label="Valid Until" type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} required />
            <div style={{ gridColumn: "1 / -1" }}>
              <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Terms and conditions, external refs..." />
            </div>
          </div>

          <div className="line-items">
            {(form.items || []).map((item, index) => (
              <div className="line-item-row" key={index}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Select label="Product" value={item.product_id || ""} onChange={(e) => updateProduct(index, e.target.value)} placeholder="Custom item" options={(products || []).map((p) => ({ value: p.id, label: p.name }))} />
                  {item.product_id && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                      Available Stock: {products.find(p => String(p.id) === String(item.product_id))?.stock || 0}
                    </span>
                  )}
                </div>
                <Input label="Description" value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} required />
                <Input label="Qty" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} required />
                <Input label="Unit Price" type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)} required />
                <Input label="GST %" type="number" min="0" max="100" step="0.01" value={item.gst_rate} onChange={(e) => updateItem(index, "gst_rate", e.target.value)} required />
                <Button variant="outline" onClick={() => removeItem(index)} disabled={form.items.length === 1}>Remove</Button>
              </div>
            ))}
            <Button variant="outline" type="button" onClick={addItem}>Add Line Item</Button>
          </div>

          <div className="totals-box">
            <div><span>Subtotal</span><strong>{money(totals.subtotal)}</strong></div>
            <div><span>CGST</span><strong>{money(totals.cgst)}</strong></div>
            <div><span>SGST</span><strong>{money(totals.sgst)}</strong></div>
            <div><span>IGST</span><strong>{money(totals.igst)}</strong></div>
            <div className="grand"><span>Total</span><strong>{money(totals.total)}</strong></div>
          </div>

          <div className="form-actions">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving || editing?.invoice_id}>{saving ? "Saving..." : "Save Quotation"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
