"use client";

import { Lock } from "lucide-react";
import type {
  ActiveGodown,
  SimulationAction,
  SimulationDecision,
} from "@/types/lumino";
import { QtyText } from "./HexPrimitives";
import type { DecisionFilter } from "./MonthScrubber";
import { getTransitDays, shortGodownName } from "./plannerTypes";

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

const FILTER_LABELS: Record<DecisionFilter, string> = {
  ALL: "All",
  ORDER: "Order",
  TRANSFER: "Transfer",
  HOLD: "Hold",
  WAIT: "Wait",
};

function decisionStyle(decision: SimulationDecision) {
  switch (decision) {
    case "ORDER":
      return {
        label: "Order",
        dot: "bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]",
        text: "text-[#e7e7e7]",
      };
    case "TRANSFER_IN":
      return {
        label: "Transfer in",
        dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.75)]",
        text: "text-emerald-400",
      };
    case "TRANSFER_OUT":
      return {
        label: "Transfer out",
        dot: "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.75)]",
        text: "text-amber-300",
      };
    case "HOLD":
      return {
        label: "Hold",
        dot: "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.75)]",
        text: "text-amber-300",
      };
    default:
      return {
        label: "Wait",
        dot: "bg-white/25",
        text: "text-[#898989]",
      };
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
  const totalScopedCount =
    decisionCounts.ORDER +
    decisionCounts.HOLD +
    decisionCounts.TRANSFER_IN +
    decisionCounts.TRANSFER_OUT +
    decisionCounts.WAIT;

  const scopeSubtitle = lockedGodown
    ? `${shortGodownName(lockedGodown)} site-scoped dispatch decisions`
    : selectedGodown !== "ALL"
    ? `${shortGodownName(selectedGodown)} monthly dispatch decision`
    : "Monthly replenishment decisions across 6 Kanpur godowns";

  return (
    <section aria-label="Monthly Godown Action Cards" className="space-y-4">
      {/* Section Header & Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-[17px] font-medium text-[#e7e7e7]">
            Godown decisions ·{" "}
            <span className="tabular-nums text-white">{activeMonth}</span>
          </h3>
          <p className="mt-0.5 text-sm text-[#a0a0a0]">{scopeSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lockedGodown ? (
            <div className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#1a1a1a] px-3.5 text-xs font-medium text-[#a0a0a0]">
              <Lock aria-hidden="true" className="h-3.5 w-3.5 text-[#898989]" />
              <span>{shortGodownName(lockedGodown)} (Site scoped)</span>
            </div>
          ) : (
            <select
              aria-label="Filter by godown"
              value={selectedGodown}
              onChange={(e) =>
                onChangeGodown(e.target.value as "ALL" | ActiveGodown)
              }
              className="h-9 rounded-full border border-white/[0.09] bg-[#151515] px-4 text-sm text-[#e7e7e7] transition-colors focus-visible:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
            >
              <option value="ALL" className="bg-[#1a1a1a] text-[#e7e7e7]">
                All 6 godowns
              </option>
              {godowns.map((g) => (
                <option
                  key={g}
                  value={g}
                  className="bg-[#1a1a1a] text-[#e7e7e7]"
                >
                  {shortGodownName(g)}
                </option>
              ))}
            </select>
          )}

          {/* Pill Segmented Decision Filter */}
          <div className="inline-flex flex-wrap rounded-full border border-white/[0.06] bg-white/[0.05] p-1">
            {(
              ["ALL", "ORDER", "TRANSFER", "HOLD", "WAIT"] as DecisionFilter[]
            ).map((f) => {
              const count =
                f === "ALL"
                  ? totalScopedCount
                  : f === "TRANSFER"
                  ? decisionCounts.TRANSFER_IN + decisionCounts.TRANSFER_OUT
                  : decisionCounts[f];
              const active = decisionFilter === f;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeDecisionFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer tabular-nums ${
                    active
                      ? "bg-white font-medium text-black shadow-sm"
                      : "text-[#a0a0a0] hover:text-white"
                  }`}
                >
                  {FILTER_LABELS[f]} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State or Steep Charcoal Cards */}
      {actions.length === 0 ? (
        <div className="rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] px-6 py-10 text-center text-sm text-[#a0a0a0]">
          No godowns match this filter in{" "}
          <span className="font-medium text-white tabular-nums">
            {activeMonth}
          </span>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {actions.map((act) => {
            const status = decisionStyle(act.decision);
            const hasTransfers =
              act.transfers_in.length > 0 || act.transfers_out.length > 0;

            return (
              <article
                key={`${act.month}-${act.godown}-${act.item_code}`}
                className="flex flex-col justify-between rounded-[24px] border border-white/[0.06] bg-[#1a1a1a] p-5 transition-colors duration-200 hover:border-white/[0.12]"
              >
                <div>
                  {/* Row 1: Godown Title + Glowing Dot Status */}
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[15px] font-medium text-[#e7e7e7]">
                      {shortGodownName(act.godown)}
                    </h4>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${status.text}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                      />
                      {status.label}
                    </span>
                  </div>

                  {/* Row 2: Primary Instruction Line */}
                  <div className="mt-3 min-h-[24px] space-y-1 text-sm">
                    {act.order_qty > 0 && (
                      <div className="font-medium text-white">
                        Order{" "}
                        <QtyText value={act.order_qty} unit={act.unit} />
                        {act.expected_arrival_month && (
                          <span className="ml-2 text-xs font-normal text-[#898989] tabular-nums">
                            ETA {act.expected_arrival_month}
                          </span>
                        )}
                      </div>
                    )}

                    {act.hold_qty > 0 &&
                      act.order_qty === 0 &&
                      !hasTransfers && (
                        <div className="font-medium text-amber-300">
                          Hold{" "}
                          <QtyText
                            value={act.hold_qty}
                            unit={act.unit}
                            className="text-amber-300"
                          />{" "}
                          on site
                        </div>
                      )}

                    {act.transfers_in.map((tr, idx) => (
                      <div
                        key={`in-${idx}`}
                        className="font-medium text-emerald-400"
                      >
                        <QtyText
                          value={tr.qty}
                          unit={tr.unit}
                          signed
                          className="text-emerald-400"
                        />{" "}
                        from {shortGodownName(tr.from_godown)}
                        <span className="ml-1.5 text-xs font-normal text-[#898989] tabular-nums">
                          ({tr.distance_km} km · {getTransitDays(tr.distance_km)}
                          d)
                        </span>
                      </div>
                    ))}

                    {act.transfers_out.map((tr, idx) => (
                      <div
                        key={`out-${idx}`}
                        className="font-medium text-amber-300"
                      >
                        <QtyText
                          value={-tr.qty}
                          unit={tr.unit}
                          signed
                          className="text-amber-300"
                        />{" "}
                        to {shortGodownName(tr.to_godown)}
                        <span className="ml-1.5 text-xs font-normal text-[#898989] tabular-nums">
                          ({tr.distance_km} km · {getTransitDays(tr.distance_km)}
                          d)
                        </span>
                      </div>
                    ))}

                    {act.order_qty === 0 &&
                      act.hold_qty === 0 &&
                      !hasTransfers && (
                        <div className="text-[#898989]">
                          No replenishment required
                        </div>
                      )}
                  </div>

                  {/* Row 3: Telemetry Strip with Hairline Dividers */}
                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/[0.06] py-3">
                    <div>
                      <span className="block text-xs font-normal text-[#898989]">
                        On hand
                      </span>
                      <span className="mt-0.5 block text-sm font-medium text-white">
                        <QtyText value={act.godown_on_hand} unit={act.unit} />
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-normal text-[#898989]">
                        In transit
                      </span>
                      <span className="mt-0.5 block text-sm font-medium text-white">
                        <QtyText
                          value={act.in_transit_qty}
                          unit={act.unit}
                          dashZero
                        />
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-normal text-[#898989]">
                        Demand/mo
                      </span>
                      <span className="mt-0.5 block text-sm font-medium text-white">
                        <QtyText
                          value={act.projected_monthly_demand}
                          unit={act.unit}
                        />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 4: Concise Rationale */}
                <p
                  title={act.rationale}
                  className="mt-3 line-clamp-2 text-xs leading-relaxed text-[#a0a0a0]"
                >
                  {act.rationale}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
