"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Scale,
  Sparkles,
} from "lucide-react";
import type {
  SetDefinition,
  SetImbalanceRow,
  SetRatioMode,
} from "@/types/lumino";
import { formatRatio, SHARED_BOLT_CODE, shortSetLabel } from "./setsUtils";

interface RatioModeBannerProps {
  ratioMode: SetRatioMode;
  onChangeMode: (mode: SetRatioMode) => void;
  sets: SetDefinition[];
  allRows: SetImbalanceRow[];
}

export default function RatioModeBanner({
  ratioMode,
  onChangeMode,
  sets,
  allRows,
}: RatioModeBannerProps) {
  const [showRatioTable, setShowRatioTable] = useState(false);

  // Extract one representative row per (set_no, mode) to compare exact BOM vs empirical ratios
  const ratioLookup = new Map<string, number>();
  for (const row of allRows) {
    for (const child of row.children) {
      const key = `${row.ratio_mode}__${row.set_no}__${child.child_code}`;
      if (!ratioLookup.has(key)) {
        ratioLookup.set(key, child.ratio_used);
      }
    }
  }

  return (
    <section
      aria-label="Ratio Mode Selector and Data Discovery"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-amber-400">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                Job 3 • Match the Sets
              </span>
              <span className="font-mono text-xs text-slate-500">
                3 Assembly Kits × 6 Active Godowns × 44 Months
              </span>
            </div>
            <h2 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
              Parent-Child Kit Ratio Engine &amp; Bottleneck Diagnostics
            </h2>
          </div>
        </div>

        {/* Prominent Segmented Toggle */}
        <div
          role="group"
          aria-label="Kit Ratio Mode"
          className="inline-flex self-start rounded-xl border border-slate-200 bg-slate-100 p-1 lg:self-center"
        >
          <button
            type="button"
            onClick={() => onChangeMode("empirical")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              ratioMode === "empirical"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles
              className={`h-3.5 w-3.5 ${
                ratioMode === "empirical" ? "text-amber-400" : "text-slate-400"
              }`}
            />
            <span>Empirical Site Ratio</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                ratioMode === "empirical"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              Recommended
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChangeMode("bom")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              ratioMode === "bom"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle
              className={`h-3.5 w-3.5 ${
                ratioMode === "bom" ? "text-amber-400" : "text-slate-400"
              }`}
            />
            <span>Lumino BOM Ratio</span>
          </button>
        </div>
      </div>

      {/* Critical Domain Catch Callout */}
      <div
        className={`rounded-lg border p-3.5 text-xs leading-relaxed ${
          ratioMode === "empirical"
            ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
            : "border-amber-300 bg-amber-50/80 text-amber-950"
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Info
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                ratioMode === "empirical"
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}
            />
            <div>
              <p className="font-semibold">
                {ratioMode === "empirical"
                  ? "Data Discovery Active — Using Observed Field Consumption Ratios"
                  : "Warning — Raw Lumino BOM Contains Severe Unit & Scaling Mismatches"}
              </p>
              <p className="mt-1 opacity-90">
                In <code className="font-mono font-semibold">sets.csv</code>,
                shared child{" "}
                <code className="font-mono font-semibold">
                  {SHARED_BOLT_CODE}
                </code>{" "}
                (G.I. Nuts &amp; Bolts) is stocked in{" "}
                <strong>Metric Tonnes (MT)</strong> but carries BOM ratios of{" "}
                <code className="font-mono">1.0</code> /{" "}
                <code className="font-mono">0.75</code> (claiming 1 tonne per
                pole clamp—producing <strong>0 balanced months</strong> across
                the entire project). Actual cumulative site consumption is{" "}
                <strong>~0.000086 MT</strong> (~86 g) per Clamp and{" "}
                <strong>~0.000065 MT</strong> (~65 g) per Dist. Box. Similarly,
                3-Ph Ring Lugs (
                <code className="font-mono font-semibold">MLU020008</code>) list
                BOM <code className="font-mono">0.25</code> vs actual field
                usage of <strong>5.66 NOS/box</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRatioTable((prev) => !prev)}
            className="inline-flex shrink-0 items-center gap-1 self-start rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            {showRatioTable ? (
              <>
                Hide Ratios <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Inspect BOM vs Empirical <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Side-by-Side Ratio Reference Table */}
      {showRatioTable && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-left font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2">Set</th>
                <th className="px-3 py-2">Child SKU</th>
                <th className="px-3 py-2">UOM</th>
                <th className="px-3 py-2 text-right">BOM Ratio</th>
                <th className="px-3 py-2 text-right">Empirical Ratio</th>
                <th className="px-3 py-2">Ratio Variance Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sets.map((s) =>
                s.children.map((ch) => {
                  const bomR =
                    ratioLookup.get(`bom__${s.set_no}__${ch.child_code}`) ??
                    ch.ratio_of_parent;
                  const empR =
                    ratioLookup.get(
                      `empirical__${s.set_no}__${ch.child_code}`
                    ) ?? ch.ratio_of_parent;
                  const isShared = ch.child_code === SHARED_BOLT_CODE;
                  const factor = empR > 0 ? bomR / empR : 0;

                  let note = "Aligned within 3×";
                  if (isShared) {
                    note =
                      "MT vs pcs unit mismatch (~11,600× BOM overstatement); allocated proportionally across 3 sets";
                  } else if (factor < 0.2) {
                    note = `Under-stated ${(1 / factor).toFixed(1)}× in BOM (site consumes ~${empR.toFixed(2)} ${ch.child_unit}/${s.parent_unit})`;
                  } else if (factor > 2.5) {
                    note = `Over-stated ${factor.toFixed(1)}× in BOM`;
                  }

                  return (
                    <tr
                      key={`${s.set_no}-${ch.child_code}`}
                      className={isShared ? "bg-amber-50/40" : undefined}
                    >
                      <td className="px-3 py-2 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {s.set_no}{" "}
                        <span className="font-sans font-normal text-slate-500">
                          ({shortSetLabel(s.set_no)})
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-800">
                        <span className="font-mono font-semibold">
                          {ch.child_code}
                        </span>
                        {isShared && (
                          <span className="ml-1.5 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                            SHARED (3 SETS)
                          </span>
                        )}
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {ch.child_name}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-600">
                        {ch.child_unit} / {s.parent_unit}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                        {formatRatio(bomR, ch.child_unit)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-emerald-800">
                        {formatRatio(empR, ch.child_unit)}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{note}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
