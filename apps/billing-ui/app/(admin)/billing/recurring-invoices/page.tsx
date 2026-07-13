"use client";

import { useState, useMemo, useEffect } from "react";
import { Repeat, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/components/shared/search-input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/services/api";
import type { RecurringInvoice } from "@/types/billing";
import RecurringInvoicesLoading from "./loading";

const frequencyColors: Record<string, string> = {
  weekly: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  monthly: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  quarterly: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  yearly: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

export default function RecurringInvoices() {
  const [items, setItems] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api.get<RecurringInvoice[]>("/invoices/recurring")
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const searched = q
      ? items.filter((r) =>
          r.invoice_number.toLowerCase().includes(q) ||
          r.client_name.toLowerCase().includes(q) ||
          r.frequency.toLowerCase().includes(q))
      : items;
    if (!statusFilter) return searched;
    return searched.filter((r) => r.status === statusFilter);
  }, [items, search, statusFilter]);

  if (loading) return <RecurringInvoicesLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Recurring Invoices</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Manage automated recurring billing schedules</p>
        </div>
        <Button aria-label="Create Schedule"><Plus className="h-4 w-4" /> Create Schedule</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search recurring invoices..." className="flex-1 max-w-xs" />
        <Select value={statusFilter} onValueChange={(v) => v !== null && setStatusFilter(v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title={items.length === 0 ? "No recurring schedules yet" : "No schedules match your search"}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Last Generated</TableHead>
                  <TableHead>Auto Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><span className="font-mono text-xs font-medium">{r.invoice_number}</span></TableCell>
                    <TableCell className="text-[--shell-muted]">{r.client_name}</TableCell>
                    <TableCell>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${frequencyColors[r.frequency] ?? "bg-gray-500/10 text-gray-500 border-gray-500/20"}`}>
                        {r.frequency}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{r.next_run}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{r.last_generated || "-"}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${r.auto_email ? "text-[--shell-success]" : "text-[--shell-muted]"}`}>
                        {r.auto_email ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "active" ? "default" : "secondary"} className="capitalize">{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
