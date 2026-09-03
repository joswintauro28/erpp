"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BookOpen, AlertTriangle, Plus, Loader2, Search, Pencil } from "lucide-react";
import { api } from "@/services/api";
import { handleError, PageHeader } from "@datavex/ui-theme";
import { money } from "@/utils/format";
import type { LedgerEntryView, AccountEntry } from "@/types/billing";
import GeneralLedgerLoading from "./loading";

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntryView[]>([]);
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [journalOpen, setJournalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [formAccountId, setFormAccountId] = useState("");
  const [formDebit, setFormDebit] = useState("");
  const [formCredit, setFormCredit] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");

  const load = useCallback(async () => {
    try {
      const [ledgerData, accData] = await Promise.all([
        api.get<{ ledger: LedgerEntryView[] }>("/ledger"),
        api.get<{ accounts: AccountEntry[] }>("/accounts"),
      ]);
      setEntries(ledgerData.ledger);
      setAccounts(accData.accounts);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/ledger", {
        account_id: Number(formAccountId),
        debit: Number(formDebit) || 0,
        credit: Number(formCredit) || 0,
        description: formDesc || "Manual journal entry",
        entry_date: formDate || undefined,
      });
      setJournalOpen(false);
      setFormAccountId(""); setFormDebit(""); setFormCredit(""); setFormDesc(""); setFormDate("");
      load();
    } catch (err) { handleError(err); } finally { setSaving(false); }
  };

  const handleEditClick = (entry: LedgerEntryView) => {
    setEditId(entry.id);
    setFormAccountId(String(entry.account_code));
    setFormDebit(String(entry.debit > 0 ? entry.debit : ""));
    setFormCredit(String(entry.credit > 0 ? entry.credit : ""));
    setFormDesc(entry.description);
    setFormDate(entry.entry_date);
    setEditOpen(true);
  };

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId === null) return;
    setSaving(true);
    try {
      await api.put(`/ledger/${editId}`, {
        account_id: Number(formAccountId),
        debit: Number(formDebit) || 0,
        credit: Number(formCredit) || 0,
        description: formDesc || "Updated journal entry",
        entry_date: formDate || undefined,
      });
      setEditOpen(false);
      setEditId(null);
      setFormAccountId(""); setFormDebit(""); setFormCredit(""); setFormDesc(""); setFormDate("");
      load();
    } catch (err) { handleError(err); } finally { setSaving(false); }
  };

  if (loading) return <GeneralLedgerLoading />;

  const q = search.toLowerCase();
  const filtered = q
    ? entries.filter((e) =>
        e.account_name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.reference_type ?? "").toLowerCase().includes(q) ||
        e.entry_date.includes(q))
    : entries;

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Ledger"
        subtitle="View account transactions and balances"
        actions={<Button onClick={() => setJournalOpen(true)}><Plus className="h-4 w-4" /> Manual Journal</Button>}
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
          placeholder="Search ledger entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
          <CardDescription>{filtered.length} of {entries.length} entries</CardDescription>
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
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                      <p>{entries.length === 0 ? "No ledger entries yet" : "No entries match your search"}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{e.entry_date}</TableCell>
                  <TableCell className="text-xs font-medium">{e.account_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.description}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-destructive">{e.debit > 0 ? money(e.debit) : "-"}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-[var(--shell-success)]">{e.credit > 0 ? money(e.credit) : "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.reference_type ? `${e.reference_type}#${e.reference_id}` : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => handleEditClick(e)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={journalOpen} onOpenChange={setJournalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manual Journal Entry</DialogTitle></DialogHeader>
          <form className="space-y-5" onSubmit={handleCreateJournal}>
            <div className="space-y-2">
              <Label htmlFor="jl-account">Account</Label>
              <Select value={formAccountId} onValueChange={(v) => v !== null && setFormAccountId(v)}>
                <SelectTrigger id="jl-account"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jl-debit">Debit (₹)</Label>
                <Input id="jl-debit" type="number" min={0} step={0.01} placeholder="0.00" value={formDebit} onChange={(e) => setFormDebit(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jl-credit">Credit (₹)</Label>
                <Input id="jl-credit" type="number" min={0} step={0.01} placeholder="0.00" value={formCredit} onChange={(e) => setFormCredit(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jl-desc">Description</Label>
              <Textarea id="jl-desc" rows={2} placeholder="Journal entry description" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jl-date">Date</Label>
              <Input id="jl-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setJournalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !formAccountId || (!formDebit && !formCredit)}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Journal Entry</DialogTitle></DialogHeader>
          <form className="space-y-5" onSubmit={handleUpdateEntry}>
            <div className="space-y-2">
              <Label htmlFor="jl-edit-account">Account</Label>
              <Select value={formAccountId} onValueChange={(v) => v !== null && setFormAccountId(v)}>
                <SelectTrigger id="jl-edit-account"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jl-edit-debit">Debit (₹)</Label>
                <Input id="jl-edit-debit" type="number" min={0} step={0.01} placeholder="0.00" value={formDebit} onChange={(e) => setFormDebit(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jl-edit-credit">Credit (₹)</Label>
                <Input id="jl-edit-credit" type="number" min={0} step={0.01} placeholder="0.00" value={formCredit} onChange={(e) => setFormCredit(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jl-edit-desc">Description</Label>
              <Textarea id="jl-edit-desc" rows={2} placeholder="Journal entry description" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jl-edit-date">Date</Label>
              <Input id="jl-edit-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving || !formAccountId || (!formDebit && !formCredit)}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Update Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
