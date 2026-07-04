"use client";

import { useState, useEffect } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Input from "@/components/ui/Input";
import creditNoteService from "@/services/creditNoteService";
import { Download, Trash2, Search, FileDown } from "lucide-react";
import Link from "next/link";
import usePermission from "@/hooks/usePermission";

interface CreditNote {
  id: number;
  credit_note_number: string;
  client_name: string;
  invoice_number: string;
  invoice_id: number;
  issue_date: string;
  amount: number;
  status: string;
}

export default function CreditNotes() {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const canCreate = usePermission("invoices.create");
  const canEdit = usePermission("invoices.edit");
  const canDelete = usePermission("invoices.delete");


  const fetchNotes = async () => {
    try {
      const res = await creditNoteService.getAll();
      setNotes(res.data);
    } catch (err) {
      setError("Failed to load credit notes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this credit note? The invoice balance and stock will be restored.")) return;
    try {
      await creditNoteService.delete(id);
      fetchNotes();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      alert(axiosErr.response?.data?.detail || "Failed to delete credit note.");
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const res = await creditNoteService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `credit_note_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode!.removeChild(link);
    } catch (err) {
      alert("Failed to download PDF.");
    }
  };

  const filteredNotes = (notes || []).filter((n: CreditNote) =>
    n.credit_note_number.toLowerCase().includes(search.toLowerCase()) ||
    (n.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
    n.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page__container">
      <div className="page__header">
        <div className="page__header-info">
          <h1>Credit Notes</h1>
          <p>Manage and view all issued credit adjustments.</p>
        </div>
      </div>

      <div style={{ marginBottom: 24, display: "flex", gap: 16 }}>
        <Input
          icon={Search}
          placeholder="Search credit notes..."
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          style={{ width: 300 }}
        />
      </div>

      {error && <div className="text-destructive mb-4">{error}</div>}

      {loading ? (
        <Spinner size="lg" message="Loading credit notes..." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} style={{ textAlign: "center", padding: 32 }}>
                  <FileDown size={32} style={{ margin: "0 auto", color: "var(--muted-foreground)" }} />
                  <p style={{ marginTop: 12, color: "var(--muted-foreground)" }}>No credit notes found.</p>
                </TableCell>
              </TableRow>
            ) : (
              (filteredNotes || []).map((note: CreditNote) => (
                <TableRow key={note.id}>
                  <TableCell style={{ fontWeight: 500 }}>{note.credit_note_number}</TableCell>
                  <TableCell>
                    <Link href={`/invoices/${note.invoice_id}`} style={{ color: "var(--primary)" }}>
                      {note.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell>{note.client_name}</TableCell>
                  <TableCell>{note.issue_date}</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>Rs. {note.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={note.status === 'issued' ? 'success' : 'default'}>
                      {note.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(note.id)}>
                        <Download size={16} />
                      </Button>
                      {canDelete && <Button variant="ghost" size="sm" onClick={() => handleDelete(note.id)} style={{ color: "var(--destructive)" }}>
                        <Trash2 size={16} />
                      </Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
