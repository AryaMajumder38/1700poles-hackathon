"use client";

import {
  ArrowLeftRight,
  Clock,
  PauseCircle,
  ShoppingCart,
  Truck,
} from "lucide-react";
import type { SimulationAction, SimulationDecision } from "@/types/lumino";
import styles from "./plannerHex.module.css";
import { formatQty, getTransitDays, shortGodownName } from "./plannerTypes";

interface ActionCardsGridProps {
  actions: SimulationAction[];
  activeMonth: string;
}

function decisionMeta(decision: SimulationDecision) {
  switch (decision) {
    case "ORDER":
      return {
        label: "ORDER",
        wellBg: "rgba(59, 91, 146, 0.12)",
        accent: "#3b5b92",
        badgeBorder: "rgba(59, 91, 146, 0.32)",
        badgeBg: "rgba(59, 91, 146, 0.07)",
        icon: ShoppingCart,
      };
    case "TRANSFER_IN":
      return {
        label: "TRANSFER IN",
        wellBg: "rgba(44, 122, 98, 0.13)",
        accent: "#2c7a62",
        badgeBorder: "rgba(44, 122, 98, 0.35)",
        badgeBg: "rgba(44, 122, 98, 0.07)",
        icon: Truck,
      };
    case "TRANSFER_OUT":
      return {
        label: "TRANSFER OUT",
        wellBg: "rgba(173, 142, 182, 0.22)",
        accent: "#6f4f79",
        badgeBorder: "rgba(111, 79, 121, 0.35)",
        badgeBg: "rgba(173, 142, 182, 0.12)",
        icon: ArrowLeftRight,
      };
    case "HOLD":
      return {
        label: "HOLD",
        wellBg: "rgba(169, 133, 41, 0.13)",
        accent: "#93701d",
        badgeBorder: "rgba(169, 133, 41, 0.35)",
        badgeBg: "rgba(169, 133, 41, 0.07)",
        icon: PauseCircle,
      };
    default:
      return {
        label: "WAIT",
        wellBg: "rgba(49, 38, 59, 0.08)",
        accent: "#43394c",
        badgeBorder: "#dbd7da",
        badgeBg: "#fcf8f8",
        icon: Clock,
      };
  }
}

