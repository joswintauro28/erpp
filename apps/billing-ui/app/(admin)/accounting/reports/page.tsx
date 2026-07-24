"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Receipt, Wallet, Banknote, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import ReportsLoading from "./loading";
import { api } from "@/services/api";
import { money } from "@/utils/format";

type Tab = "pl" | "balance-sheet" | "cash-flow" | "cogs";

export default function ReportsPage() {
  const [report, setReport] = useState<{ pl: any[]; balance_sheet: any[]; cash_flow: any[] } | null>(null);
  const [cogsData, setCogsData] = useState<{ summary: any; invoices: any[]; products: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("pl");

  useEffect(() => {
    async function fetch() {
      try {
        const [d, cSummary, cInvoices, cProducts] = await Promise.all([
          api.get<{ pl: any[]; balance_sheet: any[]; cash_flow: any[] }>("/reports").catch(() => null),
          api.get<any>("/reports/cogs/summary").catch(() => null),
          api.get<any>("/reports/cogs/invoices").catch(() => null),
          api.get<any>("/reports/cogs/products").catch(() => null),
        ]);

        if (d) setReport(d);
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
    fetch();
  }, []);

  if (loading) return <ReportsLoading />;

  const tabs: { key: Tab; label: string }[] = [
    { key: "pl", label: "Profit & Loss" },
    { key: "balance-sheet", label: "Balance Sheet" },
    { key: "cash-flow", label: "Cash Flow" },
    { key: "cogs", label: "COGS & Profitability" },
  ];


  const plTotals = report ? {
    revenue: report.pl.reduce((s: number, r: any) => s + r.revenue, 0),
    cogs: report.pl.reduce((s: number, r: any) => s + r.cost_of_goods, 0),
    grossProfit: report.pl.reduce((s: number, r: any) => s + r.gross_profit, 0),
    expenses: report.pl.reduce((s: number, r: any) => s + r.operating_expenses, 0),
    netIncome: report.pl.reduce((s: number, r: any) => s + r.net_profit, 0),
  } : null;

  const cfTotals = report?.cash_flow?.reduce((s, r: any) => ({
    opInflow: s.opInflow + r.operating_activities.cash_inflow,
    opOutflow: s.opOutflow + r.operating_activities.cash_outflow,
    opNet: s.opNet + r.operating_activities.net_cash,
    invInflow: s.invInflow + r.investing_activities.cash_inflow,
    invOutflow: s.invOutflow + r.investing_activities.cash_outflow,
    invNet: s.invNet + r.investing_activities.net_cash,
    finInflow: s.finInflow + r.financing_activities.cash_inflow,
    finOutflow: s.finOutflow + r.financing_activities.cash_outflow,
    finNet: s.finNet + r.financing_activities.net_cash,
    netChange: s.netChange + r.net_change_in_cash,
  }), { opInflow: 0, opOutflow: 0, opNet: 0, invInflow: 0, invOutflow: 0, invNet: 0, finInflow: 0, finOutflow: 0, finNet: 0, netChange: 0 }) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Financial Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate and view financial statements</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
              tab === t.key
                ? "border-accent-foreground text-accent-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!report ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm">No financial data available</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {tab === "pl" && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <Card><CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-chart-1" />
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                  <p className="font-heading text-lg font-semibold text-foreground">{money(plTotals!.revenue)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="h-3.5 w-3.5 text-chart-3" />
                    <p className="text-xs text-muted-foreground">COGS</p>
                  </div>
                  <p className="font-heading text-lg font-semibold text-foreground">{money(plTotals!.cogs)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">Gross Profit</p>
                  </div>
                  <p className={`font-heading text-lg font-semibold ${plTotals!.grossProfit >= 0 ? "text-emerald-500" : "text-destructive"}`}>{money(plTotals!.grossProfit)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="h-3.5 w-3.5 text-chart-4" />
                    <p className="text-xs text-muted-foreground">Expenses</p>
                  </div>
                  <p className="font-heading text-lg font-semibold text-destructive">{money(plTotals!.expenses)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-1">Net Income</p>
                  <p className={`font-heading text-lg font-semibold ${plTotals!.netIncome >= 0 ? "text-emerald-500" : "text-destructive"}`}>{money(plTotals!.netIncome)}</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Profit & Loss</CardTitle>
                      <CardDescription>Monthly breakdown</CardDescription>
                    </div>
                    {plTotals!.netIncome >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
                  </div>
                </CardHeader>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.pl.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No P&L data</TableCell></TableRow>
                      ) : report.pl.map((row: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-xs">{row.month}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{money(row.revenue)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{money(row.cost_of_goods)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs ${row.gross_profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(row.gross_profit)}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-destructive">{money(row.operating_expenses)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-semibold ${row.net_profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(row.net_profit)}</TableCell>
                        </TableRow>
                      ))}
                      {plTotals && (
                        <TableRow className="border-t-2 border-border font-semibold">
                          <TableCell className="text-xs font-bold">Total</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">{money(plTotals.revenue)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">{money(plTotals.cogs)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-bold ${plTotals.grossProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(plTotals.grossProfit)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-destructive">{money(plTotals.expenses)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-bold ${plTotals.netIncome >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(plTotals.netIncome)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {tab === "balance-sheet" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Balance Sheet</CardTitle>
                    <CardDescription>Assets, liabilities, and equity</CardDescription>
                  </div>
                  <BarChart3 className="h-5 w-5 text-chart-2" />
                </div>
              </CardHeader>
              <CardContent>
                {report.balance_sheet.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm">No balance sheet data</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {report.balance_sheet.map((section: any) => (
                      <div key={section.category}>
                        <h3 className="text-xs font-heading font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                          {section.category}
                        </h3>
                        <div className="space-y-1.5">
                          {section.items.map((item: any) => {
                            const isTotal = item.label.startsWith("Total");
                            return (
                              <div key={item.label} className={`flex items-center justify-between ${isTotal ? "border-t border-border pt-1.5 mt-1.5" : ""}`}>
                                <span className={`text-xs ${isTotal ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
                                <span className={`font-mono text-xs ${isTotal ? "font-bold" : ""}`}>
                                  {money(item.amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {tab === "cash-flow" && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card><CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">Operating Inflow</p>
                  </div>
                  <p className="font-heading text-lg font-semibold text-foreground">{money(cfTotals!.opInflow)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                    <p className="text-xs text-muted-foreground">Operating Outflow</p>
                  </div>
                  <p className="font-heading text-lg font-semibold text-foreground">{money(cfTotals!.opOutflow)}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-1">Net Operating</p>
                  <p className={`font-heading text-lg font-semibold ${cfTotals!.opNet >= 0 ? "text-emerald-500" : "text-destructive"}`}>{money(cfTotals!.opNet)}</p>
                </CardContent></Card>
                <Card className="border-accent/30 bg-accent/5">
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground mb-1">Net Change in Cash</p>
                    <p className={`font-heading text-lg font-semibold ${cfTotals!.netChange >= 0 ? "text-emerald-500" : "text-destructive"}`}>{money(cfTotals!.netChange)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Banknote className="h-4 w-4 text-accent-foreground" />
                    Cash Flow Statement
                  </CardTitle>
                  <CardDescription>Monthly cash flow from operating, investing, and financing activities</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Op. Inflow</TableHead>
                        <TableHead className="text-right">Op. Outflow</TableHead>
                        <TableHead className="text-right">Net Operating</TableHead>
                        <TableHead className="text-right">Investing</TableHead>
                        <TableHead className="text-right">Financing</TableHead>
                        <TableHead className="text-right">Net Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.cash_flow.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No cash flow data</TableCell></TableRow>
                      ) : report.cash_flow.map((row: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-xs">{row.month}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-emerald-600">{money(row.operating_activities.cash_inflow)}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-destructive">{money(row.operating_activities.cash_outflow)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-medium ${row.operating_activities.net_cash >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(row.operating_activities.net_cash)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{money(row.investing_activities.net_cash)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{money(row.financing_activities.net_cash)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-semibold ${row.net_change_in_cash >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(row.net_change_in_cash)}</TableCell>
                        </TableRow>
                      ))}
                      {cfTotals && (
                        <TableRow className="border-t-2 border-border font-semibold">
                          <TableCell className="text-xs font-bold">Total</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-emerald-600">{money(cfTotals.opInflow)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-destructive">{money(cfTotals.opOutflow)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-bold ${cfTotals.opNet >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(cfTotals.opNet)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">{money(cfTotals.invNet)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">{money(cfTotals.finNet)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-bold ${cfTotals.netChange >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(cfTotals.netChange)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Section detail cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center gap-2 text-xs">
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                      Operating Activities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Cash Inflow</span><span className="font-mono text-emerald-600">{money(cfTotals!.opInflow)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Cash Outflow</span><span className="font-mono text-destructive">{money(cfTotals!.opOutflow)}</span></div>
                      <div className="flex justify-between border-t border-border pt-2 font-medium"><span>Net</span><span className={`font-mono ${cfTotals!.opNet >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(cfTotals!.opNet)}</span></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center gap-2 text-xs">
                      <Minus className="h-3.5 w-3.5 text-chart-2" />
                      Investing Activities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Cash Inflow</span><span className="font-mono">{money(cfTotals!.invInflow)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Cash Outflow</span><span className="font-mono">{money(cfTotals!.invOutflow)}</span></div>
                      <div className="flex justify-between border-t border-border pt-2 font-medium"><span>Net</span><span className="font-mono">{money(cfTotals!.invNet)}</span></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center gap-2 text-xs">
                      <Banknote className="h-3.5 w-3.5 text-chart-1" />
                      Financing Activities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Cash Inflow</span><span className="font-mono">{money(cfTotals!.finInflow)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Cash Outflow</span><span className="font-mono">{money(cfTotals!.finOutflow)}</span></div>
                      <div className="flex justify-between border-t border-border pt-2 font-medium"><span>Net</span><span className="font-mono">{money(cfTotals!.finNet)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {tab === "cogs" && (

            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs text-muted-foreground">Total COGS</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="font-heading text-xl font-bold text-foreground">{money(cogsData?.summary?.total_cogs || 0)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Cost of items sold</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs text-muted-foreground">Gross Profit</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="font-heading text-xl font-bold text-emerald-600">{money(cogsData?.summary?.gross_profit || 0)}</p>
                    <p className="text-[11px] text-emerald-600 mt-1">{cogsData?.summary?.gross_margin_pct || 0}% Gross Margin</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs text-muted-foreground">Operating Margin</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="font-heading text-xl font-bold text-sky-600">{cogsData?.summary?.operating_margin_pct || 0}%</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Net of operating expenses</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs text-muted-foreground">Inventory Turnover</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="font-heading text-xl font-bold text-purple-600">{cogsData?.summary?.inventory_turnover || 0}x</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Annualized turnover ratio</p>
                  </CardContent>
                </Card>
              </div>

              {/* Invoice Level COGS Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Invoice-Level COGS Breakdown</CardTitle>
                  <CardDescription>Product cost price snapshots recorded at invoice issuance/shipment</CardDescription>
                </CardHeader>
                <CardContent>
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
                            <TableCell className="text-xs text-muted-foreground">{inv.issue_date}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{money(inv.revenue)}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-destructive">{money(inv.cogs)}</TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold text-emerald-600">{money(inv.gross_profit)}</TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold">{inv.margin_pct}%</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                            No COGS invoice records found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Product Level COGS Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Product-Level Profitability</CardTitle>
                  <CardDescription>Sales revenue, unit cost snapshots, and profit margin per product</CardDescription>
                </CardHeader>
                <CardContent>
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
                            <TableCell className="text-right font-mono text-xs font-bold text-emerald-600">{money(prod.gross_profit)}</TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold">{prod.margin_pct}%</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-6 text-xs text-muted-foreground">
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
        </>
      )}
    </div>
  );
}

