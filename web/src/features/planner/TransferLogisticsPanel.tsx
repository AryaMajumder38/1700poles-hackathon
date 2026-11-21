"use client";

import { useState } from "react";
import { ArrowRight, MapPin, Route, Truck } from "lucide-react";
import type { ItemUnit } from "@/types/lumino";
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
      aria-label="Inter-Godown Transfer Logistics Panel"
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 sm:text-base">
              Inter-Godown Transfer Logistics (Stage A Min-Cost Flow LP)
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Optimizes 6×6 Kanpur district road distances (45–150 km; 1–2 day
              transit) with donor protection before triggering {leadTimeDays}-day
              vendor orders.
            </p>
          </div>
        </div>

        <div className="inline-flex self-start rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold sm:self-center">
          <button
            type="button"
            onClick={() => setScope("month")}
            className={`rounded-md px-3 py-1.5 transition-colors cursor-pointer ${
              scope === "month"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {activeMonth} ({monthRoutes.length})
          </button>
          <button
            type="button"
            onClick={() => setScope("all")}
            className={`rounded-md px-3 py-1.5 transition-colors cursor-pointer ${
              scope === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All 44 Months ({allItemRoutes.length})
          </button>
        </div>
      </div>

      {/* Logistics KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <span className="text-[11px] font-medium text-slate-500">
            Active Routes
          </span>
          <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">
            {displayed.length}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <span className="text-[11px] font-medium text-slate-500">
            Volume Rebalanced
          </span>
          <div className="mt-1 text-lg font-bold tabular-nums text-sky-900">
            {formatQty(totalQty, unit)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <span className="text-[11px] font-medium text-slate-500">
            Total Road Distance
          </span>
          <div className="mt-1 text-lg font-bold tabular-nums text-slate-900">
            {formatPlainNumber(totalDistKm)} km
          </div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
          <span className="text-[11px] font-medium text-emerald-800">
            Est. Road km Saved
          </span>
          <div className="mt-1 text-lg font-bold tabular-nums text-emerald-900">
            {formatPlainNumber(totalKmSaved)} km
          </div>
        </div>
      </div>

      {/* Transfer Routes Table */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center">
          <Route className="h-6 w-6 text-slate-400" />
          <p className="mt-2 text-xs font-medium text-slate-700">
            No inter-godown transfers triggered in{" "}
            <span className="font-mono font-semibold">{activeMonth}</span>.
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Either local yards met their safety buffer or donor godowns were
            protected by the donor horizon floor H(i). Switch to{" "}
            <button
              type="button"
              onClick={() => setScope("all")}
              className="font-semibold text-sky-700 underline cursor-pointer"
            >
              All 44 Months ({allItemRoutes.length} routes)
            </button>{" "}
            to inspect full LP transfer history.
          </p>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Month</th>
                <th className="px-3 py-2 text-left font-semibold">
                  Optimized Route (Donor → Receiver)
                </th>
                <th className="px-3 py-2 text-right font-semibold">Quantity</th>
                <th className="px-3 py-2 text-right font-semibold">Distance</th>
                <th className="px-3 py-2 text-right font-semibold">Transit</th>
                <th className="px-3 py-2 text-right font-semibold">
                  km Saved
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayed.map((r, idx) => (
                <tr
                  key={`${r.month}-${r.from_godown}-${r.to_godown}-${idx}`}
                  className="hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono font-medium text-slate-700">
                    {r.month}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                      <MapPin className="h-3.5 w-3.5 text-sky-600" />
                      <span>{shortGodownName(r.from_godown)}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-emerald-800">
                        {shortGodownName(r.to_godown)}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
                    {formatQty(r.qty, r.unit)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                    {r.distance_km} km
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        r.transit_days === 1
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {r.transit_days} day{r.transit_days > 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-mono font-semibold tabular-nums text-emerald-700">
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
