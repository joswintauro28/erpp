"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Receipt, Wallet } from "lucide-react";
import ReportsLoading from "./loading";
import { api } from "@/services/api";
import { money } from "@/utils/format";

export default function ReportsPage() {
  const [report, setReport] = useState<{ pl: any[]; balance_sheet: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const d = await api.get<{ pl: any[]; balance_sheet: any[] }>("/reports");
        setReport(d);
      } catch {
        setError("Failed to load financial reports");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) return <ReportsLoading />;

  const totals = report ? {
    revenue: report.pl.reduce((s: number, r: any) => s + r.revenue, 0),
    cogs: report.pl.reduce((s: number, r: any) => s + r.cost_of_goods, 0),
    grossProfit: report.pl.reduce((s: number, r: any) => s + r.gross_profit, 0),
    expenses: report.pl.reduce((s: number, r: any) => s + r.operating_expenses, 0),
    netIncome: report.pl.reduce((s: number, r: any) => s + r.net_profit, 0),
  } : null;

  const bsData = report?.balance_sheet ?? [];

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

      {!report ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm">No financial data available</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-chart-1" />
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
              <p className="font-heading text-lg font-semibold text-foreground">{money(totals!.revenue)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-3.5 w-3.5 text-chart-3" />
                <p className="text-xs text-muted-foreground">COGS</p>
              </div>
              <p className="font-heading text-lg font-semibold text-foreground">{money(totals!.cogs)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <p className="text-xs text-muted-foreground">Gross Profit</p>
              </div>
              <p className={`font-heading text-lg font-semibold ${totals!.grossProfit >= 0 ? "text-emerald-500" : "text-destructive"}`}>{money(totals!.grossProfit)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-3.5 w-3.5 text-chart-4" />
                <p className="text-xs text-muted-foreground">Expenses</p>
              </div>
              <p className="font-heading text-lg font-semibold text-destructive">{money(totals!.expenses)}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">Net Income</p>
              <p className={`font-heading text-lg font-semibold ${totals!.netIncome >= 0 ? "text-emerald-500" : "text-destructive"}`}>{money(totals!.netIncome)}</p>
            </CardContent></Card>
          </div>

          {/* P&L Monthly Breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profit & Loss</CardTitle>
                  <CardDescription>Monthly breakdown</CardDescription>
                </div>
                {totals!.netIncome >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
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
                  {totals && (
                    <TableRow className="border-t-2 border-border font-semibold">
                      <TableCell className="text-xs font-bold">Total</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">{money(totals.revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">{money(totals.cogs)}</TableCell>
                      <TableCell className={`text-right font-mono text-xs font-bold ${totals.grossProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(totals.grossProfit)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-destructive">{money(totals.expenses)}</TableCell>
                      <TableCell className={`text-right font-mono text-xs font-bold ${totals.netIncome >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(totals.netIncome)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Balance Sheet */}
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
              {bsData.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm">No balance sheet data</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {bsData.map((section: any) => (
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
        </>
      )}
    </div>
  );
}
