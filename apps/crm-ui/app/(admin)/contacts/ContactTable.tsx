"use client";

import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const badgeVariant = (type: string) => {
  switch (type) {
    case "Primary": return "default";
    case "Decision": return "secondary";
    case "Influencer": return "outline";
    case "Inactive": return "destructive";
    default: return "default";
  }
};

interface ContactTableProps {
  contacts: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function ContactTable({ contacts, onView, onEdit, onDelete }: ContactTableProps) {
  if (!contacts?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[--shell-muted]">
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
          <TableHead>ROLE</TableHead>
          <TableHead>ACCOUNT</TableHead>
          <TableHead>EMAIL</TableHead>
          <TableHead>PHONE</TableHead>
          <TableHead>TYPE</TableHead>
          <TableHead>LAST CONTACT</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell className="text-[--shell-muted] cursor-pointer" onClick={() => onView(item)}>{item.id_str}</TableCell>
            <TableCell className="font-medium text-[--shell-foreground] cursor-pointer" onClick={() => onView(item)}>{item.name}</TableCell>
            <TableCell>{item.role}</TableCell>
            <TableCell>{item.account}</TableCell>
            <TableCell>{item.email}</TableCell>
            <TableCell>{item.phone}</TableCell>
            <TableCell><Badge variant={badgeVariant(item.type)}>{item.type}</Badge></TableCell>
            <TableCell className="text-[--shell-muted]">{item.last_contact}</TableCell>
            <TableCell>
              <div className="flex gap-2 text-[--shell-muted]">
                <Button size="icon-sm" className="hover:text-[--shell-foreground] cursor-pointer" onClick={() => onEdit(item)} title="Edit"><Edit2 size={14} /></Button>
                <Button size="icon-sm" className="hover:text-[--shell-danger] cursor-pointer" onClick={() => onDelete(item)} title="Delete"><Trash2 size={14} /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
