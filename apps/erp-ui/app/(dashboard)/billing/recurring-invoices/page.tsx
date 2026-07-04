"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import recurringInvoiceService from "@/services/recurringInvoiceService";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { Trash2, Search, Play, Pause, FastForward } from "lucide-react";

const freqColor: Record<string, string> = {
  weekly: "var(--primary)",
  monthly: "var(--purple-600)",
  quarterly: "var(--teal-600)",
  yearly: "var(--orange-600)"
};

export default function RecurringInvoices() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSchedules = async () => {
    try {
      const res = await recurringInvoiceService.getAll();
      setSchedules(res.data.data || []);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to load recurring invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handlePauseResume = async (id: any, isActive: any) => {
    try {
      if (isActive) {
        await recurringInvoiceService.pause(id);
        setSuccess("Schedule paused");
      } else {
        await recurringInvoiceService.resume(id);
        setSuccess("Schedule resumed");
      }
      fetchSchedules();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to update schedule");
    }
  };

  const handleDelete = async (id: any) => {
    if (!window.confirm("Are you sure you want to delete this recurring schedule?")) return;
    try {
      await recurringInvoiceService.delete(id);
      setSuccess("Schedule deleted");
      fetchSchedules();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to delete schedule");
    }
  };

  const handleRunNow = async (id: any) => {
    if (!window.confirm("This will immediately generate an invoice and recalculate the next run date. Continue?")) return;
    try {
      await recurringInvoiceService.runNow(id);
      setSuccess("Invoice generated successfully");
      fetchSchedules();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to run schedule");
    }
  };

  const filtered = (schedules || []).filter((s: any) =>
    s.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Recurring Invoices</h1>
          <p>Manage automated recurring billing schedules</p>
        </div>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <CardContent style={{ display: 'flex', gap: 16, padding: '16px' }}>
          <Input
            icon={Search}
            placeholder="Search by invoice number or client..."
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            style={{ width: 300, margin: 0 }}
          />
        </CardContent>
      </Card>

      {error && <div style={{ color: "var(--destructive)", marginBottom: 16 }}>{error}</div>}
      {success && <div className="settings__success">{success}</div>}

      <Card>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}><Spinner size="lg" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Auto Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead style={{ textAlign: "right" }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
                    No recurring schedules found. To create one, go to an Invoice and click "Make Recurring".
                  </TableCell>
                </TableRow>
              ) : (
                (filtered || []).map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/billing/invoices/${s.invoice_id}`} style={{ fontWeight: 500, color: "var(--primary)", textDecoration: "none" }}>
                        {s.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>{s.client_name}</TableCell>
                    <TableCell>
                      <span style={{ color: freqColor[s.frequency], fontWeight: 600, textTransform: 'capitalize' }}>
                        {s.frequency}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div style={{ fontWeight: 500 }}>{s.next_run_date}</div>
                      {s.last_generated_at && <div style={{ fontSize: 11, color: "var(--muted)" }}>Last: {new Date(s.last_generated_at).toLocaleDateString()}</div>}
                    </TableCell>
                    <TableCell>{s.auto_email ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "success" : "secondary"}>
                        {s.is_active ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell style={{ textAlign: "right" }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button variant="outline" size="sm" onClick={() => handleRunNow(s.id)} title="Run Now">
                          <FastForward size={14} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePauseResume(s.id, s.is_active)} title={s.is_active ? "Pause" : "Resume"}>
                          {s.is_active ? <Pause size={14} /> : <Play size={14} />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(s.id)} title="Delete" style={{ color: "var(--destructive)" }}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
