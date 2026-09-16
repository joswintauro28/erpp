"use client";

import { Edit2, Trash2, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, StatusBadge, type Column } from "@datavex/ui-theme";
import { cn, statusVariant } from "@/lib/utils";

const tierVariant = (tier: string) => {
  switch (tier) {
    case "Hot": return "default";
    case "Warm": return "secondary";
    default: return "outline";
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

interface LeadTableProps {
  leads: any[];
  onView: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
  onQualify?: (record: any) => void;
}

export default function LeadTable({ leads, onView, onEdit, onDelete, onQualify }: LeadTableProps) {
  const columns: Column<any>[] = [
    {
      key: "id_str",
      header: "ID",
      render: (row) => <span className="text-muted-foreground">{row.id_str}</span>,
    },
    {
      key: "name",
      header: "Lead",
      render: (row) => {
        const isMql = !!row.is_mql;
        return (
          <span className="flex items-center gap-1.5">
            {row.name}
            {isMql && (
              <StatusBadge status="mql" category="lead" />
            )}
          </span>
        );
      },
    },
    { key: "company", header: "Company" },
    { key: "source", header: "Source", hideOnMobile: true },
    {
      key: "est_value",
      header: "Est. Value",
      hideOnMobile: true,
      render: (row) => formatCurrency(row.est_value),
    },
    {
      key: "score",
      header: "Score",
      render: (row) => {
        const score = Number(row.score ?? 0);
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-border">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  score >= 70 ? "bg-[var(--shell-warning)]" : score >= 40 ? "bg-[var(--shell-info)]" : "bg-muted-foreground/40"
                )}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums">{score}</span>
          </div>
        );
      },
    },
    {
      key: "tier",
      header: "Tier",
      render: (row) => <Badge variant={tierVariant(row.tier) as any}>{row.tier}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant={statusVariant("lead", row.status) as any}>{row.status}</Badge>,
    },
    { key: "owner", header: "Owner", hideOnMobile: true },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (row) => {
        const isMql = !!row.is_mql;
        return (
          <div className="flex gap-2 items-center">
            {onQualify && isMql && row.status !== "Converted" && row.nurture_status !== "SQL" && (
              <Button
                variant="ghost"
                size="icon-sm"
                title="Qualify to SQL"
                className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onQualify(row); }}
              >
                <BadgeCheck size={14} className="text-[var(--shell-warning)]" />
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(row); }}><Edit2 size={14} className="text-[var(--shell-brand)]" /></Button>
            <Button variant="ghost" size="icon-sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onDelete(row); }}><Trash2 size={14} className="text-[var(--shell-danger)]" /></Button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      data={leads}
      columns={columns}
      rowKey={(row) => row.id}
      onRowClick={(row) => onView(row)}
      emptyMessage="No leads found"
    />
  );
}
