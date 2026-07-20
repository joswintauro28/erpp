"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import GenericCreateModal from "@/components/GenericCreateModal";
import GenericDetailsModal from "@/components/GenericDetailsModal";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Generating: "secondary",
  Processing: "secondary",
  Pending: "secondary",
  Completed: "default",
  Ready: "default",
  Success: "default",
  Failed: "destructive",
  Error: "destructive",
};

export default function ReportsPage() {
  const [data, setData] = useState({ summary: { total_reports: 0, open: 0, overdue_at_risk: 0, owners: 0 }, reports: [] });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/reports");
      setData(result);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (record: any) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await api.delete("/reports/" + record.id_str);
      fetchData();
    } catch {}
  };

  if (loading) return <div className="space-y-10 lg:space-y-12"><div className="flex h-full items-center justify-center py-20"><Spinner /></div></div>;

  return (
    <div className="space-y-10 lg:space-y-12">
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" size="sm" onClick={() => {}}>
          <Download size={14} className="mr-1.5" /> Export
        </Button>
        <Button size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus size={14} className="mr-1.5" /> New Report
        </Button>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">OVERVIEW</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">TOTAL REPORTS</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.total_reports}</p>
            <p className="text-xs text-[--shell-muted]">reports generated</p>
          </div>
          <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">GENERATING</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.open}</p>
            <p className="text-xs text-[--shell-muted]">in progress</p>
          </div>
          <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">FAILED</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.overdue_at_risk}</p>
            <p className="text-xs text-[--shell-muted]">{data.summary.overdue_at_risk > 0 ? "needs attention" : "no failures"}</p>
          </div>
          <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">OWNERS</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.owners}</p>
            <p className="text-xs text-[--shell-muted]">active users</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">RECORDS</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
          <div className="flex items-center gap-3 p-4 border-b border-[--shell-border]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--shell-muted]" />
              <Input placeholder="Search reports..." className="pl-9 h-9 text-sm" />
            </div>
            <Filter size={15} className="text-[--shell-muted] shrink-0" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>NAME</TableHead>
                <TableHead>TYPE</TableHead>
                <TableHead>GENERATED</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>OWNER</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.reports?.map((report: any) => (
                <TableRow key={report.id}>
                  <TableCell className="text-[--shell-muted] cursor-pointer" onClick={() => { setSelectedRecord(report); setIsDetailsOpen(true); }}>{report.id_str}</TableCell>
                  <TableCell className="font-medium text-primary cursor-pointer" onClick={() => { setSelectedRecord(report); setIsDetailsOpen(true); }}>{report.name || report.title}</TableCell>
                  <TableCell>{report.type || report.category}</TableCell>
                  <TableCell>{report.date || report.last_run || report.generated_at}</TableCell>
                  <TableCell><Badge variant={statusVariant[report.status] || "outline"}>{report.status}</Badge></TableCell>
                  <TableCell>{report.owner}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 text-[--shell-muted]">
                      <button className="hover:text-[--shell-foreground] cursor-pointer" onClick={() => { setEditRecord(report); setIsModalOpen(true); }}>Edit</button>
                      <button className="hover:text-red-500 cursor-pointer" onClick={() => handleDelete(report)}>Delete</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <GenericCreateModal entityType="reports" entityName="Report" isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <GenericDetailsModal record={selectedRecord} entityName="Report" isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecord(null); }} onSuccess={fetchData} />
    </div>
  );
}
