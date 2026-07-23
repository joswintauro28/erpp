"use client";

import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const badgeVariant = (status: string) => {
  switch (status) {
    case "Draft": return "outline";
    case "Under Review": return "secondary";
    case "Signed": return "default";
    case "Expired": return "destructive";
    default: return "default";
  }
};

interface DocumentTableProps {
  documents: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
}

export default function DocumentTable({ documents, onView, onEdit, onDelete }: DocumentTableProps) {
  if (!documents?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[--shell-muted]">
        <p className="text-sm">No documents found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>DOCUMENT</TableHead>
          <TableHead>TYPE</TableHead>
          <TableHead>ACCOUNT</TableHead>
          <TableHead>SIZE</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead>UPDATED</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell className="text-[--shell-muted] cursor-pointer" onClick={() => onView(item)}>{item.id_str}</TableCell>
            <TableCell className="font-medium text-[--shell-foreground] cursor-pointer" onClick={() => onView(item)}>{item.title}</TableCell>
            <TableCell>{item.type}</TableCell>
            <TableCell>{item.account}</TableCell>
            <TableCell>{item.size}</TableCell>
            <TableCell><Badge variant={badgeVariant(item.status)}>{item.status}</Badge></TableCell>
            <TableCell>{item.owner}</TableCell>
            <TableCell className="text-[--shell-muted]">{item.updated_at}</TableCell>
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
