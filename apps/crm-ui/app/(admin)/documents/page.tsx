"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Search, Filter, RotateCw, FileText, Eye, AlertTriangle, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";
import { exportToCSV } from "@/utils/exportCsv";
import { toastError } from "@/utils/toast";
import { useConfirm, handleError, KpiCard, PageHeader, SectionHeading } from "@datavex/ui-theme";
import DocumentCreateModal from "./DocumentCreateModal";
import DocumentTable from "./DocumentTable";
import DocumentDetailsModal from "./DocumentDetailsModal";

export default function DocumentsPage() {
  const [data, setData] = useState({ summary: { total_documents: 0, open: 0, overdue_at_risk: 0, owners: 0 }, documents: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/documents");
      setData(result);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const confirm = useConfirm();

  const handleDelete = async (record: any) => {
    if (await confirm({ title: "Delete document", message: "Are you sure you want to delete this document?", destructive: true })) {
      try { await api.delete("/documents/" + record.id_str); fetchData(); }
      catch { toastError("Delete failed"); }
    }
  };

  if (loading) return <div className="space-y-10 lg:space-y-12"><div className="flex h-full items-center justify-center py-20"><Spinner /></div></div>;

  const items = data?.documents || [];
  const filtered = search
    ? items.filter((i: any) => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        title="Document Library"
        subtitle="Organize and manage CRM documents, contracts, and attachments."
        badge="CRM Sales Hub"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 text-xs">
              <RotateCw className={"h-3.5 w-3.5" + (loading ? " animate-spin" : "")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered, "documents")} className="gap-1.5 text-xs">
              <Download size={14} /> Export
            </Button>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-brand)]/90 gap-1.5 text-xs shadow-sm">
              <Plus size={14} /> New Document
            </Button>
          </>
        }
      />

      <section>
        <SectionHeading label="Overview" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Documents" value={data.summary?.total_documents ?? 0} subtitle="library items" icon={FileText} color="var(--chart-1)" index={0} />
          <KpiCard label="Open" value={data.summary?.open ?? 0} subtitle="active review" icon={Eye} color="var(--chart-2)" index={1} />
          <KpiCard label="Overdue / At Risk" value={data.summary?.overdue_at_risk ?? 0} subtitle={data.summary?.overdue_at_risk > 0 ? "expired items" : "all valid"} icon={AlertTriangle} color="var(--shell-danger)" index={2} />
          <KpiCard label="Representatives" value={data.summary?.owners ?? 0} subtitle="active reps" icon={Users} color="var(--chart-4)" index={3} />
        </div>
      </section>

      <section>
        <SectionHeading label="Document Records" />

        <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <div className="flex items-center gap-3 border-b border-[var(--shell-border)] p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-muted)]" />
              <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Filter className="h-4 w-4 text-[var(--shell-muted)]" />
          </div>
          <DocumentTable
            documents={filtered}
            onView={(rec) => { setSelectedDoc(rec); setIsDetailsOpen(true); }}
            onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }}
            onDelete={handleDelete}
          />
        </Card>
      </section>

      <DocumentCreateModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <DocumentDetailsModal doc={selectedDoc} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedDoc(null); }} />
    </div>
  );
}
