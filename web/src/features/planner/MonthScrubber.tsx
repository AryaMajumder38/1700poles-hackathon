"use client";

import {
  Clock,
  Filter,
  Gauge,
  Lock,
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
import { CornerMarks, PrimaryPlateButton } from "./HexPrimitives";
import styles from "./plannerHex.module.css";
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
  lockedGodown?: string | null;
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
  lockedGodown,
  decisionFilter,
  onChangeDecisionFilter,
  selectedItem,
  contractorIdleStock,
  totalProjectedDemand,
  decisionCounts,
}: MonthScrubberProps) {
  const activeMonth = months[monthIndex] ?? months[0];
  const isWindDown = activeMonth >= "2026-07";
  const throttleActive =
    totalProjectedDemand > 0 &&
    contractorIdleStock > 1.5 * (totalProjectedDemand * 2);

  return (
    <section
      id="planner-replay-console"
      aria-label="Causal Replay Controls"
      className="space-y-4"
    >
      {/* Upper Warm Paper Filter Bar (1px ruled strip) */}
      <div className="border border-[#dbd7da] bg-[#fcf8f8] p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <label
              htmlFor="planner-item-select"
              className={`${styles.fontMono} block text-[10px] font-semibold uppercase tracking-[0.0833em] text-[#43394c]`}
            >
              Tracked SKU · 16 Material Catalog
            </label>
            <select
              id="planner-item-select"
              value={selectedItemCode}
              onChange={(e) => onChangeItemCode(e.target.value)}
              className="mt-1.5 h-[38px] w-full rounded-[1px] border border-[#dbd7da] bg-[#fffcfc] px-3 text-xs font-medium text-[#14141c] transition-colors hover:border-[#afa9b1] focus:border-[#31263b] focus:outline-none"
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
              className={`${styles.fontMono} flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.0833em] text-[#43394c]`}
            >
              <span>Godown Scope</span>
              {lockedGodown && (
                <span className="inline-flex items-center gap-0.5 rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-800">
                  <Lock className="h-2.5 w-2.5" /> RBAC Locked
                </span>
              )}
            </label>
            {lockedGodown ? (
              <div className="mt-1.5 flex h-[38px] items-center justify-between rounded-[1px] border border-sky-300 bg-sky-50 px-3 text-xs font-semibold text-sky-950">
                <span>{shortGodownName(lockedGodown)}</span>
                <Lock className="h-3.5 w-3.5 text-sky-600" />
              </div>
            ) : (
              <select
                id="planner-godown-select"
                value={selectedGodown}
                onChange={(e) =>
                  onChangeGodown(e.target.value as "ALL" | ActiveGodown)
                }
                className="mt-1.5 h-[38px] w-full rounded-[1px] border border-[#dbd7da] bg-[#fffcfc] px-3 text-xs font-medium text-[#14141c] transition-colors hover:border-[#afa9b1] focus:border-[#31263b] focus:outline-none"
              >
                <option value="ALL">All 6 Active Godowns</option>
                {godowns.map((g) => (
                  <option key={g} value={g}>
                    {shortGodownName(g)} ({g})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="md:col-span-4">
            <span
              className={`${styles.fontMono} flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.0833em] text-[#43394c]`}
            >
              <Filter className="h-3 w-3 text-[#89828d]" /> Decision Filter
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(
                ["ALL", "ORDER", "TRANSFER", "HOLD", "WAIT"] as DecisionFilter[]
              ).map((f) => {
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
                    className={`${styles.secondaryPlate} ${
                      active ? styles.secondaryPlateActive : ""
                    } ${styles.fontMono} h-[38px] px-2.5 text-[11px] font-medium`}
                  >
                    {f} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Charcoal & Rose Quartz Causal Replay Stage (Hex Dark Product Variant) */}
      <div className={`${styles.charcoalStage} p-5 sm:p-6`}>
        <div className={styles.lavenderHorizon} />
        <CornerMarks tone="dark" />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onChangeMonthIndex(Math.max(0, monthIndex - 1))}
              disabled={monthIndex === 0}
              aria-label="Previous month"
              className={`${styles.secondaryPlateDark} h-[38px] w-[38px]`}
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <PrimaryPlateButton
              variant="dark"
              size="sm"
              onClick={onTogglePlay}
              aria-label={isPlaying ? "Pause replay" : "Play replay"}
              className="min-w-[104px]"
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
              className={`${styles.secondaryPlateDark} h-[38px] w-[38px]`}
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <div className="ml-1 border-l border-[#3a3138] pl-4">
              <div
                className={`${styles.fontMono} ${styles.darkHeadlineGradient} text-2xl font-semibold leading-none tracking-tight`}
              >
                {activeMonth}
              </div>
              <div
                className={`${styles.fontMono} mt-1 text-[11px] text-[#99797d]`}
              >
                MONTH {String(monthIndex + 1).padStart(2, "0")} /{" "}
                {months.length} · CAUSAL STATE (t_obs ≤ {activeMonth})
              </div>
            </div>
          </div>

          {/* Live Causal Context Markers (Rose Quartz & Lavender accents) */}
          <div className={`${styles.fontMono} flex flex-wrap items-center gap-2 text-[11px]`}>
            <span className="inline-flex items-center gap-1.5 border border-[#3a3138] bg-[#2b252c]/80 px-2.5 py-1.5 text-[#f5c0c0]">
              <Clock className="h-3.5 w-3.5 text-[#ad8eb6]" />
              LT {selectedItem.lead_time_days}d (
              {Math.max(1, Math.round(selectedItem.lead_time_days / 30))}m)
            </span>

            <span
              className="inline-flex items-center gap-1.5 border px-2.5 py-1.5"
              style={{
                borderColor: throttleActive ? "#f5c0c0" : "#3a3138",
                backgroundColor: throttleActive
                  ? "rgba(245, 192, 192, 0.14)"
                  : "rgba(43, 37, 44, 0.8)",
                color: throttleActive ? "#ffffff" : "#e3b2b3",
              }}
            >
              <Gauge className="h-3.5 w-3.5 text-[#ad8eb6]" />
              Contractor Idle:{" "}
              {formatQty(contractorIdleStock, selectedItem.unit)}
              {throttleActive ? " · θ=0.5" : ""}
            </span>

            {isWindDown && (
              <span className="inline-flex items-center gap-1.5 border border-[#f5c0c0]/60 bg-[#f5c0c0]/15 px-2.5 py-1.5 text-[#ffffff]">
                <Wind className="h-3.5 w-3.5 text-[#f5c0c0]" />
                Wind-Down Guard Active
              </span>
            )}
          </div>
        </div>

        {/* Timeline Scrubber Track + Milestone Technical Plates */}
        <div className="relative z-10 mt-5 border-t border-[#3a3138] pt-4">
          <input
            type="range"
            min={0}
            max={Math.max(0, months.length - 1)}
            value={monthIndex}
            onChange={(e) => onChangeMonthIndex(Number(e.target.value))}
            aria-label="Replay month slider"
            className={styles.darkRange}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className={`${styles.fontMono} text-[11px] text-[#99797d]`}>
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
                    className={`${styles.secondaryPlateDark} ${
                      isCurrent ? styles.secondaryPlateDarkActive : ""
                    } ${styles.fontMono} px-2.5 py-1 text-[11px]`}
                  >
                    {ms.month} · {ms.label}
                  </button>
                );
              })}
            </div>
            <span className={`${styles.fontMono} text-[11px] text-[#99797d]`}>
              {months[months.length - 1]}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
