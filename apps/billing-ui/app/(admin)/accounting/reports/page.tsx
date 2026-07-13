"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { money } from "@/utils/format";


export default function ReportsPage() {
  const [report, setReport] = useState<{ profit_loss: { revenue: number; expenses: number; net_income: number }; balance_sheet: { assets: number; liabilities: number; equity: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const d = await api.get<{ pl: any; balance_sheet: any }>("/reports");
        setReport({
          profit_loss: {
            revenue: d.pl.reduce((s: number, r: any) => s + r.revenue, 0),
            expenses: d.pl.reduce((s: number, r: any) => s + r.operating_expenses, 0),
            net_income: d.pl.reduce((s: number, r: any) => s + r.net_profit, 0),
          },
          balance_sheet: {
            assets: d.balance_sheet.find((s: any) => s.category === "Assets")?.items.find((i: any) => i.label === "Total Assets")?.amount ?? 0,
            liabilities: d.balance_sheet.find((s: any) => s.category === "Liabilities")?.items.find((i: any) => i.label === "Total Liabilities")?.amount ?? 0,
            equity: d.balance_sheet.find((s: any) => s.category === "Equity")?.items.find((i: any) => i.label === "Total Equity")?.amount ?? 0,
          },
        });
      } catch {
        setError("Failed to load financial reports");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) return <LoadingSpinner />;

  const pl = report?.profit_loss;
  const bs = report?.balance_sheet;

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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profit & Loss</CardTitle>
                <CardDescription>Revenue, expenses, and net income</CardDescription>
              </div>
              {pl && pl.net_income >= 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <span className="font-heading text-lg font-semibold text-foreground">{money(pl.revenue)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">Expenses</span>
                  <span className="font-heading text-lg font-semibold text-destructive">{money(pl.expenses)}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-medium text-foreground">Net Income</span>
                  <span className={`font-heading text-xl font-bold ${pl.net_income >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                    {money(pl.net_income)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

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
            {bs ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">Assets</span>
                  <span className="font-heading text-lg font-semibold text-foreground">{money(bs.assets)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">Liabilities</span>
                  <span className="font-heading text-lg font-semibold text-destructive">{money(bs.liabilities)}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-medium text-foreground">Equity</span>
                  <span className="font-heading text-xl font-bold text-chart-1">{money(bs.equity)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
