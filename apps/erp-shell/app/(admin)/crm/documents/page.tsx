"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Search, Filter, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";
import { exportToCSV } from "@/utils/exportCsv";
import { toastError } from "@/utils/toast";
import { useConfirm } from "@datavex/ui-theme";
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
      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">OVERVIEW</h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "TOTAL DOCUMENTS", value: data.summary?.total_documents, trend: "library items" },
            { label: "OPEN", value: data.summary?.open, trend: "active review" },
            { label: "OVERDUE / AT RISK", value: data.summary?.overdue_at_risk, trend: data.summary?.overdue_at_risk > 0 ? "expired items" : "all valid" },
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
              <RotateCw className={"h-4 w-4 mr-1.5" + (loading ? " animate-spin" : "")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered, "documents")}>
              <Download size={14} className="mr-1.5" /> Export
            </Button>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus size={14} className="mr-1.5" /> New Document
            </Button>
          </div>
        </div>

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
      </div>

      <DocumentCreateModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <DocumentDetailsModal doc={selectedDoc} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedDoc(null); }} />
    </div>
  );
}
