"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Users, Pencil, Power, PowerOff, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import type { TeamMember } from "@/types/settings";

const roleColors: Record<string, string> = {
  Admin: "var(--shell-action)",
  Manager: "var(--chart-2)",
  Accountant: "var(--chart-3)",
  User: "var(--chart-4)",
};

export default function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
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

  const toggleStatus = (id: number) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        if (m.status === "active") return { ...m, status: "disabled" as const };
        if (m.status === "disabled") return { ...m, status: "active" as const };
        return m;
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[--shell-foreground]">
            Team Management
          </h1>
          <p className="mt-0.5 text-sm text-[--shell-muted]">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Invite Member
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Total Members</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Active</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-success]">{members.filter((m) => m.status === "active").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Invited</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--chart-4]">{members.filter((m) => m.status === "invited").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-[--shell-muted] tracking-wide">Departments</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <p className="font-mono text-lg font-semibold text-[--shell-foreground]">{new Set(members.map((m) => m.department)).size}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--shell-muted]" />
        <Input placeholder="Search team members..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="max-w-xs">Permissions</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm font-medium">{m.name}</TableCell>
                  <TableCell className="text-xs">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs" style={{ borderColor: roleColors[m.role] || "var(--shell-border)", color: roleColors[m.role] }}>
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[--shell-muted]">{m.department}</TableCell>
                  <TableCell>
                    <Badge
                      variant={m.status === "active" ? "default" : m.status === "invited" ? "secondary" : "outline"}
                      className="text-xs capitalize"
                    >
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {m.permissions.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">{p === "All" ? "Full Access" : p}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[--shell-muted]">
                    {m.last_active ? new Date(m.last_active).toLocaleDateString("en-IN") : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {m.status === "invited" && (
                        <Button variant="ghost" size="icon-sm"><Mail className="h-3 w-3" /></Button>
                      )}
                      <Button variant="ghost" size="icon-sm"><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => toggleStatus(m.id)}>
                        {m.status === "disabled" ? (
                          <Power className="h-3 w-3 text-[--shell-success]" />
                        ) : (
                          <PowerOff className="h-3 w-3 text-[--shell-muted]" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
