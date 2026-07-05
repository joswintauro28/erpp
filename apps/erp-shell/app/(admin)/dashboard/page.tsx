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
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";
import type { DashboardData } from "@/types/dashboard";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

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
      className="animate-kpi flex flex-col gap-1 rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

        const invoiceSummary = Object.entries(summary ?? {}).map(([name, val]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
          value: val.percentage,
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
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-[--shell-muted]" />
      </div>
    );
  }

  const s = data?.stats;
  const hasAlerts = data && (data.alerts.overdue_invoices > 0 || data.alerts.low_stock_products > 0);
  const hasLowStock = (s?.low_stock_count ?? 0) > 0;
  const hasOverdue = (data?.alerts.overdue_invoices ?? 0) > 0;

  const totalRevenue = s?.total_revenue ?? 0;
  const clientGrowthCount = data?.clientGrowth?.length
    ? data.clientGrowth[data.clientGrowth.length - 1].count
    : 0;

  return (
    <div className="space-y-6">
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
        <div className="mb-4 flex items-center gap-2">
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
        <div className="mb-4 flex items-center gap-2">
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
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">
            Analytics
          </h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Trend */}
          <Card>
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
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="var(--shell-border)" strokeOpacity={0.5} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--shell-popover)", border: "1px solid var(--shell-border)",
                          borderRadius: 8, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-[--chart-2]" />
                  Invoice Status
                </CardTitle>
                <CardDescription>Distribution by status</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {data?.invoiceSummary && data.invoiceSummary.length > 0 ? (
                  <div className="relative h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.invoiceSummary}
                          cx="50%" cy="45%"
                          innerRadius={65}
                          outerRadius={105}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {data.invoiceSummary.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--shell-popover)", border: "1px solid var(--shell-border)",
                            borderRadius: 8, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                          formatter={(value, name) => [`${value}%`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: "calc(45% - 30px)" }}>
                      <span className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">
                        {s?.total_invoices ?? 0}
                      </span>
                      <span className="text-[11px] text-[--shell-muted]">Total</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[--shell-muted]">No invoice data yet</div>
                )}
                {data?.invoiceSummary && data.invoiceSummary.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pb-2">
                    {data.invoiceSummary.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs text-[--shell-muted]">{item.name}</span>
                        <span className="text-xs font-medium text-[--shell-foreground]">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Transactions & Monitoring */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
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
        <Card>
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

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment Analytics */}
        <Card>
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
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--shell-border)" strokeOpacity={0.5} />
                    <XAxis dataKey="method" tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--shell-popover)", border: "1px solid var(--shell-border)",
                        borderRadius: 8, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
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
        <Card>
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
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--shell-border)" strokeOpacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--shell-popover)", border: "1px solid var(--shell-border)",
                        borderRadius: 8, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
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

      {/* Footer Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat icon={AlertTriangle} label="Overdue Amount" value={f(s?.overdue_amount ?? 0)} color={hasOverdue ? "var(--shell-danger)" : "var(--chart-2)"} />
        <MiniStat icon={ShoppingCart} label="Total Products" value={String(s?.total_products ?? 0)} color="var(--chart-1)" />
        <MiniStat icon={BarChart3} label="Outstanding" value={f(s?.outstanding_revenue ?? 0)} color="var(--chart-3)" />
        <MiniStat icon={Wallet} label="Overdue" value={f(s?.overdue_amount ?? 0)} color={hasOverdue ? "var(--shell-danger)" : "var(--chart-2)"} />
      </div>
    </div>
  );
}
