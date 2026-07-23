"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Search, Filter, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportToCSV } from "@/utils/exportCsv";
import OpportunityTable from "./OpportunityTable";
import OpportunityDetailModal from "./OpportunityDetailModal";
import { api } from "@/services/api";
import GenericCreateModal from "@/components/GenericCreateModal";
import OpportunitiesLoading from "./loading";

export default function OpportunitiesPage() {
  const [data, setData] = useState({ summary: { total_opportunities: 0, open: 0, overdue_at_risk: 0, owners: 0 }, opportunities: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/opportunities");
      setData(result);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (record: any) => {
    if (window.confirm("Are you sure?")) {
      try { await api.delete("/opportunities/" + record.id_str); fetchData(); }
      catch { alert("Delete failed"); }
    }
  };

  if (loading) return <OpportunitiesLoading />;

  const items = data?.opportunities || [];
  const filtered = search
    ? items.filter((i: any) => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">Opportunities</h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Manage your sales pipeline deals</p>
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">OVERVIEW</h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "TOTAL OPPORTUNITIES", value: data.summary?.total_opportunities, trend: "deals pipeline" },
            { label: "OPEN", value: data.summary?.open, trend: "open opportunities" },
            { label: "OVERDUE / AT RISK", value: data.summary?.overdue_at_risk, trend: data.summary?.overdue_at_risk > 0 ? "lost deals" : "no lost deals" },
            { label: "REPRESENTATIVES", value: data.summary?.owners, trend: "active reps" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 space-y-2 hover:shadow-engineered transition-shadow">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">{m.label}</p>
              <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">{m.value ?? 0}</p>
              <p className="text-xs text-[var(--shell-muted)]">{m.trend}</p>
            </div>
          ))}
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
              <RotateCw className={"h-4 w-4" + (loading ? " animate-spin" : "")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(items, "opportunities")}><Download className="h-4 w-4" /> Export</Button>
            <Button size="sm" onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> New Opportunity</Button>
          </div>
        </div>
        <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <div className="flex items-center gap-3 border-b border-[var(--shell-border)] p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-muted)]" />
              <Input placeholder="Search opportunities..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Filter className="h-4 w-4 text-[var(--shell-muted)]" />
          </div>
          <div className="overflow-x-auto">
            <OpportunityTable
              opportunities={filtered}
              onView={(rec) => { setSelectedRecordForDetails(rec); setIsDetailsOpen(true); }}
              onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }}
              onDelete={handleDelete}
            />
          </div>
        </Card>
      </div>

      <GenericCreateModal entityType="opportunities" entityName="Opportunity" isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <OpportunityDetailModal record={selectedRecordForDetails} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecordForDetails(null); }} onSuccess={fetchData} />
    </div>
  );
}
