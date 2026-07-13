"use client";

import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { ColumnDef, EntityDef } from "@/lib/entityConfig";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Active: "default",
  Prospect: "secondary",
  Dormant: "destructive",
  Churned: "destructive",
  New: "secondary",
  Qualified: "outline",
  "In Progress": "outline",
  Converted: "default",
  Won: "default",
  Lost: "destructive",
  Signed: "default",
  Paid: "default",
  Invoiced: "secondary",
  Confirmed: "secondary",
  Overdue: "destructive",
  Draft: "outline",
  "Under Review": "outline",
  Discovery: "secondary",
  Proposal: "outline",
  Negotiation: "secondary",
  High: "destructive",
  Medium: "outline",
  Low: "secondary",
};

function getBadgeVariant(value: string): "default" | "secondary" | "destructive" | "outline" {
  return STATUS_VARIANT[value] || "outline";
}

function formatValue(value: unknown, format?: "currency" | "currency2"): string {
  if (value == null || value === "") return "-";
  if (format === "currency") {
    const n = Number(value);
    if (isNaN(n)) return String(value);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  }
  if (format === "currency2") {
    const n = Number(value);
    if (isNaN(n)) return String(value);
    return `$${(n / 1000).toFixed(0)}K`;
  }
  return String(value);
}

interface EntityTableProps {
  config: EntityDef;
  items: Record<string, unknown>[];
  onView: (record: Record<string, unknown>) => void;
  onEdit: (record: Record<string, unknown>) => void;
  onDelete: (record: Record<string, unknown>) => void;
}

export default function EntityTable({
  config,
  items,
  onView,
  onEdit,
  onDelete,
}: EntityTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {config.columns.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((record) => (
          <TableRow key={String(record.id ?? record.id_str ?? "")}>
            {config.columns.map((col) => {
              const raw = record[col.key];
              const val = formatValue(raw, col.format);

              if (col.primary || col.link) {
                return (
                  <TableCell
                    key={col.key}
                    className="cursor-pointer text-muted-foreground"
                    onClick={() => onView(record)}
                  >
                    {col.link ? (
                      <span className="text-action font-medium">
                        {val}
                      </span>
                    ) : (
                      val
                    )}
                  </TableCell>
                );
              }

              if (col.badge) {
                return (
                  <TableCell key={col.key}>
                    <Badge variant={getBadgeVariant(raw as string)}>{val}</Badge>
                  </TableCell>
                );
              }

              return (
                <TableCell
                  key={col.key}
                  className={col.key === "updated_at" || col.key === "date" ? "text-muted-foreground" : undefined}
                >
                  {val}
                </TableCell>
              );
            })}
            <TableCell>
              <div className="flex gap-2 text-muted-foreground">
                <Button variant="ghost" size="icon-sm" onClick={() => onEdit(record)}>
                  <Edit2 size={14} />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onDelete(record)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
