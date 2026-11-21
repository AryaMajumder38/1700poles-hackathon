"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { ItemMaster } from "@/types/lumino";
import { PrimaryPlateButton } from "./HexPrimitives";
import { formatQty } from "./plannerTypes";

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
}

const MILESTONES = [
  { month: "2023-03", label: "Launch" },
  { month: "2023-11", label: "Transfers" },
  { month: "2024-08", label: "Surge" },
  { month: "2025-02", label: "Peak Idle" },
  { month: "2026-07", label: "Wind-Down" },
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
      className="hp-charcoal px-5 py-5 sm:px-6"
    >
      <div className="hp-lavender-glow" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Playback + Month Readout */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onChangeMonthIndex(Math.max(0, monthIndex - 1))}
            disabled={monthIndex === 0}
            aria-label="Previous month"
            className="hp-btn-dark h-[38px] w-[38px]"
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
            className="hp-btn-dark h-[38px] w-[38px]"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>

          <div className="ml-2 border-l border-[#3a3138] pl-4">
            <div className="hp-mono hp-dark-gradient text-xl font-semibold leading-none tracking-tight">
              {activeMonth}
            </div>
            <div className="hp-mono mt-1 text-[10px] uppercase tracking-[0.07em] text-[#99797d]">
              Month {String(monthIndex + 1).padStart(2, "0")}/{months.length} · Causal (t ≤ {activeMonth})
            </div>
          </div>
        </div>

        {/* Right: Quiet Inline Mono Telemetry */}
        <div className="hp-mono flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-[#e3b2b3]">
          <span>
            <span className="text-[#99797d]">LEAD TIME </span>
            <span className="text-[#ffffff]">{selectedItem.lead_time_days}d</span>
          </span>
          <span>
            <span className="text-[#99797d]">CONTRACTOR IDLE </span>
            <span className={throttleActive ? "text-[#f5c0c0]" : "text-[#ffffff]"}>
              {formatQty(contractorIdleStock, selectedItem.unit)}
              {throttleActive ? " (θ=0.5)" : ""}
            </span>
          </span>
          {isWindDown && (
            <span className="border border-[#f5c0c0]/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#f5c0c0]">
              Wind-Down Guard
            </span>
          )}
        </div>
      </div>

      {/* Scrubber Slider + Milestone Jumps */}
      <div className="relative z-10 mt-4 pt-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, months.length - 1)}
          value={monthIndex}
          onChange={(e) => onChangeMonthIndex(Number(e.target.value))}
          aria-label="Replay month slider"
          className="hp-range"
        />
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="hp-mono text-[10px] text-[#99797d]">
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
                  className={`hp-btn-dark hp-mono px-2.5 py-1 text-[10px] ${
                    isCurrent ? "is-active" : ""
                  }`}
                >
                  {ms.month} · {ms.label}
                </button>
              );
            })}
          </div>
          <span className="hp-mono text-[10px] text-[#99797d]">
            {months[months.length - 1]}
          </span>
        </div>
      </div>
    </div>
  );
}
