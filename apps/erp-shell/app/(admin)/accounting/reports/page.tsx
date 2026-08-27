"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { handleError } from "@datavex/ui-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { money } from "@/utils/format";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type { FinancialReport, BalanceSheetItem } from "@/types/accounting";
import ReportsLoading from "./loading";

export default function Reports() {
  const [activeTab, setActiveTab] = useState<"pl" | "balance" | "tax" | "cogs">("pl");
  const [plData, setPlData] = useState<FinancialReport[]>([]);
  const [bsData, setBsData] = useState<BalanceSheetItem[]>([]);
  const [cogsData, setCogsData] = useState<{ summary: any; invoices: any[]; products: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [d, cSummary, cInvoices, cProducts] = await Promise.all([
          api.get<{ pl: FinancialReport[]; balance_sheet: BalanceSheetItem[] }>("/reports").catch(() => null),
          api.get<any>("/reports/cogs/summary").catch(() => null),
          api.get<any>("/reports/cogs/invoices").catch(() => null),
          api.get<any>("/reports/cogs/products").catch(() => null),
        ]);

        if (d) {
          setPlData(d.pl || []);
          setBsData(d.balance_sheet || []);
        }

        if (cSummary || cInvoices || cProducts) {
          setCogsData({
            summary: cSummary,
            invoices: cInvoices?.invoices || [],
            products: cProducts?.products || [],
          });
        }
      } catch {
        setError("Failed to load financial reports");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);


  const currentPL = plData.length > 0 ? plData[plData.length - 1] : { month: "", revenue: 0, cost_of_goods: 0, gross_profit: 0, operating_expenses: 0, net_profit: 0 };
  const prevPL = plData.length > 1 ? plData[plData.length - 2] : { revenue: 0, net_profit: 0 };

  const profitChange = currentPL.net_profit - prevPL.net_profit;
  const profitChangePercent = ((profitChange / prevPL.net_profit) * 100).toFixed(1);

  const taxData = {
    gstCollected: 0,
    tdsPayable: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    taxableIncome: 0,
  };

  if (loading) return <ReportsLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">
            Financial Reports
          </h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">
            Profit & Loss, Balance Sheet, and Tax summaries
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      <div className="flex gap-1 border-b border-[--shell-border]">
        {(["pl", "balance", "tax", "cogs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-[var(--shell-action)] text-[var(--shell-foreground)]"
                : "border-transparent text-[var(--shell-muted)] hover:text-[var(--shell-foreground)]"
            }`}
          >
            {tab === "pl" ? "Profit & Loss" : tab === "balance" ? "Balance Sheet" : tab === "tax" ? "Tax Summary" : "COGS & Profitability"}
          </button>
        ))}
      </div>


      {activeTab === "pl" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Revenue",
                value: money(currentPL.revenue),
                subtitle: `+${((currentPL.revenue - prevPL.revenue) / prevPL.revenue * 100).toFixed(1)}% vs last month`,
                isSuccess: true,
              },
              {
                label: "Gross Profit",
                value: money(currentPL.gross_profit),
                subtitle: `Margin ${((currentPL.gross_profit / currentPL.revenue) * 100).toFixed(1)}%`,
              },
              {
                label: "Operating Expenses",
                value: money(currentPL.operating_expenses),
                subtitle: `${((currentPL.operating_expenses / currentPL.revenue) * 100).toFixed(1)}% of revenue`,
              },
              {
                label: "Net Profit",
                value: money(currentPL.net_profit),
                subtitle: `${profitChange >= 0 ? "+" : ""}${profitChangePercent}% vs last month`,
                isTrend: true,
                trendDir: profitChange >= 0 ? "up" : "down",
              }
            ].map((item, idx) => (
              <div
                key={item.label}
                className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">
                  {item.label}
                </span>
                <span className="font-heading text-lg font-semibold tracking-tight text-[var(--shell-foreground)]">
                  {item.value}
                </span>
                <span className={`text-xs ${
                  item.isSuccess ? "text-[var(--shell-success)]" :
                  item.isTrend ? (item.trendDir === "up" ? "text-[var(--shell-success)]" : "text-[var(--shell-brand)]") :
                  "text-[var(--shell-muted)]"
                }`}>
                  {item.subtitle}
                </span>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Monthly P&L Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={plData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--shell-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--shell-muted)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--shell-muted)" }} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--shell-surface)",
                        border: "1px solid var(--shell-border)",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                      formatter={(v) => [money(Number(v)), undefined]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="gross_profit" name="Gross Profit" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="net_profit" name="Net Profit" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead className="text-right">Gross Profit</TableHead>
                    <TableHead className="text-right">Op. Expenses</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plData.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{money(row.revenue)}</TableCell>
                      <TableCell className="font-mono text-sm text-right text-[var(--shell-muted)]">{money(row.cost_of_goods)}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{money(row.gross_profit)}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{money(row.operating_expenses)}</TableCell>
                      <TableCell className="font-mono text-sm text-right font-semibold">{money(row.net_profit)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={row.net_profit > 0 ? "default" : "secondary"} className="text-xs">
                          {((row.net_profit / row.revenue) * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "balance" && (
        <div className="grid grid-cols-3 gap-4">
          {bsData.map((section) => {
            const total = section.items.find((i) => i.label.startsWith("Total"));
            const items = section.items.filter((i) => !i.label.startsWith("Total"));
            return (
              <Card key={section.category}>
                <CardHeader className="p-4 pb-2 border-b border-[var(--shell-border)]">
                  <CardTitle className="text-sm font-medium">{section.category}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-[var(--shell-muted)]">{item.label}</span>
                        <span className={`font-mono ${item.amount < 0 ? "text-[var(--shell-danger)]" : "text-[var(--shell-foreground)]"}`}>
                          {money(Math.abs(item.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                  {total && (
                    <div className="mt-3 pt-3 border-t border-[var(--shell-border)] flex items-center justify-between text-sm font-semibold">
                      <span>{total.label}</span>
                      <span className="font-mono">{money(total.amount)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "tax" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Revenue", value: money(taxData.totalRevenue) },
              { label: "Total Expenses", value: money(taxData.totalExpenses) },
              { label: "Taxable Income", value: money(taxData.taxableIncome) },
              {
                label: "Effective Tax Rate",
                value: taxData.taxableIncome > 0 ? `${((taxData.gstCollected / taxData.taxableIncome) * 100).toFixed(1)}%` : "N/A",
              }
            ].map((item, idx) => (
              <div
                key={item.label}
                className="animate-kpi flex flex-col gap-1.5 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">
                  {item.label}
                </span>
                <span className="font-heading text-lg font-semibold tracking-tight text-[var(--shell-foreground)]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Tax Liability Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[var(--shell-border)]">
                  <span className="text-sm text-[var(--shell-muted)]">GST Collected (Output)</span>
                  <span className="font-mono text-sm">{money(taxData.gstCollected)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--shell-border)]">
                  <span className="text-sm text-[var(--shell-muted)]">TDS Deducted</span>
                  <span className="font-mono text-sm">{money(taxData.tdsPayable)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--shell-border)]">
                  <span className="text-sm text-[var(--shell-muted)]">Estimated Income Tax</span>
                  <span className="font-mono text-sm">{money(Math.round(taxData.taxableIncome * 0.25))}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-semibold">Total Tax Liability</span>
                  <span className="font-mono text-sm font-semibold text-[var(--shell-action)]">
                    {money(taxData.gstCollected + taxData.tdsPayable + Math.round(taxData.taxableIncome * 0.25))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "cogs" && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs text-[--shell-muted]">Total COGS</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="font-heading text-lg font-bold text-[--shell-foreground]">{money(cogsData?.summary?.total_cogs || 0)}</p>
                <p className="text-[11px] text-[--shell-muted] mt-0.5">Cost of items sold</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs text-[--shell-muted]">Gross Profit</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="font-heading text-lg font-bold text-[var(--shell-success)]">{money(cogsData?.summary?.gross_profit || 0)}</p>
                <p className="text-[11px] text-[var(--shell-success)] mt-0.5">{cogsData?.summary?.gross_margin_pct || 0}% Margin</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs text-[--shell-muted]">Operating Margin</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="font-heading text-lg font-bold text-[var(--shell-info)]">{cogsData?.summary?.operating_margin_pct || 0}%</p>
                <p className="text-[11px] text-[--shell-muted] mt-0.5">Net of operating expenses</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs text-[--shell-muted]">Inventory Turnover</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <p className="font-heading text-lg font-bold text-purple-600">{cogsData?.summary?.inventory_turnover || 0}x</p>
                <p className="text-[11px] text-[--shell-muted] mt-0.5">Turnover ratio</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">Invoice-Level COGS Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead className="text-right">Gross Profit</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cogsData?.invoices?.length ? (
                    cogsData.invoices.map((inv: any) => (
                      <TableRow key={inv.invoice_id}>
                        <TableCell className="font-mono text-xs font-semibold">{inv.invoice_number}</TableCell>
                        <TableCell className="text-xs">{inv.client_name}</TableCell>
                        <TableCell className="text-xs text-[--shell-muted]">{inv.issue_date}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{money(inv.revenue)}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-destructive">{money(inv.cogs)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-[var(--shell-success)]">{money(inv.gross_profit)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{inv.margin_pct}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-xs text-[--shell-muted]">
                        No COGS invoice records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">Product-Level Profitability</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Avg Unit Cost</TableHead>
                    <TableHead className="text-right">Avg Selling Price</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Total COGS</TableHead>
                    <TableHead className="text-right">Gross Profit</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cogsData?.products?.length ? (
                    cogsData.products.map((prod: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-medium">{prod.product_name}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{prod.total_quantity_sold}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-destructive">{money(prod.avg_unit_cost)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{money(prod.avg_selling_price)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{money(prod.total_revenue)}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-destructive">{money(prod.total_cogs)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-[var(--shell-success)]">{money(prod.gross_profit)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">{prod.margin_pct}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4 text-xs text-[--shell-muted]">
                        No product COGS records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

