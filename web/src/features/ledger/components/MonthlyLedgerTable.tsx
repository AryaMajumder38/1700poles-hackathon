"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import type { ItemUnit, MonthlyLedgerRow } from "@/types/lumino";
import { exportToCsv, formatQty } from "../utils";

interface MonthlyLedgerTableProps {
  rows: MonthlyLedgerRow[];
  unit: ItemUnit;
  itemCode: string;
  itemName: string;
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

export function MonthlyLedgerTable({
  rows,
  unit,
  itemCode,
  itemName,
  godownName,
}: MonthlyLedgerTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("month");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [pageSize, setPageSize] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);

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
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];

      if (typeof valA === "string" && typeof valB === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [filteredRows, sortField, sortAsc]);

  // Paginate
  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  const handleExport = () => {
    const filename = `ledger_${itemCode}_${godownName.replace(/\s+/g, "_")}`;
    const headers = [
      "Month",
      "Godown",
      "Item Code",
      "Item Name",
      `Unit`,
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-slate-700" />
            <h4 className="text-sm font-semibold text-slate-900">
              Monthly Inventory Flow Ledger ({sortedRows.length} Records)
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Full audit ledger of material movements. All quantities formatted in <strong>{unit}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search month/godown..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* CSV Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
            <tr>
              <th
                onClick={() => handleSort("month")}
                className="cursor-pointer px-3.5 py-2.5 hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  <span>Month</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("godown")}
                className="cursor-pointer px-3.5 py-2.5 hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  <span>Godown</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("opening_stock")}
                className="cursor-pointer px-3 py-2.5 text-right hover:bg-slate-100"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Opening</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("receipts")}
                className="cursor-pointer px-3 py-2.5 text-right text-emerald-800 hover:bg-slate-100"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Receipts (+)</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("transfers_in")}
                className="cursor-pointer px-3 py-2.5 text-right text-blue-800 hover:bg-slate-100"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Xfer In (+)</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("transfers_out")}
                className="cursor-pointer px-3 py-2.5 text-right text-indigo-800 hover:bg-slate-100"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Xfer Out (-)</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("issues")}
                className="cursor-pointer px-3 py-2.5 text-right text-amber-800 hover:bg-slate-100"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Issues (-)</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("returns")}
                className="cursor-pointer px-3 py-2.5 text-right text-teal-800 hover:bg-slate-100"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Returns (+)</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("net_flow")}
                className="cursor-pointer px-3 py-2.5 text-right hover:bg-slate-100"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Net Flow</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("closing_stock")}
                className="cursor-pointer px-3.5 py-2.5 text-right font-bold text-slate-900 bg-purple-50/60 hover:bg-purple-100/60"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Closing ({unit})</span>
                  <ArrowUpDown className="h-3 w-3 text-purple-600" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500 font-sans">
                  No ledger rows found matching your filters.
                </td>
              </tr>
            ) : (
              paginatedRows.map((r, i) => {
                const isNetPositive = r.net_flow > 0;
                const isNetNegative = r.net_flow < 0;

                return (
                  <tr
                    key={`${r.month}-${r.godown}-${r.item_code}-${i}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="whitespace-nowrap px-3.5 py-2 font-medium text-slate-900">
                      {r.month}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 font-sans text-slate-700">
                      {r.godown}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-slate-600">
                      {formatQty(r.opening_stock, unit)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-emerald-700 font-semibold">
                      {r.receipts > 0 ? `+${formatQty(r.receipts, unit)}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-blue-700">
                      {r.transfers_in > 0 ? `+${formatQty(r.transfers_in, unit)}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-indigo-700">
                      {r.transfers_out > 0 ? `-${formatQty(r.transfers_out, unit)}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-amber-700">
                      {r.issues > 0 ? `-${formatQty(r.issues, unit)}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-teal-700">
                      {r.returns > 0 ? `+${formatQty(r.returns, unit)}` : "—"}
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
                        ? `+${formatQty(r.net_flow, unit)}`
                        : formatQty(r.net_flow, unit)}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-right font-bold text-slate-900 bg-purple-50/30">
                      {formatQty(r.closing_stock, unit)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            <option value={12}>12 months</option>
            <option value={24}>24 months</option>
            <option value={44}>Full 44 months</option>
          </select>
          <span className="text-slate-400">|</span>
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded border border-slate-200 px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded border border-slate-200 px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
