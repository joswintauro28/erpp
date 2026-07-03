import { useState, useEffect, useMemo } from "react";
import portalApi from "../../services/portalApi";
import { Card, CardContent } from "../../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { CheckCircle, XCircle, Search, Download } from "lucide-react";

const money = (v) => `Rs.${Number(v || 0).toLocaleString()}`;
const statusVariant = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "accepted") return "success";
  if (s === "rejected") return "destructive";
  if (s === "draft") return "secondary";
  return "warning"; // Sent/Pending
};

export default function ClientPortalQuotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchQuotations = async () => {
    try {
      const res = await portalApi.get("/quotations");
      setQuotations(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleAction = async (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this quotation?`)) return;
    try {
      await portalApi.post(`/quotations/${id}/${action}`);
      alert(`Quotation ${action} successfully`);
      fetchQuotations();
    } catch {
      alert(`Failed to ${action} quotation`);
    }
  };

  const downloadPdf = async (id, quoteNumber) => {
    try {
      const res = await portalApi.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${quoteNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (e) {
      console.error(e);
      alert("Failed to download PDF. Endpoint may not be implemented.");
    }
  };

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const matchesSearch = q.quote_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchTerm, statusFilter]);

  return (
    <div>
      <div className="page__header" style={{ marginBottom: 32 }}>
        <div className="page__header-info">
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>Quotations</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>Review and respond to your quotations</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <Input 
            icon={Search} 
            placeholder="Search quotation number..." 
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
              { value: "sent", label: "Pending" },
              { value: "accepted", label: "Accepted" },
              { value: "rejected", label: "Rejected" }
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
                  <TableHead>Quote #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead style={{ textAlign: "right" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--muted-foreground)" }}>
                      No quotations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotations.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell style={{ fontWeight: 500 }}>{q.quote_number}</TableCell>
                      <TableCell>{new Date(q.issue_date).toLocaleDateString()}</TableCell>
                      <TableCell>{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "-"}</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>{money(q.total)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(q.status)}>{q.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell style={{ textAlign: "right", display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Button variant="outline" size="sm" onClick={() => downloadPdf(q.id, q.quote_number)}>
                          <Download size={14} /> 
                        </Button>
                        {q.status === 'sent' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleAction(q.id, 'accept')} style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>
                              <CheckCircle size={14} style={{ marginRight: 6 }} /> Accept
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleAction(q.id, 'reject')} style={{ color: 'var(--destructive)', borderColor: 'var(--destructive)' }}>
                              <XCircle size={14} style={{ marginRight: 6 }} /> Reject
                            </Button>
                          </>
                        )}
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
