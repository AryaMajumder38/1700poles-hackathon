"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import type { ItemUnit, MonthlyLedgerRow } from "@/types/lumino";
import { exportToCsv, formatWithUnit } from "../utils";

interface MonthlyLedgerTableProps {
  rows: MonthlyLedgerRow[];
  unit: ItemUnit;
  itemCode: string;
  godownName: string;
}

type SortField =
  | "month"
  | "godown"
  | "opening_stock"
  | "receipts"
  | "transfers_in"
  | "transfers_out"
  | "issues"
  | "returns"
  | "net_flow"
  | "closing_stock";

interface ColumnDef {
  field: SortField;
  label: string;
  align: "left" | "right";
  thClassName?: string;
  iconClassName?: string;
}

export function MonthlyLedgerTable({
  rows,
  unit,
  itemCode,
  godownName,
}: MonthlyLedgerTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("month");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [pageSize, setPageSize] = useState<number>(12);
  const [pagination, setPagination] = useState<{
    rowsRef: MonthlyLedgerRow[];
    page: number;
  }>({ rowsRef: rows, page: 1 });

  // Filter rows by search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(
      (r) =>
        r.month.toLowerCase().includes(q) ||
        r.godown.toLowerCase().includes(q) ||
        r.item_code.toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  // Sort rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === "string" && typeof valB === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [filteredRows, sortField, sortAsc]);

  // Paginate with automatic reset when rows prop changes and clamping when filtered results shrink
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const activePage =
    pagination.rowsRef === rows ? Math.min(pagination.page, totalPages) : 1;

  const setCurrentPage = (nextPage: number) => {
    setPagination({
      rowsRef: rows,
      page: Math.min(Math.max(1, nextPage), totalPages),
    });
  };

  const paginatedRows = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, activePage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  const columns: ColumnDef[] = useMemo(
    () => [
      { field: "month", label: "Month", align: "left" },
      { field: "godown", label: "Godown", align: "left" },
      { field: "opening_stock", label: `Opening (${unit})`, align: "right" },
      {
        field: "receipts",
        label: `Receipts (+)`,
        align: "right",
        thClassName: "text-emerald-800",
      },
      {
        field: "transfers_in",
        label: `Xfer In (+)`,
        align: "right",
        thClassName: "text-blue-800",
      },
      {
        field: "transfers_out",
        label: `Xfer Out (-)`,
        align: "right",
        thClassName: "text-indigo-800",
      },
      {
        field: "issues",
        label: `Issues (-)`,
        align: "right",
        thClassName: "text-amber-800",
      },
      {
        field: "returns",
        label: `Returns (+)`,
        align: "right",
        thClassName: "text-teal-800",
      },
      { field: "net_flow", label: `Net Flow (${unit})`, align: "right" },
      {
        field: "closing_stock",
        label: `Closing (${unit})`,
        align: "right",
        thClassName: "font-bold text-slate-900 bg-purple-50/60",
        iconClassName: "text-purple-600",
      },
    ],
    [unit]
  );

  const handleExport = () => {
    const filename = `ledger_${itemCode}_${godownName.replace(/\s+/g, "_")}`;
    const headers = [
      "Month",
      "Godown",
      "Item Code",
      "Item Name",
      "Unit",
      `Opening Stock (${unit})`,
      `Receipts (${unit})`,
      `Transfers In (${unit})`,
      `Transfers Out (${unit})`,
      `Issues (${unit})`,
      `Returns (${unit})`,
      `Net Flow (${unit})`,
      `Closing Stock (${unit})`,
    ];

    const data = sortedRows.map((r) => [
      r.month,
      r.godown,
      r.item_code,
      r.item_name,
      r.unit,
      r.opening_stock,
      r.receipts,
      r.transfers_in,
      r.transfers_out,
      r.issues,
      r.returns,
      r.net_flow,
      r.closing_stock,
    ]);

    exportToCsv(filename, headers, data);
  };

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      {/* Header & Actions */}
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-700" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-slate-900">
              Monthly Inventory Flow Ledger ({sortedRows.length} Records)
            </h4>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Full audit ledger of material movements. All quantities formatted in{" "}
            <strong>{unit}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative w-full sm:w-56">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="ledger-search"
              type="text"
              aria-label="Search ledger by month, godown, or item code"
              placeholder="Search month/godown..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* CSV Export Button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={sortedRows.length === 0}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container (sole horizontal scroll surface) */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
            <tr>
              {columns.map((col) => {
                const isSorted = sortField === col.field;
                const ariaSort = isSorted
                  ? sortAsc
                    ? "ascending"
                    : "descending"
                  : "none";
                const SortIcon = isSorted
                  ? sortAsc
                    ? ArrowUp
                    : ArrowDown
                  : ArrowUpDown;

                return (
                  <th
                    key={col.field}
                    scope="col"
                    aria-sort={ariaSort}
                    className={`p-0 whitespace-nowrap ${
                      col.align === "right" ? "text-right" : "text-left"
                    } ${col.thClassName ?? ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.field)}
                      className={`flex w-full items-center gap-1 px-3 py-2.5 font-inherit transition hover:bg-slate-100/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 cursor-pointer ${
                        col.align === "right" ? "justify-end" : "justify-start"
                      } ${
                        col.field === "closing_stock"
                          ? "px-3.5 hover:bg-purple-100/60"
                          : col.field === "month" || col.field === "godown"
                            ? "px-3.5"
                            : ""
                      }`}
                    >
                      <span>{col.label}</span>
                      <SortIcon
                        className={`h-3 w-3 shrink-0 ${
                          isSorted
                            ? col.iconClassName ?? "text-amber-600"
                            : col.iconClassName ?? "text-slate-400"
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px] tabular-nums">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center font-sans text-slate-500">
                  No ledger rows found matching your filters.
                </td>
              </tr>
            ) : (
              paginatedRows.map((r) => {
                const isNetPositive = r.net_flow > 0;
                const isNetNegative = r.net_flow < 0;

                return (
                  <tr
                    key={`${r.month}-${r.godown}-${r.item_code}`}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-3.5 py-2 font-medium text-slate-900">
                      {r.month}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 font-sans text-slate-700">
                      {r.godown}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-slate-600">
                      {formatWithUnit(r.opening_stock, unit)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-emerald-700">
                      {r.receipts > 0 ? `+${formatWithUnit(r.receipts, unit)}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-blue-700">
                      {r.transfers_in > 0 ? `+${formatWithUnit(r.transfers_in, unit)}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-indigo-700">
                      {r.transfers_out > 0 ? `-${formatWithUnit(r.transfers_out, unit)}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-amber-700">
                      {r.issues > 0 ? `-${formatWithUnit(r.issues, unit)}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-teal-700">
                      {r.returns > 0 ? `+${formatWithUnit(r.returns, unit)}` : "—"}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 text-right font-medium ${
                        isNetPositive
                          ? "text-emerald-700"
                          : isNetNegative
                            ? "text-rose-600"
                            : "text-slate-400"
                      }`}
                    >
                      {isNetPositive
                        ? `+${formatWithUnit(r.net_flow, unit)}`
                        : formatWithUnit(r.net_flow, unit)}
                    </td>
                    <td className="whitespace-nowrap bg-purple-50/30 px-3.5 py-2 text-right font-bold text-slate-900">
                      {formatWithUnit(r.closing_stock, unit)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="ledger-page-size">Rows per page:</label>
          <select
            id="ledger-page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value={12}>12 rows</option>
            <option value={24}>24 rows</option>
            <option value={44}>44 rows</option>
          </select>
          <span className="text-slate-400" aria-hidden="true">|</span>
          <span>
            Page {activePage} of {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage(activePage - 1)}
            disabled={activePage <= 1}
            className="rounded border border-slate-200 px-2.5 py-1 font-medium transition hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(activePage + 1)}
            disabled={activePage >= totalPages}
            className="rounded border border-slate-200 px-2.5 py-1 font-medium transition hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
