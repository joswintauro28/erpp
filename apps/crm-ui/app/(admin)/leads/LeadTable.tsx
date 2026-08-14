"use client";

import { Edit2, Trash2, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
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
  if (!leads?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--shell-muted)]">
        <p className="text-sm">No leads found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>LEAD</TableHead>
          <TableHead>COMPANY</TableHead>
          <TableHead>SOURCE</TableHead>
          <TableHead>EST. VALUE</TableHead>
          <TableHead>SCORE</TableHead>
          <TableHead>TIER</TableHead>
          <TableHead>STATUS</TableHead>
          <TableHead>OWNER</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((item: any) => {
          const score = Number(item.score ?? 0);
          const isMql = !!item.is_mql;
          return (
            <TableRow key={item.id} className={cn(isMql && "bg-amber-50/40")}>
              <TableCell className="text-[var(--shell-muted)] cursor-pointer" onClick={() => onView(item)}>{item.id_str}</TableCell>
              <TableCell className="font-medium text-[var(--shell-foreground)] cursor-pointer" onClick={() => onView(item)}>
                <span className="flex items-center gap-1.5">
                  {item.name}
                  {isMql && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800 border border-amber-300">
                      <BadgeCheck className="h-2.5 w-2.5" /> MQL
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell>{item.company}</TableCell>
              <TableCell>{item.source}</TableCell>
              <TableCell>{formatCurrency(item.est_value)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--shell-border)]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        score >= 70 ? "bg-amber-500" : score >= 40 ? "bg-sky-500" : "bg-slate-400"
                      )}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold tabular-nums">{score}</span>
                </div>
              </TableCell>
              <TableCell><Badge variant={tierVariant(item.tier)}>{item.tier}</Badge></TableCell>
              <TableCell><Badge variant={statusVariant("lead", item.status)}>{item.status}</Badge></TableCell>
              <TableCell>{item.owner}</TableCell>
              <TableCell>
                <div className="flex gap-2 text-[var(--shell-muted)] items-center">
                  {onQualify && isMql && item.status !== "Converted" && item.nurture_status !== "SQL" && (
                    <Button
                      size="icon-sm"
                      title="Qualify to SQL & create Opportunity"
                      className="hover:text-amber-600 cursor-pointer"
                      onClick={() => onQualify(item)}
                    >
                      <BadgeCheck size={14} />
                    </Button>
                  )}
                  <Button size="icon-sm" className="hover:text-[var(--shell-foreground)] cursor-pointer" onClick={() => onEdit(item)}><Edit2 size={14} /></Button>
                  <Button size="icon-sm" className="hover:text-red-500 cursor-pointer" onClick={() => onDelete(item)}><Trash2 size={14} /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
