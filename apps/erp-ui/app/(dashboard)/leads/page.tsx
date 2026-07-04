"use client";

import { useEffect, useState } from "react";
import leadService from "@/services/leadService";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import usePermission from "@/hooks/usePermission";
import { Plus, Edit, Trash2, UserPlus, Search, CheckCircle } from "lucide-react";
import "@/app/(dashboard)/_styles/Clients.css";

const emptyForm = { company_name: "", contact_person: "", email: "", phone: "", status: "New", lead_score: "0", assigned_to: "", source: "Website", expected_value: "0", notes: "", gst_number: "", state: "", address: "", website: "", industry: "" };
interface Lead {
  id: number;
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  status: string;
  lead_score: number;
  assigned_to?: string;
  source: string;
  expected_value: number;
  notes?: string;
  gst_number?: string;
  state?: string;
  address?: string;
  website?: string;
  industry?: string;
  converted_client_id?: number;
}

const statusOptions = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"].map((s: string) => ({ value: s, label: s }));
const sourceOptions = ["Website", "Referral", "Social Media", "Email", "Cold Call", "Other"].map((s: string) => ({ value: s, label: s }));
const money = (v: number | string | undefined | null) => `Rs.${Number(v || 0).toLocaleString()}`;
const statusVariant = (s: string) => s === "Won" || s === "Qualified" ? "success" : s === "Proposal" ? "warning" : s === "Lost" ? "destructive" : "secondary";
const scoreColor = (score: number) => score >= 70 ? "#16a34a" : score >= 40 ? "#ca8a04" : "#dc2626";

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, number | string>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", status: "", source: "", min_score: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canCreate = usePermission("clients.create");
  const canEdit = usePermission("clients.edit");
  const canDelete = usePermission("clients.delete");


  const fetchLeads = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const [leadRes, analyticsRes] = await Promise.all([leadService.getAll(nextFilters), leadService.getAnalytics()]);
      setLeads(leadRes.data.data || []);
      setAnalytics(analyticsRes.data.data || {});
      setError("");
    } catch { setError("Failed to load leads"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeads(); }, []);
  const updateFilter = (key: string, value: string) => { const next = { ...filters, [key]: value }; setFilters(next); fetchLeads(next); };
  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (l: Lead) => { setEditing(l); setForm({ ...emptyForm, ...l, lead_score: String(l.lead_score || 0), expected_value: String(l.expected_value || 0) }); setModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, lead_score: parseInt(form.lead_score, 10), expected_value: parseFloat(form.expected_value || "0") };
      if (editing) await leadService.update(editing.id, payload);
      else await leadService.create(payload);
      setModalOpen(false);
      fetchLeads();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Save failed");
    }
    finally { setSaving(false); }
  };

  const handleConvert = async (lead: Lead) => {
    if (!window.confirm(`Convert ${lead.company_name} to a client?`)) return;
    try { await leadService.convert(lead.id, { phone: lead.phone }); fetchLeads(); }
    catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Conversion failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this lead?")) return;
    try { await leadService.delete(id); fetchLeads(); }
    catch { setError("Delete failed"); }
  };

  if (loading) return <Spinner size="lg" message="Loading leads..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info"><h1>Leads</h1><p>Manage pipeline, lead scoring, and conversions</p></div>
        {canCreate && <Button variant="primary" onClick={openCreate}><Plus size={16} /> Add Lead</Button>}
      </div>

      <div className="page__grid">
        <Card><CardContent><div className="page__metric">Total Leads<strong>{analytics.total_leads || 0}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">Conversion Rate<strong>{analytics.conversion_rate || 0}%</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">Avg Score<strong>{Number(analytics.average_score || 0).toFixed(1)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">Pipeline Value<strong>{money(analytics.pipeline_value)}</strong></div></CardContent></Card>
      </div>

      <div className="page__toolbar">
        <Input icon={Search} placeholder="Search leads..." value={filters.search} onChange={(e: any) => updateFilter("search", e.target.value)} />
        <Select label="Status" value={filters.status} onChange={(e: any) => updateFilter("status", e.target.value)} options={statusOptions} placeholder="All statuses" />
        <Select label="Source" value={filters.source} onChange={(e: any) => updateFilter("source", e.target.value)} options={sourceOptions} placeholder="All sources" />
        <Input label="Min Score" type="number" min="0" max="100" value={filters.min_score} onChange={(e: any) => updateFilter("min_score", e.target.value)} />
      </div>

      {error && <div className="page__error">{error}</div>}

      <Card>
        <CardContent>
          {leads.length === 0 ? (
            <div className="page__empty"><UserPlus size={48} /><p>No leads found</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Score</TableHead><TableHead>Value</TableHead><TableHead>Source</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {(leads || []).map((l: Lead) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.company_name}</TableCell><TableCell>{l.contact_person}</TableCell><TableCell>{l.email}</TableCell><TableCell><Badge variant={statusVariant(l.status)}>{l.status}</Badge></TableCell>
                    <TableCell><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: scoreColor(l.lead_score) }} />{l.lead_score}</span></TableCell>
                    <TableCell>{money(l.expected_value)}</TableCell><TableCell>{l.source}</TableCell>
                    <TableCell><div className="page__actions">{canEdit && <Button variant="ghost" size="icon" onClick={() => openEdit(l)}><Edit size={15} /></Button>}<Button variant="ghost" size="icon" onClick={() => handleConvert(l)} disabled={!!l.converted_client_id} title="Convert"><CheckCircle size={15} /></Button>{canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)}><Trash2 size={15} color="var(--destructive)" /></Button>}</div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Lead" : "Add Lead"} size="lg">
        <form onSubmit={handleSave} className="form-grid two">
          <Input label="Company Name" value={form.company_name} onChange={(e: any) => setForm({ ...form, company_name: e.target.value })} required />
          <Input label="Contact Person" value={form.contact_person} onChange={(e: any) => setForm({ ...form, contact_person: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Phone" value={form.phone || ""} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })} options={statusOptions} />
          <Input label="Lead Score" type="number" min="0" max="100" value={form.lead_score} onChange={(e: any) => setForm({ ...form, lead_score: e.target.value })} required />
          <Input label="Assigned To" value={form.assigned_to || ""} onChange={(e: any) => setForm({ ...form, assigned_to: e.target.value })} />
          <Select label="Source" value={form.source} onChange={(e: any) => setForm({ ...form, source: e.target.value })} options={sourceOptions} />
          <Input label="Expected Value" type="number" min="0" step="0.01" value={form.expected_value} onChange={(e: any) => setForm({ ...form, expected_value: e.target.value })} />
          <Input label="GST Number" value={form.gst_number || ""} onChange={(e: any) => setForm({ ...form, gst_number: e.target.value })} />
          <Input label="State" value={form.state || ""} onChange={(e: any) => setForm({ ...form, state: e.target.value })} />
          <Input label="Address" value={form.address || ""} onChange={(e: any) => setForm({ ...form, address: e.target.value })} />
          <Input label="Website" value={form.website || ""} onChange={(e: any) => setForm({ ...form, website: e.target.value })} />
          <Input label="Industry" value={form.industry || ""} onChange={(e: any) => setForm({ ...form, industry: e.target.value })} />
          <Input label="Notes" value={form.notes || ""} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} />
          <div className="form-actions"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
