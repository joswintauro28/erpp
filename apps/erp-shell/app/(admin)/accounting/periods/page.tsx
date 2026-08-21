"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Lock, Unlock, Calendar } from "lucide-react";
import { api } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [reopenId, setReopenId] = useState<number | null>(null);
  const [reopenReason, setReopenReason] = useState("");

  const load = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        api.get<{ periods: any[] }>("/periods"),
        api.get<any>("/periods/status"),
      ]);
      setPeriods(pRes.periods);
      setStatus(sRes);
    } catch {
      setError("Failed to load fiscal periods");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClose = async (id: number) => {
    setActionLoading(id);
    try { await api.post(`/periods/${id}/close`, {}); load(); }
    catch { } finally { setActionLoading(null); }
  };

  const handleReopen = async (id: number) => { setReopenId(id); setReopenReason(""); };

  const handleReopenConfirm = async () => {
    if (reopenId === null) return;
    setActionLoading(reopenId);
    try {
      await api.post(`/periods/${reopenId}/reopen-request`, { reason: reopenReason || "Reopening period" });
      setReopenId(null);
      load();
    } catch { } finally { setActionLoading(null); }
  };

  if (loading) {
    return <div className="flex h-60 items-center justify-center"><Loader2 size={24} className="animate-spin text-[var(--shell-accent)]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--shell-foreground)]">Fiscal Periods</h1>
        <p className="text-sm text-[var(--shell-muted)] mt-1">Manage month-end close process</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{error}</span>
        </div>
      )}

      {status && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[var(--shell-muted)]">Current Month</p>
            <p className="font-heading text-lg font-semibold text-[var(--shell-foreground)] mt-1">{status.current_month}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[var(--shell-muted)]">Last Closed</p>
            <p className="font-heading text-lg font-semibold text-[var(--shell-foreground)] mt-1">{status.last_closed_period?.label ?? status.last_closed_period ?? "None"}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-xs text-[var(--shell-muted)]">Open Periods</p>
            <p className="font-heading text-lg font-semibold text-[var(--shell-foreground)] mt-1">{status.total_open}</p>
          </CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-[var(--shell-muted)]" />
            Periods
          </CardTitle>
          <CardDescription>Fiscal periods and their close status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Closed At</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-[var(--shell-muted)] py-8 text-sm">No fiscal periods found</TableCell></TableRow>
              ) : periods.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs font-medium">{p.label}</TableCell>
                  <TableCell className="text-xs font-mono">{p.start_date}</TableCell>
                  <TableCell className="text-xs font-mono">{p.end_date}</TableCell>
                  <TableCell>
                    {p.is_closed ? (
                      <Badge variant="default" className="text-xs gap-1"><Lock className="h-3 w-3" /> Closed</Badge>
                    ) : (
                      <Badge variant="neutral" className="text-xs gap-1"><Unlock className="h-3 w-3" /> Open</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--shell-muted)]">{p.closed_at ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {p.is_closed ? (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => handleReopen(p.id)} disabled={actionLoading === p.id}>
                        {actionLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Reopen
                      </Button>
                    ) : (
                      <Button size="sm" className="text-xs" onClick={() => handleClose(p.id)} disabled={actionLoading === p.id}>
                        {actionLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Close Period
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={reopenId !== null} onOpenChange={(open) => { if (!open) setReopenId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reopen Fiscal Period</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-[var(--shell-muted)]">Provide a reason for reopening this period.</p>
            <Textarea placeholder="Enter reason for reopening..." className="text-xs min-h-[80px]" value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setReopenId(null)}>Cancel</Button>
            <Button size="sm" className="text-xs" onClick={handleReopenConfirm} disabled={actionLoading === reopenId}>
              {actionLoading === reopenId ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Submit Reopen Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
