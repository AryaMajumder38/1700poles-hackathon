"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { ItemMaster } from "@/types/lumino";
import { PrimaryPlateButton, QtyText } from "./HexPrimitives";
import { shortGodownName } from "./plannerTypes";

export type DecisionFilter = "ALL" | "ORDER" | "TRANSFER" | "HOLD" | "WAIT";

interface MonthScrubberProps {
  months: string[];
  monthIndex: number;
  onChangeMonthIndex: (idx: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  selectedItem: ItemMaster;
  contractorIdleStock: number;
  totalProjectedDemand: number;
  scopedGodown?: string | null;
  scopedProjectedDemand?: number | null;
}

const MILESTONES = [
  { month: "2023-03", label: "Launch" },
  { month: "2023-11", label: "Transfers" },
  { month: "2024-08", label: "Surge" },
  { month: "2025-02", label: "Peak idle" },
  { month: "2026-07", label: "Wind-down" },
];

export default function MonthScrubber({
  months,
  monthIndex,
  onChangeMonthIndex,
  isPlaying,
  onTogglePlay,
  selectedItem,
  contractorIdleStock,
  totalProjectedDemand,
  scopedGodown,
  scopedProjectedDemand,
}: MonthScrubberProps) {
  const activeMonth = months[monthIndex] ?? months[0];
  const isWindDown = activeMonth >= "2026-07";
  const throttleActive =
    totalProjectedDemand > 0 &&
    contractorIdleStock > 1.5 * (totalProjectedDemand * 2);

  return (
    <div
      id="planner-replay-console"
      aria-label="Causal Replay Timeline Scrubber"
      className="border-t border-white/[0.06] bg-[#151515] px-6 py-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Playback + Month Readout */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeMonthIndex(Math.max(0, monthIndex - 1))}
            disabled={monthIndex === 0}
            aria-label="Previous month"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.06] text-[#e7e7e7] transition-all duration-200 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151515] disabled:opacity-35 cursor-pointer"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>

          <PrimaryPlateButton
            variant="dark"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause replay" : "Play replay"}
            className="min-w-[100px]"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Replay
              </>
            )}
          </PrimaryPlateButton>

          <button
            type="button"
            onClick={() =>
              onChangeMonthIndex(Math.min(months.length - 1, monthIndex + 1))
            }
            disabled={monthIndex === months.length - 1}
            aria-label="Next month"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.06] text-[#e7e7e7] transition-all duration-200 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151515] disabled:opacity-35 cursor-pointer"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>

          <div className="pl-1 sm:ml-2 sm:border-l sm:border-white/[0.08] sm:pl-4">
            <div className="text-base font-medium leading-none text-white tabular-nums">
              {activeMonth}
            </div>
            <div className="mt-1 text-xs text-[#898989] tabular-nums">
              Month {String(monthIndex + 1).padStart(2, "0")}/{months.length} ·
              Causal (t ≤ {activeMonth})
            </div>
          </div>
        </div>

        {/* Right: Quiet Inline Telemetry */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#898989] tabular-nums">
          <span>
            Lead time{" "}
            <span className="font-medium text-white">
              {selectedItem.lead_time_days}d
            </span>
          </span>
          {scopedGodown && scopedProjectedDemand != null && (
            <span>
              {shortGodownName(scopedGodown)} demand{" "}
              <QtyText
                value={scopedProjectedDemand}
                unit={selectedItem.unit}
                className="font-medium text-white"
              />
            </span>
          )}
          <span>
            Contractor idle{scopedGodown ? " (project-wide)" : ""}{" "}
            <QtyText
              value={contractorIdleStock}
              unit={selectedItem.unit}
              className={
                throttleActive
                  ? "font-medium text-amber-300"
                  : "font-medium text-white"
              }
            />
            {throttleActive && (
              <span className="ml-1 text-amber-300">(θ=0.5)</span>
            )}
          </span>
          {isWindDown && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.05] px-2.5 py-0.5 text-xs text-[#e7e7e7]">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.7)]"
              />
              Wind-down guard
            </span>
          )}
        </div>
      </div>

      {/* Scrubber Slider + Milestone Jumps */}
      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={Math.max(0, months.length - 1)}
          value={monthIndex}
          onChange={(e) => onChangeMonthIndex(Number(e.target.value))}
          aria-label="Replay month slider"
          className="hp-range"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-[#898989] tabular-nums">
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
                  className={`rounded-full px-3 py-1 text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer tabular-nums ${
                    isCurrent
                      ? "bg-white font-medium text-black shadow-sm"
                      : "border border-white/[0.06] bg-white/[0.04] text-[#a0a0a0] hover:bg-white/[0.1] hover:text-white"
                  }`}
                >
                  {ms.month} · {ms.label}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-[#898989] tabular-nums">
            {months[months.length - 1]}
          </span>
        </div>
      </div>
    </div>
  );
}
