"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import invoiceService from "@/services/invoiceService";
import paymentService from "@/services/paymentService";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import recurringInvoiceService from "@/services/recurringInvoiceService";
import creditNoteService from "@/services/creditNoteService";
import debitNoteService from "@/services/debitNoteService";

interface InvoiceItem {
  id: number;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  already_returned?: number;
}

interface InvoicePayment {
  id: number;
  payment_date?: string;
  created_at?: string;
  amount: number;
  payment_method: string;
  reference_id?: string;
  provider_payment_id?: string;
}

interface InvoiceData {
  id: number;
  invoice_number?: string;
  client_name: string;
  client_email?: string;
  client_gst_number?: string;
  gst_treatment: string;
  place_of_supply?: string;
  company?: { gst_number?: string };
  warehouse_name?: string;
  warehouse_id?: number;
  eway_bill?: { eway_bill_number?: string };
  total?: number;
  amount?: number;
  paid_amount?: number;
  balance_due?: number;
  status: string;
  due_date?: string;
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  tax_total?: number;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
}

const money = (v: number | undefined | null) => `Rs.${Number(v || 0).toLocaleString()}`;
const statusVariant = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "paid") return "success";
  if (v === "overdue") return "destructive";
  if (v === "partially_paid") return "warning";
  return "secondary";
};

