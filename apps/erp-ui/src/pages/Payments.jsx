import { useEffect, useState } from "react";
import paymentService from "../services/paymentService";
import { Card, CardContent } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import usePermission from "../hooks/usePermission";
import { Plus, Trash2, CreditCard, Link as LinkIcon, Undo2 } from "lucide-react";
import "./Clients.css";

const methodOptions = ["Cash", "Bank Transfer", "UPI", "Credit Card", "Debit Card", "Cheque"].map((m) => ({ value: m, label: m }));
const money = (v) => `Rs.${Number(v || 0).toLocaleString()}`;

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [links, setLinks] = useState([]);
  const [report, setReport] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ invoice_id: "", amount: "", payment_method: "", reference_id: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canCreate = usePermission("payments.create");
  const canEdit = usePermission("payments.edit");
  const canDelete = usePermission("payments.delete");


  const fetchAll = async () => {
    setLoading(true);
    try {
      const [paymentsRes, outstandingRes, reportRes, linksRes] = await Promise.all([
        paymentService.getAll(),
        paymentService.getOutstandingInvoices(),
        paymentService.getReport(),
        paymentService.getLinks(),
      ]);
      setPayments(paymentsRes.data.data || []);
      setOutstanding(outstandingRes.data.data || []);
      setReport(reportRes.data.data || {});
      setLinks(linksRes.data.data || []);
      setError("");
    } catch { setSuccess(""); setError("Failed to load payments"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    const first = outstanding[0];
    setForm({ invoice_id: first ? String(first.id) : "", amount: first ? String(first.balance_due) : "", payment_method: "", reference_id: "", notes: "" });
    setModalOpen(true);
  };

  const updateInvoice = (invoiceId) => {
    const inv = outstanding.find((i) => String(i.id) === String(invoiceId));
    setForm({ ...form, invoice_id: invoiceId, amount: inv ? String(inv.balance_due) : "" });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await paymentService.create({ ...form, invoice_id: parseInt(form.invoice_id, 10), amount: parseFloat(form.amount) });
      setModalOpen(false);
      fetchAll();
    } catch (err) { setError(err.response?.data?.detail || "Create failed"); }
    finally { setSaving(false); }
  };

  const handleLink = async (invoice) => {
    try {
      const res = await paymentService.createLink({ invoice_id: invoice.id });
      const data = res.data.data;
      const url = data.short_url;
      if (url) {
        setError("");
        setSuccess(data.message || (data.reused ? "Existing payment link opened" : "New payment link created"));
        window.prompt("Payment link", url);
      } else {
        setSuccess("");
        setError("Payment link record created, but Razorpay keys are not configured.");
      }
      fetchAll();
    } catch (err) { setSuccess(""); setError(err.response?.data?.detail || "Payment link failed"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment record?")) return;
    try { await paymentService.delete(id); fetchAll(); }
    catch { setError("Delete failed"); }
  };

  const handleRefund = async (p) => {
    const amount = window.prompt(`Enter amount to refund (Max: ${p.amount - (p.refunded_amount || 0)}):`, p.amount - (p.refunded_amount || 0));
    if (!amount) return;
    try {
      await paymentService.refund(p.id, { amount: parseFloat(amount) });
      setSuccess("Refund processed successfully");
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Refund failed");
    }
  };

  if (loading) return <Spinner size="lg" message="Loading payments..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Payments</h1>
          <p>Record partial payments, track outstanding balances, and manage payment links</p>
        </div>
        <Button variant="primary" onClick={openCreate} disabled={outstanding.length === 0}><Plus size={16} /> Record Payment</Button>
      </div>

      <div className="page__grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Card><CardContent><div className="page__metric">Today's Collections<strong>{money(report.collected_today)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">This Month<strong>{money(report.collected_this_month)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">Outstanding<strong>{money(report.outstanding)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">Refunds<strong>{money(report.total_refunded)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">Failed Payments<strong>{report.failed_count || 0}</strong></div></CardContent></Card>
      </div>

      {error && <div className="page__error">{error}</div>}
      {success && <div className="page__success">{success}</div>}

      <Card>
        <CardContent>
          {payments.length === 0 ? (
            <div className="page__empty"><CreditCard size={48} /><p>No payments recorded</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {(payments || []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>#{p.id}</TableCell>
                    <TableCell>{p.invoice_number || `#${p.invoice_id}`}</TableCell>
                    <TableCell>{p.client_name || "-"}</TableCell>
                    <TableCell>
                      {money(p.amount)}
                      {p.refunded_amount > 0 && <span style={{display: 'block', fontSize: 12, color: 'var(--destructive)'}}>Refunded: {money(p.refunded_amount)}</span>}
                    </TableCell>
                    <TableCell>{p.payment_method}</TableCell>
                    <TableCell>{p.reference_id || p.provider_payment_id || "-"}</TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {canDelete && p.provider === 'razorpay' && p.status !== 'refunded' && (
                          <Button variant="ghost" size="icon" title="Refund" onClick={() => handleRefund(p)}>
                            <Undo2 size={15} />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                            <Trash2 size={15} color="var(--destructive)" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="detail-grid" style={{ marginTop: 16 }}>
        <Card>
          <CardContent>
            <h3 style={{ marginBottom: 12 }}>Outstanding Invoices</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Balance</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {(outstanding || []).map((inv) => <TableRow key={inv.id}><TableCell>{inv.invoice_number}</TableCell><TableCell>{inv.client_name}</TableCell><TableCell>{money(inv.balance_due)}</TableCell><TableCell><Button variant="outline" onClick={() => handleLink(inv)}><LinkIcon size={14} /> Link</Button></TableCell></TableRow>)}
                {outstanding.length === 0 && <TableRow><TableCell colSpan={4} style={{ textAlign: "center" }}>No outstanding invoices</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 style={{ marginBottom: 12 }}>Payment Links</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {(links || []).map((link) => <TableRow key={link.id}><TableCell>{link.invoice_number}</TableCell><TableCell>{money(link.amount)}</TableCell><TableCell>{link.status}</TableCell></TableRow>)}
                {links.length === 0 && <TableRow><TableCell colSpan={3} style={{ textAlign: "center" }}>No payment links</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment">
        <form onSubmit={handleSave} className="form-grid">
          <Select label="Invoice" value={form.invoice_id} onChange={(e) => updateInvoice(e.target.value)} options={(outstanding || []).map((i) => ({ value: i.id, label: `${i.invoice_number} - ${i.client_name} (${money(i.balance_due)})` }))} required />
          <Input label="Amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <Select label="Payment Method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} options={methodOptions} required />
          <Input label="Reference" value={form.reference_id} onChange={(e) => setForm({ ...form, reference_id: e.target.value })} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="form-actions"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" variant="primary" disabled={saving}>{saving ? "Recording..." : "Record Payment"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
