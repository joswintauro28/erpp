"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Users, Pencil, Power, PowerOff, Shield, ShieldAlert, Key, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/services/api";
import { KpiCard } from "@datavex/ui-theme";
import type { TeamMember } from "@/types/settings";

const roleStyles: Record<string, { color: string; bg: string; border: string }> = {
  "Organization Owner": {
    color: "var(--primary, #f2470c)",
    bg: "color-mix(in srgb, var(--primary, #f2470c) 12%, transparent)",
    border: "color-mix(in srgb, var(--primary, #f2470c) 35%, transparent)",
  },
  "Accountant": {
    color: "#7c3aed", // Indigo/Violet - rich contrast for finance
    bg: "color-mix(in srgb, #7c3aed 12%, transparent)",
    border: "color-mix(in srgb, #7c3aed 35%, transparent)",
  },
  "Sales Executive": {
    color: "#0284c7", // Sky blue
    bg: "color-mix(in srgb, #0284c7 12%, transparent)",
    border: "color-mix(in srgb, #0284c7 35%, transparent)",
  },
  "Inventory Manager": {
    color: "#059669", // Emerald
    bg: "color-mix(in srgb, #059669 12%, transparent)",
    border: "color-mix(in srgb, #059669 35%, transparent)",
  },
  "Auditor": {
    color: "#d97706", // Amber
    bg: "color-mix(in srgb, #d97706 12%, transparent)",
    border: "color-mix(in srgb, #d97706 35%, transparent)",
  },
  "Employee": {
    color: "var(--muted-foreground)",
    bg: "var(--muted)",
    border: "var(--border)",
  },
};

function getRoleStyle(role: string) {
  return (
    roleStyles[role] || {
      color: "var(--foreground)",
      bg: "var(--secondary)",
      border: "var(--border)",
    }
  );
}

