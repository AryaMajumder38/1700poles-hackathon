"use client";

import type { SimulationAction } from "@/types/lumino";
import { QtyText } from "./HexPrimitives";
import type { PlannerBacktestComparison } from "./plannerTypes";
import { formatPlainNumber, shortGodownName } from "./plannerTypes";

interface TheBarScorecardProps {
  selected: PlannerBacktestComparison;
  allSummaries: PlannerBacktestComparison[];
  onSelectItem: (itemCode: string) => void;
  showAllMatrix: boolean;
  scopedGodown?: string | null;
  scopedMonthAction?: SimulationAction | null;
  scopedTransferCount?: number;
}

export default function TheBarScorecard({
  selected,
  allSummaries,
  onSelectItem,
  showAllMatrix,
  scopedGodown,
  scopedMonthAction,
  scopedTransferCount,
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
      className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a]"
    >
      {/* Compact Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-6 py-3.5">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h3 className="text-[15px] font-medium text-[#e7e7e7]">
            Backtest scorecard
          </h3>
          <span className="font-mono text-xs text-[#a0a0a0]">
            {selected.item_code}
          </span>
          <span className="text-xs text-[#898989]">({selected.unit})</span>
        </div>
        <span className="text-xs text-[#898989]">
          44-month causal proof
          {scopedGodown ? " · Project-wide (6 godowns)" : ""}
        </span>
      </div>

      {/* Site-scoped live KPI strip when a Site Manager is active */}
      {scopedGodown && scopedMonthAction && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-white/[0.025] px-6 py-2.5 text-xs text-[#a0a0a0]">
          <span className="font-medium text-[#e7e7e7]">
            Site snapshot · {shortGodownName(scopedGodown)} (
            {scopedMonthAction.month})
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
            <span>
              On hand:{" "}
              <QtyText
                value={scopedMonthAction.godown_on_hand}
                unit={scopedMonthAction.unit}
                className="font-medium text-white"
              />
            </span>
            <span>
              Demand/mo:{" "}
              <QtyText
                value={scopedMonthAction.projected_monthly_demand}
                unit={scopedMonthAction.unit}
                className="font-medium text-white"
              />
            </span>
            <span>
              Site LP routes:{" "}
              <strong className="font-medium text-white">
                {scopedTransferCount ?? 0}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Continuous 4-Column Stat Strip */}
      <div className="grid grid-cols-1 divide-y divide-white/[0.06] sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {/* Stat 1 */}
        <div className="flex flex-col justify-between gap-2.5 p-6">
          <span className="text-xs font-normal text-[#898989]">
            Idle reduction
          </span>
          <div
            className={`font-serif font-normal text-[30px] leading-none tracking-[-0.02em] tabular-nums sm:text-[34px] ${
              isPositiveReduction ? "text-emerald-400" : "text-amber-300"
            }`}
          >
            {isPositiveReduction ? "−" : "+"}
            {Math.abs(selected.idle_reduction_pct).toFixed(1)}%
          </div>
          <p className="text-xs text-[#898989] tabular-nums">
            Avg{" "}
            <QtyText
              value={selected.actual_avg_idle}
              unit={selected.unit}
              className="text-[#a0a0a0]"
            />{" "}
            →{" "}
            <QtyText
              value={selected.simulated_avg_idle}
              unit={selected.unit}
              className="font-medium text-white"
            />
          </p>
        </div>

        {/* Stat 2 */}
        <div className="flex flex-col justify-between gap-2.5 p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-normal text-[#898989]">
              Peak stock
            </span>
            <span className="text-xs text-[#a0a0a0] tabular-nums">
              {peakReductionPct >= 0
                ? `−${peakReductionPct.toFixed(1)}%`
                : `+${Math.abs(peakReductionPct).toFixed(1)}%`}
            </span>
          </div>
          <div className="font-serif font-normal text-[30px] leading-none tracking-[-0.02em] text-white tabular-nums sm:text-[34px]">
            <QtyText value={selected.simulated_peak_idle} unit={selected.unit} />
          </div>
          <p className="text-xs text-[#898989] tabular-nums">
            Was{" "}
            <QtyText
              value={selected.actual_peak_idle}
              unit={selected.unit}
              className="text-[#a0a0a0]"
            />{" "}
            at peak
          </p>
        </div>

        {/* Stat 3 */}
        <div className="flex flex-col justify-between gap-2.5 p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-normal text-[#898989]">
              Shortages
            </span>
            <span className="text-xs text-[#a0a0a0] tabular-nums">
              {shortageRate.toFixed(1)}% vol
            </span>
          </div>
          <div
            className={`font-serif font-normal text-[30px] leading-none tracking-[-0.02em] tabular-nums sm:text-[34px] ${
              selected.simulated_stockout_months > 0
                ? "text-rose-400"
                : "text-white"
            }`}
          >
            {selected.simulated_stockout_months}
            <span className="ml-1.5 font-sans text-xs font-normal text-[#898989]">
              / 44 mo
            </span>
          </div>
          <p className="text-xs text-[#898989] tabular-nums">
            Unmet:{" "}
            <QtyText
              value={shortageQty}
              unit={selected.unit}
              dashZero
              className={shortageQty > 0 ? "text-rose-400" : "text-[#a0a0a0]"}
            />
          </p>
        </div>

        {/* Stat 4 */}
        <div className="flex flex-col justify-between gap-2.5 p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-normal text-[#898989]">
              Transfers
            </span>
            <span className="text-xs text-emerald-400 tabular-nums">
              {formatPlainNumber(kmSaved)} km saved
            </span>
          </div>
          <div className="font-serif font-normal text-[30px] leading-none tracking-[-0.02em] text-white tabular-nums sm:text-[34px]">
            {selected.total_transfers_recommended}
            <span className="ml-1.5 font-sans text-xs font-normal text-[#898989]">
              routes
            </span>
          </div>
          <p className="text-xs text-[#898989] tabular-nums">
            Shifted:{" "}
            <QtyText
              value={transferQty}
              unit={selected.unit}
              dashZero
              className="text-[#a0a0a0]"
            />
          </p>
        </div>
      </div>

      {/* Expandable 16-SKU Comparison Matrix */}
      {showAllMatrix && (
        <div className="border-t border-white/[0.06]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.025] text-xs font-normal text-[#898989]">
                  <th className="px-6 py-2.5 text-left font-normal">SKU</th>
                  <th className="px-4 py-2.5 text-left font-normal">
                    Material
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    Actual avg
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    Plan avg
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    Idle delta
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    Shortage qty
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    Stockouts (act/sim)
                  </th>
                  <th className="px-6 py-2.5 text-right font-normal">
                    LP routes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-sm">
                {allSummaries.map((row) => {
                  const isSelected = row.item_code === selected.item_code;
                  const pos = row.idle_reduction_pct >= 0;
                  return (
                    <tr
                      key={row.item_code}
                      tabIndex={0}
                      onClick={() => onSelectItem(row.item_code)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectItem(row.item_code);
                        }
                      }}
                      className={`cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/50 ${
                        isSelected ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <td className="whitespace-nowrap px-6 py-2.5 font-mono text-xs text-[#a0a0a0]">
                        <span className="inline-flex items-center gap-2">
                          {isSelected && (
                            <span
                              aria-hidden="true"
                              className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.85)]"
                            />
                          )}
                          <span
                            className={
                              isSelected ? "font-medium text-white" : ""
                            }
                          >
                            {row.item_code}
                          </span>
                        </span>
                      </td>
                      <td
                        className="max-w-xs truncate px-4 py-2.5 text-[#e7e7e7]"
                        title={row.item_name}
                      >
                        {row.item_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <QtyText
                          value={row.actual_avg_idle}
                          unit={row.unit}
                          className="text-[#a0a0a0]"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                        <QtyText
                          value={row.simulated_avg_idle}
                          unit={row.unit}
                          className="text-white"
                        />
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums ${
                          pos ? "text-emerald-400" : "text-amber-300"
                        }`}
                      >
                        {pos ? "−" : "+"}
                        {Math.abs(row.idle_reduction_pct).toFixed(1)}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <QtyText
                          value={row.total_shortage_qty ?? 0}
                          unit={row.unit}
                          dashZero
                          className="text-rose-400"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[#898989]">
                        {row.actual_stockout_months} /{" "}
                        <span
                          className={
                            row.simulated_stockout_months > 0
                              ? "font-medium text-rose-400"
                              : "text-white"
                          }
                        >
                          {row.simulated_stockout_months}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-2.5 text-right tabular-nums text-white">
                        {row.total_transfers_recommended > 0 ? (
                          row.total_transfers_recommended
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/[0.06] bg-white/[0.02] px-6 py-2.5 text-xs text-[#898989]">
            Select a SKU row to load its 44-month causal replay. All figures keep
            native per-SKU UOMs.
          </div>
        </div>
      )}
    </section>
  );
}
