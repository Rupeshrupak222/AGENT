import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = "No data found",
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        "bg-surface-card border-line",
        "dark:bg-[rgba(21,3,5,0.7)] dark:border-white/[0.07]",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line dark:border-white/[0.06]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wider text-content-muted dark:text-white/35",
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-content-muted dark:text-white/35"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr
                  key={keyExtractor(item, i)}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "border-b border-line/50 dark:border-white/[0.03] transition-colors",
                    onRowClick && "cursor-pointer hover:bg-brand-500/[0.03] dark:hover:bg-brand-500/[0.06]"
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 text-content-secondary dark:text-white/65", col.className)}>
                      {col.render
                        ? col.render(item, i)
                        : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
