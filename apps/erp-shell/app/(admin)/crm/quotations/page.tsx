"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Search, Filter, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";
import { exportToCSV } from "@/utils/exportCsv";
import GenericCreateModal from "@/components/GenericCreateModal";
import GenericDetailsModal from "@/components/GenericDetailsModal";
import QuotationTable from "./QuotationTable";

export default function QuotationsPage() {
  const [data, setData] = useState({ summary: { total_quotations: 0, open: 0, overdue_at_risk: 0, owners: 0 }, quotations: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [autoConvert, setAutoConvert] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/quotations");
      setData(result);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (record: any) => {
    if (!window.confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await api.delete("/quotations/" + record.id_str);
      fetchData();
    } catch {}
  };

  const handleFinalize = (record: any) => {
    setAutoConvert(true);
    setSelectedRecord(record);
    setIsDetailsOpen(true);
  };

  if (loading) return <div className="space-y-10 lg:space-y-12"><div className="flex h-full items-center justify-center py-20"><Spinner /></div></div>;

  const items = data?.quotations || [];
  const filtered = search
    ? items.filter((i: any) => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-10 lg:space-y-12">
      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">OVERVIEW</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">TOTAL QUOTATIONS</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.total_quotations}</p>
            <p className="text-xs text-[--shell-muted]">active quotes</p>
          </div>
          <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">OPEN</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.open}</p>
            <p className="text-xs text-[--shell-muted]">pending response</p>
          </div>
          <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">NEEDS ATTENTION</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.overdue_at_risk}</p>
            <p className="text-xs text-[--shell-muted]">{data.summary.overdue_at_risk > 0 ? "expired quotes" : "all valid"}</p>
          </div>
          <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-engineered transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">REPRESENTATIVES</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.owners}</p>
            <p className="text-xs text-[--shell-muted]">active reps</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">RECORDS</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RotateCw className={"h-4 w-4 mr-1.5" + (loading ? " animate-spin" : "")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered, "quotations")}>
              <Download size={14} className="mr-1.5" /> Export
            </Button>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus size={14} className="mr-1.5" /> New Quotation
            </Button>
          </div>
        </div>

        <Card className="hover:shadow-engineered transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
          <div className="flex items-center gap-3 p-4 border-b border-[--shell-border]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--shell-muted]" />
              <Input placeholder="Search quotations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <Filter size={15} className="text-[--shell-muted] shrink-0" />
          </div>
          <QuotationTable
            quotations={filtered}
            onView={(quote) => { setAutoConvert(false); setSelectedRecord(quote); setIsDetailsOpen(true); }}
            onEdit={(quote) => { setEditRecord(quote); setIsModalOpen(true); }}
            onDelete={handleDelete}
            onFinalize={handleFinalize}
          />
        </Card>
      </div>

      <GenericCreateModal entityType="quotations" entityName="Quotation" isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <GenericDetailsModal record={selectedRecord} entityName="Quotation" isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecord(null); setAutoConvert(false); }} onSuccess={fetchData} initialShowForm={autoConvert ? "sales-order" : ""} />
    </div>
  );
}
