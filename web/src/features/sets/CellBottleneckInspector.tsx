"use client";

import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Package,
  ShieldAlert,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { SetImbalanceRow } from "@/types/lumino";
import {
  computeStrandedChildSurplus,
  formatCount,
  formatQty,
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
      <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-xs">
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

  const badgeStyle =
    status === "balanced"
      ? "bg-emerald-100 text-emerald-900 border-emerald-200"
      : status === "critical"
        ? "bg-rose-100 text-rose-900 border-rose-200"
        : status === "warning"
          ? "bg-amber-100 text-amber-900 border-amber-200"
          : "bg-slate-100 text-slate-700 border-slate-200";

  const badgeLabel =
    status === "balanced"
      ? "Balanced / Ready"
      : status === "critical"
        ? "Critical Imbalance"
        : childOnlyStranded
          ? "Warning • Stranded Child Stock (0 Parent)"
          : status === "warning"
            ? "Warning • Partial Imbalance"
            : "Zero Stock";

  const maxBarScale = Math.max(
    row.parent_stock,
    ...row.children.map((c) => Math.min(c.buildable_sets, row.parent_stock * 1.5 || c.buildable_sets)),
    1
  );

  return (
    <section
      aria-label="Cell Drill-Down and Bottleneck Inspector"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-5"
    >
      {/* Inspector Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-400">
              SET {row.set_no}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
              <Warehouse className="h-3.5 w-3.5 text-slate-500" />
              {shortGodown(row.godown)} ({row.godown})
            </span>
            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
              {row.month}
            </span>
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 uppercase">
              {row.ratio_mode === "empirical" ? "Empirical Ratio" : "BOM Ratio"}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {shortSetLabel(row.set_no)} —{" "}
            <span className="font-mono text-sm font-semibold text-slate-600">
              {row.parent_code}
            </span>
          </h3>
          <p className="text-xs text-slate-500">{row.parent_name}</p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-3 py-1 text-xs font-bold ${badgeStyle}`}
        >
          {status === "balanced" && <CheckCircle2 className="h-3.5 w-3.5" />}
          {status === "critical" && <AlertOctagon className="h-3.5 w-3.5" />}
          {status === "warning" && <AlertTriangle className="h-3.5 w-3.5" />}
          {status === "zero" && <Package className="h-3.5 w-3.5" />}
          {badgeLabel}
        </span>
      </div>

      {/* 3 Headline Parent-Unit Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="text-xs font-medium text-slate-500">
            Parent Stock on Hand
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {formatQty(row.parent_stock, row.parent_unit)}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-500">
            {row.parent_code} closing stock in {row.month}
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5">
          <div className="text-xs font-medium text-emerald-900">
            Max Buildable Sets (Child Limit)
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-950">
            {formatCount(row.max_buildable_sets)}{" "}
            <span className="text-sm font-semibold text-emerald-800">
              {row.parent_unit}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-emerald-800 tabular-nums">
            Effective deployable kits:{" "}
            <strong>{formatQty(usableSets, row.parent_unit)}</strong>
          </div>
        </div>

        <div
          className={`rounded-lg border p-3.5 ${
            row.stranded_parent_qty > 0
              ? "border-rose-200 bg-rose-50/60"
              : "border-slate-200 bg-slate-50/70"
          }`}
        >
          <div
            className={`text-xs font-medium ${
              row.stranded_parent_qty > 0 ? "text-rose-900" : "text-slate-500"
            }`}
          >
            Stranded Parent Surplus
          </div>
          <div
            className={`mt-1 text-2xl font-bold tabular-nums ${
              row.stranded_parent_qty > 0 ? "text-rose-950" : "text-slate-900"
            }`}
          >
            {formatQty(row.stranded_parent_qty, row.parent_unit)}
          </div>
          <div
            className={`mt-0.5 text-[11px] tabular-nums ${
              row.stranded_parent_qty > 0 ? "text-rose-800" : "text-slate-500"
            }`}
          >
            {row.parent_stock > 0
              ? `${blockedPct.toFixed(1)}% of on-hand parents blocked`
              : childOnlyStranded
                ? "0 parents on hand — child stock stranded below"
                : "No parents stranded"}
          </div>
        </div>
      </div>

      {/* Bottleneck Callout Banner */}
      {!zeroStock && (
        <div
          className={`rounded-lg border p-3.5 flex items-start gap-3 ${
            status === "balanced"
              ? "border-emerald-200 bg-emerald-50/60 text-emerald-950"
              : status === "critical"
                ? "border-rose-200 bg-rose-50/70 text-rose-950"
                : "border-amber-200 bg-amber-50/70 text-amber-950"
          }`}
        >
          {status === "balanced" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          ) : (
            <ShieldAlert
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                status === "critical" ? "text-rose-700" : "text-amber-700"
              }`}
            />
          )}
          <div className="text-xs leading-relaxed">
            {status === "balanced" ? (
              <>
                <span className="font-bold">Kit Balanced:</span> All{" "}
                <strong>{formatQty(row.parent_stock, row.parent_unit)}</strong>{" "}
                in {shortGodown(row.godown)} can be assembled with available
                child inventory (children support up to{" "}
                <strong>{formatCount(row.max_buildable_sets)} sets</strong>).
              </>
            ) : childOnlyStranded ? (
              <>
                <span className="font-bold">
                  Parent Missing ({row.parent_code} = 0 {row.parent_unit}):
                </span>{" "}
                Child components are sitting idle in {shortGodown(row.godown)}{" "}
                with zero parent assemblies available to pair them with.
              </>
            ) : (
              <>
                <span className="font-bold">
                  Primary Bottleneck: {row.bottleneck_item_code}
                </span>{" "}
                ({row.bottleneck_item_name}) caps assembly at{" "}
                <strong>
                  {formatCount(row.max_buildable_sets)} {row.parent_unit}
                </strong>
                , leaving{" "}
                <strong>
                  {formatQty(row.stranded_parent_qty, row.parent_unit)}
                </strong>{" "}
                stranded in {shortGodown(row.godown)} during {row.month}.
              </>
            )}
          </div>
        </div>
      )}

      {/* Law of the Minimum Visual Capacity Bars + Detailed Component Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Wrench className="h-3.5 w-3.5 text-slate-500" />
            Child Component Breakdown &amp; Stranded Surplus
          </h4>
          <span className="text-[11px] text-slate-500">
            Every quantity shown strictly in its native UOM
          </span>
        </div>

        {/* Visual Capacity Bars */}
        {!zeroStock && row.parent_stock > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span className="font-semibold">
                Buildable Capacity vs. Parent Demand ({formatQty(row.parent_stock, row.parent_unit)})
              </span>
              <span className="font-mono">
                Law of the Minimum: min = {formatCount(row.max_buildable_sets)} sets
              </span>
            </div>
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

              return (
                <div key={child.child_code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-semibold text-slate-800">
                        {child.child_code}
                      </span>
                      {child.is_bottleneck && (
                        <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          BOTTLENECK
                        </span>
                      )}
                      {child.is_shared_child && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                          SHARED
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-slate-700">
                      {formatCount(child.buildable_sets)} buildable sets (
                      {formatQty(child.available_stock, child.child_unit)})
                    </span>
                  </div>
                  <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all ${
                        child.is_bottleneck
                          ? "bg-rose-500"
                          : isShort
                            ? "bg-amber-400"
                            : "bg-emerald-500"
                      }`}
                    />
                    {/* Vertical target line for parent_stock */}
                    <div
                      style={{ left: `${parentMarkerPct}%` }}
                      title={`Parent Stock Target: ${formatQty(row.parent_stock, row.parent_unit)}`}
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-900"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Exact Quantities Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-left font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2.5">Child Component</th>
                <th className="px-3 py-2.5 text-right">Ratio</th>
                <th className="px-3 py-2.5 text-right">Available Stock</th>
                <th className="px-3 py-2.5 text-right">Req. for Parent</th>
                <th className="px-3 py-2.5 text-right">Buildable Sets</th>
                <th className="px-3 py-2.5 text-right">Surplus / Deficit</th>
                <th className="px-3 py-2.5 text-right">Stranded Child Surplus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {row.children.map((child) => {
                const strandedChild = computeStrandedChildSurplus(row, child);
                const isDeficit = child.surplus_or_deficit < -1e-6;

                return (
                  <tr
                    key={child.child_code}
                    className={
                      child.is_bottleneck
                        ? "bg-rose-50/70"
                        : child.is_shared_child
                          ? "bg-amber-50/30"
                          : undefined
                    }
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">
                          {child.child_code}
                        </span>
                        {child.is_bottleneck && (
                          <span className="inline-flex items-center rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            BOTTLENECK
                          </span>
                        )}
                        {child.is_shared_child && (
                          <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                            SHARED (3 SETS)
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 max-w-xs truncate">
                        {child.child_name}
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {formatRatio(child.ratio_used, child.child_unit)}{" "}
                      <span className="text-[10px] text-slate-400">
                        {child.child_unit}/{row.parent_unit}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                      {formatQty(child.available_stock, child.child_unit)}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {formatQty(child.required_for_parent, child.child_unit)}
                    </td>

                    <td
                      className={`px-3 py-2.5 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                        child.is_bottleneck
                          ? "text-rose-700"
                          : "text-slate-900"
                      }`}
                    >
                      {formatCount(child.buildable_sets)}
                    </td>

                    <td
                      className={`px-3 py-2.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                        isDeficit
                          ? "text-rose-700"
                          : child.surplus_or_deficit > 0
                            ? "text-emerald-700"
                            : "text-slate-500"
                      }`}
                    >
                      {child.surplus_or_deficit > 0 ? "+" : ""}
                      {formatQty(child.surplus_or_deficit, child.child_unit)}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={
                          strandedChild > 0
                            ? "font-semibold text-amber-800"
                            : "text-slate-400"
                        }
                      >
                        {formatQty(strandedChild, child.child_unit)}
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
