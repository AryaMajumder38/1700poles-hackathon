"use client";

import {
  ArrowLeftRight,
  Clock,
  PauseCircle,
  ShoppingCart,
  Truck,
  Warehouse,
} from "lucide-react";
import type { SimulationAction, SimulationDecision } from "@/types/lumino";
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
        badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
        borderClass: "border-blue-200 hover:border-blue-300",
        icon: ShoppingCart,
      };
    case "TRANSFER_IN":
      return {
        label: "TRANSFER IN",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
        borderClass: "border-emerald-200 hover:border-emerald-300",
        icon: Truck,
      };
    case "TRANSFER_OUT":
      return {
        label: "TRANSFER OUT",
        badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
        borderClass: "border-sky-200 hover:border-sky-300",
        icon: ArrowLeftRight,
      };
    case "HOLD":
      return {
        label: "HOLD",
        badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
        borderClass: "border-amber-200/80 hover:border-amber-300",
        icon: PauseCircle,
      };
    default:
      return {
        label: "WAIT",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        borderClass: "border-slate-200 hover:border-slate-300",
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
      <section className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No godown decisions match the current filter for{" "}
        <span className="font-mono font-semibold text-slate-700">
          {activeMonth}
        </span>
        .
      </section>
    );
  }

  return (
    <section aria-label="Monthly Godown Action Cards" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 sm:text-base">
          Monthly Godown Decisions —{" "}
          <span className="font-mono text-amber-700">{activeMonth}</span>
        </h3>
        <span className="text-xs text-slate-500">
          Showing {actions.length} of 6 active Kanpur godowns
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((act) => {
          const meta = decisionMeta(act.decision);
          const Icon = meta.icon;
          const hasTransfers =
            act.transfers_in.length > 0 || act.transfers_out.length > 0;

          return (
            <article
              key={`${act.month}-${act.godown}-${act.item_code}`}
              className={`flex flex-col justify-between rounded-xl border bg-white p-4 shadow-xs transition-colors ${meta.borderClass}`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <Warehouse className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {shortGodownName(act.godown)}
                      </h4>
                      <span className="font-mono text-[11px] text-slate-500">
                        {act.godown}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                </div>

                {/* Primary Instruction Highlight */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {act.order_qty > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs">
                      <span className="font-bold text-blue-900 tabular-nums">
                        Order {formatQty(act.order_qty, act.unit)}
                      </span>
                      {act.expected_arrival_month && (
                        <span className="ml-1.5 font-mono text-[11px] text-blue-700">
                          ETA {act.expected_arrival_month}
                        </span>
                      )}
                    </div>
                  )}

                  {act.hold_qty > 0 && act.order_qty === 0 && !hasTransfers && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs">
                      <span className="font-bold text-amber-900 tabular-nums">
                        Holding {formatQty(act.hold_qty, act.unit)}
                      </span>
                    </div>
                  )}

                  {act.transfers_in.map((tr, idx) => (
                    <div
                      key={`in-${idx}`}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900"
                    >
                      <span className="font-bold tabular-nums">
                        +{formatQty(tr.qty, tr.unit)}
                      </span>{" "}
                      from{" "}
                      <span className="font-semibold">
                        {shortGodownName(tr.from_godown)}
                      </span>{" "}
                      <span className="font-mono text-[11px] text-emerald-700">
                        ({tr.distance_km} km · {getTransitDays(tr.distance_km)}d)
                      </span>
                    </div>
                  ))}

                  {act.transfers_out.map((tr, idx) => (
                    <div
                      key={`out-${idx}`}
                      className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs text-sky-900"
                    >
                      <span className="font-bold tabular-nums">
                        -{formatQty(tr.qty, tr.unit)}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold">
                        {shortGodownName(tr.to_godown)}
                      </span>{" "}
                      <span className="font-mono text-[11px] text-sky-700">
                        ({tr.distance_km} km · {getTransitDays(tr.distance_km)}d)
                      </span>
                    </div>
                  ))}
                </div>

                {/* Telemetry Grid */}
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px] tabular-nums">
                  <div>
                    <span className="block text-slate-500">On Hand</span>
                    <span className="font-semibold text-slate-900">
                      {formatQty(act.godown_on_hand, act.unit)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500">In Transit</span>
                    <span className="font-semibold text-sky-800">
                      {formatQty(act.in_transit_qty, act.unit)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500">Causal Dem/mo</span>
                    <span className="font-semibold text-slate-900">
                      {formatQty(act.projected_monthly_demand, act.unit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plain-English Reasoning String */}
              <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs leading-relaxed text-slate-600">
                {act.rationale}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
