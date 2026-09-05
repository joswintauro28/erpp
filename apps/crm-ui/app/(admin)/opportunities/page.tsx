"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Search, Filter, RotateCw, KanbanSquare, Table2, Target, Users, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportToCSV } from "@/utils/exportCsv";
import { cn } from "@/lib/utils";
import OpportunityTable from "./OpportunityTable";
import OpportunityKanban from "./OpportunityKanban";
import OpportunityDetailModal from "./OpportunityDetailModal";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";
import { toastError } from "@/utils/toast";
import { useConfirm, handleError, KpiCard, PageHeader, SectionHeading } from "@datavex/ui-theme";
import OpportunityCreateModal from "./OpportunityCreateModal";

export default function OpportunitiesPage() {
  const [data, setData] = useState({ summary: { total_opportunities: 0, open: 0, overdue_at_risk: 0, owners: 0 }, opportunities: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<any>(null);
  const [editRecord, setEditRecord] = useState(null);
  const [view, setView] = useState<"table" | "kanban">("kanban");

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/opportunities");
      setData(result);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const confirm = useConfirm();

  const handleDelete = async (record: any) => {
    if (await confirm({ title: "Delete opportunity", message: "Are you sure you want to delete this opportunity?", destructive: true })) {
      try { await api.delete("/opportunities/" + record.id_str); fetchData(); }
      catch { toastError("Delete failed"); }
    }
  };

  if (loading) return <div className="space-y-10 lg:space-y-12"><div className="flex h-full items-center justify-center py-20"><Spinner /></div></div>;

  const items = data?.opportunities || [];
  const filtered = search
    ? items.filter((i: any) => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        title="Sales Pipeline"
        subtitle="Track and manage sales opportunities through each stage."
        badge="CRM Sales Hub"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 text-xs">
              <RotateCw className={"h-3.5 w-3.5" + (loading ? " animate-spin" : "")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(items, "opportunities")} className="gap-1.5 text-xs">
              <Download size={14} /> Export
            </Button>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-brand)]/90 gap-1.5 text-xs shadow-sm">
              <Plus size={14} /> New Opportunity
            </Button>
          </>
        }
      />

      <section>
        <SectionHeading label="Overview" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Opportunities" value={data.summary?.total_opportunities ?? 0} subtitle="deals in pipeline" icon={Target} color="var(--chart-1)" index={0} />
          <KpiCard label="Open" value={data.summary?.open ?? 0} subtitle="open opportunities" icon={KanbanSquare} color="var(--chart-2)" index={1} />
          <KpiCard label="Overdue / At Risk" value={data.summary?.overdue_at_risk ?? 0} subtitle={data.summary?.overdue_at_risk > 0 ? "lost deals" : "no lost deals"} icon={AlertTriangle} color="var(--shell-danger)" index={2} />
          <KpiCard label="Representatives" value={data.summary?.owners ?? 0} subtitle="active reps" icon={Users} color="var(--chart-4)" index={3} />
        </div>
      </section>

      <section>
        <SectionHeading label="Pipeline Records" />

        <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--shell-border)] p-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-muted)]" />
              <Input placeholder="Search opportunities..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-[var(--shell-muted)]" />
              <div className="flex items-center rounded-lg border border-[var(--shell-border)] bg-[var(--shell-surface)] p-0.5">
                <button
                  type="button"
                  onClick={() => setView("kanban")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    view === "kanban" ? "bg-[var(--shell-brand)] text-white shadow-sm" : "text-[var(--shell-muted)] hover:text-[var(--shell-foreground)]"
                  )}
                >
                  <KanbanSquare className="h-3.5 w-3.5" /> Pipeline
                </button>
                <button
                  type="button"
                  onClick={() => setView("table")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    view === "table" ? "bg-[var(--shell-brand)] text-white shadow-sm" : "text-[var(--shell-muted)] hover:text-[var(--shell-foreground)]"
                  )}
                >
                  <Table2 className="h-3.5 w-3.5" /> Table
                </button>
              </div>
            </div>
          </div>
          {view === "kanban" ? (
            <div className="p-4">
              <OpportunityKanban
                opportunities={filtered}
                onView={(rec) => { setSelectedRecordForDetails(rec); setIsDetailsOpen(true); }}
                onStageChange={fetchData}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <OpportunityTable
                opportunities={filtered}
                onView={(rec) => { setSelectedRecordForDetails(rec); setIsDetailsOpen(true); }}
                onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }}
                onDelete={handleDelete}
              />
            </div>
          )}
        </Card>
      </section>

      <OpportunityCreateModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <OpportunityDetailModal record={selectedRecordForDetails} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecordForDetails(null); }} onSuccess={fetchData} />
    </div>
  );
}
