"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Receipt, AlertTriangle, Plus, Loader2, Search } from "lucide-react";
import { api } from "@/services/api";
import { handleError, PageHeader } from "@datavex/ui-theme";
import { money } from "@/utils/format";
import type { AccountEntry } from "@/types/billing";
import ChartOfAccountsLoading from "./loading";

const accountTypes = ["Asset", "Liability", "Equity", "Revenue", "Expense"];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("Expense");
  const [formDesc, setFormDesc] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ accounts: AccountEntry[] }>("/accounts");
      setAccounts(d.accounts);
    } catch {
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/accounts", { code: formCode, name: formName, type: formType, description: formDesc || undefined });
      setCreateOpen(false);
      setFormCode(""); setFormName(""); setFormType("Expense"); setFormDesc("");
      load();
    } catch (err) { handleError(err); } finally { setSaving(false); }
  };

  if (loading) return <ChartOfAccountsLoading />;

  const q = search.toLowerCase();
  const filtered = q
    ? accounts.filter((a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        (a.sub_type ?? "").toLowerCase().includes(q))
    : accounts;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage your accounting accounts"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Account</Button>}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>{filtered.length} of {accounts.length} accounts</CardDescription>
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="h-8 w-8 text-muted-foreground/50" />
                      <p>{accounts.length === 0 ? "No accounts yet" : "No accounts match your search"}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((a) => (
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Account</DialogTitle></DialogHeader>
          <form className="space-y-5" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="ac-code">Account Code</Label>
              <Input id="ac-code" placeholder="e.g. 5001" required value={formCode} onChange={(e) => setFormCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ac-name">Account Name</Label>
              <Input id="ac-name" placeholder="e.g. Office Supplies" required value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ac-type">Type</Label>
              <Select value={formType} onValueChange={(v) => v !== null && setFormType(v)}>
                <SelectTrigger id="ac-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {accountTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ac-desc">Description</Label>
              <Textarea id="ac-desc" rows={2} placeholder="Optional description" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !formCode || !formName}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
