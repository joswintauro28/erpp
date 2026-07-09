"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  ArrowUp, Wallet, Clock, FileText, TrendingUp,
  AlertTriangle, DollarSign, Plus, CreditCard,
  BarChart3, Receipt, Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { api } from "@/services/api";
import { money, lakhFormat } from "@/utils/format";
import type { BillingDashboardData } from "@/types/billing";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const statusVariant = (status: string) => {
  const s = status.toLowerCase();
  if (s === "paid") return "default" as const;
  if (s === "pending" || s === "sent") return "secondary" as const;
  if (s === "overdue") return "destructive" as const;
  return "outline" as const;
};

function KpiCard({ label, value, subtitle, icon: Icon, color, index }: {
  label: string; value: string; subtitle?: string; icon: typeof Wallet; color: string; index: number;
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
      {subtitle && <span className="text-xs text-[--shell-muted]">{subtitle}</span>}
    </div>
  );
}

export default function BillingDashboard() {
  const router = useRouter();
  const [data, setData] = useState<BillingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const d = await api.get<BillingDashboardData>("/dashboard/billing");
        setData(d);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner />;

  const s = data;
  const hasOverdue = (s?.overdue ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {hasOverdue && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[--shell-accent]/20 bg-gradient-to-r from-[--shell-accent]/5 to-transparent px-5 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[--shell-accent]/10">
            <AlertTriangle className="h-4 w-4 text-[--shell-accent]" />
          </div>
          <span className="text-sm font-medium text-[--shell-accent-text]">
            {money(s!.overdue)} in overdue invoices require attention
          </span>
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
            label="Total Revenue"
            value={lakhFormat(s?.totalRevenue ?? 0)}
            subtitle="All time"
            icon={Wallet}
            color="var(--chart-1)"
            index={0}
          />
          <KpiCard
            label="Outstanding"
            value={lakhFormat(s?.outstanding ?? 0)}
            subtitle={s?.outstanding ? `${((s.outstanding / Math.max(s.totalRevenue, 1)) * 100).toFixed(0)}% of revenue` : "None due"}
            icon={Clock}
            color="var(--chart-3)"
            index={1}
          />
          <KpiCard
            label="Overdue"
            value={lakhFormat(s?.overdue ?? 0)}
            subtitle={hasOverdue ? "Requires action" : "All clear"}
            icon={AlertTriangle}
            color={hasOverdue ? "var(--shell-danger)" : "var(--chart-2)"}
            index={2}
          />
          <KpiCard
            label="Total Invoices"
            value={String(s?.summary?.reduce((a, i) => a + i.count, 0) ?? 0)}
            subtitle="Issued to date"
            icon={FileText}
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
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/billing/invoices")} aria-label="New Invoice">
            <Plus className="h-3.5 w-3.5" /> New Invoice
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/billing/quotations")} aria-label="New Quotation">
            <Receipt className="h-3.5 w-3.5" /> New Quotation
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => router.push("/billing/payments")} aria-label="Record Payment">
            <CreditCard className="h-3.5 w-3.5" /> Record Payment
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
              {s?.totalRevenue && s.totalRevenue > 0 && (
                <div className="text-right">
                  <p className="font-heading text-lg font-semibold text-[--shell-foreground]">{lakhFormat(s.totalRevenue)}</p>
                  <p className="text-[10px] text-[--shell-muted]">Total</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {s?.revenueTrend && s.revenueTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={s.revenueTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
                        contentStyle={{ background: "var(--shell-popover)", border: "1px solid var(--shell-border)", borderRadius: 8, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                        formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                        labelStyle={{ fontWeight: 600, marginBottom: 4, color: "var(--shell-foreground)" }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 3, fill: "var(--chart-1)", stroke: "var(--shell-surface)", strokeWidth: 2 }} activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--shell-surface)", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[--shell-muted]">No revenue data yet</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Status Summary */}
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
                {s?.summary && s.summary.length > 0 ? (
                  <div className="relative h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={s.summary} cx="50%" cy="45%" innerRadius={65} outerRadius={105} paddingAngle={2} dataKey="count" stroke="none">
                          {s.summary.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "var(--shell-popover)", border: "1px solid var(--shell-border)", borderRadius: 8, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                          formatter={(value, name) => [value, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: "calc(45% - 30px)" }}>
                      <span className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">
                        {s.summary.reduce((a, i) => a + i.count, 0)}
                      </span>
                      <span className="text-[11px] text-[--shell-muted]">Total</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pb-2">
                      {s.summary.map((item, i) => (
                        <div key={item.status} className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-xs text-[--shell-muted] capitalize">{item.status.replace("_", " ")}</span>
                          <span className="text-xs font-medium text-[--shell-foreground]">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[--shell-muted]">No invoice data yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Payment Metrics & Recent Invoices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-[--chart-3]" />
                Payment Metrics
              </CardTitle>
              <CardDescription>Daily, monthly, and outstanding totals</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {s?.paymentMetrics ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-3.5">
                  <p className="text-xs text-[--shell-muted]">Today</p>
                  <p className="font-heading text-lg font-semibold text-[--shell-foreground]">{money(s.paymentMetrics.dailyTotal)}</p>
                </div>
                <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-3.5">
                  <p className="text-xs text-[--shell-muted]">This Month</p>
                  <p className="font-heading text-lg font-semibold text-[--shell-foreground]">{money(s.paymentMetrics.monthlyTotal)}</p>
                </div>
                <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-3.5">
                  <p className="text-xs text-[--shell-muted]">Refunds</p>
                  <p className="font-heading text-lg font-semibold text-[--shell-danger]">{money(s.paymentMetrics.totalRefunds)}</p>
                </div>
                <div className="rounded-lg border border-[--shell-border] bg-[--shell-surface] p-3.5">
                  <p className="text-xs text-[--shell-muted]">Failed</p>
                  <p className="font-heading text-lg font-semibold text-[--shell-danger]">{s.paymentMetrics.failedTransactions}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-[--shell-muted]">No payment data yet</div>
            )}
          </CardContent>
        </Card>

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
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => router.push("/billing/invoices")} aria-label="View all invoices">
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
                {(s?.recentInvoices ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-[--shell-muted] py-8 text-sm">No invoices yet</TableCell>
                  </TableRow>
                ) : (s?.recentInvoices ?? []).slice(0, 5).map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/30" onClick={() => router.push(`/billing/invoices/${inv.id}`)}>
                    <TableCell className="font-mono text-xs font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm text-[--shell-muted]">{inv.client_name}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">{lakhFormat(inv.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)} className="capitalize text-xs">
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
