"use client";

import { useMemo } from "react";
import type {
  ActiveGodown,
  SetDefinition,
  SetImbalanceRow,
} from "@/types/lumino";
import {
  formatCount,
  formatQty,
  formatQtyNumber,
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
  balanced:
    "bg-emerald-400/80 hover:bg-emerald-400 hover:shadow-[0_0_10px_rgba(52,211,153,0.45)]",
  warning:
    "bg-amber-300/85 hover:bg-amber-300 hover:shadow-[0_0_10px_rgba(252,211,77,0.45)]",
  critical:
    "bg-rose-400/85 hover:bg-rose-400 hover:shadow-[0_0_10px_rgba(251,113,133,0.5)]",
  zero: "bg-white/[0.05] hover:bg-white/[0.12]",
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
  // Per-set imbalance summary for the set selector cards
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
    const bnFreq = new Map<
      string,
      { code: string; name: string; count: number }
    >();

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
      className="space-y-6 min-w-0"
    >
      {/* Set Selector Cards */}
      <div
        role="group"
        aria-label="Select assembly kit"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
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
              className={`rounded-[20px] border bg-[#1a1a1a] p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] ${
                isSelected
                  ? "border-white/40 bg-white/[0.05] shadow-[0_0_0_1px_rgba(255,255,255,0.22)]"
                  : "border-white/[0.06] hover:border-white/20 hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-normal text-[#898989]">
                  Set {s.set_no}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-[#a0a0a0]">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      imbalancedTotal > 0
                        ? "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.7)]"
                        : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                    }`}
                    aria-hidden="true"
                  />
                  {imbalancedTotal} imbalanced
                </span>
              </div>
              <div
                className={`mt-2 text-[17px] font-medium ${
                  isSelected ? "text-white" : "text-[#e7e7e7]"
                }`}
              >
                {shortSetLabel(s.set_no)}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#898989]">
                <span className="font-mono text-[#a0a0a0]">
                  {s.parent_code}
                </span>
                <span className="text-white/20">·</span>
                <span>{s.parent_unit}</span>
                <span className="text-white/20">·</span>
                <span>{s.children.length} children</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Set KPI Summary Strip (Single Raised Charcoal Card) */}
      {activeSet && (
        <div className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a]">
          <div className="grid grid-cols-1 divide-y divide-white/[0.06] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-white/[0.06]">
            <div className="p-5 sm:p-6 min-w-0 max-lg:sm:border-r max-lg:sm:border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-xs font-normal text-[#898989]">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                  aria-hidden="true"
                />
                Balanced
              </div>
              <div className="mt-3 flex items-baseline">
                <span className="font-serif font-normal text-[30px] sm:text-[34px] leading-none tracking-[-0.02em] tabular-nums text-white">
                  {stats.balanced}
                </span>
                <span className="ml-1.5 font-sans text-xs tabular-nums text-[#898989]">
                  / {godowns.length * months.length} cells
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-normal text-[#898989]">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-rose-400"
                  aria-hidden="true"
                />
                Critical
              </div>
              <div className="mt-3 flex items-baseline gap-2.5">
                <span
                  className={`font-serif font-normal text-[30px] sm:text-[34px] leading-none tracking-[-0.02em] tabular-nums ${
                    stats.critical > 0 ? "text-rose-400" : "text-white"
                  }`}
                >
                  {stats.critical}
                </span>
                <span className="inline-flex items-center gap-1.5 font-sans text-xs tabular-nums text-[#a0a0a0]">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-300"
                    aria-hidden="true"
                  />
                  {stats.warning} warning
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6 min-w-0 max-lg:sm:border-t max-lg:sm:border-r max-lg:sm:border-white/[0.06]">
              <div className="text-xs font-normal text-[#898989]">
                Peak stranded
              </div>
              <div className="mt-3 flex items-baseline">
                <span className="font-serif font-normal text-[30px] sm:text-[34px] leading-none tracking-[-0.02em] tabular-nums text-white">
                  {worstCell
                    ? formatQtyNumber(
                        worstCell.stranded_parent_qty,
                        activeSet.parent_unit
                      )
                    : "0"}
                </span>
                <span className="ml-1.5 font-sans text-xs text-[#898989]">
                  {activeSet.parent_unit}
                </span>
              </div>
              {worstCell && worstCell.stranded_parent_qty > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onSelectCell(worstCell.godown, worstCell.month, true)
                  }
                  className="mt-2 rounded text-xs text-[#a0a0a0] underline decoration-white/20 underline-offset-4 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer"
                >
                  {shortGodown(worstCell.godown)} · {worstCell.month}
                </button>
              )}
            </div>

            <div className="p-5 sm:p-6 min-w-0 max-lg:sm:border-t max-lg:sm:border-white/[0.06]">
              <div className="text-xs font-normal text-[#898989]">
                #1 bottleneck
              </div>
              {stats.topBottleneck ? (
                <div className="mt-3 truncate font-mono text-lg font-medium leading-8 tracking-tight text-white">
                  {stats.topBottleneck.code}
                </div>
              ) : (
                <div className="mt-3 font-serif font-normal text-[30px] sm:text-[34px] leading-none tracking-[-0.02em] text-[#898989]">
                  None
                </div>
              )}
              <div
                className="mt-1.5 truncate text-xs text-[#898989]"
                title={stats.topBottleneck?.name}
              >
                {stats.topBottleneck
                  ? `${stats.topBottleneck.count} cells · ${stats.topBottleneck.name}`
                  : "All active cells balanced"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Matrix Card */}
      <div className="rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] p-5 sm:p-6 space-y-5 min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-medium text-[#e7e7e7]">
              Godown × month matrix — Set {selectedSetNo} (
              {shortSetLabel(selectedSetNo)})
            </h3>
            <p className="mt-0.5 text-sm text-[#a0a0a0]">
              Select any cell to inspect parent stock, buildable sets, and
              bottlenecks.
            </p>
          </div>

          {/* Single-line Dot Legend */}
          <div className="flex flex-wrap items-center gap-3.5 text-xs text-[#a0a0a0] whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full bg-emerald-400/85"
                aria-hidden="true"
              />
              Balanced
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full bg-amber-300/85"
                aria-hidden="true"
              />
              Warning
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full bg-rose-400/85"
                aria-hidden="true"
              />
              Critical
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full bg-white/[0.12] border border-white/[0.14]"
                aria-hidden="true"
              />
              Zero stock
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-w-full">
          <div style={{ minWidth: `${heatmapMinWidthPx}px` }} className="py-1">
            {/* Year Header Row */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-3 pb-1.5">
              <div className="text-[11px] font-normal text-[#898989]">
                Godown
              </div>
              <div className="flex gap-[2px]">
                {yearGroups.map((yg) => (
                  <div
                    key={yg.year}
                    style={{ flex: yg.count }}
                    className="border-b border-white/[0.06] pb-1 text-center text-[11px] font-medium tabular-nums text-[#a0a0a0]"
                  >
                    {yg.year}
                  </div>
                ))}
              </div>
            </div>

            {/* Month Index Row */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-3 pb-2">
              <div />
              <div className="grid gap-[2px]" style={monthGridStyle}>
                {months.map((m) => {
                  const mm = m.slice(5, 7);
                  const isWindDown = m >= WIND_DOWN_START;
                  const isWindDownBoundary = m === WIND_DOWN_START;
                  return (
                    <div
                      key={m}
                      title={
                        isWindDown
                          ? `${m} (Wind-down phase: receipts ended 2026-07)`
                          : m
                      }
                      className={`relative text-center text-[11px] leading-none tabular-nums ${
                        m === selectedMonth
                          ? "font-semibold text-white"
                          : isWindDown
                            ? "font-medium text-amber-300/80"
                            : "text-[#898989]"
                      } ${
                        isWindDownBoundary
                          ? "before:content-[''] before:pointer-events-none before:absolute before:-left-[1.5px] before:-top-1 before:-bottom-1 before:w-px before:bg-amber-300/45"
                          : ""
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
                    className="grid grid-cols-[120px_1fr] items-center gap-3"
                  >
                    <div
                      className={`truncate text-[11px] transition-colors ${
                        isSelectedRow
                          ? "font-medium text-white"
                          : "font-normal text-[#898989]"
                      }`}
                      title={godown}
                    >
                      {shortGodown(godown)}
                    </div>

                    <div className="grid gap-[2px]" style={monthGridStyle}>
                      {months.map((month) => {
                        const row = cellMap.get(`${godown}__${month}`);
                        const status: CellVisualStatus = row
                          ? getCellVisualStatus(row)
                          : "zero";
                        const isSelected =
                          godown === selectedGodown && month === selectedMonth;
                        const isWindDown = month >= WIND_DOWN_START;
                        const isWindDownBoundary = month === WIND_DOWN_START;

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
                          <div
                            key={month}
                            className={`relative ${
                              isWindDownBoundary
                                ? "before:content-[''] before:pointer-events-none before:absolute before:-left-[1.5px] before:-top-1 before:-bottom-1 before:w-px before:bg-amber-300/40"
                                : ""
                            }`}
                          >
                            <button
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => onSelectCell(godown, month)}
                              title={tooltip}
                              aria-label={`${shortGodown(godown)} ${month} ${status}`}
                              className={`block h-7 w-full rounded-[4px] transition-all duration-150 cursor-pointer hover:scale-[1.12] hover:z-20 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-1 focus-visible:ring-offset-[#1a1a1a] ${
                                CELL_COLORS[status]
                              } ${
                                isSelected
                                  ? "ring-2 ring-white ring-offset-1 ring-offset-[#1a1a1a] z-10 scale-[1.06]"
                                  : ""
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer note on wind-down phase */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3.5 text-xs text-[#898989]">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-3 w-px bg-amber-300/60"
              aria-hidden="true"
            />
            2026-08 to 2026-10 marks wind-down (vendor receipts ended after
            2026-07).
          </span>
          <span className="tabular-nums text-[#a0a0a0]">
            Selected: {shortGodown(selectedGodown)} · {selectedMonth}
          </span>
        </div>
      </div>
    </section>
  );
}
