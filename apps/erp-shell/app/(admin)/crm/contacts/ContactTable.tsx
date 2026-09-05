"use client";

import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { statusVariant } from "@/lib/utils";

interface ContactTableProps {
  contacts: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function ContactTable({ contacts, onView, onEdit, onDelete }: ContactTableProps) {
  if (!contacts?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--shell-muted)]">
        <p className="text-sm">No contacts found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>NAME</TableHead>
          <TableHead>EMAIL</TableHead>
          <TableHead>PHONE</TableHead>
          <TableHead>ROLE</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead>UPDATED</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell className="text-[var(--shell-muted)] cursor-pointer text-xs" onClick={() => onView(item)}>{item.id_str}</TableCell>
            <TableCell className="font-medium text-[var(--shell-foreground)] cursor-pointer" onClick={() => onView(item)}>{item.first_name} {item.last_name}</TableCell>
            <TableCell className="text-xs text-[var(--shell-muted)]">{item.email}</TableCell>
            <TableCell className="text-xs text-[var(--shell-muted)]">{item.phone}</TableCell>
            <TableCell className="text-xs">{item.role}</TableCell>
            <TableCell><Badge variant={statusVariant("contact", item.status)}>{item.status}</Badge></TableCell>
            <TableCell className="text-xs text-[var(--shell-muted)]">{item.owner}</TableCell>
            <TableCell className="text-xs text-[var(--shell-muted)]">{item.updated_at}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={() => onEdit(item)} title="Edit"><Edit2 size={14} className="text-[var(--shell-brand)]" /></Button>
                <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={() => onDelete(item)} title="Delete"><Trash2 size={14} className="text-[var(--shell-danger)]" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
