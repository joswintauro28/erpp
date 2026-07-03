import { useState, useEffect } from "react";
import portalApi from "../../services/portalApi";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import { DollarSign, FileText, FileSignature } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";

const money = (v) => `Rs.${Number(v || 0).toLocaleString()}`;

export default function ClientPortalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await portalApi.get("/dashboard");
        setData(res.data);
      } catch (err) {
        console.error("Failed to load portal dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;
  if (!data) return <div style={{ padding: 48, textAlign: 'center' }}>Failed to load dashboard</div>;

  return (
    <div>
      <div className="page__header" style={{ marginBottom: 32 }}>
        <div className="page__header-info">
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>Dashboard</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>Overview of your account activity</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 32 }}>
        <Card>
          <CardContent style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--red-50)', color: 'var(--destructive)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500 }}>Outstanding Balance</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{money(data.outstanding_amount)}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--blue-50)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500 }}>Total Invoices</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{money(data.total_invoiced)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'var(--purple-50)', color: 'var(--purple-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSignature size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500 }}>Total Quotations</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{data.total_quotations}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <Button variant="primary" onClick={() => window.location.href = '/portal/invoices'}>View Invoices</Button>
        <Button variant="outline" onClick={() => window.location.href = '/portal/quotations'}>View Quotations</Button>
        <Button variant="outline" onClick={() => window.location.href = '/portal/payments'}>View Payments</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.recent_payments || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} style={{ textAlign: "center", color: "var(--muted-foreground)", padding: 32 }}>
                      No recent payments.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recent_payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>{money(p.amount)}</TableCell>
                      <TableCell>{p.reference_id || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.recent_invoices || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} style={{ textAlign: "center", color: "var(--muted-foreground)", padding: 32 }}>
                      No recent invoices.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recent_invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.invoice_number}</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>{money(inv.total)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          inv.status === 'paid' ? 'success' : 
                          inv.status === 'overdue' ? 'destructive' : 
                          inv.status === 'partially_paid' ? 'warning' : 'secondary'
                        }>
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
