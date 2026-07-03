import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Select from "../components/ui/Select";
import Spinner from "../components/ui/Spinner";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import expenseService from "../services/expenseService";
import usePermission from "../hooks/usePermission";

const categories = [
  { value: "Direct Materials", label: "Direct Materials (COGS)" },
  { value: "Direct Labor", label: "Direct Labor (COGS)" },
  { value: "Payroll", label: "Payroll" },
  { value: "Rent", label: "Rent & Utilities" },
  { value: "Software", label: "Software & Technology" },
  { value: "Marketing", label: "Marketing & Advertising" },
  { value: "Office Supplies", label: "Office Expenses" },
  { value: "Travel", label: "Travel" },
  { value: "Other", label: "Other Operating Expenses" }
];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const canCreate = usePermission("expenses.create");
  const canEdit = usePermission("expenses.edit");
  const canDelete = usePermission("expenses.delete");

  const [formData, setFormData] = useState({
    expense_number: "", vendor: "", category: "Other", amount: "", status: "paid", payment_method: "Bank Transfer", expense_date: "", notes: ""
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await expenseService.getAll();
      setExpenses(res.data.data);
    } catch (err) {
      console.error("Failed to load expenses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleOpenModal = (expense = null) => {
    if (expense) {
      setEditingId(expense.id);
      setFormData({
        expense_number: expense.expense_number || "",
        vendor: expense.vendor || "",
        category: expense.category || "Other",
        amount: expense.amount || "",
        status: expense.status || "paid",
        payment_method: expense.payment_method || "Bank Transfer",
        expense_date: expense.expense_date ? new Date(expense.expense_date).toISOString().split('T')[0] : "",
        notes: expense.notes || ""
      });
    } else {
      setEditingId(null);
      setFormData({
        expense_number: "", vendor: "", category: "Other", amount: "", status: "paid", payment_method: "Bank Transfer", expense_date: new Date().toISOString().split('T')[0], notes: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await expenseService.update(editingId, formData);
      } else {
        await expenseService.create(formData);
      }
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert("Failed to save expense.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this expense? This action cannot be undone.")) {
      try {
        await expenseService.delete(id);
        fetchExpenses();
      } catch (err) {
        alert("Failed to delete expense");
      }
    }
  };

  const filteredExpenses = (expenses || []).filter(e => 
    (e.vendor || "").toLowerCase().includes(search.toLowerCase()) || 
    (e.expense_number || "").toLowerCase().includes(search.toLowerCase())
  );

  const money = (v) => v ? `₹${Number(v).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-';

  return (
    <div>
      <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--foreground)' }}>Expenses</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginTop: '4px' }}>Manage operating expenses and cost of goods sold</p>
        </div>
        <Button onClick={() => handleOpenModal()}><Plus size={16} style={{ marginRight: 8 }} /> Add Expense</Button>
      </div>

      <Card>
        <CardHeader style={{ paddingBottom: 0 }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <Input 
              icon={Search} 
              placeholder="Search expenses by vendor or number..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ maxWidth: 400 }}
            />
          </div>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '40px 0' }}><Spinner size="lg" message="Loading expenses..." /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead style={{ textAlign: 'right' }}>Amount</TableHead>
                    <TableHead style={{ textAlign: 'center' }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(filteredExpenses || []).map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : (expense.created_at ? new Date(expense.created_at).toLocaleDateString() : '-')}</TableCell>
                      <TableCell style={{ fontWeight: 500 }}>{expense.expense_number || `EXP-${expense.id}`}</TableCell>
                      <TableCell>{expense.vendor}</TableCell>
                      <TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={expense.status === 'paid' ? 'success' : 'warning'}>
                          {expense.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ textAlign: 'right', fontWeight: 500 }}>{money(expense.amount)}</TableCell>
                      <TableCell style={{ textAlign: 'center' }}>
                        <Button variant="ghost" onClick={() => handleOpenModal(expense)} style={{ padding: '4px 8px', height: 'auto' }}><Edit2 size={16} /></Button>
                        {canDelete && <Button variant="ghost" onClick={() => handleDelete(expense.id)} style={{ padding: '4px 8px', height: 'auto', color: 'var(--destructive)' }}><Trash2 size={16} /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted-foreground)' }}>
                        No expenses found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Expense" : "Add Expense"} size="default">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <Input label="Expense Number" placeholder="Auto-generated if blank" value={formData.expense_number} onChange={e => setFormData({...formData, expense_number: e.target.value})} />
          <Input label="Date" type="date" value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})} />
          <Input label="Vendor" value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} />
          <Input label="Amount (₹)" type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
          <Select label="Category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} options={categories} />
          <Select label="Payment Method" value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})} options={[{value:'Bank Transfer',label:'Bank Transfer'},{value:'Credit Card',label:'Credit Card'},{value:'Cash',label:'Cash'}]} />
          <Select label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} options={[{value:'paid',label:'Paid'},{value:'pending',label:'Pending'}]} />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <Input label="Notes" placeholder="Optional notes..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>{editingId ? "Update Expense" : "Save Expense"}</Button>
        </div>
      </Modal>
    </div>
  );
}
