"use client";

import { Lock } from "lucide-react";
import type {
  ActiveGodown,
  SimulationAction,
  SimulationDecision,
} from "@/types/lumino";
import type { DecisionFilter } from "./MonthScrubber";
import { formatQty, getTransitDays, shortGodownName } from "./plannerTypes";

interface ActionCardsGridProps {
  actions: SimulationAction[];
  activeMonth: string;
  godowns: ActiveGodown[];
  selectedGodown: "ALL" | ActiveGodown;
  onChangeGodown: (g: "ALL" | ActiveGodown) => void;
  lockedGodown?: string | null;
  decisionFilter: DecisionFilter;
  onChangeDecisionFilter: (f: DecisionFilter) => void;
  decisionCounts: Record<SimulationDecision, number>;
}

function decisionAccent(decision: SimulationDecision) {
  switch (decision) {
    case "ORDER":
      return { label: "ORDER", color: "#36578f" };
    case "TRANSFER_IN":
      return { label: "TRANSFER IN", color: "#2c7a62" };
    case "TRANSFER_OUT":
      return { label: "TRANSFER OUT", color: "#765383" };
    case "HOLD":
      return { label: "HOLD", color: "#a98529" };
    default:
      return { label: "WAIT", color: "#89828d" };
  }
}

export default function ActionCardsGrid({
  actions,
  activeMonth,
  godowns,
  selectedGodown,
  onChangeGodown,
  lockedGodown,
  decisionFilter,
  onChangeDecisionFilter,
  decisionCounts,
}: ActionCardsGridProps) {
  return (
    <section aria-label="Monthly Godown Action Cards" className="space-y-5">
      {/* Clean Single-Row Section Header with Contextual Filters */}
      <div className="flex flex-col gap-4 border-b border-[#dbd7da] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="hp-mono text-[10px] uppercase tracking-[0.0833em] text-[#89828d]">
            ACTIVE KANPUR GODOWNS · MONTHLY DISPATCH
          </span>
          <h3 className="hp-heading mt-1 text-2xl font-extrabold text-[#14141c]">
            Godown decisions{" "}
            <span className="hp-italic text-[29px] font-light text-[#31263b]">
              for {activeMonth}
            </span>
          </h3>
        </div>

        {/* Inline Filters placed directly above the tiles they control */}
        <div className="flex flex-wrap items-center gap-2">
          {lockedGodown ? (
            <div className="inline-flex h-[34px] items-center gap-1.5 rounded-[1px] border border-sky-300 bg-sky-50 px-2.5 text-xs font-semibold text-sky-900">
              <Lock className="h-3 w-3 text-sky-700" />
              <span>{shortGodownName(lockedGodown)} (Site Scoped)</span>
            </div>
          ) : (
            <select
              aria-label="Filter by godown"
              value={selectedGodown}
              onChange={(e) =>
                onChangeGodown(e.target.value as "ALL" | ActiveGodown)
              }
              className="hp-select !h-[34px] !w-auto !px-2.5 !text-xs"
            >
              <option value="ALL">All 6 Godowns</option>
              {godowns.map((g) => (
                <option key={g} value={g}>
                  {shortGodownName(g)}
                </option>
              ))}
            </select>
          )}

          <div className="flex flex-wrap gap-1">
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
                  className={`hp-btn-secondary hp-mono h-[34px] px-2.5 text-[10px] font-medium ${
                    active ? "is-active" : ""
                  }`}
                >
                  {f} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State or 3x2 Flat Technical Tiles */}
      {actions.length === 0 ? (
        <div className="border border-dashed border-[#dbd7da] bg-[#fcf8f8] px-6 py-10 text-center text-sm font-light text-[#43394c]">
          No godowns match this filter in{" "}
          <span className="hp-mono font-medium text-[#14141c]">
            {activeMonth}
          </span>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {actions.map((act) => {
            const accent = decisionAccent(act.decision);
            const hasTransfers =
              act.transfers_in.length > 0 || act.transfers_out.length > 0;

            return (
              <div
                key={`${act.month}-${act.godown}-${act.item_code}`}
                className="hp-tech-tile"
              >
                <article className="hp-tech-tile-body flex flex-col justify-between p-5">
                  <div>
                    {/* Row 1: Godown Title + Quiet Dot Status */}
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="hp-heading text-[17px] font-bold text-[#14141c]">
                        {shortGodownName(act.godown)}
                      </h4>
                      <span
                        className="hp-mono inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                        style={{ color: accent.color }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: accent.color }}
                        />
                        {accent.label}
                      </span>
                    </div>

                    {/* Row 2: Crisp Primary Instruction Line */}
                    <div className="mt-2.5 min-h-[24px] space-y-1 text-[13px]">
                      {act.order_qty > 0 && (
                        <div className="font-medium text-[#36578f] tabular-nums">
                          Order {formatQty(act.order_qty, act.unit)}
                          {act.expected_arrival_month && (
                            <span className="hp-mono ml-2 text-[11px] font-normal text-[#89828d]">
                              ETA {act.expected_arrival_month}
                            </span>
                          )}
                        </div>
                      )}

                      {act.hold_qty > 0 &&
                        act.order_qty === 0 &&
                        !hasTransfers && (
                          <div className="font-medium text-[#93701d] tabular-nums">
                            Holding {formatQty(act.hold_qty, act.unit)} on site
                          </div>
                        )}

                      {act.transfers_in.map((tr, idx) => (
                        <div
                          key={`in-${idx}`}
                          className="font-medium text-[#2c7a62] tabular-nums"
                        >
                          +{formatQty(tr.qty, tr.unit)} from{" "}
                          {shortGodownName(tr.from_godown)}
                          <span className="hp-mono ml-1.5 text-[11px] font-normal text-[#89828d]">
                            ({tr.distance_km} km ·{" "}
                            {getTransitDays(tr.distance_km)}d)
                          </span>
                        </div>
                      ))}

                      {act.transfers_out.map((tr, idx) => (
                        <div
                          key={`out-${idx}`}
                          className="font-medium text-[#765383] tabular-nums"
                        >
                          −{formatQty(tr.qty, tr.unit)} to{" "}
                          {shortGodownName(tr.to_godown)}
                          <span className="hp-mono ml-1.5 text-[11px] font-normal text-[#89828d]">
                            ({tr.distance_km} km ·{" "}
                            {getTransitDays(tr.distance_km)}d)
                          </span>
                        </div>
                      ))}

                      {act.order_qty === 0 &&
                        act.hold_qty === 0 &&
                        !hasTransfers && (
                          <div className="font-light text-[#89828d]">
                            No replenishment required
                          </div>
                        )}
                    </div>

                    {/* Row 3: Clean Hairline Telemetry Strip (no heavy boxes) */}
                    <div className="mt-4 grid grid-cols-3 gap-2 border-y border-[#e9e5e8] py-2.5 text-[11px] tabular-nums">
                      <div>
                        <span className="hp-mono block text-[9.5px] uppercase tracking-[0.06em] text-[#89828d]">
                          On Hand
                        </span>
                        <span className="mt-0.5 block font-medium text-[#14141c]">
                          {formatQty(act.godown_on_hand, act.unit)}
                        </span>
                      </div>
                      <div>
                        <span className="hp-mono block text-[9.5px] uppercase tracking-[0.06em] text-[#89828d]">
                          In Transit
                        </span>
                        <span className="mt-0.5 block font-medium text-[#43394c]">
                          {formatQty(act.in_transit_qty, act.unit)}
                        </span>
                      </div>
                      <div>
                        <span className="hp-mono block text-[9.5px] uppercase tracking-[0.06em] text-[#89828d]">
                          Demand/mo
                        </span>
                        <span className="mt-0.5 block font-medium text-[#14141c]">
                          {formatQty(act.projected_monthly_demand, act.unit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Calm Plain-English Rationale */}
                  <p className="mt-3.5 text-[13px] font-light leading-[1.55] text-[#43394c]">
                    {act.rationale}
                  </p>
                </article>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
