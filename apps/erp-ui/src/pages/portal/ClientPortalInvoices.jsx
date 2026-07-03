import { useState, useEffect, useMemo } from "react";
import portalApi from "../../services/portalApi";
import { Card, CardContent } from "../../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Download, Search } from "lucide-react";
import Select from "../../components/ui/Select";

const money = (v) => `Rs.${Number(v || 0).toLocaleString()}`;
const statusVariant = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "success";
  if (s === "pending" || s === "partially_paid") return "warning";
  if (s === "overdue") return "destructive";
  return "secondary";
};

export default function ClientPortalInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await portalApi.get("/invoices");
        setInvoices(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const downloadPdf = async (id, invoiceNumber) => {
    try {
      const res = await portalApi.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Failed to download PDF");
    }
  };

  const handlePay = async (invoiceId) => {
    try {
      const res = await portalApi.post(`/invoices/${invoiceId}/pay`);
      if (res.data.data && res.data.data.short_url) {
        window.open(res.data.data.short_url, '_blank');
      } else {
        alert("Payment link could not be generated.");
      }
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.detail || "Failed to initiate payment.");
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  return (
    <div>
      <div className="page__header" style={{ marginBottom: 32 }}>
        <div className="page__header-info">
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>Invoices</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>View and download your invoices</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <Input 
            icon={Search} 
            placeholder="Search invoice number..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div style={{ width: 200 }}>
          <Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "paid", label: "Paid" },
              { value: "pending", label: "Pending" },
              { value: "overdue", label: "Overdue" }
            ]}
          />
        </div>
      </div>

      <Card>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Balance Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead style={{ textAlign: "right" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--muted-foreground)" }}>
                      No invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell style={{ fontWeight: 500 }}>{inv.invoice_number}</TableCell>
                      <TableCell>{new Date(inv.issue_date).toLocaleDateString()}</TableCell>
                      <TableCell>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{money(inv.total)}</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>{money(inv.balance_due)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(inv.status)}>{inv.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell style={{ textAlign: "right" }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          {(inv.balance_due > 0 && inv.status !== 'cancelled') && (
                            <Button size="sm" onClick={() => handlePay(inv.id)}>
                              Pay Now
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => downloadPdf(inv.id, inv.invoice_number)}>
                            <Download size={14} style={{ marginRight: 6 }} /> PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
