"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Search,
} from "lucide-react";
import type { ItemUnit, MonthlyLedgerRow } from "@/types/lumino";
import { exportToCsv, formatQty } from "../utils";

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
}

function QtyCell({
  value,
  unit,
  prefix = "",
  emphasize = false,
}: {
  value: number;
  unit: ItemUnit;
  prefix?: string;
  emphasize?: boolean;
}) {
  if (!value) {
    return <span className="text-white/20">—</span>;
  }
  return (
    <>
      <span
        className={`tabular-nums ${emphasize ? "font-medium text-white" : "text-[#e7e7e7]"}`}
      >
        {prefix}
        {formatQty(value, unit)}
      </span>{" "}
      <span className="text-xs text-[#898989]">{unit}</span>
    </>
  );
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
      { field: "opening_stock", label: "Opening", align: "right" },
      { field: "receipts", label: "Receipts", align: "right" },
      { field: "transfers_in", label: "Xfer in", align: "right" },
      { field: "transfers_out", label: "Xfer out", align: "right" },
      { field: "issues", label: "Issues", align: "right" },
      { field: "returns", label: "Returns", align: "right" },
      { field: "net_flow", label: "Net flow", align: "right" },
      { field: "closing_stock", label: "Closing", align: "right" },
    ],
    []
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
    <section className="min-w-0 overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a]">
      {/* Header & Quiet Toolbar */}
      <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            <h3 className="text-[17px] font-medium text-[#e7e7e7]">
              Monthly ledger
            </h3>
            <span className="text-xs tabular-nums text-[#898989]">
              {sortedRows.length} rows
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[#a0a0a0]">
            Monthly material movements in {unit}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#898989]"
              aria-hidden="true"
            />
            <input
              id="ledger-search"
              type="text"
              aria-label="Search ledger by month, godown, or item code"
              placeholder="Search month or godown"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-full rounded-full border border-white/[0.09] bg-[#141414] pl-9 pr-3.5 text-sm text-[#e7e7e7] placeholder:text-[#666666] transition-colors duration-150 hover:border-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:border-white/20"
            />
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={sortedRows.length === 0}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.06] px-4 text-sm font-medium text-[#e7e7e7] transition-all duration-200 hover:bg-white/[0.12] active:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4 text-[#a0a0a0]" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table (sole horizontal scroll surface) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-white/[0.06] bg-white/[0.025] text-xs font-normal text-[#898989]">
            <tr>
              {columns.map((col, idx) => {
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
                const isFirst = idx === 0;
                const isLast = idx === columns.length - 1;

                return (
                  <th
                    key={col.field}
                    scope="col"
                    aria-sort={ariaSort}
                    className={`whitespace-nowrap p-0 ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.field)}
                      className={`flex w-full items-center gap-1 py-3 text-xs font-normal transition-colors duration-150 hover:text-[#e7e7e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/50 cursor-pointer ${
                        isSorted ? "text-[#e7e7e7]" : "text-[#898989]"
                      } ${
                        col.align === "right" ? "justify-end" : "justify-start"
                      } ${isFirst ? "pl-5 pr-3 sm:pl-6" : isLast ? "pl-3 pr-5 sm:pr-6" : "px-3"}`}
                    >
                      <span>{col.label}</span>
                      <SortIcon
                        className={`h-3 w-3 shrink-0 ${
                          isSorted ? "text-white" : "text-white/25"
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="text-sm">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-sm text-[#898989]">
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
                    className="border-b border-white/[0.05] last:border-b-0 transition-colors duration-150 hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap py-2.5 pl-5 pr-3 sm:pl-6 tabular-nums font-medium text-[#e7e7e7]">
                      {r.month}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#a0a0a0]">
                      {r.godown}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <QtyCell value={r.opening_stock} unit={unit} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <QtyCell value={r.receipts} unit={unit} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <QtyCell value={r.transfers_in} unit={unit} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <QtyCell value={r.transfers_out} unit={unit} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <QtyCell value={r.issues} unit={unit} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <QtyCell value={r.returns} unit={unit} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      {r.net_flow === 0 ? (
                        <span className="text-white/20">—</span>
                      ) : (
                        <>
                          <span
                            className={`tabular-nums font-medium ${
                              isNetPositive
                                ? "text-emerald-400"
                                : isNetNegative
                                  ? "text-rose-400"
                                  : "text-[#e7e7e7]"
                            }`}
                          >
                            {isNetPositive
                              ? `+${formatQty(r.net_flow, unit)}`
                              : formatQty(r.net_flow, unit)}
                          </span>{" "}
                          <span className="text-xs text-[#898989]">{unit}</span>
                        </>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pl-3 pr-5 sm:pr-6 text-right">
                      <QtyCell value={r.closing_stock} unit={unit} emphasize />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Minimal Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3.5 sm:px-6 text-xs text-[#898989]">
        <div className="flex items-center gap-3">
          <select
            id="ledger-page-size"
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-8 rounded-full border border-white/[0.09] bg-[#141414] px-3 text-xs text-[#e7e7e7] transition-colors duration-150 hover:border-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer"
          >
            <option value={12} className="bg-[#1a1a1a] text-[#e7e7e7]">
              12 / page
            </option>
            <option value={24} className="bg-[#1a1a1a] text-[#e7e7e7]">
              24 / page
            </option>
            <option value={44} className="bg-[#1a1a1a] text-[#e7e7e7]">
              44 / page
            </option>
          </select>
          <span className="tabular-nums text-[#898989]">
            Page {activePage} of {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage(activePage - 1)}
            disabled={activePage <= 1}
            className="h-8 rounded-full border border-white/[0.06] bg-white/[0.06] px-3.5 text-xs font-medium text-[#e7e7e7] transition-all duration-200 hover:bg-white/[0.12] active:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(activePage + 1)}
            disabled={activePage >= totalPages}
            className="h-8 rounded-full border border-white/[0.06] bg-white/[0.06] px-3.5 text-xs font-medium text-[#e7e7e7] transition-all duration-200 hover:bg-white/[0.12] active:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
