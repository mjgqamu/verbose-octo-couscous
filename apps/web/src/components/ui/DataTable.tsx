import { type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: string;
  onRowClick?: (row: T) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  loading?: boolean;
  emptyState?: ReactNode;
  rowClassName?: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  sortBy,
  sortDir,
  onSort,
  loading,
  emptyState,
  rowClassName,
}: DataTableProps<T>) {
  const getSortIcon = (key: string) => {
    if (sortBy !== key) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 inline ml-1" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-600 inline ml-1" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-600 inline ml-1" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center px-6 py-4 border-b border-gray-100 last:border-0">
              {columns.slice(0, 4).map((_, j) => (
                <div key={j} className="flex-1 h-4 bg-gray-100 rounded mr-4 last:mr-0" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Desktop: table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.sortable ? "cursor-pointer select-none hover:text-gray-700" : ""} ${col.className ?? ""}`}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  {col.header}
                  {col.sortable && getSortIcon(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={String((row as Record<string, unknown>)[keyField])}
                className={`border-b border-gray-100 last:border-0 ${onRowClick ? "cursor-pointer hover:bg-blue-50/50 transition-colors" : "hover:bg-gray-50/50"} ${rowClassName?.(row) ?? ""}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-sm ${col.className ?? ""}`}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card view */}
      <div className="md:hidden divide-y divide-gray-100">
        {data.map((row) => (
          <div
            key={String((row as Record<string, unknown>)[keyField])}
            className={`p-4 ${onRowClick ? "cursor-pointer active:bg-blue-50" : ""}`}
            onClick={() => onRowClick?.(row)}
          >
            {columns.slice(0, 2).map((col) => (
              <div key={col.key} className="flex justify-between items-center py-1">
                <span className="text-xs text-gray-500 font-medium">{col.header}</span>
                <span className="text-sm text-gray-900">
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                </span>
              </div>
            ))}
            {columns.slice(2).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {columns.slice(2).map((col) => (
                  <span key={col.key} className="text-xs">
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
