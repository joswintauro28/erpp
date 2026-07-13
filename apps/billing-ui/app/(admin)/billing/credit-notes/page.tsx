"use client";

import { useState, useMemo, useEffect } from "react";
import { FileText, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/shared/search-input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/services/api";
import { money, noteStatusVariant as statusVariant } from "@/utils/format";
import type { CreditNote } from "@/types/billing";
import CreditNotesLoading from "./loading";

export default function CreditNotes() {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<CreditNote[]>("/invoices/credit-notes")
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.note_number.toLowerCase().includes(q) ||
        n.invoice_number.toLowerCase().includes(q) ||
        n.client_name.toLowerCase().includes(q),
    );
  }, [notes, search]);

  if (loading) return <CreditNotesLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">Credit Notes</h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">Manage credit notes issued against invoices</p>
        </div>
        <Button aria-label="Create Credit Note"><Plus className="h-4 w-4" /> Create Credit Note</Button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search credit notes..." className="max-w-xs" />

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={notes.length === 0 ? "No credit notes yet" : "No credit notes match your search"}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Note #</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell><span className="font-mono text-xs font-medium">{n.note_number}</span></TableCell>
                    <TableCell className="font-mono text-xs">{n.invoice_number}</TableCell>
                    <TableCell className="text-[--shell-muted]">{n.client_name}</TableCell>
                    <TableCell className="font-mono text-sm text-right">{money(n.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(n.status)} className="capitalize">{n.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{n.date}</TableCell>
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
