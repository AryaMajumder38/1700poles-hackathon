"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Layers, ShieldAlert } from "lucide-react";
import type {
  ActiveGodown,
  SetImbalanceRow,
  SetRatioMode,
} from "@/types/lumino";
import {
  computeSharedChildCollisions,
  formatQty,
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
      className="rounded-xl border border-amber-300/80 bg-white p-4 sm:p-5 shadow-xs space-y-4 min-w-0"
    >
      {/* Panel Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-950 shadow-xs">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-950">
                SHARED CHILD CONTENTION ALERT
              </span>
              <span className="font-mono text-xs font-semibold text-slate-600">
                {SHARED_BOLT_CODE} • UOM: MT
              </span>
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900">
              G.I. Nuts &amp; Bolts (M16×65 MM) — Cross-Set Competition Monitor
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Shared by <strong>all 3 sets</strong> (1.071 Pole Clamps, 1.077
              1-Ph Boxes, 1.078 3-Ph Boxes). Below are godown-months where{" "}
              <code className="font-mono font-semibold">{SHARED_BOLT_CODE}</code>{" "}
              simultaneously bottlenecks 2+ sets or where combined MT demand
              across sets exceeds on-hand godown MT stock.
            </p>
          </div>
        </div>

        {/* Summary Counters */}
        <div className="flex flex-wrap gap-2 self-start">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-center">
            <div className="text-lg font-bold tabular-nums text-rose-900">
              {summary.threeSet}
            </div>
            <div className="text-[10px] font-semibold uppercase text-rose-700">
              All 3 Sets Blocked
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-center">
            <div className="text-lg font-bold tabular-nums text-amber-900">
              {summary.twoSet}
            </div>
            <div className="text-[10px] font-semibold uppercase text-amber-700">
              2 Sets Blocked
            </div>
          </div>
          {summary.combinedOnly > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-center">
              <div className="text-lg font-bold tabular-nums text-slate-900">
                {summary.combinedOnly}
              </div>
              <div className="text-[10px] font-semibold uppercase text-slate-600">
                Pool Deficit
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Godown Filter Pills */}
      {!lockedGodown && collisions.length > 0 && (
        <div
          role="group"
          aria-label="Filter collisions by godown"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            aria-pressed={effectiveGodownFilter === "ALL"}
            onClick={() => setSelectedGodownFilter("ALL")}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 ${
              effectiveGodownFilter === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Godowns ({collisions.length})
          </button>
          {Array.from(summary.byGodown.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([godown, count]) => (
              <button
                key={godown}
                type="button"
                aria-pressed={effectiveGodownFilter === godown}
                onClick={() => setSelectedGodownFilter(godown)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 ${
                  effectiveGodownFilter === godown
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {shortGodown(godown)} ({count})
              </button>
            ))}
        </div>
      )}

      {/* Collisions Table */}
      {filteredCollisions.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
          No multi-set {SHARED_BOLT_CODE} collisions detected for this filter.
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="overflow-x-auto max-w-full rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                <tr>
                  <th className="px-3 py-2">Godown</th>
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Bottlenecked Sets</th>
                  <th className="px-3 py-2 text-right">
                    On-Hand {SHARED_BOLT_CODE}
                  </th>
                  <th className="px-3 py-2 text-right">
                    Combined 3-Set Need
                  </th>
                  <th className="px-3 py-2 text-right">Combined MT Deficit</th>
                  <th className="px-3 py-2 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visibleEvents.map((ev) => {
                  const targetSet =
                    ev.bottleneckedSets[0] ?? ev.affectedSets[0]?.set_no ?? "1.071";
                  const isThreeSet = ev.bottleneckedSets.length === 3;
                  return (
                    <tr
                      key={`${ev.godown}-${ev.month}`}
                      className="hover:bg-amber-50/40 transition-colors"
                    >
                      <td className="px-3 py-2 font-semibold text-slate-900 whitespace-nowrap">
                        {shortGodown(ev.godown)}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                        {ev.month}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          {ev.bottleneckedSets.length > 0 ? (
                            ev.bottleneckedSets.map((setNo) => (
                              <span
                                key={setNo}
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                                  isThreeSet
                                    ? "bg-rose-100 text-rose-900"
                                    : "bg-amber-100 text-amber-900"
                                }`}
                              >
                                <Layers className="h-2.5 w-2.5" />
                                {setNo}
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              Combined Pool Contention (
                              {ev.affectedSets.map((s) => s.set_no).join(", ")})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                        {formatQty(ev.availableMt, "MT")}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {formatQty(ev.combinedRequiredMt, "MT")}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-rose-700 whitespace-nowrap">
                        {ev.deficitMt > 0
                          ? `-${formatQty(ev.deficitMt, "MT")}`
                          : "0 MT"}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            onJumpToCell(targetSet, ev.godown, ev.month)
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 transition-colors cursor-pointer"
                        >
                          Drill Down
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredCollisions.length > 12 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Showing {visibleEvents.length} of {filteredCollisions.length}{" "}
                flagged godown-months (
                {ratioMode === "empirical" ? "Empirical" : "BOM"} mode)
              </span>
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="rounded font-semibold text-slate-800 underline underline-offset-2 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 cursor-pointer"
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
