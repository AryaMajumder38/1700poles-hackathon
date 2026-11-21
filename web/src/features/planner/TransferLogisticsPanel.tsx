"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ItemUnit } from "@/types/lumino";
import { KanpurNetworkDiagram } from "./HexPrimitives";
import type { TransferRouteRow } from "./plannerTypes";
import {
  formatPlainNumber,
  formatQty,
  shortGodownName,
} from "./plannerTypes";

interface TransferLogisticsPanelProps {
  monthRoutes: TransferRouteRow[];
  allItemRoutes: TransferRouteRow[];
  activeMonth: string;
  unit: ItemUnit;
  leadTimeDays: number;
  scopedGodown?: string | null;
}

export default function TransferLogisticsPanel({
  monthRoutes,
  allItemRoutes,
  activeMonth,
  unit,
  leadTimeDays,
  scopedGodown,
}: TransferLogisticsPanelProps) {
  const [scope, setScope] = useState<"month" | "all">("month");

  const displayed = scope === "month" ? monthRoutes : allItemRoutes;
  const totalQty = displayed.reduce((acc, r) => acc + r.qty, 0);
  const totalDistKm = displayed.reduce((acc, r) => acc + r.distance_km, 0);
  const totalKmSaved = displayed.reduce((acc, r) => acc + r.km_saved, 0);

  return (
    <section
      id="planner-lp-logistics"
      aria-label="Inter-Godown Transfer Logistics Panel"
      className="space-y-6 border-t border-[#dbd7da] pt-8"
    >
      {/* Feature Split: Copy + Compact Metrics on Left, Line Diagram on Right */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="hp-ochre-tag">STAGE A · MIN-COST FLOW LP</span>
            {scopedGodown && (
              <span className="hp-mono inline-flex items-center border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-sky-800">
                Site-Scoped · {shortGodownName(scopedGodown)}
              </span>
            )}
          </div>
          <h3 className="hp-heading text-2xl font-extrabold leading-[1.2] text-[#14141c]">
            Rebalance local yards{" "}
            <span className="hp-italic text-[29px] font-light text-[#31263b]">
              before ordering
            </span>
          </h3>
          <p className="text-sm font-light leading-[1.6] text-[#43394c]">
            {scopedGodown
              ? `Showing LP transfer routes entering or leaving ${shortGodownName(
                  scopedGodown
                )} (45–150 km; 1–2 day road transit) before placing ${leadTimeDays}-day vendor orders.`
              : `Solves minimum-distance transfers across the 6 Kanpur district godowns (45–150 km; 1–2 day road transit) with donor horizon protection before placing ${leadTimeDays}-day vendor orders.`}
          </p>

          {/* Compact Scope Switcher */}
          <div className="inline-flex border border-[#dbd7da] bg-[#fffcfc]">
            <button
              type="button"
              aria-pressed={scope === "month"}
              onClick={() => setScope("month")}
              className={`hp-mono px-3.5 py-2 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#31263b] cursor-pointer ${
                scope === "month"
                  ? "bg-[#31263b] text-[#fffcfc]"
                  : "text-[#43394c] hover:bg-[#e9e5e8]"
              }`}
            >
              {activeMonth} ({monthRoutes.length})
            </button>
            <button
              type="button"
              aria-pressed={scope === "all"}
              onClick={() => setScope("all")}
              className={`hp-mono border-l border-[#dbd7da] px-3.5 py-2 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#31263b] cursor-pointer ${
                scope === "all"
                  ? "bg-[#31263b] text-[#fffcfc]"
                  : "text-[#43394c] hover:bg-[#e9e5e8]"
              }`}
            >
              All 44 Months ({allItemRoutes.length})
            </button>
          </div>

          {/* Quiet Inline Metric Row (no extra boxed cards) */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[#e9e5e8] pt-4 text-xs tabular-nums sm:grid-cols-4 lg:grid-cols-2">
            <div>
              <span className="hp-mono block text-[10px] uppercase tracking-[0.07em] text-[#89828d]">
                Active Routes
              </span>
              <span className="hp-heading mt-0.5 block text-lg font-bold text-[#14141c]">
                {displayed.length}
              </span>
            </div>
            <div>
              <span className="hp-mono block text-[10px] uppercase tracking-[0.07em] text-[#89828d]">
                Volume Shifted
              </span>
              <span className="hp-heading mt-0.5 block text-lg font-bold text-[#31263b]">
                {formatQty(totalQty, unit)}
              </span>
            </div>
            <div>
              <span className="hp-mono block text-[10px] uppercase tracking-[0.07em] text-[#89828d]">
                Road Distance
              </span>
              <span className="hp-heading mt-0.5 block text-lg font-bold text-[#14141c]">
                {formatPlainNumber(totalDistKm)} km
              </span>
            </div>
            <div>
              <span className="hp-mono block text-[10px] uppercase tracking-[0.07em] text-[#2c7a62]">
                Est. Haul Saved
              </span>
              <span className="hp-heading mt-0.5 block text-lg font-bold text-[#2c7a62]">
                {formatPlainNumber(totalKmSaved)} km
              </span>
            </div>
          </div>
        </div>

        {/* Right: Technical Line Illustration */}
        <div className="lg:col-span-7">
          <KanpurNetworkDiagram routes={displayed} />
        </div>
      </div>

      {/* Clean Open Hairline Routes Table */}
      {displayed.length === 0 ? (
        <div className="border-y border-dashed border-[#dbd7da] bg-[#fcf8f8] px-6 py-8 text-center">
          <p className="text-sm font-light text-[#43394c]">
            No inter-godown transfers triggered in{" "}
            <span className="hp-mono font-medium text-[#14141c]">
              {activeMonth}
            </span>
            .{" "}
            {allItemRoutes.length > 0 && (
              <button
                type="button"
                onClick={() => setScope("all")}
                className="font-medium text-[#31263b] underline decoration-[#cda0a5] underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31263b] cursor-pointer"
              >
                View all {allItemRoutes.length} LP routes across 44 months
              </button>
            )}
          </p>
        </div>
      ) : (
        <div className="max-h-72 overflow-auto border-y border-[#dbd7da] bg-[#fffcfc]">
          <table className="min-w-full border-collapse text-xs">
            <thead className="sticky top-0 border-b border-[#dbd7da] bg-[#fcf8f8] text-[#43394c]">
              <tr>
                <th className="hp-mono px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em]">
                  Month
                </th>
                <th className="hp-mono px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em]">
                  Route (Donor → Receiver)
                </th>
                <th className="hp-mono px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em]">
                  Quantity
                </th>
                <th className="hp-mono px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em]">
                  Distance
                </th>
                <th className="hp-mono px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em]">
                  Transit
                </th>
                <th className="hp-mono px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em]">
                  km Saved
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9e5e8]">
              {displayed.map((r, idx) => (
                <tr
                  key={`${r.month}-${r.from_godown}-${r.to_godown}-${idx}`}
                  className="transition-colors hover:bg-[#fcf8f8]"
                >
                  <td className="hp-mono whitespace-nowrap px-4 py-2.5 text-[#43394c]">
                    {r.month}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className="inline-flex items-center gap-2 font-medium text-[#14141c]">
                      <span>{shortGodownName(r.from_godown)}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#afa9b1]" />
                      <span className="text-[#2c7a62]">
                        {shortGodownName(r.to_godown)}
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums text-[#14141c]">
                    {formatQty(r.qty, r.unit)}
                  </td>
                  <td className="hp-mono whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[#43394c]">
                    {r.distance_km} km
                  </td>
                  <td className="hp-mono whitespace-nowrap px-4 py-2.5 text-right text-[#43394c]">
                    {r.transit_days}d
                  </td>
                  <td className="hp-mono whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-[#2c7a62]">
                    +{r.km_saved} km
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
