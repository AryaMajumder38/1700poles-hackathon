"use client";

import { useState } from "react";
import { ArrowRight, MapPin, Route } from "lucide-react";
import type { ItemUnit } from "@/types/lumino";
import { CornerMarks, KanpurNetworkDiagram } from "./HexPrimitives";
import styles from "./plannerHex.module.css";
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
}

export default function TransferLogisticsPanel({
  monthRoutes,
  allItemRoutes,
  activeMonth,
  unit,
  leadTimeDays,
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
      className={`${styles.glassPaper} relative space-y-5 p-5 sm:p-6`}
    >
      <CornerMarks tone="light" />

      {/* Feature Split Header: Narrow Copy + Technical Line Diagram */}
      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-6">
          <span className={styles.ochreAnnotation}>
            STAGE A · MIN-COST FLOW LP
          </span>
          <h3
            className={`${styles.fontHeading} text-xl font-extrabold leading-[1.2] text-[#14141c] sm:text-2xl`}
          >
            Inter-Godown Transfer Logistics{" "}
            <span
              className={`${styles.fontItalicSerif} text-[26px] font-light text-[#31263b]`}
            >
              before vendor orders
            </span>
          </h3>
          <p className="text-sm font-light leading-relaxed text-[#43394c]">
            Rebalances local surplus across the 6×6 Kanpur district road matrix
            (45–150 km; 1–2 day transit) with donor horizon protection before
            triggering {leadTimeDays}-day external purchase orders.
          </p>

          {/* Scope Toggle (1px Rectangular Plates) */}
          <div className="inline-flex border border-[#dbd7da] bg-[#fffcfc]">
            <button
              type="button"
              onClick={() => setScope("month")}
              className={`${styles.fontMono} px-3.5 py-2 text-[11px] font-medium transition-colors cursor-pointer ${
                scope === "month"
                  ? "bg-[#31263b] text-[#fffcfc]"
                  : "text-[#43394c] hover:bg-[#e9e5e8]"
              }`}
            >
              {activeMonth} ({monthRoutes.length})
            </button>
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`${styles.fontMono} border-l border-[#dbd7da] px-3.5 py-2 text-[11px] font-medium transition-colors cursor-pointer ${
                scope === "all"
                  ? "bg-[#31263b] text-[#fffcfc]"
                  : "text-[#43394c] hover:bg-[#e9e5e8]"
              }`}
            >
              All 44 Months ({allItemRoutes.length})
            </button>
          </div>
        </div>

        {/* Technical Line Illustration of the 6 Kanpur Godowns */}
        <div className="lg:col-span-6">
          <KanpurNetworkDiagram routes={displayed} />
        </div>
      </div>

      {/* Continuous 4-Column Ruled Logistics KPI Bar */}
      <div className="grid grid-cols-2 divide-y divide-[#e9e5e8] border border-[#dbd7da] bg-[#fffcfc] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="p-3.5">
          <span
            className={`${styles.fontMono} block text-[10px] uppercase tracking-[0.0833em] text-[#89828d]`}
          >
            Active Routes
          </span>
          <div
            className={`${styles.fontHeading} mt-1 text-xl font-extrabold tabular-nums text-[#14141c]`}
          >
            {displayed.length}
          </div>
        </div>
        <div className="p-3.5">
          <span
            className={`${styles.fontMono} block text-[10px] uppercase tracking-[0.0833em] text-[#89828d]`}
          >
            Volume Rebalanced
          </span>
          <div
            className={`${styles.fontHeading} mt-1 text-xl font-extrabold tabular-nums text-[#31263b]`}
          >
            {formatQty(totalQty, unit)}
          </div>
        </div>
        <div className="p-3.5">
          <span
            className={`${styles.fontMono} block text-[10px] uppercase tracking-[0.0833em] text-[#89828d]`}
          >
            Total Road Distance
          </span>
          <div
            className={`${styles.fontHeading} mt-1 text-xl font-extrabold tabular-nums text-[#14141c]`}
          >
            {formatPlainNumber(totalDistKm)} km
          </div>
        </div>
        <div className="bg-[#fcf8f8] p-3.5">
          <span
            className={`${styles.fontMono} block text-[10px] uppercase tracking-[0.0833em] text-[#2c7a62]`}
          >
            Est. Road km Saved
          </span>
          <div
            className={`${styles.fontHeading} mt-1 text-xl font-extrabold tabular-nums text-[#2c7a62]`}
          >
            {formatPlainNumber(totalKmSaved)} km
          </div>
        </div>
      </div>

      {/* Transfer Routes Table */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-[#afa9b1] bg-[#fcf8f8] px-4 py-8 text-center">
          <Route className="h-5 w-5 text-[#89828d]" />
          <p className="mt-2 text-xs font-medium text-[#31263b]">
            No inter-godown transfers triggered in{" "}
            <span className={`${styles.fontMono} font-semibold`}>
              {activeMonth}
            </span>
            .
          </p>
          <p className="mt-1 max-w-lg text-[11px] font-light text-[#89828d]">
            Local yards either satisfied their safety buffer or donor godowns
            remained protected by the donor horizon floor H(i). Switch to{" "}
            <button
              type="button"
              onClick={() => setScope("all")}
              className="font-medium text-[#31263b] underline decoration-[#cda0a5] underline-offset-2 cursor-pointer"
            >
              All 44 Months ({allItemRoutes.length} routes)
            </button>{" "}
            to inspect the complete Stage A LP schedule.
          </p>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto border border-[#dbd7da] bg-[#fffcfc]">
          <table className="min-w-full border-collapse text-xs">
            <thead className="sticky top-0 border-b border-[#dbd7da] bg-[#fcf8f8] text-[#43394c]">
              <tr>
                <th
                  className={`${styles.fontMono} px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.07em]`}
                >
                  Month
                </th>
                <th
                  className={`${styles.fontMono} px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.07em]`}
                >
                  Optimized Route (Donor → Receiver)
                </th>
                <th
                  className={`${styles.fontMono} px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.07em]`}
                >
                  Quantity
                </th>
                <th
                  className={`${styles.fontMono} px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.07em]`}
                >
                  Distance
                </th>
                <th
                  className={`${styles.fontMono} px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.07em]`}
                >
                  Transit
                </th>
                <th
                  className={`${styles.fontMono} px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.07em]`}
                >
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
                  <td
                    className={`${styles.fontMono} whitespace-nowrap px-4 py-2.5 font-medium text-[#43394c]`}
                  >
                    {r.month}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="inline-flex items-center gap-1.5 font-medium text-[#14141c]">
                      <MapPin className="h-3.5 w-3.5 text-[#6f4f79]" />
                      <span>{shortGodownName(r.from_godown)}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#afa9b1]" />
                      <span className="text-[#2c7a62]">
                        {shortGodownName(r.to_godown)}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-[#14141c]">
                    {formatQty(r.qty, r.unit)}
                  </td>
                  <td
                    className={`${styles.fontMono} whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-[#43394c]`}
                  >
                    {r.distance_km} km
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <span
                      className={`${styles.fontMono} inline-flex border px-2 py-0.5 text-[10px] font-medium`}
                      style={{
                        borderColor:
                          r.transit_days === 1
                            ? "rgba(44, 122, 98, 0.35)"
                            : "rgba(111, 79, 121, 0.35)",
                        backgroundColor:
                          r.transit_days === 1
                            ? "rgba(44, 122, 98, 0.08)"
                            : "rgba(173, 142, 182, 0.12)",
                        color: r.transit_days === 1 ? "#2c7a62" : "#6f4f79",
                      }}
                    >
                      {r.transit_days} day{r.transit_days > 1 ? "s" : ""}
                    </span>
                  </td>
                  <td
                    className={`${styles.fontMono} whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-[#2c7a62]`}
                  >
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
