"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, Search, Filter, Sparkles } from "lucide-react";
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
  New: "secondary",
  Qualified: "default",
  "In Progress": "outline",
  Converted: "default",
  Lost: "destructive",
};

function formatCurrency(value: number | string) {
  const n = Number(value);
  if (isNaN(n)) return String(value);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function LeadsPage() {
  const router = useRouter();
  const [data, setData] = useState({ summary: { total_leads: 0, open: 0, overdue_at_risk: 0, owners: 0 }, leads: [] });
  const [loading, setLoading] = useState(true);
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

  if (loading) return <div className="space-y-10 lg:space-y-12"><div className="flex h-full items-center justify-center py-20"><Spinner /></div></div>;

  return (
    <div className="space-y-10 lg:space-y-12">
      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">OVERVIEW</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">TOTAL LEADS</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.total_leads}</p>
            <p className="text-xs text-[--shell-muted]">leads in pipeline</p>
          </div>
          <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">OPEN</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.open}</p>
            <p className="text-xs text-[--shell-muted]">open leads</p>
          </div>
          <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">OVERDUE / AT RISK</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.overdue_at_risk}</p>
            <p className="text-xs text-[--shell-muted]">{data.summary.overdue_at_risk > 0 ? "needs attention" : "on track"}</p>
          </div>
          <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-shadow">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">OWNERS</p>
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
            <Button variant="outline" size="sm" onClick={() => {}}>
              <Download size={14} className="mr-1.5" /> Export
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push("/lead-discovery")}>
              <Sparkles size={14} className="mr-1.5" /> Discover Leads
            </Button>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus size={14} className="mr-1.5" /> New Lead
            </Button>
          </div>
        </div>

        <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
          <div className="flex items-center gap-3 p-4 border-b border-[--shell-border]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--shell-muted]" />
              <Input placeholder="Search leads..." className="pl-9 h-9 text-sm" />
            </div>
            <Filter size={15} className="text-[--shell-muted] shrink-0" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>LEAD</TableHead>
                <TableHead>COMPANY</TableHead>
                <TableHead>SOURCE</TableHead>
                <TableHead>EST. VALUE</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>OWNER</TableHead>
                <TableHead>UPDATED</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.leads?.map((lead: any) => (
                <TableRow key={lead.id}>
                  <TableCell className="text-[--shell-muted] cursor-pointer" onClick={() => { setSelectedRecord(lead); setIsDetailsOpen(true); }}>{lead.id_str}</TableCell>
                  <TableCell className="font-medium text-primary cursor-pointer" onClick={() => { setSelectedRecord(lead); setIsDetailsOpen(true); }}>{lead.name}</TableCell>
                  <TableCell>{lead.company}</TableCell>
                  <TableCell>{lead.source}</TableCell>
                  <TableCell>{formatCurrency(lead.est_value)}</TableCell>
                  <TableCell><Badge variant={statusVariant[lead.status] || "outline"}>{lead.status}</Badge></TableCell>
                  <TableCell>{lead.owner}</TableCell>
                  <TableCell className="text-[--shell-muted]">{lead.updated_at}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 text-[--shell-muted]">
                      <button className="hover:text-[--shell-foreground] cursor-pointer" onClick={() => { setEditRecord(lead); setIsModalOpen(true); }}>Edit</button>
                      <button className="hover:text-red-500 cursor-pointer" onClick={() => handleDelete(lead)}>Delete</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <GenericCreateModal entityType="leads" entityName="Lead" isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <GenericDetailsModal record={selectedRecord} entityName="Lead" isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecord(null); }} onSuccess={fetchData} />
    </div>
  );
}