export default function ActionCardsGrid({
  actions,
  activeMonth,
}: ActionCardsGridProps) {
  if (actions.length === 0) {
    return (
      <section className="border border-dashed border-[#afa9b1] bg-[#fcf8f8] p-8 text-center text-sm font-light text-[#43394c]">
        No godown decisions match the current filter for{" "}
        <span className={`${styles.fontMono} font-semibold text-[#14141c]`}>
          {activeMonth}
        </span>
        .
      </section>
    );
  }

  return (
    <section aria-label="Monthly Godown Action Cards" className="space-y-4">
      <div className="flex flex-col gap-1 border-b border-[#dbd7da] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span
            className={`${styles.fontMono} text-[10px] uppercase tracking-[0.0833em] text-[#89828d]`}
          >
            DISPATCH BOARD · 6 ACTIVE KANPUR CONSTRUCTION GODOWNS
          </span>
          <h3
            className={`${styles.fontHeading} mt-0.5 text-lg font-extrabold text-[#14141c] sm:text-xl`}
          >
            Monthly Godown Decisions{" "}
            <span
              className={`${styles.fontItalicSerif} text-2xl font-light text-[#31263b]`}
            >
              for {activeMonth}
            </span>
          </h3>
        </div>
        <span
          className={`${styles.fontMono} text-[11px] uppercase tracking-[0.06em] text-[#43394c]`}
        >
          Showing {actions.length} of 6 active godowns
        </span>
      </div>

      {/* 3-Column Technical Tiles Grid (20px gutters, flat 5% eggplant wash frames) */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((act) => {
          const meta = decisionMeta(act.decision);
          const Icon = meta.icon;
          const hasTransfers =
            act.transfers_in.length > 0 || act.transfers_out.length > 0;

          return (
            <div
              key={`${act.month}-${act.godown}-${act.item_code}`}
              className={styles.technicalTileOuter}
            >
              <article
                className={`${styles.technicalTileInner} flex h-full flex-col justify-between p-4`}
              >
                <div>
                  {/* Header with 28px Circular Pastel Icon Well & Mono Decision Plate */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: meta.wellBg,
                          color: meta.accent,
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4
                          className={`${styles.fontHeading} text-[15px] font-semibold leading-tight text-[#14141c]`}
                        >
                          {shortGodownName(act.godown)}
                        </h4>
                        <span
                          className={`${styles.fontMono} text-[10px] tracking-[0.06em] text-[#89828d]`}
                        >
                          {act.godown}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`${styles.fontMono} inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.07em]`}
                      style={{
                        borderColor: meta.badgeBorder,
                        backgroundColor: meta.badgeBg,
                        color: meta.accent,
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {/* Primary Action Directives */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    {act.order_qty > 0 && (
                      <div
                        className="border px-2.5 py-1.5 text-xs"
                        style={{
                          borderColor: "rgba(59, 91, 146, 0.3)",
                          backgroundColor: "rgba(59, 91, 146, 0.06)",
                          color: "#2c4673",
                        }}
                      >
                        <span className="font-semibold tabular-nums">
                          Order {formatQty(act.order_qty, act.unit)}
                        </span>
                        {act.expected_arrival_month && (
                          <span
                            className={`${styles.fontMono} ml-1.5 text-[10px] text-[#3b5b92]`}
                          >
                            ETA {act.expected_arrival_month}
                          </span>
                        )}
                      </div>
                    )}

                    {act.hold_qty > 0 &&
                      act.order_qty === 0 &&
                      !hasTransfers && (
                        <div
                          className="border px-2.5 py-1.5 text-xs"
                          style={{
                            borderColor: "rgba(169, 133, 41, 0.3)",
                            backgroundColor: "rgba(169, 133, 41, 0.07)",
                            color: "#806117",
                          }}
                        >
                          <span className="font-semibold tabular-nums">
                            Holding {formatQty(act.hold_qty, act.unit)}
                          </span>
                        </div>
                      )}

                    {act.transfers_in.map((tr, idx) => (
                      <div
                        key={`in-${idx}`}
                        className="border px-2.5 py-1.5 text-xs"
                        style={{
                          borderColor: "rgba(44, 122, 98, 0.3)",
                          backgroundColor: "rgba(44, 122, 98, 0.06)",
                          color: "#215c4a",
                        }}
                      >
                        <span className="font-semibold tabular-nums">
                          +{formatQty(tr.qty, tr.unit)}
                        </span>{" "}
                        from{" "}
                        <span className="font-medium">
                          {shortGodownName(tr.from_godown)}
                        </span>{" "}
                        <span
                          className={`${styles.fontMono} text-[10px] text-[#2c7a62]`}
                        >
                          ({tr.distance_km} km · {getTransitDays(tr.distance_km)}
                          d)
                        </span>
                      </div>
                    ))}

                    {act.transfers_out.map((tr, idx) => (
                      <div
                        key={`out-${idx}`}
                        className="border px-2.5 py-1.5 text-xs"
                        style={{
                          borderColor: "rgba(111, 79, 121, 0.3)",
                          backgroundColor: "rgba(173, 142, 182, 0.1)",
                          color: "#4a3352",
                        }}
                      >
                        <span className="font-semibold tabular-nums">
                          -{formatQty(tr.qty, tr.unit)}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">
                          {shortGodownName(tr.to_godown)}
                        </span>{" "}
                        <span
                          className={`${styles.fontMono} text-[10px] text-[#6f4f79]`}
                        >
                          ({tr.distance_km} km · {getTransitDays(tr.distance_km)}
                          d)
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Ruled 3-Column Telemetry Strip */}
                  <div className="mt-3.5 grid grid-cols-3 divide-x divide-[#e9e5e8] border border-[#e9e5e8] bg-[#fcf8f8] text-[11px] tabular-nums">
                    <div className="px-2.5 py-2">
                      <span
                        className={`${styles.fontMono} block text-[9.5px] uppercase tracking-[0.06em] text-[#89828d]`}
                      >
                        On Hand
                      </span>
                      <span className="mt-0.5 block font-semibold text-[#14141c]">
                        {formatQty(act.godown_on_hand, act.unit)}
                      </span>
                    </div>
                    <div className="px-2.5 py-2">
                      <span
                        className={`${styles.fontMono} block text-[9.5px] uppercase tracking-[0.06em] text-[#89828d]`}
                      >
                        In Transit
                      </span>
                      <span className="mt-0.5 block font-semibold text-[#6f4f79]">
                        {formatQty(act.in_transit_qty, act.unit)}
                      </span>
                    </div>
                    <div className="px-2.5 py-2">
                      <span
                        className={`${styles.fontMono} block text-[9.5px] uppercase tracking-[0.06em] text-[#89828d]`}
                      >
                        Demand/mo
                      </span>
                      <span className="mt-0.5 block font-semibold text-[#14141c]">
                        {formatQty(act.projected_monthly_demand, act.unit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plain-English Rationale beneath dashed hairline */}
                <p className="mt-3.5 border-t border-dashed border-[#dbd7da] pt-2.5 text-xs font-light leading-relaxed text-[#43394c]">
                  {act.rationale}
                </p>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}
