"use client";

import { useMemo } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Flame,
  PackageX,
} from "lucide-react";
import type {
  ActiveGodown,
  SetDefinition,
  SetImbalanceRow,
} from "@/types/lumino";
import {
  formatCount,
  formatQty,
  getCellVisualStatus,
  isChildOnlyStrandedRow,
  shortGodown,
  shortSetLabel,
  WIND_DOWN_START,
  type CellVisualStatus,
} from "./setsUtils";

interface ImbalanceHeatmapProps {
  sets: SetDefinition[];
  godowns: ActiveGodown[];
  months: string[];
  rowsForMode: SetImbalanceRow[];
  selectedSetNo: string;
  onSelectSet: (setNo: string) => void;
  selectedGodown: ActiveGodown;
  selectedMonth: string;
  onSelectCell: (
    godown: ActiveGodown,
    month: string,
    shouldScroll?: boolean
  ) => void;
}

const CELL_COLORS: Record<CellVisualStatus, string> = {
  balanced: "bg-emerald-500 hover:bg-emerald-600",
  warning: "bg-amber-400 hover:bg-amber-500",
  critical: "bg-rose-500 hover:bg-rose-600",
  zero: "bg-slate-200 hover:bg-slate-300",
};

export default function ImbalanceHeatmap({
  sets,
  godowns,
  months,
  rowsForMode,
  selectedSetNo,
  onSelectSet,
  selectedGodown,
  selectedMonth,
  onSelectCell,
}: ImbalanceHeatmapProps) {
  // Per-set imbalance summary for the set selector pills
  const setPillCounts = useMemo(() => {
    const counts = new Map<
      string,
      { balanced: number; warning: number; critical: number; zero: number }
    >();
    for (const s of sets) {
      counts.set(s.set_no, { balanced: 0, warning: 0, critical: 0, zero: 0 });
    }
    for (const row of rowsForMode) {
      const bucket = counts.get(row.set_no);
      if (!bucket) continue;
      bucket[getCellVisualStatus(row)] += 1;
    }
    return counts;
  }, [sets, rowsForMode]);

  const activeSet = useMemo(
    () => sets.find((s) => s.set_no === selectedSetNo) ?? sets[0],
    [sets, selectedSetNo]
  );

  // Lookup map for active set: (godown, month) -> SetImbalanceRow
  const { cellMap, stats, worstCell } = useMemo(() => {
    const map = new Map<string, SetImbalanceRow>();
    let balanced = 0;
    let warning = 0;
    let critical = 0;
    let zero = 0;
    let peakStrandedRow: SetImbalanceRow | null = null;
    const bnFreq = new Map<string, { code: string; name: string; count: number }>();

    for (const row of rowsForMode) {
      if (row.set_no !== selectedSetNo) continue;
      map.set(`${row.godown}__${row.month}`, row);

      const status = getCellVisualStatus(row);
      if (status === "balanced") balanced += 1;
      else if (status === "warning") warning += 1;
      else if (status === "critical") critical += 1;
      else zero += 1;

      if (
        !peakStrandedRow ||
        row.stranded_parent_qty > peakStrandedRow.stranded_parent_qty
      ) {
        peakStrandedRow = row;
      }

      if (row.is_imbalanced && row.bottleneck_item_code) {
        const prev = bnFreq.get(row.bottleneck_item_code);
        if (prev) {
          prev.count += 1;
        } else {
          bnFreq.set(row.bottleneck_item_code, {
            code: row.bottleneck_item_code,
            name: row.bottleneck_item_name ?? row.bottleneck_item_code,
            count: 1,
          });
        }
      }
    }

    let topBottleneck: { code: string; name: string; count: number } | null =
      null;
    for (const entry of bnFreq.values()) {
      if (!topBottleneck || entry.count > topBottleneck.count) {
        topBottleneck = entry;
      }
    }

    return {
      cellMap: map,
      stats: { balanced, warning, critical, zero, topBottleneck },
      worstCell: peakStrandedRow,
    };
  }, [rowsForMode, selectedSetNo]);

  // Group months by year for crisp column headers
  const yearGroups = useMemo(() => {
    const groups: { year: string; count: number }[] = [];
    for (const m of months) {
      const year = m.slice(0, 4);
      const last = groups[groups.length - 1];
      if (last && last.year === year) {
        last.count += 1;
      } else {
        groups.push({ year, count: 1 });
      }
    }
    return groups;
  }, [months]);

  const monthGridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${Math.max(months.length, 1)}, minmax(0, 1fr))`,
    }),
    [months.length]
  );

  const heatmapMinWidthPx = Math.max(640, 160 + months.length * 18);

  return (
    <section
      aria-label="Set Imbalance Heatmap"
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-5 min-w-0"
    >
      {/* Set Selector Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 flex-1">
          {sets.map((s) => {
            const isSelected = s.set_no === selectedSetNo;
            const c = setPillCounts.get(s.set_no) ?? {
              balanced: 0,
              warning: 0,
              critical: 0,
              zero: 0,
            };
            const imbalancedTotal = c.warning + c.critical;
            return (
              <button
                key={s.set_no}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectSet(s.set_no)}
                className={`rounded-xl border p-3 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                    : "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-mono text-xs font-bold ${
                      isSelected ? "text-amber-400" : "text-slate-600"
                    }`}
                  >
                    SET {s.set_no}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                      isSelected
                        ? "bg-rose-500/25 text-rose-200"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {imbalancedTotal} imbalanced
                  </span>
                </div>
                <div className="mt-1 text-sm font-bold leading-snug">
                  {shortSetLabel(s.set_no)}
                </div>
                <div
                  className={`mt-0.5 font-mono text-[11px] ${
                    isSelected ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {s.parent_code} ({s.parent_unit}) • {s.children.length} children
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Set KPI Summary Strip */}
      {activeSet && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-900">
              <span>Balanced / Ready</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-1 text-xl font-bold tabular-nums text-emerald-950">
              {stats.balanced}{" "}
              <span className="text-xs font-normal text-emerald-700">
                / {godowns.length * months.length} cells
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3">
            <div className="flex items-center justify-between text-xs font-medium text-rose-900">
              <span>Critical / Warning</span>
              <AlertOctagon className="h-4 w-4 text-rose-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums text-rose-950">
                {stats.critical}
              </span>
              <span className="text-xs font-semibold tabular-nums text-amber-700">
                + {stats.warning} warn
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <div className="flex items-center justify-between text-xs font-medium text-amber-900">
              <span>Peak Stranded Parent</span>
              <Flame className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-1 text-xl font-bold tabular-nums text-amber-950">
              {worstCell
                ? formatQty(worstCell.stranded_parent_qty, activeSet.parent_unit)
                : `0 ${activeSet.parent_unit}`}
            </div>
            {worstCell && worstCell.stranded_parent_qty > 0 && (
              <button
                type="button"
                onClick={() =>
                  onSelectCell(worstCell.godown, worstCell.month, true)
                }
                className="mt-0.5 rounded text-[11px] font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 cursor-pointer"
              >
                Jump to {shortGodown(worstCell.godown)} ({worstCell.month})
              </button>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>#1 Bottleneck Item</span>
              <PackageX className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-1 font-mono text-sm font-bold text-slate-900 truncate">
              {stats.topBottleneck ? stats.topBottleneck.code : "None"}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 truncate">
              {stats.topBottleneck
                ? `${stats.topBottleneck.count} cells blocked • ${stats.topBottleneck.name}`
                : "All active cells balanced"}
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Matrix */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Godown × Month Kit Balance Matrix — Set {selectedSetNo} (
              {shortSetLabel(selectedSetNo)})
            </h3>
            <p className="text-xs text-slate-500">
              Click any cell to inspect exact parent stock, buildable sets,
              bottleneck child, and stranded surpluses.
            </p>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-emerald-500" />
              Balanced
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-amber-400" />
              Warning (&lt;50% stranded / 0 parent)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-rose-500" />
              Critical (≥50% blocked)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-slate-200 border border-slate-300" />
              Zero Stock
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-w-full rounded-lg border border-slate-200">
          <div
            style={{ minWidth: `${heatmapMinWidthPx}px` }}
            className="bg-white p-3"
          >
            {/* Year Header Row */}
            <div className="grid grid-cols-[128px_1fr] items-center gap-2 pb-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Active Godown
              </div>
              <div className="flex gap-1">
                {yearGroups.map((yg) => (
                  <div
                    key={yg.year}
                    style={{ flex: yg.count }}
                    className="border-b border-slate-200 pb-0.5 text-center font-mono text-[11px] font-bold text-slate-600"
                  >
                    {yg.year}
                  </div>
                ))}
              </div>
            </div>

            {/* Month Index Row */}
            <div className="grid grid-cols-[128px_1fr] items-center gap-2 pb-2">
              <div />
              <div className="grid gap-1" style={monthGridStyle}>
                {months.map((m) => {
                  const mm = m.slice(5, 7);
                  const isWindDown = m >= WIND_DOWN_START;
                  return (
                    <div
                      key={m}
                      title={
                        isWindDown
                          ? `${m} (Wind-down phase: receipts ended 2026-07)`
                          : m
                      }
                      className={`text-center font-mono text-[9px] leading-none ${
                        m === selectedMonth
                          ? "font-bold text-slate-950"
                          : isWindDown
                            ? "font-semibold text-amber-700"
                            : "text-slate-400"
                      }`}
                    >
                      {mm}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Godown Rows */}
            <div className="space-y-1.5">
              {godowns.map((godown) => {
                const isSelectedRow = godown === selectedGodown;
                return (
                  <div
                    key={godown}
                    className="grid grid-cols-[128px_1fr] items-center gap-2"
                  >
                    <div
                      className={`truncate pr-2 text-xs font-semibold ${
                        isSelectedRow ? "text-slate-950" : "text-slate-700"
                      }`}
                      title={godown}
                    >
                      {shortGodown(godown)}
                    </div>

                    <div className="grid gap-1" style={monthGridStyle}>
                      {months.map((month) => {
                        const row = cellMap.get(`${godown}__${month}`);
                        const status: CellVisualStatus = row
                          ? getCellVisualStatus(row)
                          : "zero";
                        const isSelected =
                          godown === selectedGodown && month === selectedMonth;
                        const isWindDown = month >= WIND_DOWN_START;

                        const tooltip = row
                          ? [
                              `${shortGodown(godown)} • ${month}${isWindDown ? " (Wind-Down)" : ""}`,
                              `Parent Stock: ${formatQty(row.parent_stock, row.parent_unit)}`,
                              `Buildable Sets: ${formatCount(row.max_buildable_sets)}`,
                              row.stranded_parent_qty > 0
                                ? `Stranded Parent: ${formatQty(row.stranded_parent_qty, row.parent_unit)}`
                                : isChildOnlyStrandedRow(row)
                                  ? "Status: 0 Parent — Stranded Child Stock"
                                  : status === "zero"
                                    ? "Status: Zero Stock"
                                    : "Status: Balanced / Ready",
                              row.bottleneck_item_code
                                ? `Bottleneck: ${row.bottleneck_item_code}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join("\n")
                          : `${shortGodown(godown)} • ${month}`;

                        return (
                          <button
                            key={month}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => onSelectCell(godown, month)}
                            title={tooltip}
                            aria-label={`${shortGodown(godown)} ${month} ${status}`}
                            className={`h-7 w-full rounded-[3px] transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-1 ${
                              CELL_COLORS[status]
                            } ${
                              isSelected
                                ? "ring-2 ring-slate-950 ring-offset-1 scale-110 z-10 relative"
                                : ""
                            } ${
                              isWindDown && !isSelected
                                ? "outline outline-1 outline-slate-900/15"
                                : ""
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer note on wind-down phase */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Months{" "}
                <span className="font-mono font-semibold text-amber-700">
                  2026-08 → 2026-10
                </span>{" "}
                mark project wind-down (vendor receipts ceased after 2026-07).
              </span>
              <span className="font-mono text-slate-400">
                Selected: {shortGodown(selectedGodown)} • {selectedMonth}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
