"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Route,
  Scale,
  TrendingDown,
} from "lucide-react";
import type { PlannerBacktestComparison } from "./plannerTypes";
import { formatPlainNumber, formatQty } from "./plannerTypes";

interface TheBarScorecardProps {
  selected: PlannerBacktestComparison;
  allSummaries: PlannerBacktestComparison[];
  onSelectItem: (itemCode: string) => void;
}

export default function TheBarScorecard({
  selected,
  allSummaries,
  onSelectItem,
}: TheBarScorecardProps) {
  const [showAllMatrix, setShowAllMatrix] = useState(false);

  const peakReductionPct =
    selected.actual_peak_idle > 0
      ? ((selected.actual_peak_idle - selected.simulated_peak_idle) /
          selected.actual_peak_idle) *
        100
      : 0;

  const isPositiveReduction = selected.idle_reduction_pct >= 0;
  const shortageQty = selected.total_shortage_qty ?? 0;
  const shortageRate = selected.shortage_rate_pct ?? 0;
  const transferQty = selected.total_transfer_qty ?? 0;
  const kmSaved = selected.estimated_km_saved ?? 0;

  return (
    <section
      aria-label="The Bar Backtest Scorecard"
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-amber-400">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                THE BAR • Zero-Lookahead Backtest
              </span>
              <span className="font-mono text-xs text-slate-500">
                {selected.item_code} • UOM: {selected.unit}
              </span>
            </div>
            <h2 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
              {selected.item_name}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAllMatrix((prev) => !prev)}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer sm:self-center"
        >
          {showAllMatrix ? (
            <>
              Hide All 16 SKUs
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Compare All 16 SKUs
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {/* 4 Headline Side-by-Side KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Avg Idle Stock & Reduction % */}
        <div
          className={`rounded-xl border p-4 ${
            isPositiveReduction
              ? "border-emerald-200 bg-emerald-50/60"
              : "border-amber-200 bg-amber-50/60"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Avg Godown Idle Reduced</span>
            <TrendingDown
              className={`h-4 w-4 ${
                isPositiveReduction ? "text-emerald-600" : "text-amber-600"
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tabular-nums ${
                isPositiveReduction ? "text-emerald-900" : "text-amber-900"
              }`}
            >
              {isPositiveReduction ? "-" : "+"}
              {Math.abs(selected.idle_reduction_pct).toFixed(1)}%
            </span>
            <span className="inline-flex items-center text-xs font-medium text-slate-600">
              {isPositiveReduction ? (
                <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <ArrowUpRight className="h-3.5 w-3.5 text-amber-600" />
              )}
              44-mo avg
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-2 text-xs tabular-nums">
            <div>
              <span className="block text-[11px] text-slate-500">Actual Avg</span>
              <span className="font-semibold text-slate-800">
                {formatQty(selected.actual_avg_idle, selected.unit)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500">Simulated Avg</span>
              <span className="font-semibold text-emerald-800">
                {formatQty(selected.simulated_avg_idle, selected.unit)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Peak Idle Stock */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Peak Yard Pileup (Actual vs Plan)</span>
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
              {peakReductionPct >= 0 ? `-${peakReductionPct.toFixed(1)}%` : `+${Math.abs(peakReductionPct).toFixed(1)}%`}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-slate-900">
              {formatQty(selected.simulated_peak_idle, selected.unit)}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-2 text-xs tabular-nums">
            <div>
              <span className="block text-[11px] text-slate-500">Historical Peak</span>
              <span className="font-semibold text-amber-800">
                {formatQty(selected.actual_peak_idle, selected.unit)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500">Total Ordered</span>
              <span className="font-semibold text-slate-800">
                {formatQty(selected.simulated_total_ordered, selected.unit)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Transparent Shortage & Stockout Audit */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-900">
            <span>Shortages Caused (Unmasked)</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-rose-950">
              {selected.simulated_stockout_months} / 44 mo
            </span>
            <span className="text-xs font-medium text-rose-700 tabular-nums">
              ({shortageRate.toFixed(1)}% vol)
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-rose-200/70 pt-2 text-xs tabular-nums">
            <div>
              <span className="block text-[11px] text-rose-700/80">Total Short Qty</span>
              <span className="font-semibold text-rose-900">
                {formatQty(shortageQty, selected.unit)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-rose-700/80">Actual Stockouts</span>
              <span className="font-semibold text-slate-800">
                {selected.actual_stockout_months} / 44 mo
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: LP Inter-Godown Logistics */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-900">
            <span>Stage A LP Transfers</span>
            <Route className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-sky-950">
              {selected.total_transfers_recommended} routes
            </span>
            <span className="text-xs font-medium text-sky-700">1–2d transit</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-sky-200/70 pt-2 text-xs tabular-nums">
            <div>
              <span className="block text-[11px] text-sky-800/80">Rebalanced Vol</span>
              <span className="font-semibold text-sky-950">
                {formatQty(transferQty, selected.unit)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-sky-800/80">Est. Haul Saved</span>
              <span className="font-semibold text-emerald-800">
                {formatPlainNumber(kmSaved)} km
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable 16-SKU Bar Comparison Matrix (never sums across UOMs) */}
      {showAllMatrix && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-900 text-slate-100">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">SKU</th>
                <th className="px-3 py-2.5 text-left font-semibold">Item Name</th>
                <th className="px-3 py-2.5 text-right font-semibold">Actual Avg Idle</th>
                <th className="px-3 py-2.5 text-right font-semibold">Simulated Avg Idle</th>
                <th className="px-3 py-2.5 text-right font-semibold">Idle Reduction</th>
                <th className="px-3 py-2.5 text-right font-semibold">Shortage Qty</th>
                <th className="px-3 py-2.5 text-right font-semibold">Stockout Mo (Act / Sim)</th>
                <th className="px-3 py-2.5 text-right font-semibold">LP Transfers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {allSummaries.map((row) => {
                const isSelected = row.item_code === selected.item_code;
                const pos = row.idle_reduction_pct >= 0;
                return (
                  <tr
                    key={row.item_code}
                    onClick={() => onSelectItem(row.item_code)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-amber-50/90 font-medium"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold text-slate-800">
                      {row.item_code}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-slate-700" title={row.item_name}>
                      {row.item_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
                      {formatQty(row.actual_avg_idle, row.unit)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-900">
                      {formatQty(row.simulated_avg_idle, row.unit)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          pos
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {pos ? "-" : "+"}
                        {Math.abs(row.idle_reduction_pct).toFixed(1)}%
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-rose-700">
                      {formatQty(row.total_shortage_qty ?? 0, row.unit)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-700">
                      {row.actual_stockout_months} /{" "}
                      <span className="font-semibold text-rose-700">
                        {row.simulated_stockout_months}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-semibold text-sky-700">
                      {row.total_transfers_recommended}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            Click any SKU row to inspect its 44-month causal replay. Quantities are strictly per-SKU with native UOM (never summed across distinct units). Negative reduction on discontinued early fastener SKUs (e.g., MNB010174 / MNB010128) reflects honest zero-lookahead lag when Lumino switched specs mid-project.
          </div>
        </div>
      )}
    </section>
  );
}
