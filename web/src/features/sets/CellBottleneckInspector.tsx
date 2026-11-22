"use client";

import { ChevronDown } from "lucide-react";
import type { SetImbalanceRow } from "@/types/lumino";
import KitAssemblyWireframe from "./KitAssemblyWireframe";
import {
  computeStrandedChildSurplus,
  formatCount,
  formatQty,
  formatQtyNumber,
  formatRatio,
  getCellVisualStatus,
  isChildOnlyStrandedRow,
  isZeroStockRow,
  shortGodown,
  shortSetLabel,
} from "./setsUtils";

interface CellBottleneckInspectorProps {
  row: SetImbalanceRow | null;
}

export default function CellBottleneckInspector({
  row,
}: CellBottleneckInspectorProps) {
  if (!row) {
    return (
      <section className="rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] p-6 text-sm text-[#a0a0a0]">
        Select any godown-month cell in the heatmap above to inspect its kit
        balance and bottleneck child.
      </section>
    );
  }

  const status = getCellVisualStatus(row);
  const zeroStock = isZeroStockRow(row);
  const childOnlyStranded = isChildOnlyStrandedRow(row);
  const usableSets = Math.min(row.parent_stock, row.max_buildable_sets);
  const blockedPct =
    row.parent_stock > 0
      ? (row.stranded_parent_qty / row.parent_stock) * 100
      : 0;
  const hasBottleneck = row.children.some((c) => c.is_bottleneck);

  const statusDot =
    status === "balanced"
      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
      : status === "critical"
        ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.75)]"
        : status === "warning"
          ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.7)]"
          : "bg-white/30";

  const statusLabel =
    status === "balanced"
      ? "Balanced"
      : status === "critical"
        ? "Critical imbalance"
        : childOnlyStranded
          ? "Stranded child stock (0 parent)"
          : status === "warning"
            ? "Partial imbalance"
            : "Zero stock";

  const maxBarScale = Math.max(
    row.parent_stock,
    ...row.children.map((c) =>
      Math.min(c.buildable_sets, row.parent_stock * 1.5 || c.buildable_sets)
    ),
    1
  );

  return (
    <section
      aria-label="Cell Drill-Down and Bottleneck Inspector"
      className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] min-w-0"
    >
      {/* Inspector Header + Spectral Isometric Kit Wireframe */}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0 space-y-2.5">
          <div>
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h3 className="font-serif font-normal text-[24px] sm:text-[26px] leading-tight tracking-[-0.015em] text-[#e7e7e7]">
                {shortSetLabel(row.set_no)}
              </h3>
              <span className="font-mono text-xs text-[#898989]">
                {row.parent_code}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#a0a0a0] tabular-nums">
              Set {row.set_no} · {shortGodown(row.godown)} · {row.month} ·{" "}
              {row.ratio_mode === "empirical" ? "Empirical" : "BOM"} ratio
            </p>
          </div>

          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-[#e7e7e7]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusDot}`}
              aria-hidden="true"
            />
            {statusLabel}
          </span>
        </div>

        <KitAssemblyWireframe
          childrenItems={row.children}
          status={status}
          hasBottleneck={hasBottleneck}
        />
      </div>

      {/* 3 Headline Parent-Unit Metrics (Divider-Separated, Newsreader Serif Numerals) */}
      <div className="grid grid-cols-1 divide-y divide-white/[0.06] border-t border-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5 sm:p-6 min-w-0">
          <div className="text-xs font-normal text-[#898989]">
            Parent stock on hand
          </div>
          <div className="mt-3 flex items-baseline">
            <span className="font-serif font-normal text-[30px] sm:text-[34px] leading-none tracking-[-0.02em] tabular-nums text-white">
              {formatQtyNumber(row.parent_stock, row.parent_unit)}
            </span>
            <span className="ml-1.5 font-sans text-xs text-[#898989]">
              {row.parent_unit}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#898989] tabular-nums">
            Closing stock in {row.month}
          </div>
        </div>

        <div className="p-5 sm:p-6 min-w-0">
          <div className="text-xs font-normal text-[#898989]">
            Max buildable sets
          </div>
          <div className="mt-3 flex items-baseline">
            <span className="font-serif font-normal text-[30px] sm:text-[34px] leading-none tracking-[-0.02em] tabular-nums text-white">
              {formatCount(row.max_buildable_sets)}
            </span>
            <span className="ml-1.5 font-sans text-xs text-[#898989]">
              {row.parent_unit}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#898989] tabular-nums">
            Deployable: {formatQty(usableSets, row.parent_unit)}
          </div>
        </div>

        <div className="p-5 sm:p-6 min-w-0">
          <div className="text-xs font-normal text-[#898989]">
            Stranded parent
          </div>
          <div className="mt-3 flex items-baseline">
            <span
              className={`font-serif font-normal text-[30px] sm:text-[34px] leading-none tracking-[-0.02em] tabular-nums ${
                row.stranded_parent_qty > 0 ? "text-rose-400" : "text-white"
              }`}
            >
              {formatQtyNumber(row.stranded_parent_qty, row.parent_unit)}
            </span>
            <span className="ml-1.5 font-sans text-xs text-[#898989]">
              {row.parent_unit}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#898989] tabular-nums">
            {row.parent_stock > 0
              ? `${blockedPct.toFixed(1)}% of on-hand parents blocked`
              : childOnlyStranded
                ? "0 parents on hand — child stock stranded"
                : "No parents stranded"}
          </div>
        </div>
      </div>

      {/* Concise 1-Line Finding + Collapsible Context */}
      {!zeroStock && (
        <details className="group border-t border-white/[0.06] px-5 sm:px-6 py-3.5 text-xs text-[#a0a0a0]">
          <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot}`}
                aria-hidden="true"
              />
              <span className="truncate">
                {status === "balanced" ? (
                  <>
                    All {formatQty(row.parent_stock, row.parent_unit)} can be
                    assembled (children support{" "}
                    {formatCount(row.max_buildable_sets)} {row.parent_unit}).
                  </>
                ) : childOnlyStranded ? (
                  <>
                    Parent{" "}
                    <span className="font-mono text-[#e7e7e7]">
                      {row.parent_code}
                    </span>{" "}
                    is at 0 {row.parent_unit} while child stock remains idle.
                  </>
                ) : (
                  <>
                    Primary bottleneck{" "}
                    <span className="font-mono text-[#e7e7e7]">
                      {row.bottleneck_item_code}
                    </span>{" "}
                    caps assembly at {formatCount(row.max_buildable_sets)}{" "}
                    {row.parent_unit}, stranding{" "}
                    {formatQty(row.stranded_parent_qty, row.parent_unit)}.
                  </>
                )}
              </span>
            </span>

            <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-[#a0a0a0] group-hover:text-white transition-colors">
              Details
              <ChevronDown className="h-3.5 w-3.5 text-[#898989] transition-transform duration-200 group-open:rotate-180" />
            </span>
          </summary>

          <div className="mt-2.5 pl-3.5 text-xs leading-relaxed text-[#898989]">
            <p>
              Parent item: {row.parent_name} ({row.godown}).
              {row.bottleneck_item_name
                ? ` Limiting child: ${row.bottleneck_item_name} (${row.bottleneck_item_code}).`
                : ""}
            </p>
            <p className="mt-1">
              Buildable sets follow the Law of the Minimum across all child
              components using {row.ratio_mode} ratios.
            </p>
          </div>
        </details>
      )}

      {/* Visual Capacity Bars (Law of the Minimum) */}
      {!zeroStock && row.parent_stock > 0 && (
        <div className="border-t border-white/[0.06] p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-[15px] font-medium text-[#e7e7e7]">
              Buildable capacity
            </h4>
            <span className="text-xs tabular-nums text-[#898989]">
              Target {formatQty(row.parent_stock, row.parent_unit)} · min{" "}
              {formatCount(row.max_buildable_sets)} {row.parent_unit}
            </span>
          </div>

          <div className="space-y-3.5">
            {row.children.map((child) => {
              const pct = Math.min(
                100,
                (child.buildable_sets / maxBarScale) * 100
              );
              const parentMarkerPct = Math.min(
                100,
                (row.parent_stock / maxBarScale) * 100
              );
              const isShort = child.buildable_sets < row.parent_stock;

              const barFillClass = child.is_bottleneck
                ? "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.65)]"
                : child.is_shared_child
                  ? "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.45)]"
                  : isShort
                    ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.45)]"
                    : "bg-teal-300 shadow-[0_0_8px_rgba(94,234,212,0.4)]";

              return (
                <div key={child.child_code} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[#e7e7e7]">
                        {child.child_code}
                      </span>
                      {child.is_bottleneck ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-rose-400">
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]"
                            aria-hidden="true"
                          />
                          Bottleneck
                        </span>
                      ) : child.is_shared_child ? (
                        <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[11px] text-violet-300">
                          Shared
                        </span>
                      ) : null}
                    </div>
                    <span className="tabular-nums text-[#e7e7e7]">
                      {formatCount(child.buildable_sets)}{" "}
                      <span className="text-[#898989]">{row.parent_unit}</span>{" "}
                      <span className="text-[#898989]">
                        ({formatQty(child.available_stock, child.child_unit)})
                      </span>
                    </span>
                  </div>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${barFillClass}`}
                    />
                    <div
                      style={{ left: `${parentMarkerPct}%` }}
                      title={`Parent stock target: ${formatQty(row.parent_stock, row.parent_unit)}`}
                      className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exact Quantities Table */}
      <div className="border-t border-white/[0.06]">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 sm:px-6 pt-5 pb-3.5">
          <h4 className="text-[15px] font-medium text-[#e7e7e7]">
            Child components
          </h4>
          <span className="text-xs text-[#898989]">
            Every quantity shown in its native UOM
          </span>
        </div>

        <div className="overflow-x-auto max-w-full">
          <table className="min-w-full text-left">
            <thead className="border-y border-white/[0.06] bg-white/[0.025] text-xs font-normal text-[#898989]">
              <tr>
                <th className="px-5 sm:px-6 py-2.5 font-normal">Component</th>
                <th className="px-4 py-2.5 text-right font-normal">Ratio</th>
                <th className="px-4 py-2.5 text-right font-normal">
                  Available
                </th>
                <th className="px-4 py-2.5 text-right font-normal">Required</th>
                <th className="px-4 py-2.5 text-right font-normal">
                  Buildable
                </th>
                <th className="px-4 py-2.5 text-right font-normal">
                  Surplus / deficit
                </th>
                <th className="px-5 sm:px-6 py-2.5 text-right font-normal">
                  Stranded child
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-sm">
              {row.children.map((child) => {
                const strandedChild = computeStrandedChildSurplus(row, child);
                const isDeficit = child.surplus_or_deficit < -1e-6;
                const isSurplus = child.surplus_or_deficit > 1e-6;

                return (
                  <tr
                    key={child.child_code}
                    className="hover:bg-white/[0.03] transition-colors duration-150"
                  >
                    <td className="px-5 sm:px-6 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-[#e7e7e7]">
                          {child.child_code}
                        </span>
                        {child.is_bottleneck ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400">
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]"
                              aria-hidden="true"
                            />
                            Bottleneck
                          </span>
                        ) : child.is_shared_child ? (
                          <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[11px] text-violet-300">
                            Shared
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 max-w-xs truncate text-xs text-[#898989]">
                        {child.child_name}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-[#a0a0a0] whitespace-nowrap">
                      {formatRatio(child.ratio_used, child.child_unit)}
                      <span className="ml-1 text-xs text-[#898989]">
                        {child.child_unit}/{row.parent_unit}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-[#e7e7e7] whitespace-nowrap">
                      {formatQtyNumber(child.available_stock, child.child_unit)}
                      <span className="ml-1 text-xs text-[#898989]">
                        {child.child_unit}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-[#a0a0a0] whitespace-nowrap">
                      {formatQtyNumber(
                        child.required_for_parent,
                        child.child_unit
                      )}
                      <span className="ml-1 text-xs text-[#898989]">
                        {child.child_unit}
                      </span>
                    </td>

                    <td
                      className={`px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap ${
                        child.is_bottleneck ? "text-rose-400" : "text-white"
                      }`}
                    >
                      {formatCount(child.buildable_sets)}
                      <span className="ml-1 text-xs font-normal text-[#898989]">
                        {row.parent_unit}
                      </span>
                    </td>

                    <td
                      className={`px-4 py-3 text-right tabular-nums whitespace-nowrap ${
                        isDeficit
                          ? "text-rose-400"
                          : isSurplus
                            ? "text-emerald-400"
                            : "text-white/25"
                      }`}
                    >
                      {isSurplus ? "+" : ""}
                      {formatQtyNumber(
                        child.surplus_or_deficit,
                        child.child_unit
                      )}
                      <span className="ml-1 text-xs text-[#898989]">
                        {child.child_unit}
                      </span>
                    </td>

                    <td className="px-5 sm:px-6 py-3 text-right tabular-nums whitespace-nowrap">
                      <span
                        className={
                          strandedChild > 0
                            ? "text-[#e7e7e7]"
                            : "text-white/25"
                        }
                      >
                        {formatQtyNumber(strandedChild, child.child_unit)}
                      </span>
                      <span className="ml-1 text-xs text-[#898989]">
                        {child.child_unit}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
