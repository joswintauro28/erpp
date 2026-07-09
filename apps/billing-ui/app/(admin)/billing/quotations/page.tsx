"use client";

import { useState, useMemo, useEffect } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/components/shared/search-input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/services/api";
import { money, quotationStatusVariant as statusVariant } from "@/utils/format";
import type { Quotation } from "@/types/billing";

const statusOptions = ["draft", "sent", "accepted", "rejected", "expired"];

export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api.get<Quotation[]>("/invoices/quotations")
      .then(setQuotations)
      .catch(() => setQuotations([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const searched = q
      ? quotations.filter((qt) =>
          qt.quote_number.toLowerCase().includes(q) ||
          qt.client_name.toLowerCase().includes(q) ||
          qt.status.toLowerCase().includes(q))
      : quotations;
    if (!statusFilter) return searched;
    return searched.filter((qt) => qt.status === statusFilter);
  }, [quotations, search, statusFilter]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Quotations</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Create and manage client quotations</p>
        </div>
        <Button aria-label="Create Quotation"><Plus className="h-4 w-4" /> Create Quotation</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search quotations..." className="flex-1 max-w-xs" />
        <Select value={statusFilter} onValueChange={(v) => v !== null && setStatusFilter(v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={quotations.length === 0 ? "No quotations yet" : "No quotations match your search"}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Valid Until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((qt) => (
                  <TableRow key={qt.id}>
                    <TableCell><span className="font-mono text-xs font-medium">{qt.quote_number}</span></TableCell>
                    <TableCell className="text-[--shell-muted]">{qt.client_name}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(qt.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(qt.status)} className="capitalize">{qt.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{qt.issue_date}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{qt.valid_until}</TableCell>
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
