"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { money } from "@/utils/format";

export interface KanbanItem {
  id: number;
  title: string;
  subtitle: string;
  amount: number;
  status: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  items: KanbanItem[];
  color: string;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onItemClick: (id: number) => void;
  onStatusChange?: (itemId: number, newStatus: string) => void;
}

const statusVariant = (s: string) => {
  if (s === "paid") return "default" as const;
  if (s === "sent" || s === "pending") return "secondary" as const;
  if (s === "overdue") return "destructive" as const;
  return "outline" as const;
};

export function KanbanBoard({ columns, onItemClick, onStatusChange }: KanbanBoardProps) {
  const [dragId, setDragId] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, itemId: number, fromStatus: string) => {
    setDragId(itemId);
    e.dataTransfer.setData("text/plain", JSON.stringify({ itemId, fromStatus }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, toStatus: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.fromStatus !== toStatus && onStatusChange) {
        onStatusChange(data.itemId, toStatus);
      }
    } catch { /* ignore */ }
    setDragId(null);
  };

  const gridCols = columns.length <= 3 ? "md:grid-cols-3" : columns.length === 4 ? "md:grid-cols-4" : "md:grid-cols-5";

  return (
    <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
      {columns.map((col) => (
        <div
          key={col.id}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.id)}
          className="flex flex-col rounded-xl border border-border bg-card/50"
        >
          <div
            className="flex items-center justify-between rounded-t-xl px-4 py-3"
            style={{ borderBottom: `2px solid ${col.color}` }}
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
              <span className="text-xs font-heading font-semibold tracking-tight text-foreground">
                {col.title}
              </span>
            </div>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-border/50 text-[10px] font-mono font-bold text-muted-foreground">
              {col.items.length}
            </span>
          </div>

          <div className="flex-1 space-y-2 p-3 min-h-[200px]">
            {col.items.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <span className="rounded-lg border border-dashed border-border px-4 py-2">No items</span>
              </div>
            ) : (
              col.items.map((item) => (
                <div
                  key={item.id}
                  draggable={!!onStatusChange}
                  onDragStart={(e) => handleDragStart(e, item.id, col.id)}
                  className={`group cursor-pointer rounded-lg border border-border bg-card p-3 transition-all duration-150 hover:shadow-sm hover:-translate-y-0.5 ${dragId === item.id ? "opacity-50" : ""}`}
                  onClick={() => onItemClick(item.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); onItemClick(item.id); }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-foreground">{money(item.amount)}</span>
                    <Badge variant={statusVariant(item.status)} className="capitalize text-[10px] px-1.5 py-0">
                      {item.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
