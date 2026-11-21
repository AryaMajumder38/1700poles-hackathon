"use client";

import {
  Clock,
  Filter,
  Gauge,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Wind,
} from "lucide-react";
import type {
  ActiveGodown,
  ItemMaster,
  SimulationDecision,
} from "@/types/lumino";
import { formatQty, shortGodownName } from "./plannerTypes";

export type DecisionFilter = "ALL" | "ORDER" | "TRANSFER" | "HOLD" | "WAIT";

interface MonthScrubberProps {
  months: string[];
  monthIndex: number;
  onChangeMonthIndex: (idx: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  items: ItemMaster[];
  selectedItemCode: string;
  onChangeItemCode: (code: string) => void;
  godowns: ActiveGodown[];
  selectedGodown: "ALL" | ActiveGodown;
  onChangeGodown: (g: "ALL" | ActiveGodown) => void;
  decisionFilter: DecisionFilter;
  onChangeDecisionFilter: (f: DecisionFilter) => void;
  selectedItem: ItemMaster;
  contractorIdleStock: number;
  totalProjectedDemand: number;
  decisionCounts: Record<SimulationDecision, number>;
}

const MILESTONES = [
  { month: "2023-03", label: "Launch" },
  { month: "2023-11", label: "Early Transfers" },
  { month: "2024-08", label: "Demand Surge" },
  { month: "2025-02", label: "Peak Yard Idle" },
  { month: "2026-07", label: "Wind-Down" },
];

export default function MonthScrubber({
  months,
  monthIndex,
  onChangeMonthIndex,
  isPlaying,
  onTogglePlay,
  items,
  selectedItemCode,
  onChangeItemCode,
  godowns,
  selectedGodown,
  onChangeGodown,
  decisionFilter,
  onChangeDecisionFilter,
  selectedItem,
  contractorIdleStock,
  totalProjectedDemand,
  decisionCounts,
}: MonthScrubberProps) {
  const activeMonth = months[monthIndex] ?? months[0];
  const isWindDown = activeMonth >= "2026-07";
  // Note: totalProjectedDemand is already multiplied by theta (0.5 if throttled);
  // contractor throttle triggers when contractor_idle_stock > 1.5 * sum(D_raw)
  const throttleActive =
    totalProjectedDemand > 0 &&
    contractorIdleStock > 1.5 * (totalProjectedDemand * 2);

  return (
    <section
      aria-label="Causal Replay Controls"
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
    >
      {/* Top Row: Filters */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-5">
          <label
            htmlFor="planner-item-select"
            className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500"
          >
            Tracked SKU (16 Items)
          </label>
          <select
            id="planner-item-select"
            value={selectedItemCode}
            onChange={(e) => onChangeItemCode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
          >
            {items.map((it) => (
              <option key={it.item_code} value={it.item_code}>
                {it.item_code} — {it.item_name} ({it.unit}, LT {it.lead_time_days}d)
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label
            htmlFor="planner-godown-select"
            className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500"
          >
            Godown Scope
          </label>
          <select
            id="planner-godown-select"
            value={selectedGodown}
            onChange={(e) =>
              onChangeGodown(e.target.value as "ALL" | ActiveGodown)
            }
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
          >
            <option value="ALL">All 6 Active Godowns</option>
            {godowns.map((g) => (
              <option key={g} value={g}>
                {shortGodownName(g)} ({g})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <Filter className="h-3 w-3" /> Decision Filter
          </span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(["ALL", "ORDER", "TRANSFER", "HOLD", "WAIT"] as DecisionFilter[]).map(
              (f) => {
                const count =
                  f === "ALL"
                    ? 6
                    : f === "TRANSFER"
                    ? decisionCounts.TRANSFER_IN + decisionCounts.TRANSFER_OUT
                    : decisionCounts[f];
                const active = decisionFilter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => onChangeDecisionFilter(f)}
                    className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                      active
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {f} ({count})
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Middle Row: Play/Pause Timeline Scrubber */}
      <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 text-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeMonthIndex(Math.max(0, monthIndex - 1))}
              disabled={monthIndex === 0}
              aria-label="Previous month"
              className="rounded-md border border-slate-700 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? "Pause replay" : "Play replay"}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Replay
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeMonthIndex(Math.min(months.length - 1, monthIndex + 1))
              }
              disabled={monthIndex === months.length - 1}
              aria-label="Next month"
              className="rounded-md border border-slate-700 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <div className="ml-2">
              <div className="font-mono text-lg font-bold leading-none text-white">
                {activeMonth}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                Month {monthIndex + 1} of {months.length} • Causal view (data ≤{" "}
                {activeMonth})
              </div>
            </div>
          </div>

          {/* Live Causal Context Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-200">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              LT: {selectedItem.lead_time_days}d (
              {Math.max(1, Math.round(selectedItem.lead_time_days / 30))}m)
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 ${
                throttleActive
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              <Gauge className="h-3.5 w-3.5" />
              Contractor Idle: {formatQty(contractorIdleStock, selectedItem.unit)}
              {throttleActive ? " (θ=0.5)" : ""}
            </span>
            {isWindDown && (
              <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/50 bg-rose-500/15 px-2.5 py-1 text-rose-300">
                <Wind className="h-3.5 w-3.5" />
                Wind-Down Guard
              </span>
            )}
          </div>
        </div>

        {/* Range Slider */}
        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={months.length - 1}
            value={monthIndex}
            onChange={(e) => onChangeMonthIndex(Number(e.target.value))}
            aria-label="Replay month slider"
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-amber-500"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-slate-400">
              {months[0]}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MILESTONES.map((ms) => {
                const idx = months.indexOf(ms.month);
                if (idx === -1) return null;
                const isCurrent = idx === monthIndex;
                return (
                  <button
                    key={ms.month}
                    type="button"
                    onClick={() => onChangeMonthIndex(idx)}
                    className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                      isCurrent
                        ? "bg-amber-500 text-slate-950 font-semibold"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {ms.month} · {ms.label}
                  </button>
                );
              })}
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              {months[months.length - 1]}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
