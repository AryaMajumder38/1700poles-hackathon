"use client";

import {
  ArrowDownToLine,
  Clock,
  Hammer,
  TrendingUp,
  Truck,
  Warehouse,
} from "lucide-react";
import type { ItemUnit } from "@/types/lumino";
import { formatQty, formatWithUnit } from "../utils";

interface KpiSummaryStripProps {
  unit: ItemUnit;
  itemCode: string;
  godownName: string;
  totalReceipts: number;
  totalIssues: number;
  totalReturns: number;
  peakGodownStock: number;
  peakGodownMonth: string;
  endingGodownStock: number;
  totalConsumption: number;
  contractorIdleStock: number;
  peakContractorIdleStock: number;
  peakContractorMonth: string;
}

export function KpiSummaryStrip({
  unit,
  godownName,
  totalReceipts,
  totalIssues,
  totalReturns,
  peakGodownStock,
  peakGodownMonth,
  endingGodownStock,
  totalConsumption,
  contractorIdleStock,
  peakContractorIdleStock,
  peakContractorMonth,
}: KpiSummaryStripProps) {
  const netIssues = totalIssues - totalReturns;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* 1. Total Inflow / Receipts */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Total Receipts</span>
          <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-xl font-bold tabular-nums text-slate-900">
            {formatQty(totalReceipts, unit)}
          </span>
          <span className="text-xs font-semibold text-slate-500">{unit}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 truncate">
          Inflow to {godownName === "ALL" ? "All Godowns" : godownName}
        </p>
      </div>

      {/* 2. Net Issues to Contractors */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Net Issued to Contractors</span>
          <Truck className="h-4 w-4 text-amber-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-xl font-bold tabular-nums text-slate-900">
            {formatQty(netIssues, unit)}
          </span>
          <span className="text-xs font-semibold text-slate-500">{unit}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 truncate">
          Issues ({formatQty(totalIssues, unit)}) - Returns ({formatQty(totalReturns, unit)})
        </p>
      </div>

      {/* 3. Peak Godown Stock */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Peak Godown Stock</span>
          <TrendingUp className="h-4 w-4 text-purple-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-xl font-bold tabular-nums text-slate-900">
            {formatQty(peakGodownStock, unit)}
          </span>
          <span className="text-xs font-semibold text-slate-500">{unit}</span>
        </div>
        <p className="mt-1 text-[11px] font-medium text-purple-700 font-mono">
          Peak in {peakGodownMonth || "—"}
        </p>
      </div>

      {/* 4. Current/Ending Godown Stock */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Closing Godown Stock</span>
          <Warehouse className="h-4 w-4 text-blue-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-xl font-bold tabular-nums text-slate-900">
            {formatQty(endingGodownStock, unit)}
          </span>
          <span className="text-xs font-semibold text-slate-500">{unit}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Unissued in godown shelves
        </p>
      </div>

      {/* 5. Project-Wide Total Consumption */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1">
            Total Consumption
            <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-semibold text-slate-600">
              Project
            </span>
          </span>
          <Hammer className="h-4 w-4 text-indigo-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-xl font-bold tabular-nums text-slate-900">
            {formatQty(totalConsumption, unit)}
          </span>
          <span className="text-xs font-semibold text-slate-500">{unit}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Actual field installation
        </p>
      </div>

      {/* 6. Project-Wide Contractor Idle Stock */}
      <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium text-amber-900">
          <span className="flex items-center gap-1 font-semibold">
            Contractor Idle Stock
            <span className="rounded bg-amber-200 px-1 py-0.2 text-[9px] font-bold text-amber-900">
              Field Idle
            </span>
          </span>
          <Clock className="h-4 w-4 text-amber-700" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-xl font-bold tabular-nums text-amber-950">
            {formatQty(contractorIdleStock, unit)}
          </span>
          <span className="text-xs font-semibold text-amber-800">{unit}</span>
        </div>
        <p className="mt-1 text-[11px] font-medium text-amber-800 truncate">
          Peak {formatWithUnit(peakContractorIdleStock, unit)} ({peakContractorMonth})
        </p>
      </div>
    </div>
  );
}
