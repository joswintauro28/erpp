"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, Search, Filter, Sparkles, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportToCSV } from "@/utils/exportCsv";
import LeadTable from "./LeadTable";
import LeadDetailsModal from "./LeadDetailsModal";
import { api } from "@/services/api";
import GenericCreateModal from "@/components/GenericCreateModal";
import LeadsLoading from "./loading";

export default function LeadsPage() {
  const router = useRouter();
  const [data, setData] = useState({ summary: { total_leads: 0, open: 0, overdue_at_risk: 0, owners: 0 }, leads: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/leads");
      setData(result);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (lead: any) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      await api.delete("/leads/" + lead.id_str);
      fetchData();
    } catch {}
  };

  if (loading) return <LeadsLoading />;

  const items = data?.leads || [];
  const filtered = search
    ? items.filter((i: any) => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">Leads</h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Manage pipeline, lead scoring, and conversions</p>
        </div>
      </div>

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
            <Button variant="secondary" size="sm" onClick={() => router.push("/crm/lead-discovery")}>
              <Sparkles size={14} className="mr-1.5" /> Discover Leads
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
            <Filter size={15} className="text-[var(--shell-muted)] shrink-0" />
          </div>
          <LeadTable
            leads={filtered}
            onView={(rec) => { setSelectedRecord(rec); setIsDetailsOpen(true); }}
            onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }}
            onDelete={handleDelete}
          />
        </Card>
      </div>

      <GenericCreateModal entityType="leads" entityName="Lead" isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <LeadDetailsModal lead={selectedRecord} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecord(null); }} onSuccess={fetchData} />
    </div>
  );
}
