"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LabelList,
} from "recharts";
import {
  ArrowUp, ArrowDown, Wallet, Clock, FileText, Users, TrendingUp,
  AlertTriangle, ShoppingCart, DollarSign, Plus, UserPlus, Package,
  BarChart3, Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from "@/services/api";
import type { DashboardData } from "@/types/dashboard";
import DashboardLoading from "./loading";

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

const statusVariant = (status: string) => {
  const s = status.toLowerCase();
  if (s === "paid") return "default" as const;
  if (s === "pending" || s === "sent") return "secondary" as const;
  if (s === "overdue") return "destructive" as const;
  return "outline" as const;
};

function KpiCard({ label, value, subtitle, icon: Icon, trend, color, index }: {
  label: string; value: string; subtitle?: string; icon: typeof Wallet; trend?: { dir: "up" | "down"; pct: string }; color: string; index: number;
}) {
  return (
    <div
      className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[--shell-border] bg-[--shell-surface] p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">
          {label}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[--shell-border] bg-[--shell-bg]">
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
      </div>
      <span className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">
        {value}
      </span>
      <div className="flex items-center gap-2">
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trend.dir === "up" ? "text-[--shell-success]" : "text-[--shell-danger]"}`}>
            {trend.dir === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {trend.pct}
          </span>
        )}
        {subtitle && <span className="text-xs text-[--shell-muted]">{subtitle}</span>}
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: typeof Package; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[--shell-border] bg-[--shell-surface] px-3.5 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${color}15` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[--shell-muted] truncate">{label}</p>
        <p className="font-heading text-sm font-semibold text-[--shell-foreground]">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    stats: null,
    revenueTrend: [],
    invoiceSummary: [],
    paymentAnalytics: [],
    recentInvoices: [],
    alerts: { overdue_invoices: 0, low_stock_products: 0 },
    clientGrowth: [],
  });

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [stats, recent, trend, summary, payments, growth] = await Promise.all([
          api.get<DashboardData["stats"]>("/dashboard/stats"),
          api.get<DashboardData["recentInvoices"]>("/dashboard/recent-invoices"),
          api.get<DashboardData["revenueTrend"]>("/dashboard/revenue-trend"),
          api.get<Record<string, { count: number; percentage: number }>>("/dashboard/invoice-summary"),
          api.get<{ method: string; count: number; amount: number }[]>("/dashboard/payment-analytics"),
          api.get<{ month: string; count: number }[]>("/dashboard/client-growth"),
        ]);

        const invoiceSummary = Object.entries(summary ?? {}).map(([name, item]) => ({
          name,
          count: item.count,
          value: item.percentage,
        }));

        setData({
          stats,
          revenueTrend: trend ?? [],
          invoiceSummary,
          paymentAnalytics: (payments ?? []).map((p) => ({ method: p.method, amount: p.amount })),
          recentInvoices: recent ?? [],
          alerts: {
            overdue_invoices: stats?.overdue_amount && stats.overdue_amount > 0
              ? recent?.filter((i) => i.status === "overdue" || (i.status === "sent" && i.due_date && new Date(i.due_date) < new Date())).length ?? 0
              : 0,
            low_stock_products: stats?.low_stock_count ?? 0,
          },
          clientGrowth: growth ?? [],
        });
      } catch {
        // Keep initial state
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

  const totalRevenue = s?.total_revenue ?? 0;
  const clientGrowthCount = data?.clientGrowth?.length
    ? data.clientGrowth[data.clientGrowth.length - 1].count
    : 0;

  return (
    <div className="space-y-10 lg:space-y-12">
      {/* Alert Banner */}
      {hasAlerts && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[--shell-accent]/20 bg-gradient-to-r from-[--shell-accent]/5 to-transparent px-5 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[--shell-accent]/10">
            <AlertTriangle className="h-4 w-4 text-[--shell-accent]" />
          </div>
          <span className="text-sm font-medium text-[--shell-accent-text]">Items requiring attention</span>
          <div className="flex flex-wrap gap-2">
            {hasOverdue && (
              <Badge variant="destructive" className="text-xs">
                {data!.alerts.overdue_invoices} overdue invoice{data!.alerts.overdue_invoices !== 1 ? "s" : ""}
              </Badge>
            )}
            {hasLowStock && (
              <Badge variant="outline" className="border-[--shell-warning]/30 text-[--shell-warning] text-xs">
                {data!.alerts.low_stock_products} low-stock item{data!.alerts.low_stock_products !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Primary KPIs */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">
            Overview
          </h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            label="Clients"
            value={String(s?.total_clients ?? 0)}
            subtitle={`${clientGrowthCount > 0 ? `+${clientGrowthCount} this month` : "Registered"}`}
            icon={Users}
            color="var(--chart-4)"
            index={3}
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">
            Quick Actions
          </h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/billing/invoices")}>
            <Plus className="h-3.5 w-3.5" /> New Invoice
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/crm/clients")}>
            <UserPlus className="h-3.5 w-3.5" /> Add Client
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/inventory/products")}>
            <Package className="h-3.5 w-3.5" /> New Product
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/crm/leads")}>
            <Layers className="h-3.5 w-3.5" /> Add Lead
          </Button>
        </div>
      </section>

      {/* Charts */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">
            Analytics
          </h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Trend */}
          <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-[--chart-1]" />
                  Revenue Trend
                </CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </div>
              {totalRevenue > 0 && (
                <div className="text-right">
                  <p className="font-heading text-lg font-semibold text-[--shell-foreground]">{f(totalRevenue)}</p>
                  <p className="text-[10px] text-[--shell-muted]">Total (MTD)</p>
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
                  <div className="flex h-full items-center justify-center text-sm text-[--shell-muted]">No revenue data yet</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Summary (Donut) */}
          <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-[--shell-border]/20">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[--shell-foreground]">
                  <BarChart3 className="h-4 w-4 text-[--shell-accent]" />
                  Invoice Distribution
                </CardTitle>
                <CardDescription className="text-xs text-[--shell-muted]">Real-time invoice lifecycle breakdown</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {data?.invoiceSummary && data.invoiceSummary.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center min-h-[300px]">
                  {/* Left Side: Donut Chart */}
                  <div className="col-span-12 md:col-span-7 flex justify-center items-center relative h-[250px] md:h-[280px]">
                    {/* Glassmorphic Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                      <div className="flex flex-col items-center justify-center bg-[--shell-surface] border border-[--shell-border] rounded-full h-32 w-32 shadow-engineered">
                        <span className="font-heading text-4xl font-bold tracking-tight text-[--shell-foreground] leading-none">
                          {s?.total_invoices ?? 0}
                        </span>
                        <span className="text-[11px] font-heading font-semibold uppercase tracking-[0.12em] text-[--shell-muted] mt-1">Invoices</span>
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

                  {/* Right Side: High-end Progress Legend */}
                  <div className="col-span-12 md:col-span-5 space-y-3">
                    <div className="text-[11px] font-heading font-semibold uppercase tracking-[0.12em] text-[--shell-muted] border-b border-[--shell-border]/20 pb-1.5 mb-3">
                      Lifecycle Summary
                    </div>
                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                      {data.invoiceSummary.map((item) => (
                        <div key={item.name} className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-[--shell-border]/10 transition-all duration-150 group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0 transition-transform group-hover:scale-110" style={{ background: statusColor(item.name) }} />
                              <span className="text-xs font-heading font-semibold tracking-tight text-[--shell-foreground]">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-[--shell-foreground]">{item.count}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[--shell-border]/30 text-[--shell-muted] font-medium">{item.value}%</span>
                            </div>
                          </div>
                          {/* Segment Progress Bar */}
                          <div className="h-1 w-full bg-[--shell-border]/20 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.value}%`, background: statusColor(item.name) }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[300px] items-center justify-center text-sm text-[--shell-muted] border border-dashed border-[--shell-border] rounded-lg">
                  No lifecycle metrics available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Transactions & Monitoring */}
      <section>
        <div className="mb-4 lg:mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">
            Activity
          </h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-[--shell-muted]" />
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
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recentInvoices ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-[--shell-muted] py-8 text-sm">No invoices yet</TableCell>
                  </TableRow>
                ) : (data?.recentInvoices ?? []).slice(0, 5).map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/30" onClick={() => router.push(`/billing/invoices/${inv.id}`)}>
                    <TableCell className="font-mono text-xs font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm text-[--shell-muted]">{inv.client_name}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">{f(inv.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)} className="capitalize text-xs">
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
        <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-[--shell-muted]" />
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
              <div className="mt-3 rounded-lg border border-[--shell-warning]/20 bg-[--shell-warning]/5 px-3.5 py-2.5">
                <p className="text-xs font-medium text-[--shell-warning]">
                  {s!.low_stock_count} product{s!.low_stock_count !== 1 ? "s" : ""} below minimum stock threshold
                </p>
                <p className="mt-0.5 text-[11px] text-[--shell-muted]">
                  Review and reorder to maintain inventory levels.
                </p>
              </div>
            )}
            {!hasLowStock && s && s.total_products > 0 && (
              <div className="mt-3 rounded-lg border border-[--shell-success]/20 bg-[--shell-success]/5 px-3.5 py-2.5">
                <p className="text-xs font-medium text-[--shell-success]">All stock levels are healthy</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </section>

      {/* Bottom Row */}
      <section>
        <div className="mb-4 lg:mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">
            Payments & Growth
          </h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment Analytics */}
        <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-[--chart-3]" />
                Payment Analytics
              </CardTitle>
              <CardDescription>Collections by payment method</CardDescription>
            </div>
            {data?.paymentAnalytics && data.paymentAnalytics.length > 0 && (
              <div className="text-right">
                <p className="font-heading text-lg font-semibold text-[--shell-foreground]">
                  {f(data.paymentAnalytics.reduce((s, p) => s + p.amount, 0))}
                </p>
                <p className="text-[10px] text-[--shell-muted]">Total collected</p>
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
                <div className="flex h-full items-center justify-center text-sm text-[--shell-muted]">No payment data yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Client Growth */}
        <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-[--chart-4]" />
                Client Growth
              </CardTitle>
              <CardDescription>New clients per month</CardDescription>
            </div>
            {data?.clientGrowth && data.clientGrowth.length > 0 && (
              <div className="text-right">
                <p className="font-heading text-lg font-semibold text-[--shell-foreground]">
                  {data.clientGrowth.reduce((s, m) => s + m.count, 0)}
                </p>
                <p className="text-[10px] text-[--shell-muted]">New this period</p>
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
                <div className="flex h-full items-center justify-center text-sm text-[--shell-muted]">No client growth data yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </section>

      {/* Footer Stats */}
      <section>
        <div className="mb-4 lg:mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">
            Summary
          </h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MiniStat icon={AlertTriangle} label="Overdue Amount" value={f(s?.overdue_amount ?? 0)} color={hasOverdue ? "var(--shell-danger)" : "var(--chart-2)"} />
          <MiniStat icon={ShoppingCart} label="Total Products" value={String(s?.total_products ?? 0)} color="var(--chart-1)" />
          <MiniStat icon={BarChart3} label="Outstanding" value={f(s?.outstanding_revenue ?? 0)} color="var(--chart-3)" />
          <MiniStat icon={DollarSign} label="Total Revenue" value={f(totalRevenue)} color="var(--chart-1)" />
        </div>
      </section>
    </div>
  );
}
