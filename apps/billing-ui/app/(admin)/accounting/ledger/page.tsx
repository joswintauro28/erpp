"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { BookOpen, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { money } from "@/utils/format";
import type { LedgerEntryView } from "@/types/billing";
import GeneralLedgerLoading from "./loading";

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const d = await api.get<{ ledger: LedgerEntryView[] }>("/ledger");
        setEntries(d.ledger);
      } catch {
        setError("Failed to load ledger entries");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) return <GeneralLedgerLoading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">General Ledger</h1>
        <p className="text-sm text-muted-foreground mt-1">View account transactions and balances</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
          <CardDescription>All journal entries</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                      <p>No ledger entries yet</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{e.entry_date}</TableCell>
                  <TableCell className="text-xs font-medium">{e.account_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.description}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-destructive">{e.debit > 0 ? money(e.debit) : "-"}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-emerald-600">{e.credit > 0 ? money(e.credit) : "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.reference_type ? `${e.reference_type}#${e.reference_id}` : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
