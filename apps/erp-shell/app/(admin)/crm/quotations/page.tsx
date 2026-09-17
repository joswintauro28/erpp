"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Search, Filter, RotateCw, FileText, Eye, AlertTriangle, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";
import { exportToCSV } from "@/utils/exportCsv";
import { toastSuccess, toastError, errorMessage } from "@/utils/toast";
import { useConfirm, handleError, KpiCard, PageHeader, SectionHeading } from "@datavex/ui-theme";
import QuotationCreateModal from "./QuotationCreateModal";
import QuotationDetailsModal from "./QuotationDetailsModal";
import QuotationTable from "./QuotationTable";
import QuotationCpqModal from "./QuotationCpqModal";

export default function QuotationsPage() {
  const [data, setData] = useState({ summary: { total_quotations: 0, open: 0, overdue_at_risk: 0, owners: 0 }, quotations: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [autoConvert, setAutoConvert] = useState(false);
  const [isCpqOpen, setIsCpqOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/crm/quotations");
      setData(result);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const confirm = useConfirm();

  const handleDelete = async (record: any) => {
    if (!(await confirm({ title: "Delete quotation", message: "Are you sure you want to delete this quotation?", destructive: true }))) return;
    try {
      await api.delete("/crm/quotations/" + record.id);
      fetchData();
    } catch {}
  };

  const handleFinalize = (record: any) => {
    if (record.status !== "Accepted") {
      toastError("Quote not accepted yet", "Mark the quotation as Accepted before converting to a Sales Order.");
      return;
    }
    setAutoConvert(true);
    setSelectedRecord(record);
    setIsDetailsOpen(true);
  };

  const handleApprovalDecision = async (record: any, approve: boolean) => {
    try {
      const res = await api.put<any>(`/crm/quotations/${record.id}/approval`, { approve });
      if (approve) {
        toastSuccess("Quote approved", `${record.quote_no || record.quote_number || ""} is now unlocked for sending.`);
      } else {
        toastSuccess("Quote rejected", "The quote stays locked.");
      }
      fetchData();
    } catch (err) {
      toastError("Approval decision failed", errorMessage(err));
    }
  };

  if (loading) return <div className="space-y-10 lg:space-y-12"><div className="flex h-full items-center justify-center py-20"><Spinner /></div></div>;

  const items = data?.quotations || [];
  const filtered = search
    ? items.filter((i: any) => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        title="Quotation Manager"
        subtitle="Create, send, and track client quotations and proposals."
        badge="CRM Sales Hub"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 text-xs">
              <RotateCw className={"h-3.5 w-3.5" + (loading ? " animate-spin" : "")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered, "quotations")} className="gap-1.5 text-xs">
              <Download size={14} /> Export
            </Button>
            <Button size="sm" onClick={() => setIsCpqOpen(true)} className="bg-primary text-white hover:bg-primary/90 gap-1.5 text-xs shadow-sm">
              <Plus size={14} /> New Quotation (CPQ)
            </Button>
          </>
        }
      />

      <section>
        <SectionHeading label="Overview" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Quotations" value={data.summary.total_quotations} subtitle="active quotes" icon={FileText} color="var(--chart-1)" index={0} />
          <KpiCard label="Open" value={data.summary.open} subtitle="pending response" icon={Eye} color="var(--chart-2)" index={1} />
          <KpiCard label="Needs Attention" value={data.summary.overdue_at_risk} subtitle={data.summary.overdue_at_risk > 0 ? "expired quotes" : "all valid"} icon={AlertTriangle} color="var(--shell-danger)" index={2} />
          <KpiCard label="Representatives" value={data.summary.owners} subtitle="active reps" icon={Users} color="var(--chart-4)" index={3} />
        </div>
      </section>

      <section>
        <SectionHeading label="Quotation Records" />

        <Card className="hover:shadow-engineered transition-shadow duration-200">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search quotations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <Filter size={15} className="text-muted-foreground shrink-0" />
          </div>
          <QuotationTable
            quotations={filtered}
            onView={(quote) => { setAutoConvert(false); setSelectedRecord(quote); setIsDetailsOpen(true); }}
            onEdit={(quote) => { setEditRecord(quote); setIsModalOpen(true); }}
            onDelete={handleDelete}
            onFinalize={handleFinalize}
            onApprovalDecision={handleApprovalDecision}
          />
        </Card>
      </section>

      <QuotationCpqModal isOpen={isCpqOpen} onClose={() => setIsCpqOpen(false)} onSuccess={fetchData} />
      <QuotationCreateModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <QuotationDetailsModal record={selectedRecord} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecord(null); setAutoConvert(false); }} onSuccess={fetchData} initialShowForm={autoConvert ? "sales-order" : ""} />
    </div>
  );
}
