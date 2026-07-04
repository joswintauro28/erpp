"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import invoiceService from "@/services/invoiceService";
import clientService from "@/services/clientService";
import paymentService from "@/services/paymentService";
import productService from "@/services/productService";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { Plus, Download, Trash2, FileText, Search, Eye, Edit, Mail, Link as LinkIcon } from "lucide-react";
import usePermission from "@/hooks/usePermission";
import "@/app/(dashboard)/_styles/Clients.css";

interface Invoice {
  id: number;
  invoice_number?: string;
  client_name: string;
  client_id?: number;
  total?: number;
  amount?: number;
  paid_amount?: number;
  balance_due?: number;
  status: string;
  due_date?: string;
  issue_date?: string;
  gst_treatment?: string;
  place_of_supply?: string;
  notes?: string;
  items?: InvoiceFormItem[];
}

interface InvoiceFormItem {
  product_id: string;
  description: string;
  quantity: number;
  unit_price: string;
  gst_rate: number;
}

interface Client {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  stock: number;
  price?: number;
}

const emptyItem: InvoiceFormItem = { product_id: "", description: "", quantity: 1, unit_price: "", gst_rate: 18 };
const emptyForm = { client_id: "", due_date: "", issue_date: "", gst_treatment: "intrastate", place_of_supply: "", notes: "", items: [{ ...emptyItem }] };
const money = (v: number | undefined | null) => `Rs.${Number(v || 0).toLocaleString()}`;
const statusVariant = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "paid") return "success";
  if (v === "overdue") return "destructive";
  if (v === "partially_paid") return "warning";
  return "secondary";
};

