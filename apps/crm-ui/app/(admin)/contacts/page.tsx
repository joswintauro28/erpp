"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Download, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";
import GenericCreateModal from "@/components/GenericCreateModal";
import GenericDetailsModal from "@/components/GenericDetailsModal";

const badgeVariant = (type: string) => {
  switch (type) {
    case "Primary": return "default";
    case "Decision": return "secondary";
    case "Influencer": return "outline";
    case "Inactive": return "destructive";
    default: return "default";
  }
};

export default function ContactsPage() {
  const [data, setData] = useState({ summary: { total_contacts: 0, open: 0, overdue_at_risk: 0, owners: 0 }, contacts: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<any>("/contacts");
      setData(result);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (record: any) => {
    if (window.confirm("Are you sure?")) {
      try { await api.delete("/contacts/" + record.id_str); fetchData(); }
      catch { alert("Delete failed"); }
    }
  };

  if (loading) return <div className="space-y-10 lg:space-y-12"><div className="flex h-full items-center justify-center py-20"><Spinner /></div></div>;

  const items = data?.contacts || [];
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

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "TOTAL CONTACTS", value: data.summary?.total_contacts, trend: "+4 this week" },
            { label: "OPEN", value: data.summary?.open, trend: "on track" },
            { label: "OVERDUE / AT RISK", value: data.summary?.overdue_at_risk, trend: "attention" },
            { label: "REPRESENTATIVES", value: data.summary?.owners, trend: "active" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-shadow">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">{m.label}</p>
              <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{m.value ?? 0}</p>
              <p className="text-xs text-[--shell-muted]">{m.trend}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">RECORDS</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export</Button>
            <Button size="sm" onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> New Contact</Button>
          </div>
        </div>

        <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
          <div className="flex items-center gap-3 border-b border-[--shell-border] p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--shell-muted]" />
              <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Filter className="h-4 w-4 text-[--shell-muted]" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>NAME</TableHead>
                  <TableHead>ROLE</TableHead>
                  <TableHead>ACCOUNT</TableHead>
                  <TableHead>EMAIL</TableHead>
                  <TableHead>PHONE</TableHead>
                  <TableHead>TYPE</TableHead>
                  <TableHead>LAST CONTACT</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-[--shell-muted] cursor-pointer" onClick={() => { setSelectedRecordForDetails(item); setIsDetailsOpen(true); }}>{item.id_str}</TableCell>
                    <TableCell className="font-medium text-[--shell-foreground] cursor-pointer" onClick={() => { setSelectedRecordForDetails(item); setIsDetailsOpen(true); }}>{item.name}</TableCell>
                    <TableCell>{item.role}</TableCell>
                    <TableCell>{item.account}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>{item.phone}</TableCell>
                    <TableCell><Badge variant={badgeVariant(item.type)}>{item.type}</Badge></TableCell>
                    <TableCell className="text-[--shell-muted]">{item.last_contact}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button className="text-[--shell-muted] hover:text-[--shell-foreground]" onClick={() => { setEditRecord(item); setIsModalOpen(true); }}>Edit</button>
                        <button className="text-[--shell-muted] hover:text-destructive" onClick={() => handleDelete(item)}>Delete</button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <GenericCreateModal entityType="contacts" entityName="Contact" isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} onSuccess={fetchData} />
      <GenericDetailsModal record={selectedRecordForDetails} entityName="Contact" isOpen={isDetailsOpen} onClose={() => { setIsDetailsOpen(false); setSelectedRecordForDetails(null); }} onSuccess={fetchData} />
    </div>
  );
}
