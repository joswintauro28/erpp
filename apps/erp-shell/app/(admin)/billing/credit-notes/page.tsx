"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, FileDown, Download, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchBilling, money } from "@/utils/format";
import type { CreditNote } from "@/types/billing";
import { api } from "@/services/api";

export default function CreditNotes() {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<CreditNote[]>("/invoices/credit-notes")
      .then((data) => {
        setNotes(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this credit note?")) return;
    try {
      await api.delete(`/invoices/credit-notes/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete credit note", err);
    }
  };

  const filtered = useMemo(() => searchBilling(notes, search), [notes, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Credit Notes
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Credit notes issued against invoices
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
          <Input
            placeholder="Search credit notes..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[--shell-muted]" />
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-[--shell-muted]">
                <FileDown className="h-10 w-10" />
                <p className="text-sm">No credit notes found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Note #</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="font-mono text-xs font-medium">{n.note_number}</TableCell>
                      <TableCell className="font-mono text-xs">{n.invoice_number}</TableCell>
                      <TableCell>{n.client_name}</TableCell>
                      <TableCell className="text-xs text-[--shell-muted]">{n.date}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{money(n.amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={n.status === "issued" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {n.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(n.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-[--shell-danger]" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