export default function Invoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [gstSummary, setGstSummary] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [filters, setFilters] = useState({ search: "", status: "", overdue: "" });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canCreate = usePermission("invoices.create");
  const canEdit = usePermission("invoices.edit");
  const canDelete = usePermission("invoices.delete");
  const canSend = usePermission("invoices.send");

  const fetchInvoices = async (nextFilters = filters, isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const params: Record<string, string | undefined> = { ...nextFilters };
      if (params.overdue === "") delete params.overdue;
      const [invoiceRes, gstRes] = await Promise.all([invoiceService.getAll(params), invoiceService.getGstSummary()]);
      setInvoices(invoiceRes.data.data || []);
      setGstSummary(gstRes.data.data || null);
      setError("");
    } catch { setSuccess(""); setError("Failed to load invoices"); }
    finally { if (isInitial) setLoading(false); }
  };

  useEffect(() => { fetchInvoices(filters, true); }, []);

  const loadClients = async () => {
    const res = await clientService.getAll({ limit: 100, skip: 0 });
    setClients(res.data.data || []);
  };

  const loadProducts = async () => {
    const res = await productService.getAll();
    setProducts(res.data.data || []);
  };

  const updateFilter = (key: string, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    fetchInvoices(next, false);
  };

  const totals = useMemo(() => {
    return (form.items || []).reduce((acc: { subtotal: number; cgst: number; sgst: number; igst: number; tax_total: number; total: number }, item: InvoiceFormItem) => {
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
    await Promise.all([loadClients(), loadProducts()]);
    setEditing(null);
    setForm({ ...emptyForm, issue_date: new Date().toISOString().slice(0, 10), items: [{ ...emptyItem }] });
    setModalOpen(true);
  };

  const openEdit = async (id: number) => {
    await Promise.all([loadClients(), loadProducts()]);
    const res = await invoiceService.getDetails(id);
    const inv = res.data.data;
    setEditing(inv);
    setForm({
      client_id: String(inv.client_id),
      due_date: inv.due_date || "",
      issue_date: inv.issue_date || "",
      gst_treatment: inv.gst_treatment || "intrastate",
      place_of_supply: inv.place_of_supply || "",
      notes: inv.notes || "",
      items: (inv.items || []).map((item: InvoiceFormItem) => ({
        product_id: item.product_id ? String(item.product_id) : "",
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        gst_rate: Number(item.gst_rate),
      })) || [{ ...emptyItem }],
    });
    setModalOpen(true);
  };

  const updateItem = (index: number, key: string, value: string | number) => {
    setForm((prev: any) => ({ ...prev, items: (prev.items || []).map((item: InvoiceFormItem, i: number) => i === index ? { ...item, [key]: value } : item) }));
  };

  const updateProduct = (index: number, productId: string) => {
    const product = products.find((p: Product) => String(p.id) === String(productId));
    setForm((prev: any) => ({
      ...prev,
      items: (prev.items || []).map((item: InvoiceFormItem, i: number) => i === index ? {
        ...item,
        product_id: productId,
        description: product ? product.name : item.description,
        unit_price: product ? String(product.price) : item.unit_price,
      } : item),
    }));
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (index: number) => setForm({ ...form, items: (form.items || []).filter((_: InvoiceFormItem, i: number) => i !== index) });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        client_id: parseInt(form.client_id, 10),
        items: (form.items || []).map((item: InvoiceFormItem) => ({
          ...item,
          product_id: item.product_id ? parseInt(item.product_id, 10) : null,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          gst_rate: Number(item.gst_rate),
        })),
      };
      if (editing) await invoiceService.update(editing.id, payload);
      else await invoiceService.create(payload);
      setModalOpen(false);
      fetchInvoices();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Save failed");
    }
    finally { setSaving(false); }
  };

  const handleDownload = async (id: number) => {
    try {
      const res = await invoiceService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { setError("Download failed"); }
  };

  const handleEmail = async (id: number) => {
    try { await invoiceService.emailInvoice(id, {}); alert("Invoice email sent"); }
    catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Email failed. Check SMTP settings.");
    }
  };

  const handlePaymentLink = async (inv: Invoice) => {
    try {
      const res = await paymentService.createLink({ invoice_id: inv.id });
      const data = res.data.data;
      const url = data.short_url;
      if (url) {
        setError("");
        setSuccess(data.message || (data.reused ? "Existing payment link opened" : "New payment link created"));
        window.prompt("Payment link", url);
      } else {
        setSuccess("");
        setError("Payment link record created, but Razorpay keys are not configured on the backend.");
      }
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setSuccess(""); setError(axiosErr.response?.data?.detail || "Payment link failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this invoice?")) return;
    try { await invoiceService.delete(id); fetchInvoices(); }
    catch { setError("Delete failed"); }
  };



  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Invoices</h1>
          <p>Create GST-ready invoices, track status, and collect payments</p>
        </div>
        {canCreate && <Button variant="primary" onClick={openCreate}><Plus size={16} /> Create Invoice</Button>}
      </div>

      <div className="page__grid">
        <Card><CardContent><div className="page__metric">Taxable Value<strong>{money(gstSummary?.taxable_value)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">GST Collected<strong>{money(gstSummary?.tax_total)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">CGST / SGST<strong>{money(gstSummary?.cgst)} / {money(gstSummary?.sgst)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">IGST<strong>{money(gstSummary?.igst)}</strong></div></CardContent></Card>
      </div>

      <div className="page__toolbar">
        <Input icon={Search} placeholder="Search invoice or client..." value={filters.search} onChange={(e: any) => updateFilter("search", e.target.value)} />
        <Select label="Status" value={filters.status} onChange={(e: any) => updateFilter("status", e.target.value)} placeholder="All statuses" options={["pending", "partially_paid", "paid", "overdue", "cancelled"].map((s: string) => ({ value: s, label: s }))} />
        <Select label="Overdue" value={filters.overdue} onChange={(e: any) => updateFilter("overdue", e.target.value)} placeholder="All invoices" options={[{ value: "true", label: "Overdue only" }]} />
      </div>

      {error && <div className="page__error">{error}</div>}
      {success && <div className="page__success">{success}</div>}

      <Card>
        <CardContent>
          {loading ? (
            <div style={{ padding: '40px 0' }}><Spinner size="lg" message="Loading invoices..." /></div>
          ) : invoices.length === 0 ? (
            <div className="page__empty"><FileText size={48} /><p>No invoices found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead>Due Date</TableHead><TableHead>Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {(invoices || []).map((inv: Invoice) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.invoice_number || `#${inv.id}`}</TableCell>
                    <TableCell>{inv.client_name}</TableCell>
                    <TableCell>{money(inv.total || inv.amount)}</TableCell>
                    <TableCell>{money(inv.paid_amount)}</TableCell>
                    <TableCell>{money(inv.balance_due)}</TableCell>
                    <TableCell><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></TableCell>
                    <TableCell>{inv.due_date}</TableCell>
                    <TableCell><div className="page__actions">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/billing/invoices/${inv.id}`)} title="Details"><Eye size={15} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(inv.id)} title="Download PDF"><Download size={15} /></Button>
                      {canSend && <Button variant="ghost" size="icon" onClick={() => handleEmail(inv.id)} title="Send Email"><Mail size={15} /></Button>}
                      {canEdit && <Button variant="ghost" size="icon" onClick={() => openEdit(inv.id)} title="Edit"><Edit size={15} /></Button>}
                      {canEdit && <Button variant="ghost" size="icon" onClick={() => handlePaymentLink(inv)} title="Payment Link"><LinkIcon size={15} /></Button>}
                      {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)} title="Delete"><Trash2 size={15} color="var(--destructive)" /></Button>}
                    </div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Invoice" : "Create Invoice"} size="lg">
        <form onSubmit={handleSave} className="form-grid">
          <div className="form-grid two">
            <Select label="Client" value={form.client_id} onChange={(e: any) => setForm({ ...form, client_id: e.target.value })} options={(clients || []).map((c: Client) => ({ value: String(c.id), label: c.name }))} placeholder="Select client..." required />
            <Select label="GST Treatment" value={form.gst_treatment} onChange={(e: any) => setForm({ ...form, gst_treatment: e.target.value })} options={[{ value: "intrastate", label: "Intrastate: CGST + SGST" }, { value: "interstate", label: "Interstate: IGST" }]} required />
            <Input label="Issue Date" type="date" value={form.issue_date} onChange={(e: any) => setForm({ ...form, issue_date: e.target.value })} required />
            <Input label="Due Date" type="date" value={form.due_date} onChange={(e: any) => setForm({ ...form, due_date: e.target.value })} required />
            <Input label="Place of Supply" value={form.place_of_supply} onChange={(e: any) => setForm({ ...form, place_of_supply: e.target.value })} />
            <Input label="Notes" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="line-items">
            {(form.items || []).map((item: InvoiceFormItem, index: number) => (
              <div className="line-item-row" key={index}>
                <Select label="Product" value={item.product_id || ""} onChange={(e: any) => updateProduct(index, e.target.value)} placeholder="Custom item" options={(products || []).map((p: Product) => ({ value: String(p.id), label: `${p.name} (${p.stock} in stock)` }))} />
                <Input label="Description" value={item.description} onChange={(e: any) => updateItem(index, "description", e.target.value)} required />
                <Input label="Qty" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e: any) => updateItem(index, "quantity", e.target.value)} required />
                <Input label="Unit Price" type="number" min="0" step="0.01" value={item.unit_price} onChange={(e: any) => updateItem(index, "unit_price", e.target.value)} required />
                <Input label="GST %" type="number" min="0" max="100" step="0.01" value={item.gst_rate} onChange={(e: any) => updateItem(index, "gst_rate", e.target.value)} required />
                <Button variant="outline" onClick={() => removeItem(index)} disabled={form.items.length === 1}>Remove</Button>
              </div>
            ))}
            <Button variant="outline" onClick={addItem}>Add Line Item</Button>
          </div>

          <div className="totals-box">
            <div><span>Subtotal</span><strong>{money(totals.subtotal)}</strong></div>
            <div><span>CGST</span><strong>{money(totals.cgst)}</strong></div>
            <div><span>SGST</span><strong>{money(totals.sgst)}</strong></div>
            <div><span>IGST</span><strong>{money(totals.igst)}</strong></div>
            <div className="grand"><span>Total</span><strong>{money(totals.total)}</strong></div>
          </div>

          <div className="form-actions">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Save Invoice"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
