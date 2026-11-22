"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ItemUnit } from "@/types/lumino";
import { KanpurNetworkDiagram, QtyText } from "./HexPrimitives";
import type { TransferRouteRow } from "./plannerTypes";
import { formatPlainNumber, shortGodownName } from "./plannerTypes";

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
      className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a]"
    >
      {/* Top Split: Metrics & Scope on Left, Spectral Corridor Network on Right */}
      <div className="grid grid-cols-1 items-start gap-6 p-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[17px] font-medium text-[#e7e7e7]">
                Inter-godown transfers
              </h3>
              {scopedGodown && (
                <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 py-0.5 text-xs text-[#a0a0a0]">
                  {shortGodownName(scopedGodown)}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[#a0a0a0]">
              {scopedGodown
                ? `LP routes touching ${shortGodownName(
                    scopedGodown
                  )} before ${leadTimeDays}-day vendor orders.`
                : `Min-distance yard rebalancing (1–2d road transit) before ${leadTimeDays}-day vendor orders.`}
            </p>
          </div>

          {/* Pill Segmented Scope Switcher */}
          <div className="inline-flex rounded-full border border-white/[0.06] bg-white/[0.05] p-1">
            <button
              type="button"
              aria-pressed={scope === "month"}
              onClick={() => setScope("month")}
              className={`rounded-full px-3.5 py-1.5 text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer tabular-nums ${
                scope === "month"
                  ? "bg-white font-medium text-black shadow-sm"
                  : "text-[#a0a0a0] hover:text-white"
              }`}
            >
              {activeMonth} ({monthRoutes.length})
            </button>
            <button
              type="button"
              aria-pressed={scope === "all"}
              onClick={() => setScope("all")}
              className={`rounded-full px-3.5 py-1.5 text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer tabular-nums ${
                scope === "all"
                  ? "bg-white font-medium text-black shadow-sm"
                  : "text-[#a0a0a0] hover:text-white"
              }`}
            >
              All 44 months ({allItemRoutes.length})
            </button>
          </div>

          {/* Inline Metric Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/[0.06] pt-4 sm:grid-cols-4 lg:grid-cols-2">
            <div>
              <span className="block text-xs font-normal text-[#898989]">
                Active routes
              </span>
              <span className="mt-1 block font-serif text-[26px] font-normal leading-none tracking-[-0.02em] text-white tabular-nums">
                {displayed.length}
              </span>
            </div>
            <div>
              <span className="block text-xs font-normal text-[#898989]">
                Volume shifted
              </span>
              <span className="mt-1 block font-serif text-[26px] font-normal leading-none tracking-[-0.02em] text-white">
                <QtyText value={totalQty} unit={unit} dashZero />
              </span>
            </div>
            <div>
              <span className="block text-xs font-normal text-[#898989]">
                Road distance
              </span>
              <span className="mt-1 block font-serif text-[26px] font-normal leading-none tracking-[-0.02em] text-white tabular-nums">
                {totalDistKm > 0 ? (
                  <>
                    {formatPlainNumber(totalDistKm)}
                    <span className="ml-1 font-sans text-xs font-normal text-[#898989]">
                      km
                    </span>
                  </>
                ) : (
                  <span className="text-white/20">—</span>
                )}
              </span>
            </div>
            <div>
              <span className="block text-xs font-normal text-[#898989]">
                Est. haul saved
              </span>
              <span className="mt-1 block font-serif text-[26px] font-normal leading-none tracking-[-0.02em] text-emerald-400 tabular-nums">
                {totalKmSaved > 0 ? (
                  <>
                    {formatPlainNumber(totalKmSaved)}
                    <span className="ml-1 font-sans text-xs font-normal text-[#898989]">
                      km
                    </span>
                  </>
                ) : (
                  <span className="text-white/20">—</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Spectral Isometric Corridor Graph */}
        <div className="lg:col-span-7">
          <KanpurNetworkDiagram routes={displayed} />
        </div>
      </div>

      {/* Routes Table or Empty State */}
      <div className="border-t border-white/[0.06]">
        {displayed.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-[#a0a0a0]">
            No inter-godown transfers triggered in{" "}
            <span className="font-medium text-white tabular-nums">
              {activeMonth}
            </span>
            .{" "}
            {allItemRoutes.length > 0 && (
              <button
                type="button"
                onClick={() => setScope("all")}
                className="font-medium text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer"
              >
                View all {allItemRoutes.length} routes across 44 months
              </button>
            )}
          </div>
        ) : (
          <div className="max-h-72 overflow-auto">
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#161616] text-xs font-normal text-[#898989]">
                <tr>
                  <th className="px-6 py-2.5 text-left font-normal">Month</th>
                  <th className="px-4 py-2.5 text-left font-normal">
                    Route (donor → receiver)
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    Quantity
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    Distance
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    Transit
                  </th>
                  <th className="px-6 py-2.5 text-right font-normal">
                    Haul saved
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-sm">
                {displayed.map((r, idx) => (
                  <tr
                    key={`${r.month}-${r.from_godown}-${r.to_godown}-${idx}`}
                    className="transition-colors duration-150 hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-6 py-2.5 text-[#a0a0a0] tabular-nums">
                      {r.month}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="inline-flex items-center gap-2 font-medium text-[#e7e7e7]">
                        <span>{shortGodownName(r.from_godown)}</span>
                        <ArrowRight
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-[#898989]"
                        />
                        <span className="text-emerald-400">
                          {shortGodownName(r.to_godown)}
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                      <QtyText value={r.qty} unit={r.unit} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-[#a0a0a0] tabular-nums">
                      {r.distance_km}
                      <span className="ml-1 text-xs text-[#898989]">km</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-[#a0a0a0] tabular-nums">
                      {r.transit_days}d
                    </td>
                    <td className="whitespace-nowrap px-6 py-2.5 text-right font-medium text-emerald-400 tabular-nums">
                      +{r.km_saved}
                      <span className="ml-1 text-xs font-normal text-[#898989]">
                        km
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
