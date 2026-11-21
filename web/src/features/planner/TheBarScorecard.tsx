"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Route,
  TrendingDown,
} from "lucide-react";
import { CornerMarks, PrimaryPlateButton } from "./HexPrimitives";
import styles from "./plannerHex.module.css";
import type { PlannerBacktestComparison } from "./plannerTypes";
import { formatPlainNumber, formatQty } from "./plannerTypes";

interface TheBarScorecardProps {
  selected: PlannerBacktestComparison;
  allSummaries: PlannerBacktestComparison[];
  onSelectItem: (itemCode: string) => void;
  showAllMatrix?: boolean;
  onToggleMatrix?: () => void;
}

export default function TheBarScorecard({
  selected,
  allSummaries,
  onSelectItem,
  showAllMatrix: controlledMatrix,
  onToggleMatrix,
}: TheBarScorecardProps) {
  const [internalMatrix, setInternalMatrix] = useState(false);
  const showAllMatrix = controlledMatrix ?? internalMatrix;
  const toggleMatrix =
    onToggleMatrix ?? (() => setInternalMatrix((prev) => !prev));

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
      className="relative border border-[#dbd7da] bg-[#fffcfc]"
    >
      <CornerMarks tone="light" />

      {/* Drafting-Field Headline Region */}
      <div className={`${styles.draftingField} relative px-5 py-5 sm:px-7 sm:py-6`}>
        <div className={styles.draftingFieldGrid} />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={styles.ochreAnnotation}>
                THE BAR · Zero-Lookahead Backtest
              </span>
              <span
                className={`${styles.fontMono} text-[11px] tracking-[0.06em] text-[#43394c]`}
              >
                {selected.item_code} · UOM: {selected.unit}
              </span>
            </div>
            <h2
              className={`${styles.fontHeading} ${styles.headlineGradient} text-xl font-extrabold leading-[1.2] sm:text-2xl`}
            >
              {selected.item_name}
            </h2>
          </div>

          <PrimaryPlateButton
            variant="light"
            size="md"
            onClick={toggleMatrix}
            className="self-start sm:self-auto"
          >
            {showAllMatrix ? (
              <>
                Hide All 16 SKUs
                <ChevronUp className="h-3.5 w-3.5 text-[#43394c]" />
              </>
            ) : (
              <>
                Compare All 16 SKUs
                <ChevronDown className="h-3.5 w-3.5 text-[#43394c]" />
              </>
            )}
          </PrimaryPlateButton>
        </div>
      </div>

      {/* Interrupted Proof-Strip Boundary with 10px Uppercase Mono Proof Label */}
      <div className="relative flex items-center justify-center border-t border-[#dbd7da]">
        <span
          className={`${styles.fontMono} -translate-y-1/2 bg-[#fffcfc] px-3 text-[10px] uppercase tracking-[0.0833em] text-[#43394c]`}
        >
          44-MONTH HISTORICAL VS. SIMULATED OUTCOME PROOF
        </span>
      </div>

      {/* Continuous 4-Column Ruled Proof Strip (No individual rounded boxes) */}
      <div className="grid grid-cols-1 divide-y divide-[#e9e5e8] sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4">
        {/* Cell 1: Avg Godown Idle Reduced */}
        <div className="flex flex-col justify-between gap-3 border-b border-[#e9e5e8] p-5 sm:border-r xl:border-b-0">
          <div>
            <div className="flex items-center justify-between">
              <span
                className={`${styles.fontMono} text-[11px] uppercase tracking-[0.07em] text-[#43394c]`}
              >
                01 · Avg Idle Reduced
              </span>
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isPositiveReduction
                    ? "rgba(44, 122, 98, 0.12)"
                    : "rgba(169, 133, 41, 0.12)",
                }}
              >
                {isPositiveReduction ? (
                  <Check className="h-3.5 w-3.5 text-[#2c7a62]" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-[#a98529]" />
                )}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`${styles.fontHeading} text-[30px] font-extrabold leading-none tabular-nums ${
                  isPositiveReduction ? "text-[#2c7a62]" : "text-[#a98529]"
                }`}
              >
                {isPositiveReduction ? "-" : "+"}
                {Math.abs(selected.idle_reduction_pct).toFixed(1)}%
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-normal text-[#89828d]">
                {isPositiveReduction ? (
                  <ArrowDownRight className="h-3.5 w-3.5 text-[#2c7a62]" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#a98529]" />
                )}
                44-mo avg
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-dashed border-[#dbd7da] pt-3 text-xs tabular-nums">
            <div>
              <span className={`${styles.fontMono} block text-[10px] uppercase tracking-[0.06em] text-[#89828d]`}>
                Actual Avg
              </span>
              <span className="mt-0.5 block font-medium text-[#31263b]">
                {formatQty(selected.actual_avg_idle, selected.unit)}
              </span>
            </div>
            <div>
              <span className={`${styles.fontMono} block text-[10px] uppercase tracking-[0.06em] text-[#89828d]`}>
                Plan Avg
              </span>
              <span className="mt-0.5 block font-semibold text-[#2c7a62]">
                {formatQty(selected.simulated_avg_idle, selected.unit)}
              </span>
            </div>
          </div>
        </div>

        {/* Cell 2: Peak Yard Pileup */}
        <div className="flex flex-col justify-between gap-3 border-b border-[#e9e5e8] p-5 xl:border-r xl:border-b-0">
          <div>
            <div className="flex items-center justify-between">
              <span
                className={`${styles.fontMono} text-[11px] uppercase tracking-[0.07em] text-[#43394c]`}
              >
                02 · Peak Yard Pileup
              </span>
              <span
                className={`${styles.fontMono} border border-[#dbd7da] bg-[#fcf8f8] px-1.5 py-0.5 text-[10px] text-[#31263b]`}
              >
                {peakReductionPct >= 0
                  ? `-${peakReductionPct.toFixed(1)}%`
                  : `+${Math.abs(peakReductionPct).toFixed(1)}%`}
              </span>
            </div>

            <div className="mt-3">
              <span
                className={`${styles.fontHeading} text-[28px] font-extrabold leading-none tabular-nums text-[#14141c]`}
              >
                {formatQty(selected.simulated_peak_idle, selected.unit)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-dashed border-[#dbd7da] pt-3 text-xs tabular-nums">
            <div>
              <span className={`${styles.fontMono} block text-[10px] uppercase tracking-[0.06em] text-[#89828d]`}>
                Historical Peak
              </span>
              <span className="mt-0.5 block font-medium text-[#a98529]">
                {formatQty(selected.actual_peak_idle, selected.unit)}
              </span>
            </div>
            <div>
              <span className={`${styles.fontMono} block text-[10px] uppercase tracking-[0.06em] text-[#89828d]`}>
                Total Ordered
              </span>
              <span className="mt-0.5 block font-medium text-[#31263b]">
                {formatQty(selected.simulated_total_ordered, selected.unit)}
              </span>
            </div>
          </div>
        </div>

        {/* Cell 3: Unmasked Shortages */}
        <div className="flex flex-col justify-between gap-3 border-b border-[#e9e5e8] p-5 sm:border-r sm:border-b-0">
          <div>
            <div className="flex items-center justify-between">
              <span
                className={`${styles.fontMono} text-[11px] uppercase tracking-[0.07em] text-[#43394c]`}
              >
                03 · Unmasked Shortages
              </span>
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(184, 66, 92, 0.1)" }}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-[#b8425c]" />
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`${styles.fontHeading} text-[28px] font-extrabold leading-none tabular-nums text-[#b8425c]`}
              >
                {selected.simulated_stockout_months} / 44
              </span>
              <span className={`${styles.fontMono} text-[11px] text-[#89828d]`}>
                mo ({shortageRate.toFixed(1)}% vol)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-dashed border-[#dbd7da] pt-3 text-xs tabular-nums">
            <div>
              <span className={`${styles.fontMono} block text-[10px] uppercase tracking-[0.06em] text-[#89828d]`}>
                Total Short Qty
              </span>
              <span className="mt-0.5 block font-semibold text-[#b8425c]">
                {formatQty(shortageQty, selected.unit)}
              </span>
            </div>
            <div>
              <span className={`${styles.fontMono} block text-[10px] uppercase tracking-[0.06em] text-[#89828d]`}>
                Actual Stockouts
              </span>
              <span className="mt-0.5 block font-medium text-[#31263b]">
                {selected.actual_stockout_months} / 44 mo
              </span>
            </div>
          </div>
        </div>

        {/* Cell 4: Stage A LP Transfers */}
        <div className="flex flex-col justify-between gap-3 p-5">
          <div>
            <div className="flex items-center justify-between">
              <span
                className={`${styles.fontMono} text-[11px] uppercase tracking-[0.07em] text-[#43394c]`}
              >
                04 · Stage A LP Routes
              </span>
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(173, 142, 182, 0.18)" }}
              >
                <Route className="h-3.5 w-3.5 text-[#6f4f79]" />
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`${styles.fontHeading} text-[28px] font-extrabold leading-none tabular-nums text-[#31263b]`}
              >
                {selected.total_transfers_recommended}
              </span>
              <span className={`${styles.fontMono} text-[11px] text-[#89828d]`}>
                routes · 1–2d transit
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-dashed border-[#dbd7da] pt-3 text-xs tabular-nums">
            <div>
              <span className={`${styles.fontMono} block text-[10px] uppercase tracking-[0.06em] text-[#89828d]`}>
                Rebalanced Vol
              </span>
              <span className="mt-0.5 block font-medium text-[#31263b]">
                {formatQty(transferQty, selected.unit)}
              </span>
            </div>
            <div>
              <span className={`${styles.fontMono} block text-[10px] uppercase tracking-[0.06em] text-[#89828d]`}>
                Est. Haul Saved
              </span>
              <span className="mt-0.5 block font-semibold text-[#2c7a62]">
                {formatPlainNumber(kmSaved)} km
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable 16-SKU Ruled Comparison Matrix (never sums across UOMs) */}
      {showAllMatrix && (
        <div className="border-t border-[#dbd7da] bg-[#fffcfc]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#dbd7da] bg-[#fcf8f8] text-[#43394c]">
                  <th
                    className={`${styles.fontMono} px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em]`}
                  >
                    SKU
                  </th>
                  <th
                    className={`${styles.fontMono} px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em]`}
                  >
                    Material Description
                  </th>
                  <th
                    className={`${styles.fontMono} px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em]`}
                  >
                    Actual Avg Idle
                  </th>
                  <th
                    className={`${styles.fontMono} px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em]`}
                  >
                    Plan Avg Idle
                  </th>
                  <th
                    className={`${styles.fontMono} px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em]`}
                  >
                    Idle Delta
                  </th>
                  <th
                    className={`${styles.fontMono} px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em]`}
                  >
                    Shortage Qty
                  </th>
                  <th
                    className={`${styles.fontMono} px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em]`}
                  >
                    Stockout Mo (Act/Sim)
                  </th>
                  <th
                    className={`${styles.fontMono} px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em]`}
                  >
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
                          ? `${styles.stippledSurface} bg-[#fcf8f8] font-medium`
                          : "hover:bg-[#fcf8f8]"
                      }`}
                    >
                      <td
                        className={`${styles.fontMono} whitespace-nowrap px-4 py-2.5 font-semibold text-[#14141c]`}
                      >
                        {isSelected && (
                          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#31263b] align-middle" />
                        )}
                        {row.item_code}
                      </td>
                      <td
                        className="max-w-xs truncate px-4 py-2.5 text-[#31263b]"
                        title={row.item_name}
                      >
                        {row.item_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[#43394c]">
                        {formatQty(row.actual_avg_idle, row.unit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums text-[#14141c]">
                        {formatQty(row.simulated_avg_idle, row.unit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                        <span
                          className={`${styles.fontMono} inline-flex border px-1.5 py-0.5 text-[11px] font-medium`}
                          style={{
                            borderColor: pos
                              ? "rgba(44, 122, 98, 0.35)"
                              : "rgba(169, 133, 41, 0.35)",
                            backgroundColor: pos
                              ? "rgba(44, 122, 98, 0.08)"
                              : "rgba(169, 133, 41, 0.08)",
                            color: pos ? "#2c7a62" : "#93701d",
                          }}
                        >
                          {pos ? "-" : "+"}
                          {Math.abs(row.idle_reduction_pct).toFixed(1)}%
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[#b8425c]">
                        {formatQty(row.total_shortage_qty ?? 0, row.unit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[#43394c]">
                        {row.actual_stockout_months} /{" "}
                        <span className="font-semibold text-[#b8425c]">
                          {row.simulated_stockout_months}
                        </span>
                      </td>
                      <td
                        className={`${styles.fontMono} whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-[#31263b]`}
                      >
                        {row.total_transfers_recommended}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#dbd7da] bg-[#fcf8f8] px-4 py-2.5 text-[11px] font-light text-[#89828d]">
            Select any SKU row to inspect its 44-month causal replay. All figures strictly preserve native UOMs (never summed across distinct units). Negative deltas on discontinued early fastener SKUs reflect honest zero-lookahead lag during mid-project spec switches.
          </div>
        </div>
      )}
    </section>
  );
}
