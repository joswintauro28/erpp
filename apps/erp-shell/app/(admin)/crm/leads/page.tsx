"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, Search, Filter, Sparkles, RotateCw, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportToCSV } from "@/utils/exportCsv";
import { toastSuccess, toastError, errorMessage } from "@/utils/toast";
import { useConfirm, handleError } from "@datavex/ui-theme";
import { cn } from "@/lib/utils";
import LeadTable from "./LeadTable";
import LeadDetailsModal from "./LeadDetailsModal";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";
import LeadCreateModal from "./LeadCreateModal";



export default function LeadsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>({ summary: { total_leads: 0, open: 0, overdue_at_risk: 0, owners: 0, mql: 0, sql: 0 }, leads: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [mqlOnly, setMqlOnly] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/leads");
      setData(result);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const confirm = useConfirm();

  const handleDelete = async (lead: any) => {
    if (!(await confirm({ title: "Delete lead", message: "Are you sure you want to delete this lead?", destructive: true }))) return;
    try {
      await api.delete("/leads/" + lead.id_str);
      toastSuccess("Lead deleted", lead.id_str);
      fetchData();
    } catch {}
  };

  const handleQualify = async (lead: any) => {
    try {
      const res = await api.post<any>(`/leads/${lead.id_str}/qualify`, {});
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
      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">OVERVIEW</h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">TOTAL LEADS</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">{data.summary.total_leads}</p>
            <p className="text-xs text-[var(--shell-muted)]">leads in pipeline</p>
          </div>
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">OPEN</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">{data.summary.open}</p>
            <p className="text-xs text-[var(--shell-muted)]">open leads</p>
          </div>
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">MQL READY</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-warning)]">{data.summary.mql}</p>
            <p className="text-xs text-[var(--shell-muted)]">ready for handoff (score ≥ 70)</p>
          </div>
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">OVERDUE / AT RISK</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">{data.summary.overdue_at_risk}</p>
            <p className="text-xs text-[var(--shell-muted)]">{data.summary.overdue_at_risk > 0 ? "needs attention" : "on track"}</p>
          </div>
          <div className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">OWNERS</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">{data.summary.owners}</p>
            <p className="text-xs text-[var(--shell-muted)]">active reps</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">RECORDS</h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RotateCw className={"h-4 w-4 mr-1.5" + (loading ? " animate-spin" : "")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered, "leads")}>
              <Download size={14} className="mr-1.5" /> Export
            </Button>
            <Button
              onClick={() => router.push("/crm/lead-discovery")}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-semibold border border-[var(--shell-warning)]/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:shadow-[0_0_18px_rgba(245,158,11,0.5)] transition-all duration-300"
              size="sm"
            >
              <Sparkles size={14} className="mr-1.5 fill-amber-950/20 text-slate-950" /> Discover Leads
            </Button>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus size={14} className="mr-1.5" /> New Lead
            </Button>
          </div>
        </div>

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
      </div>

      <LeadCreateModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <LeadDetailsModal lead={selectedRecord} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecord(null); }} onSuccess={fetchData} />
    </div>
  );
}
