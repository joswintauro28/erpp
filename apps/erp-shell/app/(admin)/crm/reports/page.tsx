"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Search, Filter, FileText, FileCheck, AlertTriangle, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { exportToCSV } from "@/utils/exportCsv";
import { api } from "@/services/api";
import GenericCreateModal from "@/components/GenericCreateModal";
import GenericDetailsModal from "@/components/GenericDetailsModal";
import ReportsLoading from "./loading";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Generating: "secondary", Processing: "secondary", Pending: "secondary",
  Completed: "default", Ready: "default", Success: "default",
  Failed: "destructive", Error: "destructive",
};

export default function ReportsPage() {
  const [data, setData] = useState({ reports: [], summary: { total_reports: 0, open: 0, overdue_at_risk: 0, owners: 0 } });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/crm/reports");
      setData(result);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (record: any) => {
    if (window.confirm("Are you sure?")) {
      try { await api.delete("/crm/reports/" + record.id_str); fetchData(); }
      catch { alert("Delete failed"); }
    }
  };

  if (loading) return <ReportsLoading />;

  const items = data?.reports || [];
  const filtered = search
    ? items.filter((i: any) => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[var(--shell-foreground)]">Reports</h1>
          <p className="mt-0.5 text-sm text-[var(--shell-muted)]">Generate and manage business reports</p>
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">OVERVIEW</h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "TOTAL REPORTS", value: data.summary?.total_reports, icon: FileText },
            { label: "GENERATING", value: data.summary?.open, icon: FileCheck },
            { label: "FAILED", value: data.summary?.overdue_at_risk, icon: AlertTriangle },
            { label: "OWNERS", value: data.summary?.owners, icon: Building2 },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-[var(--shell-border)] bg-[var(--shell-surface)] p-4 space-y-2 hover:shadow-engineered transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">{m.label}</p>
                <m.icon className="h-4 w-4 text-[var(--shell-muted)]" />
              </div>
              <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--shell-foreground)]">{m.value ?? 0}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[var(--shell-muted)]">RECORDS</h2>
          <div className="h-px flex-1 bg-[var(--shell-border)]" />
        </div>
        <div className="flex items-center justify-end gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(items, "reports")}><Download className="h-4 w-4" /> Export</Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> New Report</Button>
        </div>
        <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <div className="flex items-center gap-3 border-b border-[var(--shell-border)] p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-muted)]" />
              <Input placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Filter className="h-4 w-4 text-[var(--shell-muted)]" />
          </div>
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-[var(--shell-muted)]">
                <FileText className="h-12 w-12" />
                <p className="text-base font-medium text-[var(--shell-foreground)]">No reports found</p>
                <Button size="sm" onClick={() => setIsModalOpen(true)} className="mt-2"><Plus className="mr-1 h-4 w-4" /> New Report</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>NAME</TableHead>
                    <TableHead>TYPE</TableHead>
                    <TableHead>GENERATED</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-[var(--shell-muted)]">{r.id_str}</TableCell>
                      <TableCell className="font-medium text-[var(--shell-foreground)]">{r.name || r.title}</TableCell>
                      <TableCell>{r.type || r.category}</TableCell>
                      <TableCell className="text-xs">{r.date || r.last_run || r.generated_at}</TableCell>
                      <TableCell><Badge variant={statusVariant[r.status] || "outline"}>{r.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="icon-sm" variant="ghost" className="text-[var(--shell-muted)] hover:text-[var(--shell-foreground)]" onClick={() => { setSelectedRecordForDetails(r); setIsDetailsOpen(true); }} title="View"><FileText size={14} /></Button>
                          <Button size="icon-sm" variant="ghost" className="text-[var(--shell-muted)] hover:text-[var(--shell-foreground)]" onClick={() => { setEditRecord(r); setIsModalOpen(true); }} title="Edit">Edit</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>

      <GenericCreateModal entityType="crm/reports" entityName="Report" isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <GenericDetailsModal record={selectedRecordForDetails} entityName="Report" isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecordForDetails(null); }} onSuccess={fetchData} />
    </div>
  );
}
