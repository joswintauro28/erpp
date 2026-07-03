import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clientService from "../services/clientService";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import usePermission from "../hooks/usePermission";
import "./Clients.css";

const money = (v) => `Rs.${Number(v || 0).toLocaleString()}`;
const statusVariant = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "paid" || s === "active" || s === "accepted") return "success";
  if (s === "overdue" || s === "revoked" || s === "disabled" || s === "suspended") return "destructive";
  if (s === "partially_paid" || s === "pending") return "warning";
  return "secondary";
};

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canManageClients = usePermission("clients.manage");
  
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [portalAccess, setPortalAccess] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [clientRes, invoiceRes, paymentRes] = await Promise.all([
        clientService.getById(id),
        clientService.getInvoices(id),
        clientService.getPayments(id),
      ]);
      setClient(clientRes.data.data);
      setInvoices(invoiceRes.data.data || []);
      setPayments(paymentRes.data.data || []);
      
      if (canManageClients) {
        try {
          const portalRes = await clientService.getPortalAccess(id);
          setPortalAccess(portalRes.data);
        } catch (e) {
          console.error("Failed to load portal access info", e);
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load client details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [id, canManageClients]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError("");
    try {
      await clientService.inviteToPortal(id, inviteEmail);
      alert("Invitation sent successfully");
      setIsInviteModalOpen(false);
      fetchAll();
    } catch (err) {
      setInviteError(err.response?.data?.detail || "Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResend = async () => {
    if (!window.confirm("Resend invitation? The previous token will be invalidated.")) return;
    try {
      await clientService.resendInvitation(id);
      alert("Invitation resent successfully");
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to resend invitation");
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm("Are you sure you want to permanently revoke this client's portal access?")) return;
    try {
      await clientService.revokeAccess(id);
      alert("Access revoked successfully");
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to revoke access");
    }
  };

  const handleDisable = async () => {
    if (!window.confirm("Suspend portal access temporarily?")) return;
    try {
      await clientService.disableAccess(id);
      alert("Access suspended successfully");
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to suspend access");
    }
  };

  if (loading && !client) return <Spinner size="lg" message="Loading client details..." />;
  if (error) return <div className="page__error">{error}</div>;

  const summary = client?.summary || {};

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>{client.name}</h1>
          <p>{client.email || "No email"} {client.gst_number ? `| GST ${client.gst_number}` : ""}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/clients")}>Back to Clients</Button>
      </div>

      <div className="page__grid" style={{ marginBottom: 24 }}>
        <Card><CardContent><div className="page__metric">Invoices<strong>{summary.invoice_count || 0}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">Lifetime Billed<strong>{money(summary.lifetime_billed)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">Lifetime Paid<strong>{money(summary.lifetime_paid)}</strong></div></CardContent></Card>
        <Card><CardContent><div className="page__metric">Outstanding<strong>{money(summary.outstanding)}</strong></div></CardContent></Card>
      </div>

      {canManageClients && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <CardTitle>Client Portal Access</CardTitle>
          </CardHeader>
          <CardContent>
            {portalAccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Portal Status</div>
                    <div style={{ marginTop: 4 }}><Badge variant={statusVariant(portalAccess.status)}>{portalAccess.status.toUpperCase()}</Badge></div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Invitation Status</div>
                    <div style={{ marginTop: 4 }}><Badge variant={statusVariant(portalAccess.invitation_status)}>{portalAccess.invitation_status.toUpperCase()}</Badge></div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Portal Email</div>
                    <div style={{ fontWeight: 500, marginTop: 4 }}>{portalAccess.portal_email || "-"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Last Login</div>
                    <div style={{ fontWeight: 500, marginTop: 4 }}>{portalAccess.last_login ? new Date(portalAccess.last_login).toLocaleString() : "-"}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                  {(portalAccess.status === "none" || portalAccess.status === "disabled") && (
                    <Button variant="primary" onClick={() => { setInviteEmail(client.email || ""); setIsInviteModalOpen(true); }}>
                      Invite to Portal
                    </Button>
                  )}
                  {portalAccess.invitation_status === "pending" && (
                    <Button variant="outline" onClick={handleResend}>Resend Invitation</Button>
                  )}
                  {portalAccess.status === "active" && (
                    <Button variant="outline" onClick={handleDisable} style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}>Suspend Access</Button>
                  )}
                  {(portalAccess.status === "active" || portalAccess.status === "suspended") && (
                    <Button variant="outline" onClick={handleRevoke} style={{ color: 'var(--destructive)', borderColor: 'var(--destructive)' }}>Revoke Access</Button>
                  )}
                </div>
              </div>
            ) : (
              <Spinner size="sm" message="Loading portal data..." />
            )}
          </CardContent>
        </Card>
      )}

      <div className="detail-grid">
        <Card>
          <CardHeader><CardTitle>Client Profile</CardTitle></CardHeader>
          <CardContent>
            <dl className="detail-list">
              <div><dt>Phone</dt><dd>{client.phone || "-"}</dd></div>
              <div><dt>Address</dt><dd>{client.address || "-"}</dd></div>
              <div><dt>State</dt><dd>{client.state || "-"}</dd></div>
              <div><dt>GST Number</dt><dd>{client.gst_number || "-"}</dd></div>
              <div><dt>Website</dt><dd>{client.website || "-"}</dd></div>
              <div><dt>Industry</dt><dd>{client.industry || "-"}</dd></div>
              <div><dt>Notes</dt><dd>{client.notes || "-"}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead></TableRow></TableHeader>
              <TableBody>
                {(payments || []).map((p) => (
                  <TableRow key={p.id}><TableCell>{p.invoice_number || `#${p.invoice_id}`}</TableCell><TableCell>{money(p.amount)}</TableCell><TableCell>{p.payment_method}</TableCell></TableRow>
                ))}
                {payments.length === 0 && <TableRow><TableCell colSpan={3} style={{ textAlign: "center" }}>No payments</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card style={{ marginTop: 24 }}>
        <CardHeader><CardTitle>Invoice History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead></TableRow></TableHeader>
            <TableBody>
              {(invoices || []).map((inv) => (
                <TableRow key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} style={{ cursor: "pointer" }}>
                  <TableCell>{inv.invoice_number || `#${inv.id}`}</TableCell>
                  <TableCell>{money(inv.total || inv.amount)}</TableCell>
                  <TableCell>{money(inv.paid_amount)}</TableCell>
                  <TableCell>{money(inv.balance_due)}</TableCell>
                  <TableCell><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></TableCell>
                  <TableCell>{inv.due_date || "-"}</TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && <TableRow><TableCell colSpan={6} style={{ textAlign: "center" }}>No invoices</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite Client To Portal">
        {inviteError && <div style={{ color: 'var(--destructive)', marginBottom: 16, fontSize: 14 }}>{inviteError}</div>}
        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input 
            label="Email Address"
            type="email" 
            value={inviteEmail} 
            onChange={e => setInviteEmail(e.target.value)} 
            placeholder="client@example.com" 
            required 
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="outline" type="button" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={inviteLoading}>{inviteLoading ? "Sending..." : "Send Invitation"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
