import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import clientService from "../services/clientService";
import { Card, CardContent } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import usePermission from "../hooks/usePermission";
import { Plus, Search, Edit, Trash2, Users, Eye } from "lucide-react";
import "./Clients.css";

const emptyForm = { name: "", email: "", phone: "", address: "", gst_number: "", state: "", website: "", industry: "", notes: "" };

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", state: "", has_gst: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canCreate = usePermission("clients.create");
  const canEdit = usePermission("clients.edit");
  const canDelete = usePermission("clients.delete");


  const fetchClients = async (nextFilters = filters, isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const params = { limit: 100, skip: 0, ...nextFilters };
      if (params.has_gst === "") delete params.has_gst;
      const res = await clientService.getAll(params);
      setClients(res.data.data || []);
      setError("");
    } catch { setError("Failed to load clients"); }
    finally { if (isInitial) setLoading(false); }
  };

  useEffect(() => { fetchClients(filters, true); }, []);

  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    fetchClients(next, false);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...emptyForm, ...c }); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await clientService.update(editing.id, form);
      else await clientService.create(form);
      setModalOpen(false);
      fetchClients();
    } catch (err) { setError(err.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this client?")) return;
    try { await clientService.delete(id); fetchClients(); }
    catch { setError("Delete failed. Remove related invoices first if this client is in use."); }
  };



  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Clients</h1>
          <p>Manage client profiles, GST details, and billing history</p>
        </div>
        {canCreate && <Button variant="primary" onClick={openCreate}><Plus size={16} /> Add Client</Button>}
      </div>

      <div className="page__toolbar">
        <Input icon={Search} placeholder="Search name, email, phone, GST..." value={filters.search} onChange={(e) => updateFilter("search", e.target.value)} />
        <Input label="State" placeholder="Filter state" value={filters.state} onChange={(e) => updateFilter("state", e.target.value)} />
        <Select label="GST" value={filters.has_gst} onChange={(e) => updateFilter("has_gst", e.target.value)} options={[{ value: "true", label: "GST clients" }, { value: "false", label: "No GST" }]} placeholder="All clients" />
      </div>

      {error && <div className="page__error">{error}</div>}

      <Card>
        <CardContent>
          {loading ? (
            <div style={{ padding: '40px 0' }}><Spinner size="lg" message="Loading clients..." /></div>
          ) : clients.length === 0 ? (
            <div className="page__empty"><Users size={48} /><p>No clients found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(clients || []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.email || "-"}</TableCell>
                    <TableCell>{c.phone || "-"}</TableCell>
                    <TableCell>{c.gst_number || "-"}</TableCell>
                    <TableCell>{c.state || "-"}</TableCell>
                    <TableCell>
                      <div className="page__actions">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/clients/${c.id}`)}><Eye size={15} /></Button>
                        {canEdit && <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit size={15} /></Button>}
                        {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 size={15} color="var(--destructive)" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Client" : "Add Client"} size="lg">
        <form onSubmit={handleSave} className="form-grid two">
          <Input label="Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="GST Number" value={form.gst_number || ""} onChange={(e) => setForm({ ...form, gst_number: e.target.value.toUpperCase() })} />
          <Input label="State" value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <Input label="Address" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="Website" value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <Input label="Industry" value={form.industry || ""} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          <Input label="Notes" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="form-actions">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
