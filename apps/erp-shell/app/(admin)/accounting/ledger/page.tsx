"use client";

import { useState, useMemo } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/utils/format";
import type { LedgerEntry } from "@/types/accounting";

export default function GeneralLedger() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    if (!search.trim()) return ledger;
    const q = search.toLowerCase();
    return ledger.filter(
      (e) =>
        e.account_name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.voucher_number.toLowerCase().includes(q) ||
        e.voucher_type.toLowerCase().includes(q)
    );
  }, [search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [filtered, sortDir]);

  const totalDebit = sorted.reduce((s, e) => s + e.debit, 0);
  const totalCredit = sorted.reduce((s, e) => s + e.credit, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            General Ledger
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            View all journal entries across accounts
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
          <Input
            placeholder="Search entries..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
        >
          <ArrowUpDown className="mr-1.5 h-3 w-3" />
          {sortDir === "desc" ? "Newest First" : "Oldest First"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="max-w-xs">Description</TableHead>
                <TableHead>Voucher</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{e.date}</TableCell>
                  <TableCell className="text-sm font-medium">{e.account_name}</TableCell>
                  <TableCell className="text-xs text-[--shell-muted] max-w-xs truncate">{e.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {e.voucher_type}
                    </Badge>
                    <span className="ml-1.5 font-mono text-xs text-[--shell-muted]">{e.voucher_number}</span>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-right text-[--shell-success]">
                    {e.debit > 0 ? money(e.debit) : "-"}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-right text-[--shell-action]">
                    {e.credit > 0 ? money(e.credit) : "-"}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-right">{money(e.balance)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 border-[--shell-border] font-semibold">
                <TableCell colSpan={4} className="text-right text-sm text-[--shell-muted]">
                  Totals ({filtered.length} entries)
                </TableCell>
                <TableCell className="font-mono text-sm text-right text-[--shell-success]">{money(totalDebit)}</TableCell>
                <TableCell className="font-mono text-sm text-right text-[--shell-action]">{money(totalCredit)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
