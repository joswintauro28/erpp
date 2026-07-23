"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const badgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "Success": case "Ready": case "Completed": return "default";
    case "Generating": case "Processing": case "Pending": return "secondary";
    case "Failed": case "Error": return "destructive";
    default: return "outline";
  }
};

interface AIAssistantTableProps {
  logs: any[];
}

export default function AIAssistantTable({ logs }: AIAssistantTableProps) {
  if (!logs?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--shell-muted)]">
        <p className="text-sm">No AI assistant logs found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>QUERY</TableHead>
          <TableHead>RESPONSE</TableHead>
          <TableHead>CATEGORY</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>TIMESTAMP</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log: any) => (
          <TableRow key={log.id}>
            <TableCell className="text-[var(--shell-muted)]">{log.id_str}</TableCell>
            <TableCell className="max-w-[200px] truncate font-medium" title={log.query}>{log.query}</TableCell>
            <TableCell className="max-w-[250px] truncate text-[var(--shell-muted)]" title={log.response || ""}>{(log.response || "").substring(0, 100)}</TableCell>
            <TableCell>{log.category}</TableCell>
            <TableCell><Badge variant={badgeVariant(log.status)}>{log.status}</Badge></TableCell>
            <TableCell className="text-[var(--shell-muted)]">{log.created_at}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
