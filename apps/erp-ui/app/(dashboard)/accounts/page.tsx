"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { Plus, Search, Edit, Trash2, PowerOff, Power } from "lucide-react";
import usePermission from "@/hooks/usePermission";
import accountService from "@/services/accountService";

const emptyForm = {
  account_code: "",
  account_name: "",
  account_type: "Asset",
  account_category: "",
  description: "",
  opening_balance: 0,
  currency: "INR",
  is_active: true
};

const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Income", "Expense"];

interface Account {
  id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  account_category?: string;
  description?: string;
  opening_balance?: number;
  currency?: string;
  is_active: boolean;
  is_system?: boolean;
}

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [filters, setFilters] = useState({ search: "", account_type: "", is_active: "" });

  const canCreate = usePermission("accounting.create");
  const canEdit = usePermission("accounting.edit");
  const canDelete = usePermission("accounting.delete");

  const fetchAccounts = async (nextFilters = filters, isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const params: Record<string, string | undefined> = { ...nextFilters };
      if (params.account_type === "") delete params.account_type;
      if (params.is_active === "") delete params.is_active;
      const res = await accountService.getAll(params);
      setAccounts(res.data.data || []);
      setError("");
    } catch {
      setError("Failed to load accounts.");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts(filters, true);
  }, []);

  const updateFilter = (key: string, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    fetchAccounts(next, false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (acc: Account) => {
    setEditing(acc);
    setForm({
      account_code: acc.account_code,
      account_name: acc.account_name,
      account_type: acc.account_type,
      account_category: acc.account_category || "",
      description: acc.description || "",
      opening_balance: acc.opening_balance || 0,
      currency: acc.currency || "INR",
      is_active: acc.is_active
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await accountService.update(editing.id, form);
        setSuccess("Account updated successfully.");
      } else {
        await accountService.create(form);
        setSuccess("Account created successfully.");
      }
      setModalOpen(false);
      fetchAccounts();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to save account.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (acc: Account) => {
    if (!window.confirm(`Are you sure you want to ${acc.is_active ? 'deactivate' : 'activate'} this account?`)) return;
    try {
      await accountService.update(acc.id, { is_active: !acc.is_active });
      fetchAccounts();
      setSuccess("Account status updated.");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to update status.");
    }
  };

  const handleDelete = async (acc: Account) => {
    if (acc.is_system) {
      alert("System accounts cannot be deleted.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this account? Deactivation is recommended if it has history.")) return;
    try {
      await accountService.delete(acc.id);
      fetchAccounts();
      setSuccess("Account deleted successfully.");
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to delete account.");
    }
  };

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Chart of Accounts</h1>
          <p>Manage your general ledger accounts for bookkeeping</p>
        </div>
        {canCreate && <Button variant="primary" onClick={openCreate}><Plus size={16} /> Add Account</Button>}
      </div>

      <div className="page__toolbar">
        <Input icon={Search} placeholder="Search code or name..." value={filters.search} onChange={(e: any) => updateFilter("search", e.target.value)} />
        <Select label="Type" value={filters.account_type} onChange={(e: any) => updateFilter("account_type", e.target.value)} placeholder="All Types" options={ACCOUNT_TYPES.map((t: any) => ({ value: t, label: t }))} />
        <Select label="Status" value={filters.is_active} onChange={(e: any) => updateFilter("is_active", e.target.value)} placeholder="All Statuses" options={[{ value: "true", label: "Active Only" }, { value: "false", label: "Inactive Only" }]} />
      </div>

      {error && <div className="page__error">{error}</div>}
      {success && <div className="page__success">{success}</div>}

      <Card>
        <CardContent>
          {loading ? (
            <div style={{ padding: '40px 0' }}><Spinner size="lg" message="Loading accounts..." /></div>
          ) : accounts.length === 0 ? (
            <div className="page__empty"><p>No accounts found.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc: Account) => (
                  <TableRow key={acc.id} style={{ opacity: acc.is_active ? 1 : 0.6 }}>
                    <TableCell><strong>{acc.account_code}</strong></TableCell>
                    <TableCell>{acc.account_name}</TableCell>
                    <TableCell>{acc.account_type}</TableCell>
                    <TableCell>{acc.account_category || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={acc.is_active ? "success" : "secondary"}>
                        {acc.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {acc.is_system && <Badge variant="secondary">System</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="page__actions">
                        {canEdit && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(acc)} title="Edit">
                              <Edit size={15} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(acc)} title={acc.is_active ? "Deactivate" : "Activate"}>
                              {acc.is_active ? <PowerOff size={15} /> : <Power size={15} />}
                            </Button>
                          </>
                        )}
                        {canDelete && !acc.is_system && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(acc)} title="Delete">
                            <Trash2 size={15} color="var(--destructive)" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Account" : "Add Account"} size="default">
        <form onSubmit={handleSave} className="form-grid">
          <Input 
            label="Account Code" 
            value={form.account_code} 
            onChange={(e: any) => setForm({ ...form, account_code: e.target.value })} 
            required 
            disabled={editing?.is_system}
            title={editing?.is_system ? "System account codes cannot be changed." : ""}
          />
          <Input 
            label="Account Name" 
            value={form.account_name} 
            onChange={(e: any) => setForm({ ...form, account_name: e.target.value })} 
            required 
          />
          <Select 
            label="Account Type" 
            value={form.account_type} 
            onChange={(e: any) => setForm({ ...form, account_type: e.target.value })} 
            options={ACCOUNT_TYPES.map((t: any) => ({ value: t, label: t }))} 
            required 
          />
          <Input 
            label="Category (Optional)" 
            value={form.account_category} 
            onChange={(e: any) => setForm({ ...form, account_category: e.target.value })} 
            placeholder="e.g. Current Asset"
          />
          <Input 
            label="Opening Balance" 
            type="number" 
            step="0.01" 
            value={form.opening_balance} 
            onChange={(e: any) => setForm({ ...form, opening_balance: parseFloat(e.target.value) || 0 })} 
          />
          <Input 
            label="Description" 
            value={form.description} 
            onChange={(e: any) => setForm({ ...form, description: e.target.value })} 
          />
          <div className="form-actions">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Save Account"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
