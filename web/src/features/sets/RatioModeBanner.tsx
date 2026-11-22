"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
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
  // Extract one representative row per (set_no, mode) to compare exact BOM vs empirical ratios
  const ratioLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of allRows) {
      for (const child of row.children) {
        const key = `${row.ratio_mode}__${row.set_no}__${child.child_code}`;
        if (!map.has(key)) {
          map.set(key, child.ratio_used);
        }
      }
    }
    return map;
  }, [allRows]);

  return (
    <section
      aria-label="Ratio Mode Selector and Data Discovery"
      className="space-y-3.5 min-w-0"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif font-normal text-[30px] sm:text-[36px] leading-[1.2] tracking-[-0.015em] text-[#e7e7e7]">
            Kit balance
          </h2>
          <p className="mt-1 text-sm text-[#a0a0a0]">
            Parent-child assembly readiness across active godowns and months.
          </p>
        </div>

        {/* Steep Pill Segmented Control */}
        <div
          role="group"
          aria-label="Kit Ratio Mode"
          className="inline-flex self-start items-center rounded-full bg-white/[0.05] border border-white/[0.06] p-1 sm:self-end"
        >
          <button
            type="button"
            aria-pressed={ratioMode === "empirical"}
            onClick={() => onChangeMode("empirical")}
            title="Recommended — uses observed field consumption ratios"
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] ${
              ratioMode === "empirical"
                ? "bg-white text-black shadow-sm"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            <span>Empirical</span>
            <span
              className={`text-[11px] font-normal ${
                ratioMode === "empirical" ? "text-black/55" : "text-[#898989]"
              }`}
            >
              Recommended
            </span>
          </button>

          <button
            type="button"
            aria-pressed={ratioMode === "bom"}
            onClick={() => onChangeMode("bom")}
            title="Raw Lumino BOM ratios from sets.csv"
            className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] ${
              ratioMode === "bom"
                ? "bg-white text-black shadow-sm"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            BOM
          </button>
        </div>
      </div>

      {/* Quiet Ratio Note + Collapsible Explanation & Table */}
      <details className="group">
        <summary className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#a0a0a0] cursor-pointer list-none [&::-webkit-details-marker]:hidden rounded-full py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              ratioMode === "empirical"
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]"
                : "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.75)]"
            }`}
            aria-hidden="true"
          />
          <span>
            {ratioMode === "empirical" ? (
              <>
                Using observed field ratios — BOM ratios for{" "}
                <span className="font-mono text-[#e7e7e7]">
                  {SHARED_BOLT_CODE}
                </span>{" "}
                are unit-inconsistent
              </>
            ) : (
              <>
                Using raw BOM ratios — BOM ratios for{" "}
                <span className="font-mono text-[#e7e7e7]">
                  {SHARED_BOLT_CODE}
                </span>{" "}
                are unit-inconsistent in sets.csv
              </>
            )}
          </span>
          <span className="inline-flex items-center gap-0.5 font-medium text-[#e7e7e7] underline decoration-white/25 underline-offset-4 group-hover:text-white transition-colors">
            Why?
            <ChevronDown className="h-3.5 w-3.5 text-[#898989] transition-transform duration-200 group-open:rotate-180" />
          </span>
        </summary>

        <div className="mt-3 overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#1a1a1a]">
          <p className="p-5 text-xs leading-relaxed text-[#a0a0a0]">
            In <span className="font-mono text-[#e7e7e7]">sets.csv</span>,
            shared child{" "}
            <span className="font-mono text-[#e7e7e7]">
              {SHARED_BOLT_CODE}
            </span>{" "}
            (G.I. Nuts &amp; Bolts) is stocked in Metric Tonnes (MT) but carries
            BOM ratios of 1.0 and 0.75 (implying 1 tonne per pole clamp,
            yielding 0 balanced months project-wide). Observed site consumption
            is ~0.000086 MT (~86 g) per Clamp and ~0.000065 MT (~65 g) per Dist.
            Box. Similarly, 3-Ph Ring Lugs (
            <span className="font-mono text-[#e7e7e7]">MLU020008</span>) list
            BOM 0.25 vs. field usage of 5.66 NOS/SET.
          </p>

          <div className="overflow-x-auto max-w-full border-t border-white/[0.06]">
            <table className="min-w-full text-left">
              <thead className="border-b border-white/[0.06] bg-white/[0.025] text-xs font-normal text-[#898989]">
                <tr>
                  <th className="px-4 py-2.5 font-normal">Set</th>
                  <th className="px-4 py-2.5 font-normal">Child SKU</th>
                  <th className="px-4 py-2.5 font-normal">Unit ratio</th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    BOM ratio
                  </th>
                  <th className="px-4 py-2.5 text-right font-normal">
                    Empirical ratio
                  </th>
                  <th className="px-4 py-2.5 font-normal">Variance note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-sm">
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
                        "MT vs. pcs unit mismatch (~11,600× BOM overstatement); shared across 3 sets";
                    } else if (bomR <= 0 && empR > 0) {
                      note = `No BOM ratio (site consumes ~${empR.toFixed(2)} ${ch.child_unit}/${s.parent_unit})`;
                    } else if (empR <= 0 && bomR > 0) {
                      note = `No empirical consumption observed (BOM lists ${formatRatio(bomR, ch.child_unit)} ${ch.child_unit}/${s.parent_unit})`;
                    } else if (bomR <= 0 && empR <= 0) {
                      note = "n/a (no BOM or empirical ratio)";
                    } else if (factor < 0.2) {
                      note = `Under-stated ${(1 / factor).toFixed(1)}× in BOM (site consumes ~${empR.toFixed(2)} ${ch.child_unit}/${s.parent_unit})`;
                    } else if (factor > 2.5) {
                      note = `Over-stated ${factor.toFixed(1)}× in BOM`;
                    }

                    return (
                      <tr
                        key={`${s.set_no}-${ch.child_code}`}
                        className="hover:bg-white/[0.03] transition-colors duration-150"
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="font-medium text-[#e7e7e7]">
                            {s.set_no}
                          </span>
                          <span className="ml-1.5 text-xs text-[#898989]">
                            {shortSetLabel(s.set_no)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-[#e7e7e7]">
                              {ch.child_code}
                            </span>
                            {isShared && (
                              <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[11px] text-violet-300">
                                Shared
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#898989] truncate max-w-xs">
                            {ch.child_name}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[#898989] whitespace-nowrap">
                          {ch.child_unit} / {s.parent_unit}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#a0a0a0] whitespace-nowrap">
                          {formatRatio(bomR, ch.child_unit)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums text-white whitespace-nowrap">
                          {formatRatio(empR, ch.child_unit)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[#898989]">
                          {note}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </section>
  );
}
