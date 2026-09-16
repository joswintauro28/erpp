"use client";

import { useState, useEffect } from "react";
import { Plus, Download, Search, Filter, RotateCw, BadgeCheck, Users, UserCheck, AlertTriangle, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportToCSV } from "@/utils/exportCsv";
import { toastSuccess, toastError, errorMessage } from "@/utils/toast";
import { useConfirm, handleError, KpiCard, PageHeader, SectionHeading } from "@datavex/ui-theme";
import { cn } from "@/lib/utils";
import LeadTable from "./LeadTable";
import LeadDetailsModal from "./LeadDetailsModal";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";
import LeadCreateModal from "./LeadCreateModal";

export default function LeadsPage() {
  const [data, setData] = useState<any>({ summary: { total_leads: 0, open: 0, overdue_at_risk: 0, owners: 0, mql: 0, sql: 0 }, leads: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [mqlOnly, setMqlOnly] = useState(false);

  const fetchData = async () => {
    try {
      const result = await api.get<any>("/crm/leads");
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const confirm = useConfirm();

  const handleDelete = async (lead: any) => {
    if (!(await confirm({ title: "Delete lead", message: "Are you sure you want to delete this lead?", destructive: true }))) return;
    try {
      await api.delete("/crm/leads/" + lead.id_str);
      toastSuccess("Lead deleted", lead.id_str);
      fetchData();
    } catch (e) {
      toastError("Delete failed", errorMessage(e));
    }
  };

  const handleQualify = async (lead: any) => {
    try {
      const res = await api.post<any>(`/crm/leads/${lead.id_str}/qualify`, {});
      toastSuccess("Lead qualified (MQL → SQL)", res.message || `${res.opportunity?.id_str} created`);
      fetchData();
    } catch (err: any) {
      toastError("Qualification failed", errorMessage(err));
    }
  };

  if (loading) return <div className="space-y-10 lg:space-y-12"><div className="flex h-full items-center justify-center py-20"><Spinner /></div></div>;

  const items = data?.leads || [];
  const filtered = (search
    ? items.filter((i: any) => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : items).filter((i: any) => (mqlOnly ? !!i.is_mql : true));

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        title="Lead Pipeline"
        subtitle="Track, qualify, and convert leads into sales opportunities."
        badge="CRM Sales Hub"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 text-xs">
              <RotateCw className={"h-3.5 w-3.5" + (loading ? " animate-spin" : "")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered, "leads")} className="gap-1.5 text-xs">
              <Download size={14} /> Export
            </Button>
            <Button
              onClick={() => window.location.href = "/crm/lead-discovery"}
              className="bg-gradient-to-r from-[var(--shell-warning)] to-[var(--shell-accent)] hover:from-[var(--shell-warning)]/90 hover:to-[var(--shell-accent)]/90 text-white font-semibold border border-[var(--shell-warning)]/40 shadow-[0_0_12px_color-mix(in_srgb,var(--shell-warning)_25%,transparent)] hover:shadow-[0_0_18px_color-mix(in_srgb,var(--shell-warning)_50%,transparent)] transition-all duration-300 gap-1.5 text-xs"
              size="sm"
            >
              <BadgeCheck size={14} className="fill-[var(--shell-accent)]/20 text-white" /> Discover Leads
            </Button>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-brand)]/90 gap-1.5 text-xs shadow-sm">
              <Plus size={14} /> New Lead
            </Button>
          </>
        }
      />

      <section>
        <SectionHeading label="Overview" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="Total Leads" value={data.summary.total_leads} subtitle="leads in pipeline" icon={Users} color="var(--chart-1)" index={0} />
          <KpiCard label="Open" value={data.summary.open} subtitle="open leads" icon={UserCheck} color="var(--chart-2)" index={1} />
          <KpiCard label="MQL Ready" value={data.summary.mql} subtitle="ready for handoff (score ≥ 70)" icon={BadgeCheck} color="var(--shell-warning)" index={2} />
          <KpiCard label="Overdue / At Risk" value={data.summary.overdue_at_risk} subtitle={data.summary.overdue_at_risk > 0 ? "needs attention" : "on track"} icon={AlertTriangle} color="var(--shell-danger)" index={3} />
          <KpiCard label="Owners" value={data.summary.owners} subtitle="active reps" icon={UserPlus} color="var(--chart-4)" index={4} />
        </div>
      </section>

      <section>
        <SectionHeading label="Lead Records" />
        <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <div className="flex items-center gap-3 p-4 border-b border-[var(--shell-border)]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--shell-muted)]" />
              <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <button
              type="button"
              onClick={() => setMqlOnly((v) => !v)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                mqlOnly
                  ? "border-[var(--shell-warning)]/40 bg-[var(--shell-warning-surface)] text-[var(--shell-warning)] shadow-sm"
                  : "border-[var(--shell-border)] text-[var(--shell-muted)] hover:border-[var(--shell-warning)]/30 hover:text-[var(--shell-warning)]"
              )}
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              MQL Ready
            </button>
            <Filter size={15} className="text-[var(--shell-muted)] shrink-0" />
          </div>
          <LeadTable
            leads={filtered}
            onView={(rec) => { setSelectedRecord(rec); setIsDetailsOpen(true); }}
            onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }}
            onDelete={handleDelete}
            onQualify={handleQualify}
          />
        </Card>
      </section>

      <LeadCreateModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <LeadDetailsModal lead={selectedRecord} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecord(null); }} onSuccess={fetchData} />
    </div>
  );
}
