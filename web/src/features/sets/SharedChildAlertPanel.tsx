"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import type {
  ActiveGodown,
  SetImbalanceRow,
  SetRatioMode,
} from "@/types/lumino";
import {
  computeSharedChildCollisions,
  formatQtyNumber,
  SHARED_BOLT_CODE,
  shortGodown,
} from "./setsUtils";

interface SharedChildAlertPanelProps {
  rowsForMode: SetImbalanceRow[];
  ratioMode: SetRatioMode;
  lockedGodown?: ActiveGodown | null;
  onJumpToCell: (setNo: string, godown: ActiveGodown, month: string) => void;
}

export default function SharedChildAlertPanel({
  rowsForMode,
  ratioMode,
  lockedGodown = null,
  onJumpToCell,
}: SharedChildAlertPanelProps) {
  const [selectedGodownFilter, setSelectedGodownFilter] = useState<
    "ALL" | ActiveGodown
  >(lockedGodown ?? "ALL");
  const [showAll, setShowAll] = useState(false);

  const collisions = useMemo(
    () => computeSharedChildCollisions(rowsForMode),
    [rowsForMode]
  );

  const summary = useMemo(() => {
    const threeSet = collisions.filter(
      (e) => e.bottleneckedSets.length === 3
    ).length;
    const twoSet = collisions.filter(
      (e) => e.bottleneckedSets.length === 2
    ).length;
    const combinedOnly = collisions.filter(
      (e) => e.bottleneckedSets.length < 2 && e.deficitMt > 0
    ).length;

    const byGodown = new Map<ActiveGodown, number>();
    for (const ev of collisions) {
      byGodown.set(ev.godown, (byGodown.get(ev.godown) ?? 0) + 1);
    }

    return { threeSet, twoSet, combinedOnly, byGodown };
  }, [collisions]);

  const effectiveGodownFilter: "ALL" | ActiveGodown = useMemo(() => {
    if (lockedGodown) return lockedGodown;
    if (
      selectedGodownFilter !== "ALL" &&
      !summary.byGodown.has(selectedGodownFilter)
    ) {
      return "ALL";
    }
    return selectedGodownFilter;
  }, [lockedGodown, selectedGodownFilter, summary.byGodown]);

  const filteredCollisions = useMemo(() => {
    if (effectiveGodownFilter === "ALL") return collisions;
    return collisions.filter((c) => c.godown === effectiveGodownFilter);
  }, [collisions, effectiveGodownFilter]);

  const visibleEvents = showAll
    ? filteredCollisions
    : filteredCollisions.slice(0, 12);

  return (
    <section
      aria-label="Shared Child Bottleneck Alert Panel"
      className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] min-w-0"
    >
      {/* Panel Header */}
      <div className="flex flex-col gap-4 p-5 sm:p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h3 className="text-[17px] font-medium text-[#e7e7e7]">
              Shared child contention
            </h3>
            <span className="font-mono text-xs text-[#898989]">
              {SHARED_BOLT_CODE}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[#a0a0a0]">
            G.I. Nuts &amp; Bolts (MT) demand colliding across sets 1.071,
            1.077, and 1.078.
          </p>
          <details className="mt-2 group">
            <summary className="inline-flex items-center gap-1 text-xs font-medium text-[#898989] hover:text-[#e7e7e7] transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50">
              About shared contention
              <ChevronDown className="h-3.5 w-3.5 text-[#898989] transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#a0a0a0]">
              <span className="font-mono text-[#e7e7e7]">
                {SHARED_BOLT_CODE}
              </span>{" "}
              (G.I. Nuts &amp; Bolts M16×65 MM, stocked in MT) is required by
              all 3 assembly sets. Rows below flag godown-months where this
              shared stock simultaneously bottlenecks 2+ sets or where combined
              3-set MT demand exceeds on-hand godown stock.
            </p>
          </details>
        </div>

        {/* Inline Counters (Divider-Separated, Newsreader Serif Numerals) */}
        <div className="flex shrink-0 items-center divide-x divide-white/[0.06] self-start">
          <div className="pr-5">
            <div className="flex items-center gap-1.5 text-xs font-normal text-[#898989]">
              <span
                className="h-1.5 w-1.5 rounded-full bg-rose-400"
                aria-hidden="true"
              />
              3 sets blocked
            </div>
            <div
              className={`mt-2 font-serif font-normal text-[28px] leading-none tracking-[-0.02em] tabular-nums ${
                summary.threeSet > 0 ? "text-rose-400" : "text-white"
              }`}
            >
              {summary.threeSet}
            </div>
          </div>

          <div className="px-5">
            <div className="flex items-center gap-1.5 text-xs font-normal text-[#898989]">
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-300"
                aria-hidden="true"
              />
              2 sets blocked
            </div>
            <div className="mt-2 font-serif font-normal text-[28px] leading-none tracking-[-0.02em] tabular-nums text-white">
              {summary.twoSet}
            </div>
          </div>

          {summary.combinedOnly > 0 && (
            <div className="pl-5">
              <div className="flex items-center gap-1.5 text-xs font-normal text-[#898989]">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-violet-400"
                  aria-hidden="true"
                />
                Pool deficit
              </div>
              <div className="mt-2 font-serif font-normal text-[28px] leading-none tracking-[-0.02em] tabular-nums text-white">
                {summary.combinedOnly}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Godown Filter Pill Segmented Control */}
      {!lockedGodown && collisions.length > 0 && (
        <div className="border-t border-white/[0.06] px-5 sm:px-6 py-3.5">
          <div
            role="group"
            aria-label="Filter collisions by godown"
            className="inline-flex flex-wrap items-center gap-1 rounded-full bg-white/[0.05] border border-white/[0.06] p-1"
          >
            <button
              type="button"
              aria-pressed={effectiveGodownFilter === "ALL"}
              onClick={() => setSelectedGodownFilter("ALL")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 ${
                effectiveGodownFilter === "ALL"
                  ? "bg-white text-black shadow-sm"
                  : "text-[#a0a0a0] hover:text-white"
              }`}
            >
              All ({collisions.length})
            </button>
            {Array.from(summary.byGodown.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([godown, count]) => (
                <button
                  key={godown}
                  type="button"
                  aria-pressed={effectiveGodownFilter === godown}
                  onClick={() => setSelectedGodownFilter(godown)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 ${
                    effectiveGodownFilter === godown
                      ? "bg-white text-black shadow-sm"
                      : "text-[#a0a0a0] hover:text-white"
                  }`}
                >
                  {shortGodown(godown)} ({count})
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Collisions Table */}
      {filteredCollisions.length === 0 ? (
        <div className="flex items-center gap-2 border-t border-white/[0.06] px-5 sm:px-6 py-6 text-sm text-[#a0a0a0]">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
            aria-hidden="true"
          />
          No multi-set{" "}
          <span className="font-mono text-xs text-[#e7e7e7]">
            {SHARED_BOLT_CODE}
          </span>{" "}
          collisions detected for this filter.
        </div>
      ) : (
        <div className="border-t border-white/[0.06]">
          <div className="overflow-x-auto max-w-full">
            <table className="min-w-full text-left">
              <thead className="border-b border-white/[0.06] bg-white/[0.025] text-xs font-normal text-[#898989]">
                <tr>
                  <th className="px-5 sm:px-6 py-2.5 font-normal">Godown</th>
                  <th className="px-4 py-2.5 font-normal">Month</th>
                  <th className="px-4 py-2.5 font-normal">Blocked sets</th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    On-hand stock
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    Combined need
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    Deficit
                  </th>
                  <th className="px-5 sm:px-6 py-2.5 text-right font-normal">
                    Inspect
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-sm">
                {visibleEvents.map((ev) => {
                  const targetSet =
                    ev.bottleneckedSets[0] ??
                    ev.affectedSets[0]?.set_no ??
                    "1.071";
                  const isThreeSet = ev.bottleneckedSets.length === 3;

                  return (
                    <tr
                      key={`${ev.godown}-${ev.month}`}
                      className="hover:bg-white/[0.03] transition-colors duration-150"
                    >
                      <td className="px-5 sm:px-6 py-3 font-medium text-[#e7e7e7] whitespace-nowrap">
                        {shortGodown(ev.godown)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#a0a0a0] whitespace-nowrap">
                        {ev.month}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ev.bottleneckedSets.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#e7e7e7]">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isThreeSet
                                  ? "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.75)]"
                                  : "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.7)]"
                              }`}
                              aria-hidden="true"
                            />
                            Sets {ev.bottleneckedSets.join(", ")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#a0a0a0]">
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-violet-400"
                              aria-hidden="true"
                            />
                            Pool contention (
                            {ev.affectedSets.map((s) => s.set_no).join(", ")})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#e7e7e7] whitespace-nowrap">
                        {formatQtyNumber(ev.availableMt, "MT")}
                        <span className="ml-1 text-xs text-[#898989]">MT</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#a0a0a0] whitespace-nowrap">
                        {formatQtyNumber(ev.combinedRequiredMt, "MT")}
                        <span className="ml-1 text-xs text-[#898989]">MT</span>
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums whitespace-nowrap ${
                          ev.deficitMt > 0
                            ? "font-medium text-rose-400"
                            : "text-white/25"
                        }`}
                      >
                        {ev.deficitMt > 0
                          ? `-${formatQtyNumber(ev.deficitMt, "MT")}`
                          : "0"}
                        <span className="ml-1 text-xs font-normal text-[#898989]">
                          MT
                        </span>
                      </td>
                      <td className="px-5 sm:px-6 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            onJumpToCell(targetSet, ev.godown, ev.month)
                          }
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-medium text-[#e7e7e7] hover:bg-white/[0.12] hover:text-white active:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 transition-all duration-150 cursor-pointer"
                        >
                          Drill down
                          <ArrowRight className="h-3.5 w-3.5 text-[#a0a0a0]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredCollisions.length > 12 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 sm:px-6 py-3.5 text-xs text-[#898989]">
              <span>
                Showing {visibleEvents.length} of {filteredCollisions.length}{" "}
                flagged godown-months (
                {ratioMode === "empirical" ? "Empirical" : "BOM"} mode)
              </span>
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="rounded font-medium text-[#e7e7e7] underline decoration-white/25 underline-offset-4 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer"
              >
                {showAll
                  ? "Show top 12"
                  : `Show all ${filteredCollisions.length} events`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
