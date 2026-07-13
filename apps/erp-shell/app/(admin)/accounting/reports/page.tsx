"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { money } from "@/utils/format";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type { FinancialReport, BalanceSheetItem } from "@/types/accounting";

export default function Reports() {
  const [activeTab, setActiveTab] = useState<"pl" | "balance" | "tax">("pl");
  const [plData, setPlData] = useState<FinancialReport[]>([]);
  const [bsData, setBsData] = useState<BalanceSheetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const d = await api.get<{ pl: FinancialReport[]; balance_sheet: BalanceSheetItem[] }>("/reports");
        setPlData(d.pl);
        setBsData(d.balance_sheet);
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Financial Reports
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
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
        {(["pl", "balance", "tax"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-[--shell-action] text-[--shell-foreground]"
                : "border-transparent text-[--shell-muted] hover:text-[--shell-foreground]"
            }`}
          >
            {tab === "pl" ? "Profit & Loss" : tab === "balance" ? "Balance Sheet" : "Tax Summary"}
          </button>
        ))}
      </div>

      {activeTab === "pl" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Revenue</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{money(currentPL.revenue)}</p>
                <div className="mt-0.5 flex items-center gap-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-[--shell-success]" />
                  <span className="text-[--shell-success]">+{((currentPL.revenue - prevPL.revenue) / prevPL.revenue * 100).toFixed(1)}%</span>
                  <span className="text-[--shell-muted]">vs last month</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Gross Profit</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{money(currentPL.gross_profit)}</p>
                <p className="mt-0.5 text-xs text-[--shell-muted]">
                  Margin {((currentPL.gross_profit / currentPL.revenue) * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Operating Expenses</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{money(currentPL.operating_expenses)}</p>
                <p className="mt-0.5 text-xs text-[--shell-muted]">
                  {((currentPL.operating_expenses / currentPL.revenue) * 100).toFixed(1)}% of revenue
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Net Profit</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{money(currentPL.net_profit)}</p>
                <div className="mt-0.5 flex items-center gap-1 text-xs">
                  {profitChange >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-[--shell-success]" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-[--shell-danger]" />
                  )}
                  <span className={profitChange >= 0 ? "text-[--shell-success]" : "text-[--shell-danger]"}>
                    {profitChange >= 0 ? "+" : ""}{profitChangePercent}%
                  </span>
                  <span className="text-[--shell-muted]">vs last month</span>
                </div>
              </CardContent>
            </Card>
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
                      <TableCell className="font-mono text-sm text-right text-[--shell-muted]">{money(row.cost_of_goods)}</TableCell>
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
                <CardHeader className="p-4 pb-2 border-b border-[--shell-border]">
                  <CardTitle className="text-sm font-medium">{section.category}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-[--shell-muted]">{item.label}</span>
                        <span className={`font-mono ${item.amount < 0 ? "text-[--shell-danger]" : "text-[--shell-foreground]"}`}>
                          {money(Math.abs(item.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                  {total && (
                    <div className="mt-3 pt-3 border-t border-[--shell-border] flex items-center justify-between text-sm font-semibold">
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
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{money(taxData.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{money(taxData.totalExpenses)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Taxable Income</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{money(taxData.taxableIncome)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Effective Tax Rate</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="font-mono text-lg font-semibold text-[--shell-foreground]">
                  {taxData.taxableIncome > 0 ? `${((taxData.gstCollected / taxData.taxableIncome) * 100).toFixed(1)}%` : "N/A"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Tax Liability Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[--shell-border]">
                  <span className="text-sm text-[--shell-muted]">GST Collected (Output)</span>
                  <span className="font-mono text-sm">{money(taxData.gstCollected)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[--shell-border]">
                  <span className="text-sm text-[--shell-muted]">TDS Deducted</span>
                  <span className="font-mono text-sm">{money(taxData.tdsPayable)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[--shell-border]">
                  <span className="text-sm text-[--shell-muted]">Estimated Income Tax</span>
                  <span className="font-mono text-sm">{money(Math.round(taxData.taxableIncome * 0.25))}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-semibold">Total Tax Liability</span>
                  <span className="font-mono text-sm font-semibold text-[--shell-action]">
                    {money(taxData.gstCollected + taxData.tdsPayable + Math.round(taxData.taxableIncome * 0.25))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
