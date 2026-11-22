"use client";

import type { ItemUnit } from "@/types/lumino";
import { formatMonthShort, formatQty, formatWithUnit } from "../utils";

interface KpiSummaryStripProps {
  unit: ItemUnit;
  godownName: string;
  totalReceipts: number;
  totalIssues: number;
  totalReturns: number;
  peakGodownStock: number;
  peakGodownMonth: string;
  endingGodownStock: number;
  totalConsumption: number;
  contractorIdleStock: number;
  peakContractorIdleStock: number;
  peakContractorMonth: string;
}

export function KpiSummaryStrip({
  unit,
  godownName,
  totalReceipts,
  totalIssues,
  totalReturns,
  peakGodownStock,
  peakGodownMonth,
  endingGodownStock,
  totalConsumption,
  contractorIdleStock,
  peakContractorIdleStock,
  peakContractorMonth,
}: KpiSummaryStripProps) {
  const netIssues = totalIssues - totalReturns;
  const inflowLabel = godownName === "ALL" ? "All godowns" : godownName;
  const issuesBreakdown = `${formatWithUnit(totalIssues, unit)} issued · ${formatWithUnit(totalReturns, unit)} returned`;
  const peakGodownLabel = peakGodownMonth
    ? `Peak ${formatMonthShort(peakGodownMonth)}`
    : "No peak recorded";
  const peakContractorLabel = peakContractorMonth
    ? `Peak ${formatWithUnit(peakContractorIdleStock, unit)} (${formatMonthShort(peakContractorMonth)})`
    : `Peak ${formatWithUnit(peakContractorIdleStock, unit)}`;

  const stats = [
    {
      label: "Total receipts",
      value: totalReceipts,
      sublabel: inflowLabel,
      indicator: false,
    },
    {
      label: "Net issued",
      value: netIssues,
      sublabel: issuesBreakdown,
      indicator: false,
    },
    {
      label: "Peak godown stock",
      value: peakGodownStock,
      sublabel: peakGodownLabel,
      indicator: false,
    },
    {
      label: "Closing godown stock",
      value: endingGodownStock,
      sublabel: "On hand at period end",
      indicator: false,
    },
    {
      label: "Project consumption",
      value: totalConsumption,
      sublabel: "Installed across all 6 sites",
      indicator: false,
    },
    {
      label: "Contractor idle stock",
      value: contractorIdleStock,
      sublabel: peakContractorLabel,
      indicator: contractorIdleStock > 0,
    },
  ];

  const cellBorderClasses = [
    "",
    "border-t border-white/[0.06] sm:border-t-0 sm:border-l lg:border-t-0 lg:border-l",
    "border-t border-white/[0.06] sm:border-l-0 lg:border-t-0 lg:border-l",
    "border-t border-white/[0.06] sm:border-l lg:border-l-0",
    "border-t border-white/[0.06] sm:border-l-0 lg:border-l",
    "border-t border-white/[0.06] sm:border-l lg:border-l",
  ];

  return (
    <section
      aria-label="Key inventory metrics"
      className="min-w-0 overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#1a1a1a]"
    >
      <div className="grid grid-cols-1 divide-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, idx) => (
          <div
            key={stat.label}
            className={`min-w-0 p-5 sm:p-6 transition-colors duration-200 hover:bg-white/[0.02] ${cellBorderClasses[idx] ?? ""}`}
          >
            <div className="flex items-center gap-2 text-xs font-normal text-[#898989]">
              {stat.indicator && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300"
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{stat.label}</span>
            </div>
            <div className="mt-2.5 flex items-baseline">
              <span className="font-serif font-normal tabular-nums text-[28px] sm:text-[32px] leading-none tracking-[-0.02em] text-white">
                {formatQty(stat.value, unit)}
              </span>
              <span className="ml-1.5 font-sans text-xs text-[#898989]">
                {unit}
              </span>
            </div>
            <p
              className="mt-2 truncate text-xs text-[#898989] tabular-nums"
              title={stat.sublabel}
            >
              {stat.sublabel}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