export default function InvoiceDetails() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ frequency: "monthly", start_date: new Date().toISOString().split('T')[0], end_date: "", auto_email: false });

  const [cnModalOpen, setCnModalOpen] = useState(false);
  const [cnForm, setCnForm] = useState<{ reason: string; restock_items: boolean; itemReturns: Record<string, string> }>({ reason: "", restock_items: false, itemReturns: {} });
  const [dnModalOpen, setDnModalOpen] = useState(false);
  const [dnForm, setDnForm] = useState({ amount: "", reason: "" });

  const fetchInvoice = async () => {
    try {
      const res = await invoiceService.getDetails(id);
      setInvoice(res.data.data);
      setError("");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setSuccess(""); setError(axiosErr.response?.data?.detail || "Failed to load invoice");
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoice(); }, [id]);

  const downloadPdf = async () => {
    try {
      const res = await invoiceService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${invoice!.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { setError("Failed to download PDF"); }
  };

  const handleMakeRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        invoice_id: invoice!.id,
        frequency: recurringForm.frequency,
        start_date: recurringForm.start_date,
        end_date: recurringForm.end_date || null,
        auto_email: recurringForm.auto_email
      };
      await recurringInvoiceService.create(payload);
      setSuccess("Recurring schedule created successfully");
      setRecurringModalOpen(false);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to create recurring schedule");
    }
  };

  const [sendingEmail, setSendingEmail] = useState(false);
  const emailInvoice = async () => {
    if (sendingEmail) return;
    setSendingEmail(true);
    setSuccess("");
    setError("");
    try {
      await invoiceService.emailInvoice(id, {});
      setSuccess("Invoice email sent successfully!");
    }
    catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to send email. Please check your SMTP settings.");
    }
    finally {
      setSendingEmail(false);
    }
  };

  const createLink = async () => {
    try {
      const res = await paymentService.createLink({ invoice_id: Number(id) });
      const data = res.data.data;
      const url = data.short_url;
      if (url) {
        setError("");
        setSuccess(data.message || (data.reused ? "Existing payment link opened" : "New payment link created"));
        window.prompt("Payment link", url);
      } else {
        setSuccess("");
        setError("Payment link saved, but Razorpay keys are not configured.");
      }
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setSuccess(""); setError(axiosErr.response?.data?.detail || "Payment link failed");
    }
  };

  const handleCreateCN = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemsPayload = Object.entries(cnForm.itemReturns)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([id, qty]) => ({ invoice_item_id: Number(id), returned_quantity: Number(qty) }));

      if (itemsPayload.length === 0) {
        setError("Please select at least one item to return.");
        return;
      }

      await creditNoteService.create({
        invoice_id: Number(id),
        reason: cnForm.reason,
        restock_items: cnForm.restock_items,
        items: itemsPayload
      });
      setSuccess("Credit Note created successfully.");
      setCnModalOpen(false);
      setCnForm({ reason: "", restock_items: false, itemReturns: {} });
      fetchInvoice();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to create Credit Note");
    }
  };

  const handleCreateDN = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await debitNoteService.create({ invoice_id: Number(id), amount: Number(dnForm.amount), reason: dnForm.reason });
      setSuccess("Debit Note created successfully.");
      setDnModalOpen(false);
      setDnForm({ amount: "", reason: "" });
      fetchInvoice();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to create Debit Note");
    }
  };

  if (error && !invoice) return <div className="page__error">{error}</div>;
  if (!invoice) return <Spinner size="lg" message="Loading invoice..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>{invoice.invoice_number || `Invoice #${invoice.id}`}</h1>
          <p>{invoice.client_name} | Due {invoice.due_date}</p>
        </div>
        <div className="page__actions">
          <Button variant="outline" onClick={() => router.push("/billing/invoices")}>Back</Button>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="outline" onClick={downloadPdf}>Download PDF</Button>
            <Button variant="secondary" onClick={() => setRecurringModalOpen(true)}>Make Recurring</Button>
            <Button variant="secondary" onClick={() => setCnModalOpen(true)}>Credit Note</Button>
            <Button variant="secondary" onClick={() => setDnModalOpen(true)}>Debit Note</Button>
          </div>
          <Button variant="outline" onClick={emailInvoice} disabled={sendingEmail}>
            {sendingEmail ? <Spinner size="sm" /> : "Email"}
          </Button>
          <Button variant="primary" onClick={createLink}>Payment Link</Button>
        </div>
      </div>

      {error && <div className="page__error">{error}</div>}
      {success && <div className="page__success">{success}</div>}

      <div className="page__grid">
        <Card><CardContent><div className="page__metric">Total<strong>{money(invoice.total || invoice.amount)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">Paid<strong>{money(invoice.paid_amount)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">Balance<strong>{money(invoice.balance_due)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">Status<strong><Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge></strong></div></CardContent></Card>
      </div>

      <div className="detail-grid">
        <Card>
          <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="detail-list">
              <div><dt>Client Email</dt><dd>{invoice.client_email || "-"}</dd></div>
              <div><dt>Client GST</dt><dd>{invoice.client_gst_number || "-"}</dd></div>
              <div><dt>GST Treatment</dt><dd>{invoice.gst_treatment}</dd></div>
              <div><dt>Place of Supply</dt><dd>{invoice.place_of_supply || "-"}</dd></div>
              <div><dt>Company GST</dt><dd>{invoice.company?.gst_number || "-"}</dd></div>
              <div><dt>Warehouse</dt><dd>{invoice.warehouse_name || invoice.warehouse_id ? (invoice.warehouse_name || `WH #${invoice.warehouse_id}`) : "-"}</dd></div>
              <div><dt>E-Way Bill</dt><dd>{invoice.eway_bill?.eway_bill_number || "Not generated"}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>GST Breakdown</CardTitle></CardHeader>
          <CardContent>
            <dl className="detail-list">
              <div><dt>Taxable Value</dt><dd>{money(invoice.subtotal)}</dd></div>
              <div><dt>CGST</dt><dd>{money(invoice.cgst)}</dd></div>
              <div><dt>SGST</dt><dd>{money(invoice.sgst)}</dd></div>
              <div><dt>IGST</dt><dd>{money(invoice.igst)}</dd></div>
              <div><dt>Total GST</dt><dd>{money(invoice.tax_total)}</dd></div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Description</TableHead><TableHead>Qty</TableHead><TableHead>Rate</TableHead><TableHead>GST %</TableHead><TableHead>CGST</TableHead><TableHead>SGST</TableHead><TableHead>IGST</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {(invoice.items || []).map((item: InvoiceItem) => (
                <TableRow key={item.id}><TableCell>{item.product_name || "-"}</TableCell><TableCell>{item.description}</TableCell><TableCell>{Number(item.quantity)}</TableCell><TableCell>{money(item.unit_price)}</TableCell><TableCell>{item.gst_rate}%</TableCell><TableCell>{money(item.cgst)}</TableCell><TableCell>{money(item.sgst)}</TableCell><TableCell>{money(item.igst)}</TableCell><TableCell>{money(item.total)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
            <TableBody>
              {(invoice.payments || []).map((p: InvoicePayment) => (
                <TableRow key={p.id}><TableCell>{p.payment_date || p.created_at}</TableCell><TableCell>{money(p.amount)}</TableCell><TableCell>{p.payment_method}</TableCell><TableCell>{p.reference_id || p.provider_payment_id || "-"}</TableCell></TableRow>
              ))}
              {(invoice.payments || []).length === 0 && <TableRow><TableCell colSpan={4} style={{ textAlign: "center" }}>No payments recorded</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal isOpen={recurringModalOpen} onClose={() => setRecurringModalOpen(false)} title="Make Invoice Recurring">
        <form onSubmit={handleMakeRecurring} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select
            label="Frequency"
            value={recurringForm.frequency}
            onChange={(e: any) => setRecurringForm({ ...recurringForm, frequency: e.target.value })}
            options={[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
              { value: "quarterly", label: "Quarterly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
          <Input
            label="Start Date"
            type="date"
            value={recurringForm.start_date}
            onChange={(e: any) => setRecurringForm({ ...recurringForm, start_date: e.target.value })}
            required
          />
          <Input
            label="End Date (Optional)"
            type="date"
            value={recurringForm.end_date}
            onChange={(e: any) => setRecurringForm({ ...recurringForm, end_date: e.target.value })}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="autoEmail"
              checked={recurringForm.auto_email}
              onChange={(e: any) => setRecurringForm({ ...recurringForm, auto_email: e.target.checked })}
            />
            <label htmlFor="autoEmail" style={{ fontSize: 14 }}>Auto-email client when generated</label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
            <Button variant="outline" type="button" onClick={() => setRecurringModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Schedule</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={cnModalOpen} onClose={() => setCnModalOpen(false)} title="Create Credit Note (Return Items)">
        <form onSubmit={handleCreateCN} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {(invoice?.items || []).map((item: InvoiceItem) => {
              const returned = Number(item.already_returned || 0);
              const available = Number(item.quantity) - returned;
              return (
                <div key={item.id} style={{ border: "1px solid var(--border)", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{item.product_name || item.description}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, color: "var(--muted-foreground)" }}>
                      Sold: {item.quantity} | Returned: {returned} | Avail: {available}
                    </div>
                    <div style={{ width: 100 }}>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={available}
                        value={cnForm.itemReturns[String(item.id)] || ""}
                        onChange={(e: any) => setCnForm({
                          ...cnForm,
                          itemReturns: { ...cnForm.itemReturns, [String(item.id)]: e.target.value }
                        })}
                        disabled={available <= 0}
                        placeholder="Qty"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ padding: "12px", background: "var(--muted)", borderRadius: 8, fontWeight: 600, textAlign: "right" }}>
            Total Est. Credit: Rs. {(invoice?.items || []).reduce((acc: number, item: InvoiceItem) => {
              const qty = Number(cnForm.itemReturns[String(item.id)] || 0);
              const unitTotal = Number(item.total) / Number(item.quantity);
              return acc + (qty * unitTotal);
            }, 0).toFixed(2)}
          </div>

          <Input label="Reason" type="text" value={cnForm.reason} onChange={(e: any) => setCnForm({ ...cnForm, reason: e.target.value })} required />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" id="restock" checked={cnForm.restock_items} onChange={(e: any) => setCnForm({ ...cnForm, restock_items: e.target.checked })} />
            <label htmlFor="restock" style={{ fontSize: 14 }}>Restock returned items to inventory</label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
            <Button variant="outline" type="button" onClick={() => setCnModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={dnModalOpen} onClose={() => setDnModalOpen(false)} title="Create Debit Note">
        <form onSubmit={handleCreateDN} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Amount to Debit" type="number" step="0.01" min="0.01" value={dnForm.amount} onChange={(e: any) => setDnForm({ ...dnForm, amount: e.target.value })} required />
          <Input label="Reason" type="text" value={dnForm.reason} onChange={(e: any) => setDnForm({ ...dnForm, reason: e.target.value })} required />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
            <Button variant="outline" type="button" onClick={() => setDnModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
