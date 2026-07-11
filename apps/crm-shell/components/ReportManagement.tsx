"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Award,
  Users,
  BarChart3,
  ShieldAlert,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { api } from "@/services/api";

interface ReportSummary {
  win_rate: number;
  lead_conv_rate: number;
  total_sales_value: number;
  total_opportunities: number;
}

interface RepSale {
  rep: string;
  amount: number;
}

interface LeadStatus {
  status: string;
  count: number;
}

interface OppStage {
  stage: string;
  count: number;
}

interface ReportData {
  summary: ReportSummary;
  rep_sales: RepSale[];
  lead_status: LeadStatus[];
  opp_stages: OppStage[];
}

export default function ReportManagement() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const result = await api.get<ReportData>("/reports/dashboard");
        setData(result);
      } catch {
        console.error("Failed to fetch reports dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-muted-foreground">
        Loading CRM Analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-destructive">
        <ShieldAlert size={24} className="mr-2" />
        Failed to load reporting metrics.
      </div>
    );
  }

  const { summary, rep_sales, lead_status, opp_stages } = data;

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val}`;
  };

  const maxRepSales = Math.max(...rep_sales.map((r) => r.amount), 1);
  const maxLeadCount = Math.max(...lead_status.map((l) => l.count), 1);
  const maxOppCount = Math.max(...opp_stages.map((o) => o.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">INSIGHTS</p>
        <h2 className="font-heading text-lg font-semibold tracking-tight">CRM Analytics & Performance Reports</h2>
        <p className="text-sm text-muted-foreground">
          Real-time visual reports of sales pipeline, conversion funnels, and representative performance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              <TrendingUp size={14} className="text-primary" /> WIN RATE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{summary.win_rate}%</p>
            <p className="text-xs text-emerald-600">deals won ratio</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              <Users size={14} className="text-primary" /> LEAD CONVERSION
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{summary.lead_conv_rate}%</p>
            <p className="text-xs text-emerald-600">qualified leads</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              <Award size={14} className="text-primary" /> TOTAL REVENUE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{formatCurrency(summary.total_sales_value)}</p>
            <p className="text-xs text-emerald-600">confirmed sales value</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              <BarChart3 size={14} className="text-primary" /> ACTIVE PIPELINE DEALS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{summary.total_opportunities}</p>
            <p className="text-xs text-emerald-600">open opportunities</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Sales Representative</CardTitle>
            <CardDescription>Performance breakdown of deals closed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {rep_sales.length > 0 ? rep_sales.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm font-semibold mb-1.5">
                  <span>{item.rep}</span>
                  <span className="text-primary">{formatCurrency(item.amount)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(item.amount / maxRepSales) * 100}%`,
                      backgroundColor: "#991b1b",
                    }}
                  />
                </div>
              </div>
            )) : (
              <p className="py-8 text-center text-muted-foreground">No closed sales found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Status Distribution</CardTitle>
            <CardDescription>Current status breakdown of leads in system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {lead_status.length > 0 ? lead_status.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm font-semibold mb-1.5">
                  <span>{item.status}</span>
                  <span className="text-muted-foreground">{item.count} leads</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(item.count / maxLeadCount) * 100}%`,
                      backgroundColor: "#0ea5e9",
                    }}
                  />
                </div>
              </div>
            )) : (
              <p className="py-8 text-center text-muted-foreground">No leads found.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Opportunity Pipeline stages</CardTitle>
            <CardDescription>Active funnel stages of deals in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
              {opp_stages.length > 0 ? opp_stages.map((item, idx) => (
                <div key={idx} className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">{item.stage}</p>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.count / maxOppCount) * 100}%`,
                        backgroundColor: "#10b981",
                      }}
                    />
                  </div>
                </div>
              )) : (
                <p className="py-8 text-center text-muted-foreground col-span-full">No active opportunities.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
