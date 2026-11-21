"use client";

import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ItemUnit } from "@/types/lumino";
import styles from "./plannerHex.module.css";
import type {
  PlannerBacktestComparison,
  PlannerMonthlyPoint,
} from "./plannerTypes";
import { formatQty, shortGodownName } from "./plannerTypes";

interface IdleStockChartProps {
  summary: PlannerBacktestComparison;
  activeMonth: string;
  onSelectMonth: (month: string) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: PlannerMonthlyPoint }>;
  unit: ItemUnit;
}

function ChartTooltip({ active, payload, unit }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  const shortage = pt.simulated_shortage_qty ?? 0;
  const stockoutGodowns = pt.stockout_godowns ?? [];
  const delta = pt.actual_idle_stock - pt.simulated_idle_stock;

  return (
    <div className="w-64 rounded-[4px] border border-[#3a3138] bg-[#14141c]/95 p-3.5 text-xs text-[#f5c0c0] shadow-xl">
      <div className="flex items-center justify-between border-b border-[#3a3138] pb-2">
        <span className={`${styles.fontMono} font-semibold text-[#ffffff]`}>
          {pt.month}
        </span>
        {pt.month >= "2026-07" && (
          <span
            className={`${styles.fontMono} border border-[#f5c0c0]/40 bg-[#f5c0c0]/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#f5c0c0]`}
          >
            Wind-Down
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1.5 tabular-nums">
        <div className="flex justify-between">
          <span className="text-[#99797d]">Historical Idle</span>
          <span className="font-medium text-[#e6c46a]">
            {formatQty(pt.actual_idle_stock, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#99797d]">Simulated Idle</span>
          <span className="font-medium text-[#7ad3b2]">
            {formatQty(pt.simulated_idle_stock, unit)}
          </span>
        </div>
        <div className="flex justify-between border-t border-dashed border-[#3a3138] pt-1.5">
          <span className="text-[#99797d]">Idle Saved</span>
          <span
            className={`font-semibold ${
              delta >= 0 ? "text-[#7ad3b2]" : "text-[#e6c46a]"
            }`}
          >
            {delta >= 0 ? "+" : ""}
            {formatQty(delta, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#99797d]">Actual Receipts</span>
          <span className="text-[#e3b2b3]">
            {formatQty(pt.actual_receipts, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#99797d]">Simulated Receipts</span>
          <span className="text-[#ad8eb6]">
            {formatQty(pt.simulated_receipts, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#99797d]">Site Consumption</span>
          <span className="text-[#ffffff]">
            {formatQty(pt.actual_consumption, unit)}
          </span>
        </div>

        {shortage > 0 && (
          <div className="mt-2 border border-[#b8425c]/50 bg-[#b8425c]/15 p-2 text-[#ffd4dc]">
            <div className="flex justify-between font-semibold">
              <span>Simulated Shortage</span>
              <span>{formatQty(shortage, unit)}</span>
            </div>
            {stockoutGodowns.length > 0 && (
              <div className="mt-0.5 text-[10px] text-[#f5c0c0]">
                Affected:{" "}
                {stockoutGodowns.map((g) => shortGodownName(g)).join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IdleStockChart({
  summary,
  activeMonth,
  onSelectMonth,
}: IdleStockChartProps) {
  const [chartMode, setChartMode] = useState<"idle" | "receipts">("idle");

  const chartData = summary.monthly_series.map((pt) => ({
    ...pt,
    shortage_marker:
      (pt.simulated_shortage_qty ?? 0) > 0 ? pt.simulated_idle_stock : null,
  }));

  const stockoutMonthCount = summary.monthly_series.filter(
    (pt) => (pt.simulated_shortage_qty ?? 0) > 0
  ).length;

  const activePoint = summary.monthly_series.find(
    (pt) => pt.month === activeMonth
  );
  const activeDelta = activePoint
    ? activePoint.actual_idle_stock - activePoint.simulated_idle_stock
    : 0;

  return (
    <section
      aria-label="Actual vs Planned Idle Stock Curve"
      className={`${styles.floatingPanel} overflow-hidden`}
    >
      {/* Crisp Product Panel Chrome Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e9e5e8] bg-[#fcf8f8] px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-2 w-2 rounded-full border border-[#afa9b1] bg-[#fffcfc]" />
            <span className="h-2 w-2 rounded-full border border-[#afa9b1] bg-[#fffcfc]" />
            <span className="h-2 w-2 rounded-full border border-[#afa9b1] bg-[#fffcfc]" />
          </span>
          <span
            className={`${styles.fontMono} text-[10px] uppercase tracking-[0.0833em] text-[#43394c]`}
          >
            FIG. 01 · 44-MONTH TIME-SERIES WORKBENCH · {summary.item_code} ({summary.unit})
          </span>
        </div>

        <span
          className={`${styles.fontMono} text-[10px] uppercase tracking-[0.0833em] text-[#89828d]`}
        >
          CLICK ANY MONTH TO SCRUB
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3
              className={`${styles.fontHeading} text-lg font-extrabold text-[#14141c] sm:text-xl`}
            >
              {chartMode === "idle" ? (
                <>
                  Actual vs. Simulated Godown Idle{" "}
                  <span className={`${styles.fontItalicSerif} text-2xl font-light text-[#31263b]`}>
                    over 44 months
                  </span>
                </>
              ) : (
                <>
                  Vendor Receipts vs. Site Consumption{" "}
                  <span className={`${styles.fontItalicSerif} text-2xl font-light text-[#31263b]`}>
                    cadence
                  </span>
                </>
              )}
            </h3>
            <p className="mt-1 text-xs font-light text-[#43394c]">
              Vertical cursor synced to{" "}
              <span className={`${styles.fontMono} font-medium text-[#14141c]`}>
                {activeMonth}
              </span>{" "}
              · Native unit{" "}
              <span className={`${styles.fontMono} font-medium text-[#14141c]`}>
                {summary.unit}
              </span>{" "}
              · Rose-crimson bars audit all{" "}
              <span className="font-medium text-[#b8425c]">
                {stockoutMonthCount} months
              </span>{" "}
              with unfilled local godown demand.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Overlapping Mini Telemetry Card (Hex overlapping supporting window cue) */}
            {activePoint && (
              <div className="border border-[#dbd7da] bg-[#fcf8f8] px-3 py-1.5 text-[11px] tabular-nums">
                <div className="flex items-center gap-2">
                  <span className={`${styles.fontMono} text-[10px] uppercase text-[#89828d]`}>
                    {activeMonth} DELTA
                  </span>
                  <span
                    className={`${styles.fontMono} font-semibold ${
                      activeDelta >= 0 ? "text-[#2c7a62]" : "text-[#a98529]"
                    }`}
                  >
                    {activeDelta >= 0 ? "-" : "+"}
                    {formatQty(Math.abs(activeDelta), summary.unit)}
                  </span>
                </div>
              </div>
            )}

            {/* Rectangular 1px Mode Switcher */}
            <div className="inline-flex border border-[#dbd7da] bg-[#fffcfc]">
              <button
                type="button"
                onClick={() => setChartMode("idle")}
                className={`${styles.fontMono} px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                  chartMode === "idle"
                    ? "bg-[#31263b] text-[#fffcfc]"
                    : "text-[#43394c] hover:bg-[#e9e5e8]"
                }`}
              >
                Idle Stock Curve
              </button>
              <button
                type="button"
                onClick={() => setChartMode("receipts")}
                className={`${styles.fontMono} border-l border-[#dbd7da] px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                  chartMode === "receipts"
                    ? "bg-[#31263b] text-[#fffcfc]"
                    : "text-[#43394c] hover:bg-[#e9e5e8]"
                }`}
              >
                Receipts vs Usage
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === "idle" ? (
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 6, bottom: 4 }}
                onClick={(state) => {
                  if (state && typeof state.activeLabel === "string") {
                    onSelectMonth(state.activeLabel);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9e5e8" />
                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 11,
                    fill: "#89828d",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                  axisLine={{ stroke: "#dbd7da" }}
                  tickLine={{ stroke: "#dbd7da" }}
                  interval={3}
                />
                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "#89828d",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                  axisLine={{ stroke: "#dbd7da" }}
                  tickLine={{ stroke: "#dbd7da" }}
                  width={64}
                  tickFormatter={(v: number) =>
                    summary.unit === "MT"
                      ? `${v.toFixed(1)}`
                      : v >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : `${v}`
                  }
                />
                <Tooltip content={<ChartTooltip unit={summary.unit} />} />
                <Legend
                  wrapperStyle={{
                    fontSize: "11px",
                    paddingTop: "8px",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                />
                <ReferenceLine
                  x="2026-07"
                  stroke="#a98529"
                  strokeDasharray="4 4"
                  label={{
                    value: "Receipts End",
                    position: "insideTopRight",
                    fill: "#93701d",
                    fontSize: 10,
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                />
                <ReferenceLine
                  x={activeMonth}
                  stroke="#31263b"
                  strokeWidth={1.75}
                />
                <Bar
                  dataKey="simulated_shortage_qty"
                  name={`Simulated Shortage (${summary.unit})`}
                  fill="#b8425c"
                  fillOpacity={0.38}
                  radius={[1, 1, 0, 0]}
                  maxBarSize={14}
                />
                <Area
                  type="monotone"
                  dataKey="actual_idle_stock"
                  name={`Actual Historical Idle (${summary.unit})`}
                  stroke="#a98529"
                  fill="#a98529"
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="simulated_idle_stock"
                  name={`Simulated Plan Idle (${summary.unit})`}
                  stroke="#2c7a62"
                  strokeWidth={2.4}
                  dot={(dotProps) => {
                    const pt = dotProps.payload as
                      | PlannerMonthlyPoint
                      | undefined;
                    if (
                      !pt ||
                      !pt.simulated_shortage_qty ||
                      pt.simulated_shortage_qty <= 0 ||
                      typeof dotProps.cx !== "number" ||
                      typeof dotProps.cy !== "number"
                    ) {
                      return <g key={`empty-${dotProps.index}`} />;
                    }
                    return (
                      <circle
                        key={`shortage-${dotProps.index}`}
                        cx={dotProps.cx}
                        cy={dotProps.cy}
                        r={3.8}
                        fill="#b8425c"
                        stroke="#fffcfc"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                  activeDot={{ r: 5, fill: "#2c7a62" }}
                />
              </ComposedChart>
            ) : (
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 6, bottom: 4 }}
                onClick={(state) => {
                  if (state && typeof state.activeLabel === "string") {
                    onSelectMonth(state.activeLabel);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9e5e8" />
                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 11,
                    fill: "#89828d",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                  axisLine={{ stroke: "#dbd7da" }}
                  tickLine={{ stroke: "#dbd7da" }}
                  interval={3}
                />
                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "#89828d",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                  axisLine={{ stroke: "#dbd7da" }}
                  tickLine={{ stroke: "#dbd7da" }}
                  width={64}
                  tickFormatter={(v: number) =>
                    summary.unit === "MT"
                      ? `${v.toFixed(1)}`
                      : v >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : `${v}`
                  }
                />
                <Tooltip content={<ChartTooltip unit={summary.unit} />} />
                <Legend
                  wrapperStyle={{
                    fontSize: "11px",
                    paddingTop: "8px",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                />
                <ReferenceLine
                  x={activeMonth}
                  stroke="#31263b"
                  strokeWidth={1.75}
                />
                <Bar
                  dataKey="actual_receipts"
                  name={`Actual Receipts (${summary.unit})`}
                  fill="#a98529"
                  fillOpacity={0.45}
                  maxBarSize={14}
                />
                <Bar
                  dataKey="simulated_receipts"
                  name={`Simulated Receipts (${summary.unit})`}
                  fill="#7c6396"
                  fillOpacity={0.78}
                  maxBarSize={14}
                />
                <Line
                  type="monotone"
                  dataKey="actual_consumption"
                  name={`Actual Site Consumption (${summary.unit})`}
                  stroke="#31263b"
                  strokeWidth={2.2}
                  dot={false}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