export default function TeamManagement() {
  const [activeTab, setActiveTab] = useState<"directory" | "permissions">("directory");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Role Permissions Tab State
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedRolePermIds, setSelectedRolePermIds] = useState<number[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Modals state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    fullName: "",
    roleId: "",
    password: "",
  });
  const [inviting, setInviting] = useState(false);

  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editRoleForm, setEditRoleForm] = useState({
    userId: null as number | null,
    userName: "",
    roleId: "",
  });
  const [editingRole, setEditingRole] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load backend data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [membersData, rolesData, permissionsData] = (await Promise.all([
        api.get("/auth/users"),
        api.get("/auth/roles"),
        api.get("/auth/permissions"),
      ])) as [TeamMember[], any[], any[]];
      setMembers(membersData);
      setRoles(rolesData);
      setPermissions(permissionsData);
      
      // Auto-select first role if not set
      if (rolesData.length > 0 && selectedRoleId === null) {
        const firstRole = rolesData[0];
        setSelectedRoleId(firstRole.id);
        const mappedPerms = permissionsData
          .filter((p: any) => firstRole.permissions.includes(p.code))
          .map((p: any) => p.id);
        setSelectedRolePermIds(mappedPerms);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load team and role data from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update matrix checkbox values when switching active role
  const handleRoleSelect = (roleId: number) => {
    setSelectedRoleId(roleId);
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      const mappedPerms = permissions
        .filter((p: any) => role.permissions.includes(p.code))
        .map((p: any) => p.id);
      setSelectedRolePermIds(mappedPerms);
    }
  };

  // Toggle checklist permission state
  const handlePermissionToggle = (permId: number) => {
    setSelectedRolePermIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  // Submit checklist permissions changes to backend
  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    try {
      setSavingPermissions(true);
      setError("");
      setSuccess("");
      await api.put(`/auth/roles/${selectedRoleId}/permissions`, {
        permissionIds: selectedRolePermIds,
      });
      setSuccess("Permissions updated successfully!");
      // Reload mappings
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to save updated role permissions");
    } finally {
      setSavingPermissions(false);
    }
  };

  // Toggle user activation status
  const handleToggleStatus = async (user: TeamMember) => {
    try {
      setError("");
      setSuccess("");
      const nextActive = user.status === "disabled";
      await api.put(`/auth/users/${user.id}/status`, {
        isActive: nextActive,
      });
      setSuccess(`User "${user.name}" status updated successfully`);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to update user active status");
    }
  };

  // Invite user submit handler
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.fullName || !inviteForm.roleId) {
      setError("Please fill in all required fields");
      return;
    }
    try {
      setInviting(true);
      setError("");
      setSuccess("");
      await api.post("/auth/users", {
        email: inviteForm.email,
        fullName: inviteForm.fullName,
        roleId: Number(inviteForm.roleId),
        password: inviteForm.password || undefined,
      });
      setSuccess(`Successfully created user account for ${inviteForm.fullName}`);
      setInviteOpen(false);
      setInviteForm({ email: "", fullName: "", roleId: "", password: "" });
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to invite new member");
    } finally {
      setInviting(false);
    }
  };

  // Edit role submit handler
  const handleEditRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoleForm.userId || !editRoleForm.roleId) return;
    try {
      setEditingRole(true);
      setError("");
      setSuccess("");
      await api.put(`/auth/users/${editRoleForm.userId}/role`, {
        roleId: Number(editRoleForm.roleId),
      });
      setSuccess(`Updated role for ${editRoleForm.userName}`);
      setEditRoleOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to update member role");
    } finally {
      setEditingRole(false);
    }
  };

  // Delete user submit handler
  const handleDeleteSubmit = async () => {
    if (!deleteUserId) return;
    try {
      setDeleting(true);
      setError("");
      setSuccess("");
      await api.delete(`/auth/users/${deleteUserId}`);
      setSuccess("Member removed from organization database");
      setDeleteConfirmOpen(false);
      setDeleteUserId(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to delete user account");
    } finally {
      setDeleting(false);
    }
  };

  // Filters search members
  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q)
    );
  }, [members, search]);

  // Group permissions by their DB module field
  const permissionsByModule = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const p of permissions) {
      const mod = p.module || "General";
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(p);
    }
    return groups;
  }, [permissions]);

  return (
    <div className="relative space-y-6">
      {/* Brand Sweep Line */}
      <span className="absolute -top-6 left-0 h-0.5 w-1/3 rounded-full bg-primary shimmer-glow" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Identity &amp; Team Management
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage organization members, assign roles, and customize permission lists
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={() => setInviteOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white shadow"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Invite Member
        </Button>
      </div>

      {/* Tab Selectors */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <button
          onClick={() => setActiveTab("directory")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${
            activeTab === "directory"
              ? "bg-primary/10 text-primary border border-[var(--shell-brand)]/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          Members Directory
        </button>
        <button
          onClick={() => {
            setActiveTab("permissions");
            if (roles.length > 0 && selectedRoleId === null) {
              handleRoleSelect(roles[0].id);
            }
          }}
          className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${
            activeTab === "permissions"
              ? "bg-primary/10 text-primary border border-[var(--shell-brand)]/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          Roles &amp; Permissions Matrix
        </button>
      </div>

      {/* Message Banners */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive font-medium animate-kpi">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 rounded-lg border border-[var(--shell-success)]/20 bg-[var(--shell-success)]/10 p-3.5 text-sm text-[var(--shell-success)] font-medium animate-kpi">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--shell-muted)] border-t-transparent" />
          <span className="ml-3 text-sm font-medium">Fetching team database...</span>
        </div>
      ) : activeTab === "directory" ? (
        /* Tab 1: Directory */
        <div className="space-y-6 animate-fade-in">
          {/* Dashboard-Aligned KPI Grid */}
          <div className="grid grid-cols-4 gap-6">
            <KpiCard label="Total Members" value={members.length} subtitle="Registered profiles" icon={Users} color="var(--chart-1)" index={0} />
            <KpiCard label="Active Users" value={members.filter((m) => m.status === "active").length} subtitle="Authorized to login" icon={CheckCircle2} color="var(--shell-success)" index={1} />
            <KpiCard label="Deactivated Users" value={members.filter((m) => m.status === "disabled").length} subtitle="Access revoked" icon={PowerOff} color="var(--shell-danger)" index={2} />
            <KpiCard label="Available Roles" value={roles.length} subtitle="Configured access groups" icon={Shield} color="var(--chart-4)" index={3} />
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search team members..." 
              className="pl-8 bg-muted/10 border-border text-sm text-foreground" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>

          {/* Directory Table */}
          <Card className="border-border hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Name</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Email</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">System Role</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Department</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground max-w-xs">Role Permissions</TableHead>
                    <TableHead className="font-heading text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((m) => {
                    const rStyle = getRoleStyle(m.role);
                    return (
                      <TableRow key={m.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                        <TableCell className="text-sm font-semibold text-foreground">{m.name}</TableCell>
                        <TableCell className="text-xs text-foreground font-mono">{m.email}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className="text-xs font-semibold px-2.5 py-0.5 shadow-2xs" 
                            style={{ 
                              borderColor: rStyle.border, 
                              color: rStyle.color,
                              backgroundColor: rStyle.bg,
                            }}
                          >
                            {m.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.department}</TableCell>
                        <TableCell>
                          <Badge
                            variant={m.status === "active" ? "default" : "outline"}
                            className={`text-[10px] font-semibold px-2 py-0.5 shadow-2xs ${
                              m.status === "active"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-destructive/10 text-destructive border-destructive/30"
                            }`}
                          >
                            {m.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {m.permissions.length === 0 ? (
                              <span className="text-[10px] text-muted-foreground">No permissions mapped</span>
                            ) : m.permissions.length === permissions.length ? (
                              <Badge variant="outline" className="text-[9px] font-semibold text-primary border-primary/40 bg-primary/10 shadow-2xs">Full Access Admin</Badge>
                            ) : (
                              m.permissions.map((p) => (
                                <span key={p} className="inline-block text-[9.5px] font-mono font-medium bg-muted/80 text-foreground/80 px-1.5 py-0.5 rounded border border-border/70 shadow-2xs">{p}</span>
                              ))
                            )}
                          </div>
                        </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon-sm" 
                            onClick={() => {
                              const role = roles.find((r) => r.name === m.role);
                              setEditRoleForm({
                                userId: m.id,
                                userName: m.name,
                                roleId: role ? String(role.id) : "",
                              });
                              setEditRoleOpen(true);
                            }}
                            className="hover:bg-secondary"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon-sm" 
                            onClick={() => handleToggleStatus(m)}
                            className="hover:bg-secondary"
                          >
                            {m.status === "disabled" ? (
                              <Power className="h-3.5 w-3.5 text-[var(--shell-success)]" />
                            ) : (
                              <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon-sm" 
                            onClick={() => {
                              setDeleteUserId(m.id);
                              setDeleteConfirmOpen(true);
                            }}
                            className="hover:bg-secondary text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Tab 2: Permissions Matrix */
        <div className="grid grid-cols-4 gap-6 animate-fade-in">
          {/* Roles Selector Sidebar */}
          <Card className="border-border h-fit">
            <CardHeader className="p-4 pb-2 border-b border-border/40">
              <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">System Roles</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {roles.map((r) => {
                const rStyle = getRoleStyle(r.name);
                return (
                  <button
                    key={r.id}
                    onClick={() => handleRoleSelect(r.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      selectedRoleId === r.id
                        ? "bg-primary/10 text-primary border border-primary/30 shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: rStyle.color }}
                        />
                        <span>{r.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] scale-90 border-border/70 font-semibold">{r.permissions.length} perms</Badge>
                    </div>
                    <span className="block text-[11px] text-muted-foreground font-normal mt-0.5 ml-4">{r.description}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Permissions Matrix */}
          <Card className="col-span-3">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Permissions Matrix for &quot;{roles.find((r) => r.id === selectedRoleId)?.name || ""}&quot;
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Check or uncheck permission actions to alter backend access control scopes</CardDescription>
              </div>
              <Button 
                onClick={handleSavePermissions}
                disabled={savingPermissions}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white shadow"
              >
                <Key className="mr-1.5 h-3.5 w-3.5" />
                {savingPermissions ? "Saving Matrix..." : "Save Permissions"}
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {Object.entries(permissionsByModule).map(([moduleName, modulePerms]) => (
                <div key={moduleName} className="space-y-3 pb-4 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{moduleName}</h3>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-muted-foreground border-border/70 bg-muted/30">
                      {modulePerms.filter((p) => selectedRolePermIds.includes(p.id)).length}/{modulePerms.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    {modulePerms.map((p) => {
                      const isChecked = selectedRolePermIds.includes(p.id);
                      return (
                        <div 
                          key={p.id}
                          onClick={() => handlePermissionToggle(p.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                            isChecked
                              ? "border-primary/50 bg-primary/10 shadow-xs hover:bg-primary/15"
                              : "border-border/80 bg-card hover:bg-muted/40 hover:border-border"
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Controlled via onClick on outer box
                            className="h-4 w-4 rounded border-border accent-[var(--primary)] mt-0.5 cursor-pointer"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <span className={`block text-xs font-semibold ${isChecked ? "text-primary font-bold" : "text-foreground"}`}>
                              {p.name || p.code}
                            </span>
                            <span className="block text-[11px] font-mono text-muted-foreground truncate">
                              {p.code}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invite Member Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="border-border">
          <form onSubmit={handleInviteSubmit}>
            <DialogHeader className="p-4 border-b border-border/40">
              <DialogTitle className="text-sm font-semibold text-foreground">Invite Team Member</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Create a new user profile inside this organization</DialogDescription>
            </DialogHeader>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Full Name</Label>
                <Input 
                  placeholder="Maya Patel" 
                  value={inviteForm.fullName}
                  onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Email Address</Label>
                <Input 
                  type="email" 
                  placeholder="maya@company.com" 
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">System Role</Label>
                <Select 
                  value={inviteForm.roleId} 
                  onValueChange={(val) => setInviteForm({ ...inviteForm, roleId: val ?? "" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Assign Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Password (Optional)</Label>
                <Input 
                  type="password" 
                  placeholder="Leave empty for default 'User@123!'" 
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="p-4 border-t border-border/40 flex justify-end gap-2 bg-secondary/25">
              <Button type="button" variant="outline" size="sm" onClick={() => setInviteOpen(false)} className="hover:bg-secondary">Cancel</Button>
              <Button type="submit" size="sm" disabled={inviting} className="bg-primary hover:bg-primary/90 text-white">
                {inviting ? "Inviting..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent className="border-border">
          <form onSubmit={handleEditRoleSubmit}>
            <DialogHeader className="p-4 border-b border-border/40">
              <DialogTitle className="text-sm font-semibold text-foreground">Change Member Role</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Alter the security role maps for &quot;{editRoleForm.userName}&quot;</DialogDescription>
            </DialogHeader>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Assign New Role</Label>
                <Select 
                  value={editRoleForm.roleId} 
                  onValueChange={(val) => setEditRoleForm({ ...editRoleForm, roleId: val ?? "" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Assign Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="p-4 border-t border-border/40 flex justify-end gap-2 bg-secondary/25">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditRoleOpen(false)} className="hover:bg-secondary">Cancel</Button>
              <Button type="submit" size="sm" disabled={editingRole} className="bg-primary hover:bg-primary/90 text-white">
                {editingRole ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="border-border">
          <DialogHeader className="p-4 border-b border-border/40">
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              <DialogTitle className="text-sm font-semibold text-foreground">Revoke Access &amp; Delete User</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">This action will completely remove this user profile from the organization member roster.</DialogDescription>
          </DialogHeader>
          <div className="p-5">
            <p className="text-xs text-foreground font-semibold">Are you absolutely sure you want to delete this user account?</p>
            <p className="text-xs text-muted-foreground mt-1">This user will be logged out and will no longer be able to log into any workstation or portal.</p>
          </div>
          <DialogFooter className="p-4 border-t border-border/40 flex justify-end gap-2 bg-secondary/25">
            <Button type="button" variant="outline" size="sm" onClick={() => { setDeleteConfirmOpen(false); setDeleteUserId(null); }} className="hover:bg-secondary">Cancel</Button>
            <Button type="button" size="sm" disabled={deleting} onClick={handleDeleteSubmit} className="bg-destructive hover:bg-destructive/95 text-white">
              {deleting ? "Deleting..." : "Yes, Delete Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
