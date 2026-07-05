"use client";

import { useState, useMemo } from "react";
import {
  Search, Repeat, Play, Pause, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchBilling, money } from "@/utils/format";
import type { RecurringInvoice } from "@/types/billing";

const frequencyColors: Record<string, string> = {
  weekly: "var(--chart-1)",
  monthly: "var(--chart-2)",
  quarterly: "var(--chart-3)",
  yearly: "var(--chart-4)",
};

export default function RecurringInvoices() {
  const [recurring, setRecurring] = useState<RecurringInvoice[]>([]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => searchBilling(recurring, search), [recurring, search]);

  const toggleStatus = (id: number) => {
    setRecurring((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "active" ? "paused" : "active" }
          : r
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Recurring Invoices
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Manage automated recurring invoice schedules
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
          <Input
            placeholder="Search recurring invoices..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-[--shell-muted]">
              <Repeat className="h-10 w-10" />
              <p className="text-sm">No recurring schedules found</p>
            </div>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-medium">{r.invoice_number}</TableCell>
                    <TableCell>{r.client_name}</TableCell>
                    <TableCell>
                      <Badge
                        className="capitalize"
                        style={{
                          backgroundColor: `${frequencyColors[r.frequency]}15`,
                          color: frequencyColors[r.frequency],
                          borderColor: "transparent",
                        }}
                      >
                        {r.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{r.next_run}</TableCell>
                    <TableCell className="text-xs text-[--shell-muted]">{r.last_generated}</TableCell>
                    <TableCell>
                      {r.auto_email ? (
                        <span className="text-xs text-[--shell-success]">Yes</span>
                      ) : (
                        <span className="text-xs text-[--shell-muted]">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.status === "active" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => toggleStatus(r.id)}
                          title={r.status === "active" ? "Pause" : "Resume"}
                        >
                          {r.status === "active" ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        {r.status === "active" && (
                          <Button variant="ghost" size="icon-sm" title="Run Now">
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon-sm">
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
    </div>
  );
}
