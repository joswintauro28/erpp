"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import usePermission from "@/hooks/usePermission";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Mail, Shield, Trash2, CheckCircle2 } from "lucide-react";

export default function TeamManagement() {
  const canManageUsers = usePermission("users.manage");
  const { user } = useAuth();
  
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role_id: "" });
  
  const [roleModal, setRoleModal] = useState<any>(null); // { id, currentRole }
  const [roleForm, setRoleForm] = useState({ role_id: "" });

  const fetchData = async () => {
    try {
      const [memRes, invRes, rolesRes] = await Promise.all([
        api.get("/team/members"),
        api.get("/team/invitations"),
        api.get("/team/roles")
      ]);
      setMembers(memRes.data.data || []);
      setInvitations(invRes.data.data || []);
      setRoles(rolesRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageUsers) fetchData();
  }, [canManageUsers]);

  if (!canManageUsers) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleInvite = async (e: any) => {
    e.preventDefault();
    try {
      await api.post("/team/invite", inviteForm);
      setInviteModal(false);
      setInviteForm({ email: "", role_id: "" });
      fetchData();
    } catch (e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } };
      alert(axiosErr.response?.data?.detail || "Failed to invite");
    }
  };

  const handleChangeRole = async (e: any) => {
    e.preventDefault();
    try {
      await api.put(`/team/member/${roleModal.id}/role`, { role_id: roleForm.role_id });
      setRoleModal(null);
      fetchData();
    } catch (e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } };
      alert(axiosErr.response?.data?.detail || "Failed to update role");
    }
  };

  const handleRemoveMember = async (id: any) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      await api.delete(`/team/member/${id}`);
      fetchData();
    } catch (e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } };
      alert(axiosErr.response?.data?.detail || "Failed to remove member");
    }
  };

  const handleRevokeInvite = async (id: any) => {
    if (!window.confirm("Revoke this invitation?")) return;
    try {
      await api.delete(`/team/invitations/${id}`);
      fetchData();
    } catch (e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } };
      alert(axiosErr.response?.data?.detail || "Failed to revoke invitation");
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Team Management</h1>
          <p style={{ color: "var(--muted-foreground)", marginTop: 4 }}>Manage organization members and roles.</p>
        </div>
        <Button variant="primary" onClick={() => setInviteModal(true)}><Mail size={16} /> Invite Member</Button>
      </div>

      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Active Members</h2>
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members || []).map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell style={{ fontWeight: 500 }}>{m.email} {m.user_id === user?.id && "(You)"}</TableCell>
                  <TableCell><Badge variant="secondary">{m.role_name}</Badge></TableCell>
                  <TableCell>{new Date(m.joined_at).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant="success">Active</Badge></TableCell>
                  <TableCell style={{ textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Button variant="outline" size="sm" onClick={() => { setRoleModal(m); setRoleForm({ role_id: m.role_id }); }} disabled={m.user_id === user?.id}>Change Role</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveMember(m.id)} disabled={m.user_id === user?.id}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && <TableRow><TableCell colSpan={5} style={{ textAlign: "center", padding: "24px 0" }}>No members found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Pending Invitations</h2>
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expires At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invitations || []).map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell>{i.email}</TableCell>
                  <TableCell><Badge variant="secondary">{i.role_name}</Badge></TableCell>
                  <TableCell>{new Date(i.expires_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {i.status === 'pending' ? <Badge variant="warning">Pending</Badge> : <Badge variant="default">{i.status}</Badge>}
                  </TableCell>
                  <TableCell style={{ textAlign: "right" }}>
                    {i.status === 'pending' && <Button variant="destructive" size="sm" onClick={() => handleRevokeInvite(i.id)}>Revoke</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {invitations.length === 0 && <TableRow><TableCell colSpan={5} style={{ textAlign: "center", padding: "24px 0" }}>No pending invitations</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal isOpen={inviteModal} onClose={() => setInviteModal(false)} title="Invite Team Member">
        <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input 
            label="Email Address" 
            type="email" 
            value={inviteForm.email} 
            onChange={(e: any) => setInviteForm({ ...inviteForm, email: e.target.value })} 
            required 
          />
          <Select 
            label="Assign Role"
            value={inviteForm.role_id}
            onChange={(e: any) => setInviteForm({ ...inviteForm, role_id: e.target.value })}
            options={[
              { value: "", label: "Select Role..." },
              ...(roles || []).map((r: any) => ({ value: r.id, label: `${r.name} - ${r.description}` }))
            ]}
            required
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button variant="outline" type="button" onClick={() => setInviteModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Send Invitation</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!roleModal} onClose={() => setRoleModal(null)} title="Change Member Role">
        <form onSubmit={handleChangeRole} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select 
            label="New Role"
            value={roleForm.role_id}
            onChange={(e: any) => setRoleForm({ ...roleForm, role_id: e.target.value })}
            options={[
              { value: "", label: "Select Role..." },
              ...(roles || []).map((r: any) => ({ value: r.id, label: r.name }))
            ]}
            required
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button variant="outline" type="button" onClick={() => setRoleModal(null)}>Cancel</Button>
            <Button variant="primary" type="submit">Update Role</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
