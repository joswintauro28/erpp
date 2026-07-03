import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import auditLogService from "../services/auditLogService";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Modal from "../components/ui/Modal";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import "./AuditLogs.css";

const ENTITY_OPTIONS = [
  { value: "invoice", label: "Invoices" },
  { value: "payment", label: "Payments" },
  { value: "client", label: "Clients" },
  { value: "product", label: "Products" },
  { value: "expense", label: "Expenses" },
  { value: "quotation", label: "Quotations" },
  { value: "settings", label: "Settings" },
  { value: "authentication", label: "Authentication" },
];

const ACTION_OPTIONS = [
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "email_sent", label: "Email Sent" },
  { value: "payment_link_generated", label: "Payment Link Generated" },
  { value: "razorpay_payment_received", label: "Razorpay Payment Received" },
  { value: "convert_to_invoice", label: "Convert to Invoice" },
  { value: "organization_updated", label: "Organization Updated" },
  { value: "branding_updated", label: "Branding Updated" },
  { value: "smtp_updated", label: "SMTP Updated" },
  { value: "razorpay_updated", label: "Razorpay Updated" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
];

const PAGE_SIZE = 25;

function formatLabel(value) {
  return String(value || "-").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionVariant(action) {
  if (action === "delete") return "destructive";
  if (action === "create" || action === "login" || action === "razorpay_payment_received") return "success";
  if (action === "email_sent" || action === "payment_link_generated") return "warning";
  return "default";
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    start_date: "",
    end_date: "",
    entity_type: "",
    action: "",
  });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const params = useMemo(() => {
    const next = { limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE };
    Object.entries(filters).forEach(([key, value]) => {
      if (value) next[key] = value;
    });
    return next;
  }, [filters, page]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditLogService.getLogs(params);
      setLogs(res.data.data || []);
      setTotal(res.data.total || 0);
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setPage(1);
    setFilters({ search: "", start_date: "", end_date: "", entity_type: "", action: "" });
  };

  const openDetails = async (log) => {
    setSelectedLog(log);
    setDetailLoading(true);
    try {
      const res = await auditLogService.getLog(log.id);
      setSelectedLog(res.data.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load audit log");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Audit Logs</h1>
          <p>Permanent activity history across billing, payments, clients, products, expenses, quotations, settings, and access.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
          <CardDescription>{total} recorded events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="audit-toolbar">
            <Input
              label="Search"
              icon={Search}
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder="Search description, action, entity"
            />
            <Input
              label="From"
              type="date"
              value={filters.start_date}
              onChange={(e) => updateFilter("start_date", e.target.value)}
            />
            <Input
              label="To"
              type="date"
              value={filters.end_date}
              onChange={(e) => updateFilter("end_date", e.target.value)}
            />
            <Select
              label="Entity"
              options={ENTITY_OPTIONS}
              value={filters.entity_type}
              onChange={(e) => updateFilter("entity_type", e.target.value)}
              placeholder="All entities"
            />
            <Select
              label="Action"
              options={ACTION_OPTIONS}
              value={filters.action}
              onChange={(e) => updateFilter("action", e.target.value)}
              placeholder="All actions"
            />
            <Button variant="outline" onClick={resetFilters}>Reset</Button>
          </div>

          {error && <div className="page__error">{error}</div>}

          {loading ? (
            <Spinner size="lg" message="Loading audit logs..." />
          ) : logs.length === 0 ? (
            <div className="page__empty">No audit logs found.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs || []).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</TableCell>
                      <TableCell>U{log.user_id || log.owner_id}</TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(log.action)}>{formatLabel(log.action)}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="audit-entity">{formatLabel(log.entity_type)} #{log.entity_id || "-"}</span>
                      </TableCell>
                      <TableCell className="audit-description">{log.description || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openDetails(log)} title="View details">
                          <Eye />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="audit-pagination">
                <span>Page {page} of {pageCount}</span>
                <div className="audit-pagination__actions">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((prev) => prev + 1)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Audit Details" size="lg">
        {detailLoading ? (
          <Spinner message="Loading details..." />
        ) : selectedLog ? (
          <div className="audit-details">
            <dl>
              <div><dt>ID</dt><dd>{selectedLog.id}</dd></div>
              <div><dt>Created</dt><dd>{new Date(selectedLog.created_at).toLocaleString()}</dd></div>
              <div><dt>User</dt><dd>U{selectedLog.user_id || selectedLog.owner_id}</dd></div>
              <div><dt>Action</dt><dd>{formatLabel(selectedLog.action)}</dd></div>
              <div><dt>Entity</dt><dd>{formatLabel(selectedLog.entity_type)} #{selectedLog.entity_id || "-"}</dd></div>
              <div><dt>Description</dt><dd>{selectedLog.description || "-"}</dd></div>
            </dl>
            <div>
              <h3>Metadata</h3>
              <pre>{JSON.stringify(selectedLog.metadata || {}, null, 2)}</pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
