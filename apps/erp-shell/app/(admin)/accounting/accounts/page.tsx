"use client";

import { useState, ChangeEvent } from "react";
import { Search, Plus, Pencil, Power, PowerOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { money } from "@/utils/format";
import type { Account } from "@/types/accounting";

const typeColors: Record<string, string> = {
  Asset: "var(--chart-1)",
  Liability: "var(--chart-2)",
  Equity: "var(--chart-3)",
  Income: "var(--chart-4)",
  Expense: "var(--chart-5)",
};

const typeBalances = (type: string, accounts: Account[]) => {
  const filtered = accounts.filter((a) => a.type === type && a.is_active);
  const total = filtered.reduce((s, a) => s + a.current_balance, 0);
  return { count: filtered.length, total };
};

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const filtered = accounts.filter((a) => {
    const matchSearch =
      !search.trim() ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.includes(search) ||
      a.group.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || a.type === typeFilter;
    return matchSearch && matchType;
  });

  const totals = accounts.reduce(
    (s, a) => {
      if (!a.is_active) return s;
      s[a.type] += a.current_balance;
      return s;
    },
    { Asset: 0, Liability: 0, Equity: 0, Income: 0, Expense: 0 } as Record<string, number>
  );

  const toggleActive = (id: number) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Chart of Accounts
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Manage your accounting chart of accounts
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Account
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {(["Asset", "Liability", "Equity", "Income", "Expense"] as const).map((type) => {
          const info = typeBalances(type, accounts);
          return (
            <Card
              key={type}
              className={`cursor-pointer transition-all hover:shadow-md ${typeFilter === type ? "ring-2 ring-[--shell-action]" : ""}`}
              onClick={() => setTypeFilter(typeFilter === type ? "" : type)}
            >
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium tracking-wide" style={{ color: typeColors[type] }}>
                  {type}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="font-mono text-sm font-semibold text-[--shell-foreground]">{money(info.total)}</p>
                <p className="text-xs text-[--shell-muted]">{info.count} accounts</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b border-[--shell-border] p-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
              <Input
                placeholder="Search by name, code, or group..."
                className="pl-8"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />
            </div>
            {typeFilter && (
              <Badge variant="secondary" className="gap-1">
                {typeFilter}
                <button className="ml-1 text-[--shell-muted] hover:text-[--shell-foreground]" onClick={() => setTypeFilter("")}>×</button>
              </Badge>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Opening</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: typeColors[a.type] }}
                      />
                      <span className="text-sm font-medium">{a.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-[--shell-muted]">{a.group}</TableCell>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">{money(a.opening_balance)}</TableCell>
                  <TableCell className={`font-mono text-sm text-right ${a.current_balance < 0 ? "text-[--shell-danger]" : "text-[--shell-foreground]"}`}>
                    {money(Math.abs(a.current_balance))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.is_active ? "default" : "secondary"} className="capitalize text-xs">
                      {a.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => toggleActive(a.id)}>
                        {a.is_active ? (
                          <PowerOff className="h-3 w-3 text-[--shell-muted]" />
                        ) : (
                          <Power className="h-3 w-3 text-[--shell-success]" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
