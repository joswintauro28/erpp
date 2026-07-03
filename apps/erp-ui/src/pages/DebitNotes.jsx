import { useState, useEffect } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import Input from "../components/ui/Input";
import debitNoteService from "../services/debitNoteService";
import { Download, Trash2, Search, FileUp } from "lucide-react";
import { Link } from "react-router-dom";
import usePermission from "../hooks/usePermission";

export default function DebitNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const canCreate = usePermission("invoices.create");
  const canEdit = usePermission("invoices.edit");
  const canDelete = usePermission("invoices.delete");


  const fetchNotes = async () => {
    try {
      const res = await debitNoteService.getAll();
      setNotes(res.data);
    } catch (err) {
      setError("Failed to load debit notes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this debit note? The invoice balance will be adjusted.")) return;
    try {
      await debitNoteService.delete(id);
      fetchNotes();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete debit note.");
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await debitNoteService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `debit_note_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Failed to download PDF.");
    }
  };

  const filteredNotes = (notes || []).filter(n =>
    n.debit_note_number.toLowerCase().includes(search.toLowerCase()) ||
    (n.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
    n.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page__container">
      <div className="page__header">
        <div className="page__header-info">
          <h1>Debit Notes</h1>
          <p>Manage and view all issued debit adjustments.</p>
        </div>
      </div>

      <div style={{ marginBottom: 24, display: "flex", gap: 16 }}>
        <Input
          icon={Search}
          placeholder="Search debit notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
        />
      </div>

      {error && <div className="text-destructive mb-4">{error}</div>}

      {loading ? (
        <Spinner size="lg" message="Loading debit notes..." />
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
                  <FileUp size={32} style={{ margin: "0 auto", color: "var(--muted-foreground)" }} />
                  <p style={{ marginTop: 12, color: "var(--muted-foreground)" }}>No debit notes found.</p>
                </TableCell>
              </TableRow>
            ) : (
              (filteredNotes || []).map((note) => (
                <TableRow key={note.id}>
                  <TableCell style={{ fontWeight: 500 }}>{note.debit_note_number}</TableCell>
                  <TableCell>
                    <Link to={`/invoices/${note.invoice_id}`} style={{ color: "var(--primary)" }}>
                      {note.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell>{note.client_name}</TableCell>
                  <TableCell>{note.issue_date}</TableCell>
                  <TableCell style={{ fontWeight: 600 }}>Rs. {note.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={note.status === 'issued' ? 'warning' : 'default'}>
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
