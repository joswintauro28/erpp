"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Receipt, Wallet, Banknote, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import ReportsLoading from "./loading";
import { api } from "@/services/api";
import { handleError, Button, PageHeader } from "@datavex/ui-theme";
import { money } from "@/utils/format";

type Tab = "pl" | "balance-sheet" | "cash-flow" | "cogs";

export default function ReportsPage() {
  const [report, setReport] = useState<{ pl: any[]; balance_sheet: any[]; cash_flow: any[] } | null>(null);
  const [cogsData, setCogsData] = useState<{ summary: any; invoices: any[]; products: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("pl");

  // Detailed Cash Flow State
  const [cfStartDate, setCfStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [cfEndDate, setCfEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [cfReportingMode, setCfReportingMode] = useState<"direct" | "indirect">("direct");
  const [detailedCf, setDetailedCf] = useState<any>(null);
  const [cfLoading, setCfLoading] = useState(false);
  const [activeTx, setActiveTx] = useState<any>(null);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [search, setSearch] = useState("");

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

  useEffect(() => {
    if (tab !== "cash-flow") return;
    async function fetchCashFlow() {
      setCfLoading(true);
      try {
        const res = await api.get<any>(
          `/reports/cash-flow?startDate=${cfStartDate}&endDate=${cfEndDate}&reportingMode=${cfReportingMode}`
        );
        if (res) {
          setDetailedCf(res);
        }
      } catch (err) {
        handleError(err, "Failed to fetch detailed cash flow");
      } finally {
        setCfLoading(false);
      }
    }
    fetchCashFlow();
  }, [tab, cfStartDate, cfEndDate, cfReportingMode]);

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
      <PageHeader
        title="Financial Reports"
        subtitle="Generate and view financial statements"
      />

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
                    <TrendingUp className="h-3.5 w-3.5 text-[var(--shell-success)]" />
                    <p className="text-xs text-muted-foreground">Gross Profit</p>
                  </div>
                  <p className={`font-heading text-lg font-semibold ${plTotals!.grossProfit >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>{money(plTotals!.grossProfit)}</p>
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
                  <p className={`font-heading text-lg font-semibold ${plTotals!.netIncome >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>{money(plTotals!.netIncome)}</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Profit & Loss</CardTitle>
                      <CardDescription>Monthly breakdown</CardDescription>
                    </div>
                    {plTotals!.netIncome >= 0 ? <TrendingUp className="h-5 w-5 text-[var(--shell-success)]" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
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
                          <TableCell className={`text-right font-mono text-xs ${row.gross_profit >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>{money(row.gross_profit)}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-destructive">{money(row.operating_expenses)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-semibold ${row.net_profit >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>{money(row.net_profit)}</TableCell>
                        </TableRow>
                      ))}
                      {plTotals && (
                        <TableRow className="border-t-2 border-border font-semibold">
                          <TableCell className="text-xs font-bold">Total</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">{money(plTotals.revenue)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">{money(plTotals.cogs)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-bold ${plTotals.grossProfit >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>{money(plTotals.grossProfit)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-destructive">{money(plTotals.expenses)}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-bold ${plTotals.netIncome >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>{money(plTotals.netIncome)}</TableCell>
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
            <div className="space-y-6">
              {/* Filters Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start Date</label>
                    <input
                      type="date"
                      value={cfStartDate}
                      onChange={(e) => setCfStartDate(e.target.value)}
                      className="rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End Date</label>
                    <input
                      type="date"
                      value={cfEndDate}
                      onChange={(e) => setCfEndDate(e.target.value)}
                      className="rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reporting Mode</label>
                    <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/30">
                      <button
                        onClick={() => setCfReportingMode("direct")}
                        className={`rounded-md px-3 py-1 text-[11px] font-bold transition-all ${
                          cfReportingMode === "direct"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Direct Method
                      </button>
                      <button
                        onClick={() => setCfReportingMode("indirect")}
                        className={`rounded-md px-3 py-1 text-[11px] font-bold transition-all ${
                          cfReportingMode === "indirect"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Indirect Method
                      </button>
                    </div>
                  </div>
                </div>
                {cfLoading && (
                  <span className="text-xs text-muted-foreground animate-pulse font-medium">Updating report...</span>
                )}
              </div>

              {detailedCf ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Card className="border-border/60 bg-muted/10 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Opening Cash Balance</p>
                        <p className="font-heading text-lg font-bold text-foreground">{money(detailedCf.opening_balance)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">At start of period</p>
                      </CardContent>
                    </Card>
                    <Card className="border-border/60 bg-muted/10 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Net Cash Movement</p>
                        <p className={`font-heading text-lg font-bold ${detailedCf.net_increase_decrease >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>
                          {detailedCf.net_increase_decrease >= 0 ? "+" : ""}{money(detailedCf.net_increase_decrease)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">From all activities</p>
                      </CardContent>
                    </Card>
                    <Card className="border-accent/40 bg-accent/5 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-accent-foreground mb-1">GL Closing Balance</p>
                        <p className="font-heading text-lg font-bold text-foreground">{money(detailedCf.closing_cash_balance)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">General Ledger balance</p>
                      </CardContent>
                    </Card>
                    <Card className={`border-border/60 shadow-sm ${detailedCf.reconciliation.difference === 0 ? "bg-[var(--shell-success-surface)]0/5 border-[var(--shell-success)]/20" : "bg-destructive/5 border-destructive/20"}`}>
                      <CardContent className="pt-6">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Reconciliation Status</p>
                        <p className={`font-heading text-lg font-bold ${detailedCf.reconciliation.difference === 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>
                          {detailedCf.reconciliation.difference === 0 ? "Fully Reconciled" : `${money(Math.abs(detailedCf.reconciliation.difference))} Diff`}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">GL vs Bank Statement</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* IAS 7 / ASC 230 Cash Flow Statement */}
                  <Card className="shadow-sm">
                    <CardHeader className="border-b border-border pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-accent-foreground" />
                            Statement of Cash Flows (IAS 7 / ASC 230)
                          </CardTitle>
                          <CardDescription>
                            Reporting Period: {new Date(detailedCf.reporting_period.start_date).toLocaleDateString()} to {new Date(detailedCf.reporting_period.end_date).toLocaleDateString()} ({cfReportingMode.toUpperCase()} METHOD)
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                      {/* Operating Activities */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-border/80 pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Cash Flows from Operating Activities</h4>
                          <span className={`font-mono text-xs font-bold ${detailedCf.operating_activities.net_cash >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>
                            {money(detailedCf.operating_activities.net_cash)}
                          </span>
                        </div>
                        <div className="space-y-2 pl-4">
                          {detailedCf.operating_activities.items.map((item: any) => (
                            <div key={item.label} className="flex justify-between text-xs py-1 hover:bg-muted/30 px-2 rounded-md transition-colors">
                              <span className="text-muted-foreground">{item.label}</span>
                              <span className={`font-mono ${item.amount < 0 ? "text-destructive" : item.amount > 0 ? "text-[var(--shell-success)]" : "text-muted-foreground"}`}>
                                {money(item.amount)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs font-bold border-t border-dashed border-border pt-3 mt-2">
                            <span>Net Cash provided by (used in) Operating Activities</span>
                            <span className="font-mono">{money(detailedCf.operating_activities.net_cash)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Investing Activities */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-border/80 pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Cash Flows from Investing Activities</h4>
                          <span className={`font-mono text-xs font-bold ${detailedCf.investing_activities.net_cash >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>
                            {money(detailedCf.investing_activities.net_cash)}
                          </span>
                        </div>
                        <div className="space-y-2 pl-4">
                          {detailedCf.investing_activities.items.map((item: any) => (
                            <div key={item.label} className="flex justify-between text-xs py-1 hover:bg-muted/30 px-2 rounded-md transition-colors">
                              <span className="text-muted-foreground">{item.label}</span>
                              <span className={`font-mono ${item.amount < 0 ? "text-destructive" : item.amount > 0 ? "text-[var(--shell-success)]" : "text-muted-foreground"}`}>
                                {money(item.amount)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs font-bold border-t border-dashed border-border pt-3 mt-2">
                            <span>Net Cash provided by (used in) Investing Activities</span>
                            <span className="font-mono">{money(detailedCf.investing_activities.net_cash)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Financing Activities */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-border/80 pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Cash Flows from Financing Activities</h4>
                          <span className={`font-mono text-xs font-bold ${detailedCf.financing_activities.net_cash >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>
                            {money(detailedCf.financing_activities.net_cash)}
                          </span>
                        </div>
                        <div className="space-y-2 pl-4">
                          {detailedCf.financing_activities.items.map((item: any) => (
                            <div key={item.label} className="flex justify-between text-xs py-1 hover:bg-muted/30 px-2 rounded-md transition-colors">
                              <span className="text-muted-foreground">{item.label}</span>
                              <span className={`font-mono ${item.amount < 0 ? "text-destructive" : item.amount > 0 ? "text-[var(--shell-success)]" : "text-muted-foreground"}`}>
                                {money(item.amount)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs font-bold border-t border-dashed border-border pt-3 mt-2">
                            <span>Net Cash provided by (used in) Financing Activities</span>
                            <span className="font-mono">{money(detailedCf.financing_activities.net_cash)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Reconciliation block */}
                      <div className="border-t-2 border-double border-border pt-4 space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span>Net Increase (Decrease) in Cash & Cash Equivalents</span>
                          <span className={`font-mono ${detailedCf.net_increase_decrease >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>
                            {money(detailedCf.net_increase_decrease)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Cash & Cash Equivalents at Beginning of Year</span>
                          <span className="font-mono">{money(detailedCf.opening_balance)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                          <span>Cash & Cash Equivalents at End of Period</span>
                          <span className="font-mono text-foreground">{money(detailedCf.closing_cash_balance)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bank Reconciliation Bridge */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b border-border">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-accent-foreground" />
                        Bank Reconciliation Bridge
                      </CardTitle>
                      <CardDescription>Reconciliation of GL Cash balance with closing bank statement balance</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GL-to-Bank Statement Bridge</h5>
                          <div className="space-y-2.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-foreground font-medium">GL Closing Cash & Bank Balance</span>
                              <span className="font-mono font-semibold">{money(detailedCf.reconciliation.gl_closing_cash_balance)}</span>
                            </div>
                            {detailedCf.reconciliation.reconciling_items.map((item: any) => (
                              <div key={item.label} className="flex justify-between text-xs pl-3 border-l-2 border-muted py-0.5">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className={`font-mono ${item.type === "deposits_in_transit" ? "text-destructive" : item.type === "outstanding_payments" ? "text-[var(--shell-success)]" : "text-[var(--shell-warning)]"}`}>
                                  {item.type === "deposits_in_transit" ? "-" : "+"}{money(item.amount)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs border-t border-border pt-2 font-bold">
                              <span>Reconciled Bank Statement Balance</span>
                              <span className="font-mono">{money(detailedCf.reconciliation.bank_statement_ending_balance)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-center items-center border-l border-border pl-6 bg-muted/10 rounded-xl p-6">
                          {detailedCf.reconciliation.difference === 0 ? (
                            <div className="text-center space-y-2">
                              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-[var(--shell-success)]  ">
                                <Badge className="bg-[var(--shell-success-surface)]0 hover:bg-emerald-600 text-white border-none py-1 px-2.5 text-[10px] font-bold">OK</Badge>
                              </div>
                              <h4 className="text-sm font-semibold text-foreground">Zero Discrepancy</h4>
                              <p className="text-xs text-muted-foreground max-w-[280px]">
                                The general ledger cash account balances perfectly match the cleared bank statements.
                              </p>
                            </div>
                          ) : (
                            <div className="text-center space-y-2">
                              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                              </div>
                              <h4 className="text-sm font-semibold text-destructive">Unreconciled Difference</h4>
                              <p className="text-xs text-muted-foreground max-w-[280px]">
                                There is an unreconciled difference of <span className="font-bold text-foreground">{money(Math.abs(detailedCf.reconciliation.difference))}</span>.
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Verify unmatched ledger entries or import the latest statement batches.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Transaction Drill-down */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between flex-wrap gap-4">
                      <div>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-accent-foreground" />
                          Transaction Drill-Down
                        </CardTitle>
                        <CardDescription>All posted cash transactions in this reporting period</CardDescription>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search transactions..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="rounded-lg border border-border bg-transparent pl-8 pr-3 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-accent w-64"
                        />
                        <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground">🔍</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-24">Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Counter Account</TableHead>
                            <TableHead>Ref</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailedCf.transactions
                            .filter((t: any) =>
                              t.description.toLowerCase().includes(search.toLowerCase()) ||
                              t.counter_account.name.toLowerCase().includes(search.toLowerCase()) ||
                              (t.reference_type || "").toLowerCase().includes(search.toLowerCase())
                            )
                            .slice(0, 50).map((tx: any) => (
                              <TableRow
                                key={tx.id}
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => {
                                  setActiveTx(tx);
                                  setShowDrilldown(true);
                                }}
                              >
                                <TableCell className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</TableCell>
                                <TableCell className="text-xs font-semibold max-w-[200px] truncate">{tx.description}</TableCell>
                                <TableCell className="text-xs">
                                  <Badge variant="outline" className={`text-[10px] font-bold capitalize border-none px-2 py-0.5 ${
                                    tx.activity === "operating" ? "bg-[var(--shell-success)]/10 text-[var(--shell-success)]" :
                                    tx.activity === "investing" ? "bg-[var(--shell-info)]/10 text-[var(--shell-info)]" :
                                    "bg-purple-500/10 text-purple-700"
                                  }`}>
                                    {tx.activity}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{tx.counter_account.name} ({tx.counter_account.code})</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{tx.reference_type ? `${tx.reference_type} #${tx.reference_id}` : "Journal"}</TableCell>
                                <TableCell className={`text-right font-mono text-xs font-bold ${tx.amount >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>
                                  {tx.amount >= 0 ? "+" : ""}{money(tx.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="flex h-40 items-center justify-center border-2 border-dashed border-border rounded-xl">
                  <span className="text-xs text-muted-foreground">No cash flow data available.</span>
                </div>
              )}

              {/* Drill-down Modal overlay */}
              {showDrilldown && activeTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowDrilldown(false)}>
                  <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Transaction Details</h3>
                        <p className="text-[11px] text-muted-foreground">Reference: {activeTx.reference_type ? `${activeTx.reference_type} ID: ${activeTx.reference_id}` : "Direct Ledger Entry"}</p>
                      </div>
                      <Button variant="ghost" size="icon-xs" onClick={() => setShowDrilldown(false)} className="text-muted-foreground hover:text-foreground">✕</Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-semibold text-foreground">{new Date(activeTx.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className={`font-semibold ${activeTx.amount >= 0 ? "text-[var(--shell-success)]" : "text-destructive"}`}>{money(activeTx.amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Activity Classification</p>
                        <p className="font-semibold capitalize text-foreground">{activeTx.activity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cash Effect Type</p>
                        <p className="font-semibold capitalize text-foreground">{activeTx.type}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Description</p>
                      <div className="rounded-lg bg-muted/40 p-3 border border-border/50 text-xs text-foreground font-semibold">{activeTx.description}</div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Double-Entry Counter Party</h4>
                      <div className="flex justify-between items-center rounded-lg border border-border p-3 text-xs bg-muted/20">
                        <div>
                          <p className="font-bold text-foreground">{activeTx.counter_account.name}</p>
                          <p className="text-[10px] text-muted-foreground">GL Code: {activeTx.counter_account.code}</p>
                        </div>
                        <span className="font-mono font-bold">{money(-activeTx.amount)}</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-border">
                      <button onClick={() => setShowDrilldown(false)} className="rounded-lg bg-accent text-accent-foreground px-4 py-2 text-xs font-bold shadow-sm hover:bg-accent/90">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
                    <p className="font-heading text-xl font-bold text-[var(--shell-success)]">{money(cogsData?.summary?.gross_profit || 0)}</p>
                    <p className="text-[11px] text-[var(--shell-success)] mt-1">{cogsData?.summary?.gross_margin_pct || 0}% Gross Margin</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs text-muted-foreground">Operating Margin</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="font-heading text-xl font-bold text-[var(--shell-info)]">{cogsData?.summary?.operating_margin_pct || 0}%</p>
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
                            <TableCell className="text-right font-mono text-xs font-bold text-[var(--shell-success)]">{money(inv.gross_profit)}</TableCell>
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
                            <TableCell className="text-right font-mono text-xs font-bold text-[var(--shell-success)]">{money(prod.gross_profit)}</TableCell>
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

