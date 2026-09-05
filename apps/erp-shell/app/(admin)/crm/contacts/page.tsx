"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Search, Filter, RotateCw, Users, Mail, Phone, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";
import { exportToCSV } from "@/utils/exportCsv";
import { toastError } from "@/utils/toast";
import { useConfirm, PageHeader, KpiCard, SectionHeading, handleError } from "@datavex/ui-theme";
import ContactCreateModal from "./ContactCreateModal";
import ContactDetailsModal from "./ContactDetailsModal";
import ContactTable from "./ContactTable";

export default function ContactsPage() {
  const [data, setData] = useState({ summary: { total_contacts: 0, open: 0, overdue_at_risk: 0, owners: 0 }, contacts: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/crm/contacts");
      setData(result);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const confirm = useConfirm();

  const handleDelete = async (record: any) => {
    if (await confirm({ title: "Delete contact", message: "Are you sure you want to delete this contact?", destructive: true })) {
      try { await api.delete("/crm/contacts/" + record.id_str); fetchData(); }
      catch { toastError("Delete failed"); }
    }
  };

  if (loading) return <div className="space-y-10 lg:space-y-12"><div className="flex h-full items-center justify-center py-20"><Spinner /></div></div>;

  const items = data?.contacts || [];
  const filtered = search
    ? items.filter((i: any) => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        title="Contact Registry"
        subtitle="Manage customer contacts, communication channels, and relationship history."
        badge="CRM Sales Hub"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 text-xs">
              <RotateCw className={"h-3.5 w-3.5" + (loading ? " animate-spin" : "")} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered, "contacts")} className="gap-1.5 text-xs">
              <Download size={14} /> Export
            </Button>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-[var(--shell-brand)] text-white hover:bg-[var(--shell-brand)]/90 gap-1.5 text-xs shadow-sm">
              <Plus size={14} /> New Contact
            </Button>
          </>
        }
      />

      <section>
        <SectionHeading label="Overview" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Contacts" value={data.summary?.total_contacts ?? 0} subtitle="+4 active this week" icon={Users} color="var(--chart-1)" index={0} />
          <KpiCard label="Open Records" value={data.summary?.open ?? 0} subtitle="Active contacts" icon={Mail} color="var(--chart-2)" index={1} />
          <KpiCard label="At Risk" value={data.summary?.overdue_at_risk ?? 0} subtitle="Requires attention" icon={Phone} color="var(--shell-danger)" index={2} />
          <KpiCard label="Assigned Reps" value={data.summary?.owners ?? 0} subtitle="Active reps" icon={Building2} color="var(--chart-3)" index={3} />
        </div>
      </section>

      <section>
        <SectionHeading label="Contact Records" />

        <Card className="hover:shadow-engineered transition-shadow duration-200 border-[var(--shell-border)] bg-[var(--shell-surface)]">
          <div className="flex items-center gap-3 border-b border-[var(--shell-border)] p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-muted)]" />
              <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Filter className="h-4 w-4 text-[var(--shell-muted)]" />
          </div>
          <ContactTable
            contacts={filtered}
            onView={(rec) => { setSelectedContact(rec); setIsDetailsOpen(true); }}
            onEdit={(rec) => { setEditRecord(rec); setIsModalOpen(true); }}
            onDelete={handleDelete}
          />
        </Card>
      </section>

      <ContactCreateModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <ContactDetailsModal record={selectedContact} isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedContact(null); }} />
    </div>
  );
}
