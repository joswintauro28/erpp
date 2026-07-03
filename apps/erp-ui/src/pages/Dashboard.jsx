import { useEffect, useState } from "react";
import dashboardService from "../services/dashboardService";
import notificationService from "../services/notificationService";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import { AlertTriangle, CreditCard, Clock, DollarSign, FileText, Package, TrendingUp, Users, Warehouse, ClipboardList, SlidersHorizontal } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import api from "../services/api";
import "./Dashboard.css";

const PIE_COLORS = ["#22c55e", "#eab308", "#ef4444", "#6366f1", "#64748b"];
const money = (v) => `Rs.${Number(v || 0).toLocaleString()}`;
const statusVariant = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "success";
  if (s === "pending" || s === "partially_paid") return "warning";
  if (s === "overdue") return "destructive";
  return "secondary";
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [invoiceSummary, setInvoiceSummary] = useState([]);
  const [paymentAnalytics, setPaymentAnalytics] = useState([]);
  const [recentStockMovements, setRecentStockMovements] = useState([]);
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, invoicesRes, trendRes, summaryRes, paymentRes, stockRes, alertsRes, invSummaryRes] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getRecentInvoices(),
          dashboardService.getRevenueTrend(),
          dashboardService.getInvoiceSummary(),
          dashboardService.getPaymentAnalytics(),
          dashboardService.getRecentStockMovements(),
          notificationService.getAlerts(),
          api.get("/dashboard/inventory-summary").catch(() => ({ data: null })),
        ]);
        setStats(statsRes.data);
        setRecentInvoices(invoicesRes.data || []);
        setRevenueTrend(trendRes.data || []);
        const summary = summaryRes.data || {};
        setInvoiceSummary(Object.entries(summary).map(([name, value]) => ({ name, value })));
        setPaymentAnalytics(paymentRes.data || []);
        setRecentStockMovements(stockRes.data || []);
        setAlertsSummary(alertsRes.summary || null);
        setInventorySummary(invSummaryRes.data || null);
      } catch (err) {
        setError("Failed to load dashboard data.");
        console.error(err);
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  if (loading) return <Spinner size="lg" message="Loading dashboard..." />;
  if (error) return <div style={{ color: "var(--destructive)", padding: 24 }}>{error}</div>;

  const statCards = [
    { title: "Revenue", value: money(stats?.total_revenue), icon: DollarSign, color: "green" },
    { title: "Outstanding", value: money(stats?.outstanding_amount), icon: Clock, color: "yellow" },
    { title: "Invoices", value: stats?.total_invoices || 0, icon: FileText, color: "indigo" },
    { title: "Clients", value: stats?.total_clients || 0, icon: Users, color: "blue" },
    { title: "Lead Conversion", value: `${stats?.lead_conversion_rate || 0}%`, icon: TrendingUp, color: "green" },
    { title: "Overdue", value: stats?.overdue_invoices || 0, icon: Clock, color: "yellow" },
    { title: "Leads", value: stats?.total_leads || 0, icon: Users, color: "indigo" },
    { title: "Payments", value: money(stats?.total_revenue), icon: CreditCard, color: "blue" },
    { title: "Total Products", value: stats?.total_products || 0, icon: Package, color: "indigo" },
    { title: "Inventory Value", value: money(stats?.inventory_value), icon: Warehouse, color: "green" },
    { title: "Low Stock Products", value: stats?.low_stock_count || 0, icon: AlertTriangle, color: "yellow" },
    { title: "Active Quotes", value: stats?.active_quotations || 0, icon: ClipboardList, color: "blue" },
    { title: "Accepted Quotes", value: stats?.accepted_quotations || 0, icon: ClipboardList, color: "green" },
    { title: "Quote Value", value: money(stats?.total_quotation_value), icon: DollarSign, color: "indigo" },
  ];

  return (
    <div>
      <div className="dashboard__header"><div><h1>Dashboard</h1><p>Business KPIs from live clients, invoices, payments, and leads.</p></div></div>
      
      {alertsSummary && (alertsSummary.overdue_invoices > 0 || alertsSummary.low_stock_products > 0 || alertsSummary.expiring_quotes > 0 || alertsSummary.pending_payments > 0) && (
        <Card style={{ marginBottom: '24px', borderColor: 'var(--destructive)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)' }}>
          <CardHeader style={{ paddingBottom: '12px' }}>
            <CardTitle className="lg" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--destructive)' }}>
              <AlertTriangle size={20} /> Business Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {alertsSummary.overdue_invoices > 0 && (
                <div onClick={() => navigate("/notifications")} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#fef2f2', borderRadius: '8px', cursor: 'pointer', border: '1px solid #fecaca', color: '#991b1b', fontWeight: 500 }}>
                  <AlertTriangle size={16} /> Overdue Invoices: {alertsSummary.overdue_invoices}
                </div>
              )}
              {alertsSummary.low_stock_products > 0 && (
                <div onClick={() => navigate("/notifications")} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#fefce8', borderRadius: '8px', cursor: 'pointer', border: '1px solid #fef08a', color: '#854d0e', fontWeight: 500 }}>
                  <Package size={16} /> Low Stock Products: {alertsSummary.low_stock_products}
                </div>
              )}
              {alertsSummary.expiring_quotes > 0 && (
                <div onClick={() => navigate("/notifications")} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#eff6ff', borderRadius: '8px', cursor: 'pointer', border: '1px solid #bfdbfe', color: '#1e40af', fontWeight: 500 }}>
                  <FileText size={16} /> Quotes Expiring Soon: {alertsSummary.expiring_quotes}
                </div>
              )}
              {alertsSummary.pending_payments > 0 && (
                <div onClick={() => navigate("/notifications")} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#fffbeb', borderRadius: '8px', cursor: 'pointer', border: '1px solid #fde68a', color: '#92400e', fontWeight: 500 }}>
                  <Clock size={16} /> Invoices Due Soon: {alertsSummary.pending_payments}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="dashboard__stats">
        {(statCards || []).map((s) => <Card key={s.title} className="stat-card"><CardHeader><CardTitle>{s.title}</CardTitle><div className={`stat-icon ${s.color}`}><s.icon size={20} /></div></CardHeader><CardContent><div className="stat-value">{s.value}</div><div className="stat-label">Current business total</div></CardContent></Card>)}
      </div>

      <div className="dashboard__charts">
        <Card><CardHeader><CardTitle className="lg">Revenue Trend</CardTitle><CardDescription>Monthly collected payments</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><AreaChart data={revenueTrend}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" /><Tooltip /><Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="#6366f1" fillOpacity={0.12} strokeWidth={2} /></AreaChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle className="lg">Invoice Summary</CardTitle><CardDescription>Status breakdown of invoices</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={invoiceSummary} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}%`} outerRadius={100} dataKey="value">{(invoiceSummary || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
      </div>

      <div className="dashboard__charts">
        <Card><CardHeader><CardTitle className="lg">Payment Analytics</CardTitle><CardDescription>Collections by method</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={260}><BarChart data={paymentAnalytics}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="method" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="amount" fill="#22c55e" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle className="lg">Phase 1 Health</CardTitle><CardDescription>Critical operating indicators</CardDescription></CardHeader><CardContent><div className="detail-list"><div><dt>Pending invoices</dt><dd>{stats?.pending_invoices || 0}</dd></div><div><dt>Outstanding amount</dt><dd>{money(stats?.outstanding_amount)}</dd></div><div><dt>Billed amount</dt><dd>{money(stats?.billed_amount)}</dd></div><div><dt>Converted leads</dt><dd>{stats?.converted_leads || 0}</dd></div></div></CardContent></Card>
      </div>

      <Card className="dashboard__invoices"><CardHeader><CardTitle className="lg">Recent Invoices</CardTitle><CardDescription>Latest invoice activity</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>{(recentInvoices || []).map((inv) => <TableRow key={inv.id}><TableCell>{inv.invoice_number || `#${inv.id}`}</TableCell><TableCell>{inv.client_name}</TableCell><TableCell>{money(inv.amount)}</TableCell><TableCell><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></TableCell><TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell></TableRow>)}{recentInvoices.length === 0 && <TableRow><TableCell colSpan={5} style={{ textAlign: "center", color: "var(--muted-foreground)" }}>No recent invoices</TableCell></TableRow>}</TableBody></Table></CardContent></Card>

      <Card className="dashboard__invoices" style={{ marginTop: 16 }}><CardHeader><CardTitle className="lg">Recent Stock Movements</CardTitle><CardDescription>Latest inventory activity</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Type</TableHead><TableHead>Quantity</TableHead><TableHead>Reference</TableHead><TableHead>Date</TableHead></TableRow></TableHeader><TableBody>{(recentStockMovements || []).map((movement) => <TableRow key={movement.id}><TableCell>{movement.product_name || movement.product_id}</TableCell><TableCell><Badge variant={movement.movement_type === "In" ? "success" : "destructive"}>{movement.movement_type}</Badge></TableCell><TableCell>{movement.quantity}</TableCell><TableCell>{movement.reference || movement.invoice_id || "-"}</TableCell><TableCell>{movement.created_at ? new Date(movement.created_at).toLocaleDateString() : "-"}</TableCell></TableRow>)}{recentStockMovements.length === 0 && <TableRow><TableCell colSpan={5} style={{ textAlign: "center", color: "var(--muted-foreground)" }}>No recent stock movements</TableCell></TableRow>}</TableBody></Table></CardContent></Card>

      {/* Inventory Summary Widgets */}
      {inventorySummary && (
        <div className="dashboard__charts" style={{ marginTop: 16 }}>
          {/* Pending POs */}
          <Card>
            <CardHeader>
              <CardTitle className="lg"><ClipboardList size={18} style={{ marginRight: 6 }} />Pending Purchase Orders</CardTitle>
              <CardDescription>Awaiting receipt</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", gap: 24 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "#6366f1" }}>{inventorySummary.pending_purchase_orders?.count || 0}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Open POs</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0ea5e9" }}>Rs.{Number(inventorySummary.pending_purchase_orders?.total_value || 0).toLocaleString()}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Total Value</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warehouse Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="lg"><Warehouse size={18} style={{ marginRight: 6 }} />Stock by Warehouse</CardTitle>
              <CardDescription>Distribution across warehouses</CardDescription>
            </CardHeader>
            <CardContent>
              {(inventorySummary.warehouse_distribution || []).length === 0 ? (
                <div style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>No warehouse data</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={inventorySummary.warehouse_distribution} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="warehouse_name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total_quantity" fill="#6366f1" radius={[4, 4, 0, 0]} name="Stock Units" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expiring Batches Alert */}
      {inventorySummary?.expiring_batches_count > 0 && (
        <Card style={{ marginTop: 16, borderColor: "#f59e0b" }}>
          <CardHeader>
            <CardTitle className="lg" style={{ color: "#b45309", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={18} /> {inventorySummary.expiring_batches_count} Batch{inventorySummary.expiring_batches_count > 1 ? "es" : ""} Expiring Within 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Batch</TableHead><TableHead>Warehouse</TableHead><TableHead>Qty</TableHead><TableHead>Expiry</TableHead></TableRow></TableHeader>
              <TableBody>
                {(inventorySummary.expiring_batches || []).map(b => (
                  <TableRow key={b.id}>
                    <TableCell style={{ fontWeight: 500 }}>{b.product_name}</TableCell>
                    <TableCell><code style={{ fontSize: "0.8125rem", background: "var(--muted)", padding: "2px 6px", borderRadius: 4 }}>{b.batch_number}</code></TableCell>
                    <TableCell>{b.warehouse_name || "—"}</TableCell>
                    <TableCell>{b.quantity}</TableCell>
                    <TableCell style={{ color: "#b45309", fontWeight: 600 }}>{new Date(b.expiry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
