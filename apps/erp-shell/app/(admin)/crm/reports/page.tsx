"use client";
import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Award, Users, BarChart3, ShieldAlert, RotateCw, PackageOpen, Search, Filter, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { exportToCSV } from "@/utils/exportCsv";
import { api } from "@/services/api";
import ReportTable from "./ReportTable";
import ReportCreateModal from "./ReportCreateModal";
import ReportDetailsModal from "./ReportDetailsModal";

const formatCurrency = (val: number) => {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val}`;
};

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportsData, setReportsData] = useState<any>({ summary: { total_reports: 0, open: 0, overdue_at_risk: 0, owners: 0 }, reports: [] });
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);

  const fetchReportData = useCallback(async () => {
    try {
      const [dashboardResult, reportsResult] = await Promise.all([
        api.get<any>("/reports/dashboard"),
        api.get<any>("/reports"),
      ]);
      setData(dashboardResult);
      setReportsData(reportsResult);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReportData(); }, [fetchReportData]);

  const handleDelete = async (record: any) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await api.delete("/reports/" + record.id_str);
      fetchReportData();
    } catch {}
  };

  if (loading) {
    return (
      <div className="space-y-10 lg:space-y-12">
        <div className="flex h-full items-center justify-center py-20"><Spinner /></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[80vh] items-center justify-center gap-2 text-[var(--shell-danger)]">
        <ShieldAlert size={24} /> Failed to load reporting metrics.
      </div>
    );
  }

  const { summary, rep_sales = [], lead_status = [], opp_stages = [] } = data;

  const maxRepSales = Math.max(...rep_sales.map((r: any) => r.amount), 1);
  const maxLeadCount = Math.max(...lead_status.map((l: any) => l.count), 1);
  const maxOppCount = Math.max(...opp_stages.map((o: any) => o.count), 1);

  const reportsItems = reportsData?.reports || [];
  const filteredReports = search
    ? reportsItems.filter((i: any) => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : reportsItems;

  return (
    <div className="space-y-10 lg:space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">INSIGHTS</p>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--shell-foreground)] mt-1">CRM Analytics & Performance Reports</h2>
          <p className="text-sm text-[var(--shell-muted)] mt-1">Real-time visual reports of sales pipeline, conversion funnels, and representative performance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReportData}>
          <RotateCw className={"h-4 w-4 mr-1.5" + (loading ? " animate-spin" : "")} /> Refresh
        </Button>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">OVERVIEW</h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)] flex items-center gap-1"><TrendingUp size={14} className="text-[var(--shell-brand)]" /> WIN RATE</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">{summary.win_rate}%</p>
            <p className="text-xs text-[var(--shell-muted)]">deals won ratio</p>
          </div>
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)] flex items-center gap-1"><Users size={14} className="text-[var(--shell-brand)]" /> LEAD CONVERSION</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">{summary.lead_conv_rate}%</p>
            <p className="text-xs text-[var(--shell-muted)]">qualified leads</p>
          </div>
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)] flex items-center gap-1"><Award size={14} className="text-[var(--shell-brand)]" /> TOTAL REVENUE</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">{formatCurrency(summary.total_sales_value)}</p>
            <p className="text-xs text-[var(--shell-muted)]">confirmed sales value</p>
          </div>
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)] flex items-center gap-1"><BarChart3 size={14} className="text-[var(--shell-brand)]" /> ACTIVE PIPELINE DEALS</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">{summary.total_opportunities}</p>
            <p className="text-xs text-[var(--shell-muted)]">open opportunities</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Sales Representative</CardTitle>
            <CardDescription>Performance breakdown of deals closed</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {rep_sales.length > 0 ? (
              rep_sales.map((item: any, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm font-semibold mb-1">
                    <span className="text-[var(--shell-foreground)]">{item.rep}</span>
                    <span className="text-[var(--shell-brand)]">{formatCurrency(item.amount)}</span>
                  </div>
                  <Progress value={(item.amount / maxRepSales) * 100} />
                </div>
              ))
            ) : (
              <EmptyState icon={PackageOpen} title="No closed sales found" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Status Distribution</CardTitle>
            <CardDescription>Current status breakdown of leads in system</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {lead_status.length > 0 ? (
              lead_status.map((item: any, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm font-semibold mb-1">
                    <span className="text-[var(--shell-foreground)]">{item.status}</span>
                    <span className="text-[var(--shell-muted)]">{item.count} leads</span>
                  </div>
                  <Progress value={(item.count / maxLeadCount) * 100} className="[&>div]:bg-[#0ea5e9]" />
                </div>
              ))
            ) : (
              <EmptyState icon={PackageOpen} title="No leads found" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Opportunity Pipeline Stages</CardTitle>
          <CardDescription>Active funnel stages of deals in progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {opp_stages.length > 0 ? (
              opp_stages.map((item: any, idx: number) => (
                <div key={idx} className="rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">{item.stage}</p>
                  <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)] mt-1">{item.count}</p>
                  <div className="mt-2">
                    <Progress value={(item.count / maxOppCount) * 100} className="h-1 [&>div]:bg-[#10b981]" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full">
                <EmptyState icon={PackageOpen} title="No active opportunities" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">RECORDS</h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <Card>
          <div className="flex items-center justify-between border-b border-[var(--shell-border)] p-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--shell-muted)]" />
              <Input placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <div className="flex items-center gap-3">
              <Filter size={15} className="text-[var(--shell-muted)] shrink-0" />
              <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredReports, "reports")}>
                <Download size={14} className="mr-1.5" /> Export
              </Button>
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                <Plus size={14} className="mr-1.5" /> New Report
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <ReportTable
              reports={filteredReports}
              onView={(rec) => { setSelectedRecord(rec); setIsDetailsOpen(true); }}
              onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }}
              onDelete={handleDelete}
            />
          </div>
        </Card>
      </div>

      <ReportCreateModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchReportData} />
      <ReportDetailsModal record={selectedRecord} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecord(null); }} />
    </div>
  );
}
