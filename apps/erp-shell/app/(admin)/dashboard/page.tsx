"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LabelList,
} from "recharts";
import {
  ArrowUp, Wallet, Clock, FileText, Users, TrendingUp,
  AlertTriangle, ShoppingCart, DollarSign, Plus, UserPlus, Package,
  BarChart3, Layers, Target, Lightbulb,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from "@/services/api";
import type { DashboardData } from "@/types/dashboard";
import { statusVariant } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, KpiCard, SectionHeading, AlertBanner, handleError } from "@datavex/ui-theme";
import DashboardLoading from "./loading";
import PipelineChart from "./PipelineChart";
import Recommendations from "./Recommendations";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const STATUS_COLORS: Record<string, string> = {
  paid: "var(--chart-2)",
  sent: "var(--chart-1)",
  pending: "var(--chart-3)",
  overdue: "var(--shell-danger)",
  draft: "var(--chart-4)",
  cancelled: "var(--chart-5)",
  void: "var(--chart-4)",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status.toLowerCase()] ?? "var(--chart-4)";
}

const tooltipStyle = {
  background: "var(--shell-popover)",
  border: "1px solid var(--shell-border)",
  borderRadius: 8,
  fontSize: 13,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

const f = (v: number) => `₹${(v / 100000).toFixed(1)}L`;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function MiniStat({ icon: Icon, label, value, color }: { icon: typeof Package; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3.5 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${color}15` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="font-heading text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    stats: null,
    revenueTrend: [],
    invoiceSummary: [],
    paymentAnalytics: [],
    recentInvoices: [],
    alerts: { overdue_invoices: 0, low_stock_products: 0 },
    clientGrowth: [],
    crmDashboard: null,
    pipelineValue: 0,
    pipelineStages: [],
    recommendations: [],
  });

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [
          statsRes,
          recentRes,
          trendRes,
          summaryRes,
          paymentsRes,
          growthRes,
          crmRes,
        ] = await Promise.allSettled([
          api.get<DashboardData["stats"]>("/dashboard/stats"),
          api.get<DashboardData["recentInvoices"]>("/dashboard/recent-invoices"),
          api.get<DashboardData["revenueTrend"]>("/dashboard/revenue-trend"),
          api.get<Record<string, { count: number; percentage: number }>>("/dashboard/invoice-summary"),
          api.get<{ method: string; count: number; amount: number }[]>("/dashboard/payment-analytics"),
          api.get<{ month: string; count: number }[]>("/dashboard/client-growth"),
          api.get<any>("/dashboard/crm"),
        ]);

        const stats = statsRes.status === "fulfilled" && statsRes.value ? statsRes.value : {
          total_clients: 0,
          total_invoices: 0,
          total_revenue: 0,
          outstanding_revenue: 0,
          overdue_amount: 0,
          total_products: 0,
          low_stock_count: 0,
          pipeline_value: 0,
          open_opportunities: 0,
          total_customers: 0,
          total_leads: 0,
        };

        const recent = recentRes.status === "fulfilled" && Array.isArray(recentRes.value) ? recentRes.value : [];
        const trend = trendRes.status === "fulfilled" && Array.isArray(trendRes.value) ? trendRes.value : [];
        const summary = summaryRes.status === "fulfilled" && summaryRes.value ? summaryRes.value : {};
        const payments = paymentsRes.status === "fulfilled" && Array.isArray(paymentsRes.value) ? paymentsRes.value : [];
        const growth = growthRes.status === "fulfilled" && Array.isArray(growthRes.value) ? growthRes.value : [];
        const crm = crmRes.status === "fulfilled" && crmRes.value ? crmRes.value : null;

        const invoiceSummary = Object.entries(summary ?? {}).map(([name, item]) => ({
          name,
          count: item.count,
          value: item.percentage,
        }));

        const crmDash = crm ?? { metrics: [], pipeline_stages: [], recommendations: [] };
        const stages = crmDash.pipeline_stages ?? [];
        const pv = stages.length > 0 ? stages.reduce((s: number, st: any) => s + (Number(st.value) || 0), 0) : 0;

        setData({
          stats,
          revenueTrend: trend,
          invoiceSummary,
          paymentAnalytics: payments.map((p) => ({ method: p.method, amount: p.amount })),
          recentInvoices: recent,
          alerts: {
            overdue_invoices: stats?.overdue_amount && stats.overdue_amount > 0
              ? recent.filter((i) => i.status === "overdue" || (i.status === "sent" && i.due_date && new Date(i.due_date) < new Date())).length ?? 0
              : 0,
            low_stock_products: stats?.low_stock_count ?? 0,
          },
          clientGrowth: growth,
          crmDashboard: crmDash,
          pipelineValue: pv,
          pipelineStages: stages,
          recommendations: crmDash.recommendations ?? [],
        });
      } catch (e) {
        console.error("Dashboard fetch error:", e);
        setData((prev) => ({
          ...prev,
          stats: prev.stats || {
            total_clients: 0,
            total_invoices: 0,
            total_revenue: 0,
            outstanding_revenue: 0,
            overdue_amount: 0,
            total_products: 0,
            low_stock_count: 0,
            pipeline_value: 0,
            open_opportunities: 0,
            total_customers: 0,
            total_leads: 0,
          },
        }));
      }
    }
    fetchDashboard();
  }, []);

  if (data.stats === null) {
    return <DashboardLoading />;
  }

  const s = data.stats;
  const hasAlerts = (data.alerts.overdue_invoices > 0 || data.alerts.low_stock_products > 0);
  const hasLowStock = (s?.low_stock_count ?? 0) > 0;
  const hasOverdue = (data.alerts.overdue_invoices ?? 0) > 0;
  const hasRecommendations = data.recommendations.length > 0;

  const totalRevenue = s?.total_revenue ?? 0;
  const clientGrowthCount = data?.clientGrowth?.length
    ? data.clientGrowth[data.clientGrowth.length - 1].count
    : 0;

  return (
    <div className="space-y-10 lg:space-y-12">
      {/* Welcome Header */}
      <PageHeader
        title={`${getGreeting()}, ${user?.full_name || user?.email || "Executive"}`}
        subtitle="Here's a consolidated summary of your enterprise revenue, sales pipeline, and operations."
        badge="Executive Control Shell"
      />

      {/* Alert Banner */}
      {(hasAlerts || hasRecommendations) && (
        <AlertBanner
          icon={AlertTriangle}
          message="Items requiring attention"
          badges={
            <>
              {hasOverdue && (
                <Badge variant="destructive" className="text-xs font-medium">
                  {data!.alerts.overdue_invoices} overdue invoice{data!.alerts.overdue_invoices !== 1 ? "s" : ""}
                </Badge>
              )}
              {hasLowStock && (
                <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 text-xs font-medium">
                  {data!.alerts.low_stock_products} low-stock item{data!.alerts.low_stock_products !== 1 ? "s" : ""}
                </Badge>
              )}
              {hasRecommendations && (
                <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-xs font-medium">
                  <Lightbulb className="h-3 w-3 mr-1 inline text-primary" />
                  {data.recommendations.length} AI insight{data.recommendations.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </>
          }
        />
      )}

      {/* Primary KPIs */}
      <section>
        <SectionHeading label="Overview" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Revenue (MTD)"
            value={f(totalRevenue)}
            subtitle={totalRevenue > 0 ? "Current month" : "No data"}
            icon={Wallet}
            color="var(--chart-1)"
            index={0}
          />
          <KpiCard
            label="Outstanding"
            value={f(s?.outstanding_revenue ?? 0)}
            subtitle={s?.outstanding_revenue ? `${((s.outstanding_revenue / Math.max(totalRevenue, 1)) * 100).toFixed(0)}% of revenue` : "None due"}
            icon={Clock}
            color="var(--chart-3)"
            index={1}
          />
          <KpiCard
            label="Invoices"
            value={String(s?.total_invoices ?? 0)}
            subtitle={`${s?.total_invoices ?? 0} total issued`}
            icon={FileText}
            color="var(--chart-2)"
            index={2}
          />
          <KpiCard
            label="Pipeline Value"
            value={f(data.pipelineValue)}
            subtitle={`${data.pipelineStages.length} stage${data.pipelineStages.length !== 1 ? "s" : ""} active`}
            icon={Layers}
            color="var(--chart-5)"
            index={3}
          />
          <KpiCard
            label="Open Opportunities"
            value={String(s?.open_opportunities ?? 0)}
            subtitle={s?.open_opportunities ? `${s.open_opportunities} active` : "None active"}
            icon={Target}
            color="var(--chart-4)"
            index={4}
          />
          <KpiCard
            label="Clients"
            value={String(s?.total_customers ?? s?.total_clients ?? 0)}
            subtitle={`${clientGrowthCount > 0 ? `+${clientGrowthCount} this month` : "Registered"}`}
            icon={Users}
            color="var(--chart-4)"
            index={5}
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <SectionHeading label="Quick Actions" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/billing/invoices")}>
            <Plus className="h-3.5 w-3.5" /> New Invoice
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/crm/customers")}>
            <UserPlus className="h-3.5 w-3.5" /> Add Customer
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/inventory/products")}>
            <Package className="h-3.5 w-3.5" /> New Product
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/crm/leads")}>
            <Layers className="h-3.5 w-3.5" /> Add Lead
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/crm/opportunities")}>
            <Target className="h-3.5 w-3.5" /> New Opportunity
          </Button>
        </div>
      </section>

      {/* Analytics */}
      <section>
        <SectionHeading label="Analytics" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Trend */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-[var(--chart-1)]" />
                  Revenue Trend
                </CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </div>
              {totalRevenue > 0 && (
                <div className="text-right">
                  <p className="font-heading text-lg font-semibold text-foreground">{f(totalRevenue)}</p>
                  <p className="text-[10px] text-muted-foreground">Total (MTD)</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {data?.revenueTrend && data.revenueTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.revenueTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="var(--shell-border)" strokeOpacity={0.4} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                        labelStyle={{ fontWeight: 600, marginBottom: 4, color: "var(--shell-foreground)" }}
                      />
                      <Area
                        type="monotone" dataKey="revenue"
                        stroke="var(--chart-1)" strokeWidth={2.5}
                        fill="url(#revenueGrad)"
                        dot={{ r: 3, fill: "var(--chart-1)", stroke: "var(--shell-surface)", strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--shell-surface)", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No revenue data yet</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Summary (Donut) */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/20">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BarChart3 className="h-4 w-4 text-[var(--shell-accent)]" />
                  Invoice Distribution
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Real-time invoice lifecycle breakdown</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {data?.invoiceSummary && data.invoiceSummary.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center min-h-[300px]">
                  <div className="col-span-12 md:col-span-7 flex justify-center items-center relative h-[250px] md:h-[280px]">
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                      <div className="flex flex-col items-center justify-center border border-border rounded-full h-32 w-32 shadow-engineered">
                        <span className="font-heading text-4xl font-bold tracking-tight text-foreground leading-none">
                          {s?.total_invoices ?? 0}
                        </span>
                        <span className="text-[11px] font-heading font-semibold uppercase tracking-[0.12em] text-muted-foreground mt-1">Invoices</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                      <PieChart>
                        <Pie
                          data={data.invoiceSummary}
                          cx="50%" cy="50%"
                          innerRadius={78}
                          outerRadius={108}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="var(--shell-surface)"
                          strokeWidth={2}
                        >
                          {data.invoiceSummary.map((item) => (
                            <Cell key={item.name} fill={statusColor(item.name)} className="outline-none hover:opacity-90 transition-opacity" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(_value: unknown, _name: unknown, entry: unknown) => {
                            const p = (entry as { payload: { count: number; value: number; name: string } }).payload;
                            return [`${p.count} invoices (${p.value}%)`, p.name];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="col-span-12 md:col-span-5 space-y-3">
                    <div className="text-[11px] font-heading font-semibold uppercase tracking-[0.12em] text-muted-foreground border-b border-border/20 pb-1.5 mb-3">
                      Lifecycle Summary
                    </div>
                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                      {data.invoiceSummary.map((item) => (
                        <div key={item.name} className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-border/10 transition-all duration-150 group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0 transition-transform group-hover:scale-110" style={{ background: statusColor(item.name) }} />
                              <span className="text-xs font-heading font-semibold tracking-tight text-foreground">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-foreground">{item.count}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-border/30 text-muted-foreground font-medium">{item.value}%</span>
                            </div>
                          </div>
                          <div className="h-1 w-full bg-border/20 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.value}%`, background: statusColor(item.name) }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  No lifecycle metrics available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pipeline */}
      <section>
        <SectionHeading label="Pipeline" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PipelineChart stages={data.pipelineStages} pipelineValue={data.pipelineValue} />
          <Recommendations recommendations={data.recommendations} />
        </div>
      </section>

      {/* Transactions & Monitoring */}
      <section>
        <SectionHeading label="Activity" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Recent Invoices
              </CardTitle>
              <CardDescription>Latest invoice activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => router.push("/billing/invoices")}>
              View all <ArrowUp className="h-3 w-3 rotate-90" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider">Invoice</TableHead>
                  <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider">Client</TableHead>
                  <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-right">Amount</TableHead>
                  <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recentInvoices ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">No invoices yet</TableCell>
                  </TableRow>
                ) : (data?.recentInvoices ?? []).slice(0, 5).map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/30" onClick={() => router.push(`/billing/invoices/${inv.id}`)}>
                    <TableCell className="font-mono text-xs font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.client_name}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">{f(inv.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant("invoice", inv.status)} className="capitalize text-xs">
                        {inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Low Stock / Alerts */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                Inventory Status
              </CardTitle>
              <CardDescription>Stock levels and product overview</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => router.push("/inventory/products")}>
              View all <ArrowUp className="h-3 w-3 rotate-90" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat icon={Package} label="Total Products" value={String(s?.total_products ?? 0)} color="var(--chart-1)" />
              <MiniStat icon={AlertTriangle} label="Low Stock Items" value={String(s?.low_stock_count ?? 0)} color={hasLowStock ? "var(--shell-warning)" : "var(--chart-2)"} />
            </div>
            {hasLowStock && (
              <div className="mt-3 rounded-lg border border-[var(--shell-warning)]/20 bg-[var(--shell-warning)]/5 px-3.5 py-2.5">
                <p className="text-xs font-medium text-[var(--shell-warning)]">
                  {s!.low_stock_count} product{s!.low_stock_count !== 1 ? "s" : ""} below minimum stock threshold
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Review and reorder to maintain inventory levels.
                </p>
              </div>
            )}
            {!hasLowStock && s && s.total_products > 0 && (
              <div className="mt-3 rounded-lg border border-[var(--shell-success)]/20 bg-[var(--shell-success)]/5 px-3.5 py-2.5">
                <p className="text-xs font-medium text-[var(--shell-success)]">All stock levels are healthy</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </section>

      {/* Bottom Row */}
      <section>
        <SectionHeading label="Payments & Growth" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment Analytics */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-[var(--chart-3)]" />
                Payment Analytics
              </CardTitle>
              <CardDescription>Collections by payment method</CardDescription>
            </div>
            {data?.paymentAnalytics && data.paymentAnalytics.length > 0 && (
              <div className="text-right">
                <p className="font-heading text-lg font-semibold text-foreground">
                  {f(data.paymentAnalytics.reduce((s, p) => s + p.amount, 0))}
                </p>
                <p className="text-[10px] text-muted-foreground">Total collected</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {data?.paymentAnalytics && data.paymentAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...data.paymentAnalytics].sort((a, b) => b.amount - a.amount)} margin={{ top: 16, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--shell-border)" strokeOpacity={0.4} />
                    <XAxis dataKey="method" tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Amount"]}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {data.paymentAnalytics.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                      <LabelList
                        dataKey="amount"
                        position="top"
                        formatter={(v) => `${(Number(v) / 100000).toFixed(1)}L`}
                        style={{ fontSize: 10, fill: "var(--shell-muted)", fontWeight: 500 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No payment data yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Client Growth */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-[var(--chart-4)]" />
                Client Growth
              </CardTitle>
              <CardDescription>New clients per month</CardDescription>
            </div>
            {data?.clientGrowth && data.clientGrowth.length > 0 && (
              <div className="text-right">
                <p className="font-heading text-lg font-semibold text-foreground">
                  {data.clientGrowth.reduce((s, m) => s + m.count, 0)}
                </p>
                <p className="text-[10px] text-muted-foreground">New this period</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {data?.clientGrowth && data.clientGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.clientGrowth} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <defs>
                      <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-4)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--chart-4)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--shell-border)" strokeOpacity={0.4} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [value, "New Clients"]}
                      labelStyle={{ fontWeight: 600, marginBottom: 4, color: "var(--shell-foreground)" }}
                    />
                    <Area
                      type="monotone" dataKey="count"
                      stroke="var(--chart-4)" strokeWidth={2.5}
                      fill="url(#clientGrad)"
                      dot={{ r: 3, fill: "var(--chart-4)", stroke: "var(--shell-surface)", strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: "var(--chart-4)", stroke: "var(--shell-surface)", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No client growth data yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </section>

      {/* Footer Stats */}
      <section>
        <SectionHeading label="Summary" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MiniStat icon={AlertTriangle} label="Overdue Amount" value={f(s?.overdue_amount ?? 0)} color={hasOverdue ? "var(--shell-danger)" : "var(--chart-2)"} />
          <MiniStat icon={ShoppingCart} label="Total Products" value={String(s?.total_products ?? 0)} color="var(--chart-1)" />
          <MiniStat icon={BarChart3} label="Outstanding" value={f(s?.outstanding_revenue ?? 0)} color="var(--chart-3)" />
          <MiniStat icon={DollarSign} label="Total Revenue" value={f(totalRevenue)} color="var(--chart-1)" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MiniStat icon={Layers} label="Pipeline Value" value={f(data.pipelineValue)} color="var(--chart-5)" />
          <MiniStat icon={Target} label="Open Opportunities" value={String(s?.open_opportunities ?? 0)} color="var(--chart-4)" />
          <MiniStat icon={Users} label="Total Customers" value={String(s?.total_customers ?? 0)} color="var(--chart-2)" />
          <MiniStat icon={UserPlus} label="Total Leads" value={String(s?.total_leads ?? 0)} color={s?.total_leads && s.total_leads > 0 ? "var(--shell-info)" : "var(--chart-2)"} />
        </div>
      </section>
    </div>
  );
}
