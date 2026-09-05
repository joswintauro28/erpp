"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Wallet, Clock, FileText, TrendingUp,
  AlertTriangle, DollarSign, Plus, CreditCard,
  Receipt, Layers, ArrowDownLeft, ArrowUpRight, ArrowUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from "@/services/api";
import { PageHeader, KpiCard, SectionHeading, AlertBanner, handleError } from "@datavex/ui-theme";
import { money, lakhFormat, statusVariant } from "@/utils/format";
import type { BillingDashboardData } from "@/types/billing";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLoading from "./loading";

const STATUS_COLORS: Record<string, string> = {
  paid: "var(--chart-2)",
  sent: "var(--chart-1)",
  pending: "var(--chart-3)",
  overdue: "var(--shell-danger)",
  draft: "var(--chart-4)",
  void: "var(--chart-4)",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status.toLowerCase()] ?? "var(--chart-4)";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const tooltipStyle = {
  background: "var(--shell-popover)",
  border: "1px solid var(--shell-border)",
  borderRadius: 8,
  fontSize: 13,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export default function BillingDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<BillingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboard() {
    setLoading(true);
    setError("");
    try {
      const d = await api.get<BillingDashboardData>("/dashboard/billing");
      setData(d);
    } catch {
      setError("Failed to load dashboard data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <DashboardLoading />;

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-medium text-destructive">{error}</p>
        <button
          onClick={fetchDashboard}
          className="rounded bg-action px-4 py-2 text-xs font-medium text-white hover:bg-action/90"
        >
          Retry
        </button>
      </div>
    );
  }

  const d = data;
  const hasOverdue = (d?.overdue ?? 0) > 0;
  const totalInvoices = d?.summary?.reduce((a, i) => a + i.count, 0) ?? 0;

  return (
    <div className="space-y-10 lg:space-y-12">
      {/* Welcome Header */}
      <PageHeader
        title={`${getGreeting()}, ${user?.full_name || user?.email || "Accountant"}`}
        subtitle="Here's a live view of your revenue stream, receivables, payables, and invoice statuses."
        badge="Billing & Finance Console"
        actions={
          <Button size="sm" className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-brand)]/90 gap-1.5 text-xs shadow-sm" onClick={() => router.push("/billing/invoices")}>
            <Plus className="h-3.5 w-3.5" /> New Invoice
          </Button>
        }
      />

      {hasOverdue && (
        <AlertBanner
          icon={AlertTriangle}
          message={`${money(d!.overdue)} in overdue invoices require attention`}
          variant="danger"
        />
      )}

      <section>
        <SectionHeading label="Overview" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Total Revenue" value={lakhFormat(d?.total_revenue ?? 0)} subtitle="All time" icon={Wallet} color="var(--chart-1)" index={0} />
          <KpiCard label="AR" value={lakhFormat(d?.total_ar ?? 0)} subtitle="Accounts Receivable" icon={ArrowDownLeft} color="var(--chart-2)" index={1} />
          <KpiCard label="AP" value={lakhFormat(d?.total_ap ?? 0)} subtitle="Accounts Payable" icon={ArrowUpRight} color="var(--chart-3)" index={2} />
          <KpiCard label="Overdue" value={lakhFormat(d?.overdue ?? 0)} subtitle={hasOverdue ? "Requires action" : "All clear"} icon={AlertTriangle} color={hasOverdue ? "var(--shell-danger)" : "var(--chart-2)"} index={3} />
          <KpiCard label="Outstanding" value={lakhFormat(d?.outstanding ?? 0)} subtitle={d?.outstanding ? `${((d.outstanding / Math.max(d.total_revenue, 1)) * 100).toFixed(0)}% of revenue` : "None due"} icon={Clock} color="var(--chart-4)" index={4} />
          <KpiCard label="Total Invoices" value={String(totalInvoices)} subtitle="Issued to date" icon={FileText} color="var(--chart-5)" index={5} />
        </div>
      </section>

      <section>
        <SectionHeading label="Quick Actions" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/billing/invoices")}>
            <Plus className="h-3.5 w-3.5" /> New Invoice
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/billing/quotations")}>
            <Receipt className="h-3.5 w-3.5" /> New Quotation
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/billing/payments")}>
            <CreditCard className="h-3.5 w-3.5" /> Record Payment
          </Button>
        </div>
      </section>

      <section>
        <SectionHeading label="Revenue Trend" />
        <Card>
          <CardContent>
            <div className="h-[280px]">
              {d?.revenue_trend && d.revenue_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={d.revenue_trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--shell-border)" strokeOpacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--shell-muted)" }} stroke="var(--shell-border)" axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                      labelStyle={{ fontWeight: 600, marginBottom: 4, color: "var(--shell-foreground)" }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 3, fill: "var(--chart-1)", stroke: "var(--shell-surface)", strokeWidth: 2 }} activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--shell-surface)", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No revenue data yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading label="Invoice Distribution" />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/20">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Layers className="h-4 w-4 text-accent-foreground" />
                Invoice Lifecycle
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Real-time invoice status breakdown</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {d?.summary && d.summary.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center min-h-[300px]">
                <div className="col-span-12 md:col-span-7 flex justify-center items-center relative h-[250px] md:h-[280px]">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                    <div className="flex flex-col items-center justify-center bg-card border border-border rounded-full h-32 w-32">
                      <span className="font-heading text-4xl font-bold tracking-tight text-foreground leading-none">
                        {totalInvoices}
                      </span>
                      <span className="text-[11px] font-heading font-semibold uppercase tracking-[0.12em] text-muted-foreground mt-1">Invoices</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                    <PieChart>
                      <Pie
                        data={d.summary.map((s) => ({ name: s.status, count: s.count, value: s.percentage }))}
                        cx="50%" cy="50%"
                        innerRadius={78}
                        outerRadius={108}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="var(--shell-surface)"
                        strokeWidth={2}
                      >
                        {d.summary.map((item) => (
                          <Cell key={item.status} fill={statusColor(item.status)} className="outline-none hover:opacity-90 transition-opacity" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(_value: unknown, _name: unknown, entry: unknown) => {
                          const p = (entry as { payload: { count: number; value: number; name: string } }).payload;
                          return [`${p.count} invoices (${p.value}%)`, p.name.replace("_", " ")];
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
                    {d.summary.map((item) => (
                      <div key={item.status} className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-border/10 transition-all duration-150 group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0 transition-transform group-hover:scale-110" style={{ background: statusColor(item.status) }} />
                            <span className="text-xs font-heading font-semibold tracking-tight text-foreground capitalize">{item.status.replace("_", " ")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-foreground">{item.count}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-border/30 text-muted-foreground font-medium">{item.percentage}%</span>
                          </div>
                        </div>
                        <div className="h-1 w-full bg-border/20 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.percentage}%`, background: statusColor(item.status) }} />
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
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-chart-3" />
                Payment Metrics
              </CardTitle>
              <CardDescription>Daily, monthly, and outstanding totals</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {d?.payment_metrics ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <p className="text-xs text-muted-foreground">Today</p>
                  <p className="font-heading text-lg font-semibold text-foreground">{money(d.payment_metrics.today)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <p className="text-xs text-muted-foreground">This Month</p>
                  <p className="font-heading text-lg font-semibold text-foreground">{money(d.payment_metrics.this_month)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <p className="text-xs text-muted-foreground">Refunds</p>
                  <p className="font-heading text-lg font-semibold text-destructive">{money(d.payment_metrics.refunds)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="font-heading text-lg font-semibold text-destructive">{d.payment_metrics.failed}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">No payment data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
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
                {(d?.recent_invoices ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">No invoices yet</TableCell>
                  </TableRow>
                ) : (d?.recent_invoices ?? []).slice(0, 5).map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/30" onClick={() => router.push(`/billing/invoices/${inv.id}`)}>
                    <TableCell className="font-mono text-xs font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.client_name}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">{lakhFormat(inv.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant("invoice", inv.status)} className="capitalize text-xs">
                        {inv.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
