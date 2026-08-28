"use client";

import { useState, useMemo, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "../ui/button";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  pageSizes?: number[];
  emptyMessage?: string;
  /** Unique key extractor for row identity */
  rowKey: (row: T) => string | number;
  /** Optional row click handler */
  onRowClick?: (row: T) => void;
  /** Render entire row as custom element (overrides columns) */
  renderRow?: (row: T, index: number) => ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  pageSize: initialPageSize = 25,
  pageSizes = [10, 25, 50, 100],
  emptyMessage = "No records found",
  rowKey,
  onRowClick,
  renderRow,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const pagedData = useMemo(
    () => data.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [data, safePage, pageSize],
  );

  // Reset to first page when data changes size
  if (page >= totalPages && totalPages > 0) {
    setPage(totalPages - 1);
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Table — hidden on mobile, visible on md+ */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pagedData.map((row, i) => (
              <tr
                key={rowKey(row)}
                className={`transition-colors hover:bg-muted/30 ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                    {col.render
                      ? col.render(row, safePage * pageSize + i)
                      : String((row as any)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list — visible on < md */}
      <div className="md:hidden divide-y divide-border">
        {pagedData.map((row, i) => (
          <div
            key={rowKey(row)}
            className={`p-4 space-y-2 ${onRowClick ? "cursor-pointer hover:bg-muted/30" : ""}`}
            onClick={() => onRowClick?.(row)}
          >
            {renderRow
              ? renderRow(row, safePage * pageSize + i)
              : columns
                  .filter((col) => !col.hideOnMobile)
                  .slice(0, 3)
                  .map((col) => (
                    <div key={col.key} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{col.header}</span>
                      <span className="text-sm font-medium text-foreground truncate max-w-[60%] text-right">
                        {col.render
                          ? col.render(row, safePage * pageSize + i)
                          : String((row as any)[col.key] ?? "")}
                      </span>
                    </div>
                  ))}
          </div>
        ))}
      </div>

      {/* Pagination footer */}
      {data.length > 0 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, data.length)} of{" "}
              {data.length}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="h-7 rounded border border-border bg-transparent px-1.5 text-xs text-muted-foreground"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setPage(0)}
              disabled={safePage === 0}
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 text-xs text-muted-foreground tabular-nums">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setPage(totalPages - 1)}
              disabled={safePage >= totalPages - 1}
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
