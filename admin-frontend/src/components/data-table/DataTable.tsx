// Generic DataTable — tái sử dụng cho Users, Reports, Media, Audit, ...
// Hỗ trợ: search, sort, pagination, bulk select, row actions, empty/loading states.

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onPageChange?: (p: number) => void;
  emptyState?: React.ReactNode;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  enableRowSelection?: boolean;
  selectedRowKeys?: string[];
  onSelectedChange?: (keys: string[]) => void;
  toolbar?: React.ReactNode;
  density?: "compact" | "normal";
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  isLoading,
  searchPlaceholder = "Tìm kiếm...",
  searchValue = "",
  onSearchChange,
  onPageChange,
  emptyState,
  rowKey,
  onRowClick,
  enableRowSelection = false,
  selectedRowKeys = [],
  onSelectedChange,
  toolbar,
  density = "normal",
  className,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allKeys = data.map(rowKey);
  const allSelected =
    allKeys.length > 0 && allKeys.every((k) => selectedRowKeys.includes(k));
  const someSelected = !allSelected && allKeys.some((k) => selectedRowKeys.includes(k));

  const toggleAll = () => {
    if (!onSelectedChange) return;
    if (allSelected) onSelectedChange([]);
    else onSelectedChange(allKeys);
  };

  const toggleRow = (k: string) => {
    if (!onSelectedChange) return;
    if (selectedRowKeys.includes(k))
      onSelectedChange(selectedRowKeys.filter((x) => x !== k));
    else onSelectedChange([...selectedRowKeys, k]);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Toolbar */}
      {(onSearchChange || toolbar) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {onSearchChange && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
              {searchValue && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2 flex-wrap">{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                {enableRowSelection && (
                  <th className="w-10 p-3">
                    <Checkbox
                      checked={allSelected}
                      // @ts-ignore
                      indeterminate={someSelected}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.id}
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(
                      "p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                    className="p-12 text-center"
                  >
                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                      <Spinner className="h-4 w-4" /> Đang tải...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                    className="p-12 text-center text-muted-foreground"
                  >
                    {emptyState || "Không có dữ liệu"}
                  </td>
                </tr>
              ) : (
                data.map((row, i) => {
                  const k = rowKey(row);
                  const selected = selectedRowKeys.includes(k);
                  return (
                    <tr
                      key={k}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(
                        "border-b last:border-0 transition-colors",
                        onRowClick && "cursor-pointer hover:bg-muted/30",
                        selected && "bg-primary/5"
                      )}
                    >
                      {enableRowSelection && (
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleRow(k)}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          className={cn(
                            density === "compact" ? "p-2" : "p-3",
                            "align-middle",
                            col.className
                          )}
                        >
                          {col.cell(row, i)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {onPageChange && total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} kết quả · trang {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(1)}
              title="Trang đầu"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(totalPages)}
              title="Trang cuối"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
