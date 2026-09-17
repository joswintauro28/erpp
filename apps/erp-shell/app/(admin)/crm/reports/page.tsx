"use client";
import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Award, Users, BarChart3, ShieldAlert, RotateCw, PackageOpen, Search, Filter, Plus, Download, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { exportToCSV } from "@/utils/exportCsv";
import { toastError } from "@/utils/toast";
import { useConfirm, handleError, KpiCard, PageHeader, SectionHeading } from "@datavex/ui-theme";
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
        api.get<any>("/crm/reports/dashboard"),
        api.get<any>("/crm/reports"),
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

  const confirm = useConfirm();

  const handleDelete = async (record: any) => {
    if (!(await confirm({ title: "Delete report", message: "Are you sure you want to delete this report?", destructive: true }))) return;
    try {
      await api.delete("/crm/reports/" + record.id_str);
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
      <PageHeader
        title="CRM Analytics & Reports"
        subtitle="Real-time performance reports and pipeline insights."
        badge="CRM Sales Hub"
        actions={
          <Button variant="outline" size="sm" onClick={fetchReportData} className="gap-1.5 text-xs">
            <RotateCw className={"h-3.5 w-3.5" + (loading ? " animate-spin" : "")} /> Refresh
          </Button>
        }
      />

      <section>
        <SectionHeading label="Overview" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Win Rate" value={`${summary.win_rate}%`} subtitle="deals won ratio" icon={TrendingUp} color="var(--chart-1)" index={0} />
          <KpiCard label="Lead Conversion" value={`${summary.lead_conv_rate}%`} subtitle="qualified leads" icon={Users} color="var(--chart-2)" index={1} />
          <KpiCard label="Total Revenue" value={formatCurrency(summary.total_sales_value)} subtitle="confirmed sales value" icon={Award} color="var(--chart-3)" index={2} />
          <KpiCard label="Active Pipeline Deals" value={summary.total_opportunities} subtitle="open opportunities" icon={Target} color="var(--chart-4)" index={3} />
        </div>
      </section>

      <section>
        <SectionHeading label="Analytics" />
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
                      <span className="text-foreground">{item.rep}</span>
                      <span className="text-primary">{formatCurrency(item.amount)}</span>
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
                      <span className="text-foreground">{item.status}</span>
                      <span className="text-muted-foreground">{item.count} leads</span>
                    </div>
                    <Progress value={(item.count / maxLeadCount) * 100} className="[&>div]:bg-[var(--shell-info)]" />
                  </div>
                ))
              ) : (
                <EmptyState icon={PackageOpen} title="No leads found" />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Opportunity Pipeline Stages</CardTitle>
            <CardDescription>Active funnel stages of deals in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {opp_stages.length > 0 ? (
                opp_stages.map((item: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{item.stage}</p>
                    <p className="font-heading text-2xl font-semibold tracking-tight text-foreground mt-1">{item.count}</p>
                    <div className="mt-2">
                      <Progress value={(item.count / maxOppCount) * 100} className="h-1 [&>div]:bg-[var(--shell-success)]" />
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
      </section>

      <section>
        <SectionHeading label="Report Records" />
        <Card>
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <div className="flex items-center gap-3">
              <Filter size={15} className="text-muted-foreground shrink-0" />
              <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredReports, "reports")} className="gap-1.5 text-xs">
                <Download size={14} /> Export
              </Button>
              <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-primary text-white hover:bg-primary/90 gap-1.5 text-xs shadow-sm">
                <Plus size={14} /> New Report
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
      </section>

      <ReportCreateModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchReportData} />
      <ReportDetailsModal record={selectedRecord} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecord(null); }} />
    </div>
  );
}
