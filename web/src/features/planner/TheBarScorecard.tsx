"use client";

import { Check } from "lucide-react";
import type { PlannerBacktestComparison } from "./plannerTypes";
import { formatPlainNumber, formatQty } from "./plannerTypes";

interface TheBarScorecardProps {
  selected: PlannerBacktestComparison;
  allSummaries: PlannerBacktestComparison[];
  onSelectItem: (itemCode: string) => void;
  showAllMatrix: boolean;
}

export default function TheBarScorecard({
  selected,
  allSummaries,
  onSelectItem,
  showAllMatrix,
}: TheBarScorecardProps) {
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
      id="planner-the-bar"
      aria-label="The Bar Backtest Scorecard"
      className="relative border-y border-[#dbd7da] bg-[#fffcfc]"
    >
      {/* Centered 10px uppercase mono proof label interrupting the top boundary */}
      <div className="pointer-events-none flex justify-center">
        <span className="hp-mono -translate-y-1/2 bg-[#fffcfc] px-3 text-[10px] uppercase tracking-[0.0833em] text-[#43394c]">
          THE BAR · 44-MONTH ZERO-LOOKAHEAD PROOF · {selected.item_code} ({selected.unit})
        </span>
      </div>

      {/* Continuous 4-Column Ruled Proof Strip — Metrics First + Concise Labels */}
      <div className="grid grid-cols-1 divide-y divide-[#e9e5e8] sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4">
        {/* Cell 1 */}
        <div className="flex flex-col justify-between gap-1.5 border-b border-[#e9e5e8] px-5 pt-2.5 pb-5 sm:border-r xl:border-b-0">
          <div className="flex items-center justify-between">
            <span className="hp-mono text-[10px] uppercase tracking-[0.08em] text-[#89828d]">
              Idle Reduction
            </span>
            {isPositiveReduction && (
              <Check className="h-3.5 w-3.5 text-[#2c7a62]" />
            )}
          </div>
          <div
            className="hp-heading text-[28px] font-extrabold leading-none tabular-nums"
            style={{ color: isPositiveReduction ? "#2c7a62" : "#a98529" }}
          >
            {isPositiveReduction ? "−" : "+"}
            {Math.abs(selected.idle_reduction_pct).toFixed(1)}%
          </div>
          <p className="text-xs font-light text-[#43394c] tabular-nums">
            Avg yard stock: {formatQty(selected.actual_avg_idle, selected.unit)} →{" "}
            <span className="font-medium text-[#14141c]">
              {formatQty(selected.simulated_avg_idle, selected.unit)}
            </span>
          </p>
        </div>

        {/* Cell 2 */}
        <div className="flex flex-col justify-between gap-1.5 border-b border-[#e9e5e8] px-5 pt-2.5 pb-5 xl:border-r xl:border-b-0">
          <div className="flex items-center justify-between">
            <span className="hp-mono text-[10px] uppercase tracking-[0.08em] text-[#89828d]">
              Peak Stock
            </span>
            <span className="hp-mono text-[10px] text-[#43394c]">
              {peakReductionPct >= 0
                ? `−${peakReductionPct.toFixed(1)}%`
                : `+${Math.abs(peakReductionPct).toFixed(1)}%`}
            </span>
          </div>
          <div className="hp-heading text-[28px] font-extrabold leading-none tabular-nums text-[#14141c]">
            {formatQty(selected.simulated_peak_idle, selected.unit)}
          </div>
          <p className="text-xs font-light text-[#43394c] tabular-nums">
            Worst-month pileup (was {formatQty(selected.actual_peak_idle, selected.unit)})
          </p>
        </div>

        {/* Cell 3 */}
        <div className="flex flex-col justify-between gap-1.5 border-b border-[#e9e5e8] px-5 pt-2.5 pb-5 sm:border-r sm:border-b-0">
          <div className="flex items-center justify-between">
            <span className="hp-mono text-[10px] uppercase tracking-[0.08em] text-[#89828d]">
              Shortages
            </span>
            <span className="hp-mono text-[10px] text-[#b43c57]">
              {shortageRate.toFixed(1)}% vol
            </span>
          </div>
          <div className="hp-heading text-[28px] font-extrabold leading-none tabular-nums text-[#b43c57]">
            {selected.simulated_stockout_months}
            <span className="text-base font-semibold text-[#89828d]"> / 44 mo</span>
          </div>
          <p className="text-xs font-light text-[#43394c] tabular-nums">
            Unmet demand ({formatQty(shortageQty, selected.unit)})
          </p>
        </div>

        {/* Cell 4 */}
        <div className="flex flex-col justify-between gap-1.5 px-5 pt-2.5 pb-5">
          <div className="flex items-center justify-between">
            <span className="hp-mono text-[10px] uppercase tracking-[0.08em] text-[#89828d]">
              Transfers
            </span>
            <span className="hp-mono text-[10px] text-[#2c7a62]">
              {formatPlainNumber(kmSaved)} km saved
            </span>
          </div>
          <div className="hp-heading text-[28px] font-extrabold leading-none tabular-nums text-[#31263b]">
            {selected.total_transfers_recommended}
            <span className="text-base font-semibold text-[#89828d]"> routes</span>
          </div>
          <p className="text-xs font-light text-[#43394c] tabular-nums">
            Inter-yard rebalancing ({formatQty(transferQty, selected.unit)})
          </p>
        </div>
      </div>

      {/* Expandable 16-SKU Ruled Comparison Matrix */}
      {showAllMatrix && (
        <div className="border-t border-[#dbd7da] bg-[#fffcfc]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#dbd7da] bg-[#fcf8f8] text-[#43394c]">
                  <th className="hp-mono px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em]">
                    SKU
                  </th>
                  <th className="hp-mono px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em]">
                    Material
                  </th>
                  <th className="hp-mono px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em]">
                    Actual Avg
                  </th>
                  <th className="hp-mono px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em]">
                    Plan Avg
                  </th>
                  <th className="hp-mono px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em]">
                    Idle Delta
                  </th>
                  <th className="hp-mono px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em]">
                    Shortage Qty
                  </th>
                  <th className="hp-mono px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em]">
                    Stockouts (Act/Sim)
                  </th>
                  <th className="hp-mono px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em]">
                    LP Routes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9e5e8]">
                {allSummaries.map((row) => {
                  const isSelected = row.item_code === selected.item_code;
                  const pos = row.idle_reduction_pct >= 0;
                  return (
                    <tr
                      key={row.item_code}
                      onClick={() => onSelectItem(row.item_code)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "hp-stipple bg-[#fcf8f8] font-medium"
                          : "hover:bg-[#fcf8f8]"
                      }`}
                    >
                      <td className="hp-mono whitespace-nowrap px-5 py-3 font-semibold text-[#14141c]">
                        {isSelected && (
                          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#31263b] align-middle" />
                        )}
                        {row.item_code}
                      </td>
                      <td
                        className="max-w-xs truncate px-4 py-3 text-[#31263b]"
                        title={row.item_name}
                      >
                        {row.item_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-[#43394c]">
                        {formatQty(row.actual_avg_idle, row.unit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-[#14141c]">
                        {formatQty(row.simulated_avg_idle, row.unit)}
                      </td>
                      <td
                        className="hp-mono whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums"
                        style={{ color: pos ? "#2c7a62" : "#a98529" }}
                      >
                        {pos ? "−" : "+"}
                        {Math.abs(row.idle_reduction_pct).toFixed(1)}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-[#b43c57]">
                        {formatQty(row.total_shortage_qty ?? 0, row.unit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-[#43394c]">
                        {row.actual_stockout_months} /{" "}
                        <span className="font-semibold text-[#b43c57]">
                          {row.simulated_stockout_months}
                        </span>
                      </td>
                      <td className="hp-mono whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-[#31263b]">
                        {row.total_transfers_recommended}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#e9e5e8] bg-[#fcf8f8] px-5 py-2.5 text-[11px] font-light text-[#89828d]">
            Click any SKU row to load its 44-month causal replay. All figures keep native per-SKU UOMs (never summed across units).
          </div>
        </div>
      )}
    </section>
  );
}
