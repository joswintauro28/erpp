"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Receipt, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { money } from "@/utils/format";
import type { AccountEntry } from "@/types/billing";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const d = await api.get<{ accounts: AccountEntry[] }>("/accounts");
        setAccounts(d.accounts);
      } catch {
        setError("Failed to load accounts");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Chart of Accounts</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your accounting accounts</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>All chart of accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sub Type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="h-8 w-8 text-muted-foreground/50" />
                      <p>No accounts yet</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.code}</TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{a.type}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.sub_type ?? "-"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{money(a.balance)}</TableCell>
                  <TableCell>
                    <Badge variant={a.is_active ? "default" : "secondary"} className="text-xs">
                      {a.is_active ? "Active" : "Inactive"}
                    </Badge>
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
